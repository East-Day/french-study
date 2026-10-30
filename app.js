(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const vocab = globalThis.FRENCH_VOCAB;
  const core = globalThis.FrenchCore;
  const STORAGE_KEY = 'french-study.practice.v1';
  if (!vocab?.entries?.length || !core) {
    document.body.textContent = '词库未能加载。请将 index.html、styles.css、core.js、app.js 和 data 文件夹保存在同一个项目文件夹，再重新打开 index.html。';
    return;
  }
  const entries = vocab.entries;
  const byId = new Map(entries.map(e => [e.id, e]));
  const categories = new Map(vocab.categories.map(c => [c.id, c.label]));
  let state;
  let storageAvailable = true;
  try { state = core.restoreState(localStorage.getItem(STORAGE_KEY), entries, vocab.version); }
  catch { state = core.newState(vocab.version); storageAvailable = false; }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({...state, savedAt:new Date().toISOString()}));
      storageAvailable = true;
    } catch { storageAvailable = false; }
    $('storage-status').textContent = storageAvailable ? '进度与错题自动保存在此浏览器' : '浏览器未允许保存：当前仍可练习，但刷新会丢失记录。请使用普通浏览窗口并允许本地存储。';
    $('storage-status').classList.toggle('storage-warning', !storageAvailable);
  }
  function labelFor(id) { return id === 'all' ? '全部分类' : categories.get(id) || id; }
  function currentEntry() { return byId.get(state.round?.ids[state.round.index]); }
  function currentResult() { return state.round?.results[state.round.index]?.result; }
  function setText(id, value) { $(id).textContent = value ?? ''; }
  function setVisible(id, visible) { $(id).hidden = !visible; }
  function nounDisplay(entry) {
    if (!entry.article) return entry.fr;
    return entry.article + (/[’']$/.test(entry.article) ? '' : ' ') + entry.fr;
  }
  function posPrompt(entry) {
    if (entry.pair) return entry.pair.m.pos;
    if (entry.genderMode === 'adjective') return '形容词';
    if (entry.genderMode === 'person') return '人物称谓';
    if (core.isNoun(entry)) return /专名/.test(entry.pos) ? '专有名词' : '名词';
    return (entry.pos || '词语').replace(/n\.[mf]\.|阳性|阴性|masculin|féminin/g, '').trim();
  }
  function updateSettingsNote() {
    const count = entries.filter(e => state.settings.category === 'all' || e.category === state.settings.category).length;
    const wrong = Object.keys(state.wrong).filter(id => state.settings.category === 'all' || byId.get(id)?.category === state.settings.category).length;
    setText('settings-note', `所选范围 ${count} 题 · 待复习错题 ${wrong} 道。点击“开始新一轮”应用选择。`);
  }
  function startRound(mode) {
    state.round = core.makeRound(entries, {...state.settings, mode, wrongIds:Object.keys(state.wrong)});
    state.draft = {entryId:null, text:'', gender:''};
    save(); render();
    if (currentEntry()) $('answer-input').focus();
  }
  function renderFeedback(entry, result) {
    setVisible('feedback', Boolean(result));
    if (!result) {
      for (const id of ['feedback-title','spelling-result','gender-result','correct-answer','answer-meaning','answer-meta','answer-note','answer-alternatives']) setText(id, '');
      return;
    }
    const matched = byId.get(result.matchedId) || entry;
    $('feedback').dataset.state = result.correct ? 'correct' : 'incorrect';
    setText('feedback-title', result.correct ? '答对了，继续保持！' : result.skipped ? '先记住它，下次再试' : '差一点，再记一次');
    let spelling = result.skipped ? '未作答 · 已计入错题' : result.spellingCorrect ? '✓ 法文拼写正确' : result.accentOnly ? '重音／附加符号有误 · 字母顺序正确，请对照正确写法' : '法文拼写有误 · 请对照正确答案';
    if (result.articleCorrect === false) spelling += '；输入的冠词不匹配';
    setText('spelling-result', spelling);
    $('spelling-result').dataset.correct = String(result.spellingCorrect && result.articleCorrect !== false);
    setVisible('gender-result', result.genderRequired);
    setText('gender-result', result.genderRequired ? `${result.genderCorrect ? '✓ 阴阳性正确' : '阴阳性未答对'} · ${result.expectedGender === 'm' ? '阳性 masculin' : '阴性 féminin'}` : '');
    $('gender-result').dataset.correct = String(result.genderCorrect);
    setText('correct-answer', nounDisplay(matched));
    $('correct-answer').lang = 'fr';
    setText('answer-meaning', matched.zh);
    const genderText = matched.gender === 'm' ? '阳性' : matched.gender === 'f' ? '阴性' : '';
    const formText = matched.genderMode === 'adjective' ? `${genderText}词形` : genderText;
    setText('answer-meta', [matched.pos, formText, matched.article ? `冠词：${matched.article}` : core.isNoun(matched) ? '冠词：以原文备注为准' : '', matched.formHint].filter(Boolean).join(' · '));
    setText('answer-note', [matched.note, matched.sourceRef ? `原文位置：${matched.sourceRef}` : ''].filter(Boolean).join('\n'));
    const alternatives = (result.alternatives || []).filter(fr => core.normalize(fr) !== core.normalize(matched.fr));
    setText('answer-alternatives', alternatives.length ? `本题也接受：${alternatives.join('；')}` : '');
    if(entry.pair && result.pairResults) {
      const describe=(r)=>r.correct?'✓ 正确':r.skipped?'未作答':r.accentOnly?'重音符号有误':r.articleCorrect===false?'冠词不匹配':'拼写有误';
      setText('spelling-result', '阳性：'+describe(result.pairResults.m));
      setVisible('gender-result',true);setText('gender-result','阴性：'+describe(result.pairResults.f));
      $('spelling-result').dataset.correct=String(result.pairResults.m.correct);
      $('gender-result').dataset.correct=String(result.pairResults.f.correct);
      setText('correct-answer','阳性：'+nounDisplay(entry.pair.m)+' ／ 阴性：'+nounDisplay(entry.pair.f));
      setText('answer-meta',entry.pair.m.pos+' · 阳性与阴性形式');setText('answer-alternatives','两栏均正确，本题才计为答对。');
    }
  }
  function render() {
    const round = state.round;
    const stats = core.roundStats(round);
    const entry = currentEntry();
    const result = currentResult();
    setText('stat-total', entries.length.toLocaleString('zh-CN'));
    setText('stat-progress', `${stats.answered} / ${stats.total}`);
    setText('stat-accuracy', stats.answered ? `${stats.accuracy}%` : '—');
    setText('wrong-count', Object.keys(state.wrong).length);
    setText('round-label', round ? `${round.mode === 'wrong' ? '错题重练' : '词汇默写'} · ${labelFor(round.category)} · ${round.order === 'random' ? '随机顺序' : '手册顺序'}` : '词汇默写');
    setText('progress-text', `已完成 ${stats.answered} / ${stats.total} 题`);
    $('progress-bar').max = stats.total || 1;
    $('progress-bar').value = stats.answered;
    setVisible('question-card', Boolean(entry));
    setVisible('empty-state', !entry && !stats.total);
    setVisible('summary', !entry && stats.total > 0);
    if (!entry) {
      setText('empty-title', '这个范围暂无错题');
      setText('empty-description', '可以选择其他分类复习，或点击“开始新一轮”继续默写。');
      setText('summary-title', '这一轮，完成了。');
      setText('summary-text', `共完成 ${stats.total} 题，答对 ${stats.correct} 题，正确率 ${stats.accuracy}%。拼写、冠词与需要选择的阴阳性全部正确，才计为答对。`);
      updateSettingsNote(); return;
    }
    setText('question-category', labelFor(entry.category));
    setText('question-pos', posPrompt(entry));
    setText('question-title', entry.zh);
    let hint = entry.formHint || '';
    if (entry.genderMode === 'person' && !hint) hint = entry.gender === 'm' ? '请写男性称谓' : '请写女性称谓';
    if (entry.genderMode === 'adjective' && !hint) hint = entry.gender === 'f' ? '请写阴性单数形式' : entry.gender === 'm' ? '请写阳性单数形式' : '阴阳同形';
    if (core.isNoun(entry) && !core.needsGender(entry) && entry.genderMode !== 'person' && !entry.gender) hint += `${hint ? ' · ' : ''}本题只检查拼写`;
    setText('question-hint', hint);
    const draft = state.draft.entryId === entry.id ? state.draft : {text:'',gender:''};
    setVisible('male-label',Boolean(entry.pair));setVisible('female-wrap',Boolean(entry.pair));
    $('answer-input').placeholder = entry.pair ? '输入阳性形式…' : '在这里输入法文…';
    $('female-input').value=result ? result.femaleInput||'' : draft.femaleText||'';
    $('female-input').readOnly=Boolean(result);
    $('answer-input').value = result ? result.input : draft.text;
    $('answer-input').readOnly = Boolean(result);
    $('answer-input').removeAttribute('aria-invalid');
    setVisible('gender-fieldset', core.needsGender(entry));
    $('gender-fieldset').disabled = Boolean(result);
    document.querySelectorAll('input[name="gender"]').forEach(radio => {radio.checked = radio.value === draft.gender;});
    document.querySelectorAll('[data-char]').forEach(button => {button.disabled = Boolean(result);});
    setVisible('submit-button', !result);
    setVisible('skip-button', !result);
    setVisible('next-button', Boolean(result));
    setText('next-button', stats.complete ? '查看本轮结果 →' : '下一题 →');
    setText('form-error', '');
    renderFeedback(entry, result);
    updateSettingsNote();
  }
  function storeDraft() {
    const entry = currentEntry();
    if (!entry || currentResult()) return;
    state.draft = {entryId:entry.id, text:$('answer-input').value, femaleText:$('female-input').value, gender:document.querySelector('input[name="gender"]:checked')?.value || ''};
    save();
  }
  function submit(skip) {
    const entry = currentEntry();
    if (!entry || currentResult()) return;
    storeDraft();
    if (!skip && !core.normalize(state.draft.text)) {
      setText('form-error', '请先输入法文，或点击“不会，查看答案”。');
      $('answer-input').setAttribute('aria-invalid', 'true'); $('answer-input').focus(); return;
    }
    if (!skip && core.needsGender(entry) && !state.draft.gender) {
      setText('form-error', '请先选择阳性或阴性，再提交。');
      document.querySelector('input[name="gender"]').focus(); return;
    }
    if(!skip && entry.pair && !core.normalize(state.draft.femaleText)) {
      setText('form-error','请填写阴性形式，再提交。');$('female-input').focus();return;
    }
    const result = core.grade(entry, state.draft.text, state.draft.gender, entries, {skip,femaleInput:state.draft.femaleText});
    state = core.recordAnswer(state, entry, result);
    save(); render(); $('next-button').focus();
  }
  function next() {
    if (!currentResult()) return;
    state.round = {...state.round, index:state.round.index + 1};
    state.draft = {entryId:null, text:'', gender:''};
    save(); render();
    if (currentEntry()) $('answer-input').focus();
    else $('summary-restart').focus();
  }
  for (const category of [{id:'all',label:'全部分类'}, ...vocab.categories]) {
    const option = document.createElement('option');
    option.value = category.id;
    const count = entries.filter(e => category.id === 'all' || e.category === category.id).length;
    option.textContent = `${category.label}（${count}）`;
    $('category-select').append(option);
  }
  $('category-select').value = state.settings.category;
  $('order-select').value = state.settings.order;
  for (const id of ['category-select','order-select']) $(id).addEventListener('change', () => {
    state.settings = {category:$('category-select').value, order:$('order-select').value}; save(); updateSettingsNote();
  });
  $('start-button').addEventListener('click', () => startRound('all'));
  // Learning selects a category explicitly; ordinary mode switches never reset this state.
  document.addEventListener('practice-category', event => {
    const category = event.detail?.category;
    if (category !== 'all' && !categories.has(category)) return;
    state.settings.category = category;
    $('category-select').value = category;
    startRound('all');
  });
  $('review-button').addEventListener('click', () => startRound('wrong'));
  $('summary-restart').addEventListener('click', () => startRound('all'));
  $('summary-review').addEventListener('click', () => startRound('wrong'));
  $('answer-form').addEventListener('submit', event => { event.preventDefault(); currentResult() ? next() : submit(false); });
  $('skip-button').addEventListener('click', () => submit(true));
  $('next-button').addEventListener('click', next);
  $('answer-input').addEventListener('input', storeDraft);
  $('female-input').addEventListener('input',storeDraft);
  let activeInput=$('answer-input');
  for(const id of ['answer-input','female-input'])$(id).addEventListener('focus',()=>activeInput=$(id));
  document.querySelectorAll('input[name="gender"]').forEach(radio => radio.addEventListener('change', storeDraft));
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.repeat || event.isComposing || event.keyCode === 229)) event.preventDefault();
  });
  document.querySelectorAll('[data-char]').forEach(button => button.addEventListener('click', () => {
    if (currentResult()) return;
    const input = activeInput.hidden || activeInput.closest('[hidden]') ? $('answer-input') : activeInput;
    input.setRangeText(button.dataset.char, input.selectionStart, input.selectionEnd, 'end');
    input.focus(); storeDraft();
  }));
  setText('source-summary', `来自《${vocab.source || '外教法语课分类复习手册.docx'}》，共 ${vocab.categories.length} 个主题、${entries.length} 道词汇与词形练习。斜杠并列已拆分，详细抽取统计及边界见项目中的“词库核对说明.md”。`);
  const issues = vocab.issues || [];
  if (!issues.length) setText('issues-list', '未发现需要人工确认的词条。详细拆分规则见词库核对说明。');
  else for (const issue of issues) {
    const p = document.createElement('p');
    p.textContent = [issue.sourceRef, issue.original, issue.detail].filter(Boolean).join(' · ');
    $('issues-list').append(p);
  }
  if (!state.round) state.round = core.makeRound(entries, {...state.settings, mode:'all'});
  save(); render();
})();
