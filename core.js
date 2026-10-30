/* Pure practice rules. No browser or network dependencies. */
(function (root) {
  'use strict';
  const normalize = value => String(value ?? '').normalize('NFC').trim()
    .toLocaleLowerCase('fr').replace(/[’‘ʼ]/g, "'").replace(/\s+/g, ' ').replace(/\s*'\s*/g, "'");
  const stripAccents = value => normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isNoun = entry => ['fixed', 'person'].includes(entry.genderMode) || /名词|专名|^n\./.test(entry.pos || '');
  const needsGender = entry => entry.genderMode === 'fixed' && ['m', 'f'].includes(entry.gender);
  function candidatesFor(entry, entries) {
    const peers = entries.filter(other => {
      if ((entry.alternateIds || []).includes(other.id)) return true;
      return other.zh === entry.zh && other.pos === entry.pos && other.genderMode === entry.genderMode &&
        (other.formHint || '') === (entry.formHint || '') &&
        (!['person', 'adjective'].includes(entry.genderMode) || other.gender === entry.gender);
    });
    return [entry, ...peers.filter(other => other.id !== entry.id)];
  }
  function articlesFor(entry) {
    if (!isNoun(entry) && !entry.articles?.length) return [];
    const result = new Set([...(entry.articles || []), entry.article].filter(Boolean).map(normalize));
    const plural = entry.number === 'plural' || result.has('les');
    if (plural) result.add('des');
    else if (entry.gender === 'm') result.add('un');
    else if (entry.gender === 'f') result.add('une');
    return [...result];
  }
  function splitArticle(input) {
    const match = input.match(/^(le |la |les |un |une |des |du |de la |de l'|l')(.+)$/);
    return match ? {article:match[1].trim(), word:match[2]} : null;
  }
  function grade(entry, input, gender, entries = [], options = {}) {
    const value = normalize(input);
    const candidates = candidatesFor(entry, entries);
    let best = null;
    for (const candidate of candidates) {
      for (const spelling of [candidate.fr, ...(candidate.accepted || [])]) {
        const answer = normalize(spelling);
        const parts = isNoun(candidate) || candidate.articles?.length ? splitArticle(value) : null;
        const bare = value === answer || stripAccents(value) === stripAccents(answer);
        const word = bare ? value : (parts?.word ?? value);
        const exact = word === answer;
        const accent = !exact && stripAccents(word) === stripAccents(answer);
        const articleCorrect = bare || !parts ? null : articlesFor(candidate).includes(parts.article);
        const rank = (exact ? 4 : accent ? 2 : 0) + (articleCorrect !== false ? 1 : 0);
        if (!best || rank > best.rank) best = {rank, exact, accent, articleCorrect, candidate, spelling};
      }
    }
    const matched = best && (best.exact || best.accent) ? best.candidate : entry;
    const genderRequired = needsGender(entry);
    const expectedGender = matched.gender;
    const skipped = Boolean(options.skip);
    const spellingCorrect = !skipped && Boolean(best?.exact);
    const articleCorrect = skipped ? null : best?.articleCorrect ?? null;
    const genderCorrect = genderRequired ? !skipped && gender === expectedGender : null;
    return {
      correct: !skipped && spellingCorrect && articleCorrect !== false && genderCorrect !== false,
      spellingCorrect, accentOnly: !skipped && Boolean(best?.accent), articleCorrect,
      genderRequired, genderCorrect, expectedGender, matchedId:matched.id,
      answer:matched.fr, alternatives:[...new Set(candidates.flatMap(c => [c.fr, ...(c.accepted || [])]))],
      skipped, input:String(input ?? ''), selectedGender:gender || ''
    };
  }
  function makeRound(entries, options = {}, rng = Math.random) {
    const {category = 'all', order = 'random', mode = 'all', wrongIds = []} = options;
    const wrong = new Set(wrongIds);
    const ids = entries.filter(e => (category === 'all' || e.category === category) &&
      (mode !== 'wrong' || wrong.has(e.id))).map(e => e.id);
    if (order === 'random') {
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.max(0, Math.floor(rng() * (i + 1))));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    return {ids, index:0, results:[], category, order, mode};
  }
  function newState(version = '') {
    return {schema:1, dataVersion:version, settings:{category:'all', order:'random'},
      wrong:{}, round:null, draft:{entryId:null, text:'', gender:''}};
  }
  function roundStats(round) {
    const total = round?.ids.length || 0;
    const answered = round?.results.length || 0;
    const correct = round?.results.filter(item => item.result.correct).length || 0;
    return {answered, total, correct, accuracy:answered ? Math.round(correct / answered * 100) : 0,
      complete:total > 0 && answered === total};
  }
  function recordAnswer(state, entry, result) {
    if (!state.round || state.round.ids[state.round.index] !== entry.id || state.round.results.length > state.round.index) return state;
    const wrong = {...state.wrong};
    if (result.correct) delete wrong[entry.id];
    else wrong[entry.id] = {count:(wrong[entry.id]?.count || 0) + 1, lastSeen:new Date().toISOString(), lastInput:result.input};
    return {...state, wrong, round:{...state.round, results:[...state.round.results, {entryId:entry.id, result}]}};
  }
  function restoreState(raw, entries, version = '') {
    const fallback = newState(version);
    try {
      const stored = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!stored || stored.schema !== 1) return fallback;
      const ids = new Set(entries.map(e => e.id));
      const categories = new Set(['all', ...entries.map(e => e.category)]);
      const state = {...fallback};
      if (categories.has(stored.settings?.category)) state.settings.category = stored.settings.category;
      if (['ordered', 'random'].includes(stored.settings?.order)) state.settings.order = stored.settings.order;
      for (const [id, item] of Object.entries(stored.wrong || {})) {
        if (ids.has(id)) state.wrong[id] = {count:Number.isInteger(item?.count) && item.count > 0 ? item.count : 1,
          lastSeen:typeof item?.lastSeen === 'string' ? item.lastSeen : '', lastInput:typeof item?.lastInput === 'string' ? item.lastInput : ''};
      }
      const r = stored.round;
      if (version && stored.dataVersion !== version) return state;
      if (r && Array.isArray(r.ids) && r.ids.every(id => ids.has(id)) && new Set(r.ids).size === r.ids.length &&
          Number.isInteger(r.index) && r.index >= 0 && r.index <= r.ids.length && Array.isArray(r.results) &&
          r.results.length >= r.index && r.results.length <= Math.min(r.index + 1, r.ids.length) &&
          r.results.every((item, i) => item?.entryId === r.ids[i] &&
            ['correct','spellingCorrect','accentOnly','genderRequired','skipped'].every(key => typeof item.result?.[key] === 'boolean') &&
            typeof item.result?.input === 'string' && typeof item.result?.answer === 'string' &&
            Array.isArray(item.result?.alternatives) && item.result.alternatives.every(a => typeof a === 'string') &&
            [null,true,false].includes(item.result.articleCorrect) && [null,true,false].includes(item.result.genderCorrect)) &&
          categories.has(r.category) && ['ordered','random'].includes(r.order) && ['all','wrong'].includes(r.mode)) {
        state.round = r;
        const d = stored.draft;
        if (d?.entryId === r.ids[r.index]) state.draft = {entryId:d.entryId, text:typeof d.text === 'string' ? d.text : '', ...(typeof d.femaleText === 'string' ? {femaleText:d.femaleText} : {}), gender:['m','f'].includes(d.gender) ? d.gender : ''};
      }
      return state;
    } catch { return fallback; }
  }
  root.FrenchCore = {normalize, stripAccents, isNoun, needsGender, candidatesFor, articlesFor, grade, makeRound, newState, roundStats, recordAnswer, restoreState};
})(globalThis);
