(function (root) {
  'use strict';

  function runCoreTests() {
    const C = root.FrenchCore;
    const results = [];
    const assert = (condition, message) => { if (!condition) throw new Error(message || '断言失败'); };
    const same = (actual, expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), `预期 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
    const test = (name, action) => {
      try { action(); results.push({ name, passed: true }); }
      catch (error) { results.push({ name, passed: false, error: error.message }); }
    };
    if (!C) return { passed: 0, failed: 1, results: [{ name: '加载 core.js', passed: false, error: 'FrenchCore 不存在' }] };

    const word = (id, fr, zh, extra = {}) => Object.assign({ id, fr, zh, category: 'a', pos: 'n.', gender: 'f', genderMode: 'fixed', article: 'la', formHint: '', accepted: [] }, extra);
    const school = word('school', 'école', '学校', { article: 'l’' });
    const city = word('city', 'ville', '城市');
    const book = word('book', 'livre', '书', { gender: 'm', article: 'le' });
    const water = word('water', 'eau', '水', { article: 'l’' });
    const verb = word('verb', 's’appeler', '叫作', { pos: 'v.代词式', gender: null, genderMode: 'none', article: null });
    const adjM = word('adjm', 'heureux', '快乐的', { pos: 'adj.', gender: 'm', genderMode: 'adjective', article: null, formHint: '请写阳性单数形式' });
    const adjF = word('adjf', 'heureuse', '快乐的', { pos: 'adj.', gender: 'f', genderMode: 'adjective', article: null, formHint: '请写阴性单数形式' });
    const friendM = word('friendm', 'ami', '朋友', { gender: 'm', genderMode: 'person', article: 'un', formHint: '男性称谓' });
    const friendF = word('friendf', 'amie', '朋友', { gender: 'f', genderMode: 'person', article: 'une', formHint: '女性称谓' });
    const fridge = word('fridge', 'réfrigérateur', '冰箱', { gender: 'm', article: 'le', category: 'b' });
    const frigo = word('frigo', 'frigo', '冰箱', { gender: 'm', article: 'le', category: 'b' });
    const unknown = word('unknown', 'test', '来源未明确性别的测试词', { gender: null, article: null });
    const entries = [school, city, book, water, verb, adjM, adjF, friendM, friendF, fridge, frigo, unknown];
    const grade = (entry, input, gender, options) => C.grade(entry, input, gender, entries, options);

    test('忽略首尾空格和大小写', () => assert(grade(school, '  ÉCOLE  ', 'f').correct));
    test('兼容直撇号和弯撇号', () => assert(grade(verb, "s'appeler", '').correct));
    test('兼容 Unicode 组合重音', () => assert(grade(school, 'e\u0301cole', 'f').correct));
    test('缺少重音单独标记且不判对', () => {
      const result = grade(school, 'ecole', 'f');
      assert(!result.correct && !result.spellingCorrect && result.accentOnly && result.genderCorrect);
    });
    test('错误重音同样明确标记', () => assert(grade(school, 'ècole', 'f').accentOnly));
    test('普通拼写错误不误报为仅重音错误', () => {
      const result = grade(school, 'écolle', 'f');
      assert(!result.spellingCorrect && !result.accentOnly);
    });
    test('名词可以只写裸词', () => assert(grade(city, 'ville', 'f').correct));
    test('名词接受正确定冠词', () => assert(grade(city, 'la ville', 'f').correct));
    test('名词接受正确不定冠词', () => assert(grade(city, 'une ville', 'f').correct));
    test('名词接受省音冠词与弯撇号', () => assert(grade(school, 'l’école', 'f').correct));
    test('名词接受省音冠词与直撇号', () => assert(grade(school, "l'école", 'f').correct));
    test('错误冠词被拒绝且保留词本身的拼写结果', () => {
      const result = grade(city, 'le ville', 'f');
      assert(!result.correct && result.spellingCorrect && result.articleCorrect === false && result.genderCorrect);
    });
    test('冠词不会替代单独性别选择', () => {
      const result = grade(city, 'la ville', 'm');
      assert(!result.correct && result.spellingCorrect && result.genderCorrect === false);
    });
    test('固定性别名词不能漏选性别', () => assert(!grade(book, 'livre', '').correct));
    test('拼写错误时仍独立判断正确性别', () => {
      const result = grade(book, 'livree', 'm');
      assert(result.genderCorrect === true && result.spellingCorrect === false);
    });
    test('动词不进行阴阳性判分', () => {
      const result = grade(verb, 's’appeler', '');
      assert(result.correct && !result.genderRequired && result.genderCorrect === null);
    });
    test('形容词阴性形式单独出题且不要求性别单选', () => {
      const result = grade(adjF, 'heureuse', '');
      assert(result.correct && !result.genderRequired);
      assert(!grade(adjF, 'heureux', '').correct);
    });
    test('人物称谓按要求接受女性形式', () => {
      assert(grade(friendF, 'amie', '').correct);
      assert(!grade(friendF, 'ami', '').correct);
      assert(!grade(friendF, 'amie', '').genderRequired);
    });
    test('无依据的性别不参与判分', () => assert(!grade(unknown, 'test', '').genderRequired));
    test('相同中文词性及提示接受词库内同义词', () => assert(grade(fridge, 'frigo', 'm').correct));
    test('同义词也接受各自正确的冠词', () => assert(grade(fridge, 'le frigo', 'm').correct));
    test('不接受无关词库答案', () => assert(!grade(city, 'livre', 'm').correct));
    test('不会查看答案始终计错', () => {
      const result = grade(city, 'ville', 'f', { skip: true });
      assert(result.skipped && !result.correct);
    });
    test('空字符串不误判为正确', () => assert(!grade(city, '   ', 'f').correct));
    test('整串斜杠不作为词形答案', () => assert(!grade(adjF, 'heureux / heureuse', '').correct));

    test('全部分类顺序出题且无重复', () => {
      const round = C.makeRound(entries, { category: 'all', order: 'ordered', mode: 'all' });
      same(round.ids, entries.map(entry => entry.id));
      same(round.index, 0); same(round.results, []);
    });
    test('单分类筛选', () => same(C.makeRound(entries, { category: 'b', order: 'ordered', mode: 'all' }).ids, ['fridge', 'frigo']));
    test('错题模式结合分类筛选', () => same(C.makeRound(entries, { category: 'b', order: 'ordered', mode: 'wrong', wrongIds: ['school', 'frigo'] }).ids, ['frigo']));
    test('空错题本产生空队列', () => same(C.makeRound(entries, { mode: 'wrong', wrongIds: [] }).ids, []));
    test('随机出题仍覆盖所有条目且不重复', () => {
      const round = C.makeRound(entries, { order: 'random' }, () => 0.25);
      same([...round.ids].sort(), entries.map(entry => entry.id).sort());
      assert(round.ids.some((id, index) => id !== entries[index].id));
    });

    const initial = () => {
      const state = C.newState('qa-v1');
      state.round = C.makeRound(entries, { category: 'a', order: 'ordered' });
      return state;
    };
    test('答错加入错题并记录当前回答', () => {
      const state = C.recordAnswer(initial(), school, grade(school, 'ecole', 'f'));
      assert(state.wrong.school && state.round.results.length === 1);
    });
    test('同一题重复提交不重复计数', () => {
      const answered = C.recordAnswer(initial(), school, grade(school, 'ecole', 'f'));
      const repeated = C.recordAnswer(answered, school, grade(school, 'ecole', 'f'));
      same(repeated.round.results.length, 1);
      same(repeated.wrong.school, answered.wrong.school);
    });
    test('不会查看答案也加入错题', () => {
      const state = C.recordAnswer(initial(), school, grade(school, '', '', { skip: true }));
      assert(state.wrong.school);
    });
    test('复习答对后从待重练错题中移除', () => {
      const state = initial(); state.wrong.school = { count: 1, lastInput: 'ecole' };
      const answered = C.recordAnswer(state, school, grade(school, 'école', 'f'));
      assert(!answered.wrong.school);
    });
    test('只允许当前题写入统计', () => {
      const state = C.recordAnswer(initial(), book, grade(book, 'livre', 'm'));
      same(state.round.results.length, 0);
    });
    test('本轮统计正确率', () => {
      const state = initial();
      let answered = C.recordAnswer(state, school, grade(school, 'école', 'f'));
      answered.round.index = 1;
      answered = C.recordAnswer(answered, city, grade(city, 'vile', 'f'));
      const stats = C.roundStats(answered.round);
      same(stats.answered, 2); same(stats.correct, 1); same(stats.accuracy, 50);
      same(stats.total, answered.round.ids.length);
    });
    test('保存未提交文字与性别后可恢复', () => {
      const state = initial(); state.draft = { entryId: school.id, text: 'éco', gender: 'f' };
      const restored = C.restoreState(JSON.stringify(state), entries, 'qa-v1');
      same(restored.draft, state.draft); same(restored.round.ids, state.round.ids);
    });
    test('已提交结果与错题在刷新后保持', () => {
      const state = C.recordAnswer(initial(), school, grade(school, 'ecole', 'f'));
      const restored = C.restoreState(JSON.stringify(state), entries, 'qa-v1');
      same(restored.round.results.length, 1); assert(restored.wrong.school);
      same(restored.round.index, 0);
    });
    test('损坏的浏览器保存数据安全恢复', () => {
      const restored = C.restoreState('{ invalid json', entries, 'qa-v1');
      same(restored.round, null); same(restored.wrong, {});
    });
    test('旧词库不存在的错题不会污染新词库', () => {
      const state = initial(); state.wrong.removed = { count: 1 }; state.wrong.school = { count: 1 };
      const restored = C.restoreState(JSON.stringify(state), entries, 'qa-v1');
      assert(!restored.wrong.removed && restored.wrong.school);
    });
    test('轮次含不存在词条时安全放弃该轮', () => {
      const state = initial(); state.round.ids.push('removed');
      same(C.restoreState(JSON.stringify(state), entries, 'qa-v1').round, null);
    });

    const vocab = root.FRENCH_VOCAB;
    if (vocab && vocab.entries) {
      test('真实词库词条 ID 唯一', () => same(new Set(vocab.entries.map(entry => entry.id)).size, vocab.entries.length));
      test('真实词库分类均存在', () => {
        const categoryIds = new Set(vocab.categories.map(category => category.id));
        assert(vocab.entries.every(entry => categoryIds.has(entry.category)));
      });
      test('真实词库每条均有法文中文词性与原文定位', () => {
        const invalid = vocab.entries.filter(entry => !entry.fr || !entry.zh || !entry.pos || !entry.sourceRef);
        assert(!invalid.length, invalid.map(entry => entry.id).join(', '));
      });
      test('真实词库不要求默写斜杠组合', () => {
        const invalid = vocab.entries.filter(entry => /\//.test(entry.fr));
        assert(!invalid.length, invalid.map(entry => entry.fr).join(', '));
      });
      test('真实词库所有标准答案均能通过判题', () => {
        const invalid = vocab.entries.filter(entry => !C.grade(entry, entry.fr, entry.gender || '', vocab.entries).correct);
        assert(!invalid.length, invalid.map(entry => entry.id + ':' + entry.fr).join(', '));
      });
      test('真实词库每个分类的筛选数量一致', () => {
        for (const category of vocab.categories) {
          same(C.makeRound(vocab.entries, { category: category.id, order: 'ordered' }).ids.length, vocab.entries.filter(entry => entry.category === category.id).length);
        }
      });
    }
    const summary = { passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length, results };
    root.FRENCH_TEST_RESULTS = summary;
    return summary;
  }
  root.runCoreTests = runCoreTests;
}(globalThis));
