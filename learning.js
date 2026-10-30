(function () {
  'use strict';
  const vocab = globalThis.FRENCH_VOCAB;
  if (!vocab?.entries?.length || !globalThis.FrenchCore) return;
  const $ = id => document.getElementById(id);
  const key = 'french-study.learning.v1';
  const pageSize = 24;
  const categories = new Map(vocab.categories.map(c => [c.id, c.label]));
  let view = {mode:'learn', category:'all', query:'', page:1};
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved) view = {
      mode:saved.mode === 'practice' ? 'practice' : 'learn',
      category:categories.has(saved.category) ? saved.category : 'all',
      query:typeof saved.query === 'string' ? saved.query : '',
      page:Number.isSafeInteger(saved.page) && saved.page > 0 ? saved.page : 1
    };
  } catch { /* Learning works even when local storage is unavailable. */ }
  function saveView() { try {localStorage.setItem(key, JSON.stringify(view));} catch {} }
  const normalize = text => FrenchCore.stripAccents(text);
  const forms = entry => entry.pair ? [entry.pair.m, entry.pair.f] : [entry];
  // Search uses the same live vocabulary as practice, including both members of a pair.
  const searchIndex = vocab.entries.map(entry => ({entry, text:normalize([
    entry.zh, ...forms(entry).flatMap(f => [f.fr, f.zh, ...(f.accepted || [])])
  ].join(' '))}));
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function displayWord(entry) {
    return entry.article ? entry.article + (/[’']$/.test(entry.article) ? '' : ' ') + entry.fr : entry.fr;
  }
  function metadata(entry) {
    const bits = [entry.pos];
    if (FrenchCore.isNoun(entry)) {
      const gender = entry.gender === 'm' ? '阳性 masculin' : entry.gender === 'f' ? '阴性 féminin' :
        /两性|阴阳.*均可|阴阳.*皆可/.test(entry.note || '') ? '阴阳两性均可' : '性别以原文备注为准';
      bits.push(gender, entry.article ? `冠词 ${entry.article}` : '冠词以原文备注为准');
    }
    if (entry.number === 'plural') bits.push('复数');
    return bits.filter(Boolean).join(' · ');
  }
  function card(entry) {
    const node = element('article','word-card');
    node.dataset.entryId = entry.id;
    const top = element('div','word-card-top');
    const visual = globalThis.FRENCH_ICONS?.resolve(entry) || {emoji:'📚',source:'category'};
    const emoji = element('span','word-icon'); emoji.setAttribute('aria-hidden','true');
    emoji.dataset.iconSource = visual.source;
    if (visual.svg && ['big','small','tall','short'].includes(visual.svg)) {
      const image = element('img'); image.src = `assets/icons/${visual.svg}.svg`;
      image.alt = ''; image.width = 48; image.height = 48;
      emoji.append(image);
    } else emoji.textContent = visual.emoji;
    emoji.title = visual.source === 'category' ? '类别辅助图标' : '词义辅助图标';
    top.append(emoji, element('span','word-category',categories.get(entry.category)));
    node.append(top, element('h2','word-meaning',entry.zh));
    const row = element('div',entry.pair ? 'word-forms word-forms-pair' : 'word-forms');
    forms(entry).forEach((form, index) => {
      const col = element('div','word-form');
      if (entry.pair) col.append(element('p','word-form-label',index === 0 ? '阳性形式 masculin' : '阴性形式 féminin'));
      const word = element('p','word-french',displayWord(form)); word.lang = 'fr';
      col.append(word, element('p','word-meta',metadata(form)));
      row.append(col);
    });
    node.append(row);
    if (!entry.pair && entry.formHint) node.append(element('p','word-hint',entry.formHint));
    if (entry.note) {
      const details = element('details','word-notes');
      details.append(element('summary','','用法与原文备注'), element('p','',entry.note));
      node.append(details);
    }
    return node;
  }
  function renderCards() {
    const query = normalize(view.query);
    const matches = searchIndex.filter(({entry,text}) => (view.category === 'all' || entry.category === view.category) && text.includes(query));
    const pages = Math.max(1, Math.ceil(matches.length / pageSize));
    view.page = Math.min(view.page, pages);
    const offset = (view.page - 1) * pageSize;
    $('learn-cards').replaceChildren(...matches.slice(offset, offset + pageSize).map(({entry}) => card(entry)));
    $('learn-empty').hidden = matches.length !== 0;
    $('learn-results').textContent = `共 ${matches.length} 张卡片${matches.length ? ` · 当前显示 ${offset + 1}–${Math.min(offset + pageSize, matches.length)}` : ''}`;
    $('learn-page').textContent = `第 ${view.page} / ${pages} 页`;
    $('learn-prev').disabled = view.page <= 1;
    $('learn-next').disabled = view.page >= pages;
    $('learn-practice').textContent = view.category === 'all' ? '练习全部分类 →' : '练习本分类 →';
    saveView();
  }
  function setMode(mode) {
    view.mode = mode;
    const learning = mode === 'learn';
    $('learning-panel').hidden = !learning;
    $('practice-panel').hidden = learning;
    $('source-details').hidden = !learning;
    $('learn-mode-button').setAttribute('aria-pressed', String(learning));
    $('practice-mode-button').setAttribute('aria-pressed', String(!learning));
    $('mode-description').textContent = learning ? '先认识单词，再试着默写。每天留一点时间，复习课堂里学过的单词。' : '看中文，写法文。切换模式不会重置当前练习进度。';
    if (learning) renderCards();
    else $('learn-cards').replaceChildren(); // Remove visible answers entirely during practice.
    saveView();
  }
  for (const category of [{id:'all',label:'全部分类'}, ...vocab.categories]) {
    const count = vocab.entries.filter(e => category.id === 'all' || e.category === category.id).length;
    const option = element('option','',`${category.label}（${count}）`);
    option.value = category.id; $('learn-category').append(option);
  }
  $('learn-category').value = view.category;
  $('learn-search').value = view.query;
  $('learn-category').addEventListener('change', () => {view.category = $('learn-category').value; view.page = 1; renderCards();});
  $('learn-search').addEventListener('input', () => {view.query = $('learn-search').value; view.page = 1; renderCards();});
  $('learn-prev').addEventListener('click', () => {view.page--; renderCards();});
  $('learn-next').addEventListener('click', () => {view.page++; renderCards();});
  $('learn-mode-button').addEventListener('click', () => setMode('learn'));
  $('practice-mode-button').addEventListener('click', () => setMode('practice'));
  $('learn-practice').addEventListener('click', () => {
    setMode('practice');
    document.dispatchEvent(new CustomEvent('practice-category', {detail:{category:view.category}}));
  });
  setMode(view.mode);
})();
