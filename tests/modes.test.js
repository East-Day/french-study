/* DOM-simulated integration checks; no browser rendering is claimed. */
globalThis.runModeTests = function (sources, vm) {
  const results = [];
  function assert(value, message) {if (!value) throw new Error(message);}
  function test(name, action) {
    try {action(); results.push({name, passed:true});}
    catch (error) {results.push({name, passed:false, error:error.message});}
  }
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag; this.children = []; this.events = {}; this.attributes = {};
      this.dataset = {}; this.hidden = false; this.value = ''; this.checked = false;
      this.classList = {toggle(){}}; this._text = '';
    }
    set textContent(value) {this._text = String(value); this.children = [];}
    get textContent() {return this._text + this.children.map(c => c.textContent).join(' ');}
    append(...children) {this.children.push(...children);}
    replaceChildren(...children) {this._text = ''; this.children = children;}
    setAttribute(key,value) {this.attributes[key] = String(value);}
    removeAttribute(key) {delete this.attributes[key];}
    addEventListener(type,fn) {(this.events[type] ||= []).push(fn);}
    dispatchEvent(event) {(this.events[event.type] || []).forEach(fn => fn(event));}
    fire(type) {this.dispatchEvent({type, preventDefault(){}});}
    focus() {}
    closest() {return null;}
  }
  const storage = new Map();
  function boot() {
    const nodes = {};
    for (const match of sources.html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
      const node = new Element(match[1]); node.id = match[3]; node.hidden = /\bhidden\b/.test(match[2]);
      nodes[node.id] = node;
    }
    const radios = ['m','f'].map(value => Object.assign(new Element('input'),{value}));
    const accents = [Object.assign(new Element('button'),{dataset:{char:'é'}})];
    const document = Object.assign(new Element(), {
      body:new Element('body'), getElementById:id => nodes[id], createElement:tag => new Element(tag),
      querySelectorAll:selector => selector === '[data-char]' ? accents : radios,
      querySelector:selector => selector.includes(':checked') ? radios.find(r => r.checked) : radios[0]
    });
    const context = vm.createContext({document, localStorage:{getItem:key => storage.get(key) ?? null, setItem:(key,value) => storage.set(key,value)},
      CustomEvent:class {constructor(type,init){this.type=type;this.detail=init.detail;}}});
    for (const name of ['data/vocabulary.js','core.js','pairs.js','app.js','data/vocabulary-icons.js','learning.js']) vm.runInContext(sources[name],context,{filename:name});
    return {nodes,context,document};
  }
  let app = boot();
  const key = 'french-study.practice.v1';
  const click = id => app.nodes[id].fire('click');
  const search = value => {app.nodes['learn-search'].value=value;app.nodes['learn-search'].fire('input');};
  const category = value => {app.nodes['learn-category'].value=value;app.nodes['learn-category'].fire('change');};
  const cards = () => app.nodes['learn-cards'].children;
  test('首次打开默认学习模式，最多24张卡片', () => {
    assert(!app.nodes['learning-panel'].hidden && app.nodes['practice-panel'].hidden,'默认模式错误');
    assert(cards().length===24,'分页未限制卡片数');
  });
  test('翻页及搜索重置第一页', () => {
    click('learn-next');assert(app.nodes['learn-page'].textContent.startsWith('第 2'),'未翻页');
    search('苹果');assert(app.nodes['learn-page'].textContent.startsWith('第 1'),'未重置');
    assert(cards().length && cards().every(c=>c.textContent.includes('苹果')),'中文搜索错误');
    assert(cards().some(c=>c.textContent.includes('🍎')),'缺少苹果图标');
  });
  test('法文搜索忽略大小写重音，阴性形式找到完整双词形卡', () => {
    search('ETUDIANTE'); assert(cards().length>0,'未匹配阴性形式');
    assert(cards().some(c=>c.textContent.includes('étudiant')&&c.textContent.includes('étudiante')&&c.textContent.includes('阳性形式')&&c.textContent.includes('阴性形式')),'双词形未完整展示');
  });
  test('分类筛选、页码重置与空搜索', () => {
    search('');click('learn-next');category('09');
    const ids = new Set(app.context.FRENCH_VOCAB.entries.filter(e=>e.category==='09').map(e=>e.id));
    assert(cards().every(c=>ids.has(c.dataset.entryId)),'分类混入其他词');
    assert(app.nodes['learn-page'].textContent.startsWith('第 1'),'分类未重置页码');
    search('zzzz没有这个词');assert(cards().length===0&&!app.nodes['learn-empty'].hidden,'空结果状态错误');
  });
  test('普通模式切换不修改练习存储，练习模式移除学习答案', () => {
    const before=storage.get(key);click('practice-mode-button');
    assert(app.nodes['learning-panel'].hidden&&!app.nodes['practice-panel'].hidden&&cards().length===0,'答案未隐藏');
    click('learn-mode-button');assert(storage.get(key)===before,'切换修改了练习进度');
  });
  test('练习本分类自动应用当前分类，搜索不缩小练习范围', () => {
    category('09');search('苹果');click('learn-practice');
    const saved=JSON.parse(storage.get(key));
    assert(saved.settings.category==='09'&&saved.round.category==='09','未应用分类');
    assert(saved.round.ids.length===app.context.FRENCH_VOCAB.entries.filter(e=>e.category==='09').length,'错误地按搜索限制出题');
    assert(!app.nodes['practice-panel'].hidden&&cards().length===0,'未进入纯练习界面');
  });
  test('双框草稿、错题、题目位置在模式切换及刷新后保留', () => {
    const C=app.context.FrenchCore,V=app.context.FRENCH_VOCAB;
    const pair=V.entries.find(e=>e.pair), state=C.newState(V.version);
    state.round=C.makeRound([pair],{category:pair.category,order:'ordered'});
    state.draft={entryId:pair.id,text:'masculin draft',femaleText:'féminin draft',gender:''};
    state.wrong[pair.id]={count:2,lastSeen:'2026-10-30',lastInput:'test'};
    storage.set(key,JSON.stringify(state));app=boot();
    click('learn-mode-button');click('practice-mode-button');app=boot();
    assert(app.nodes['answer-input'].value==='masculin draft'&&app.nodes['female-input'].value==='féminin draft','双框草稿丢失');
    assert(app.nodes['wrong-count'].textContent==='1','错题丢失');
    assert(!app.nodes['female-wrap'].hidden,'双框未显示');
    assert(app.nodes['answer-input'].placeholder==='输入阳性形式…','双框占位错误');
  });
  test('双框判分、答题后刷新、错题移除及下一题保持工作', () => {
    const pair=app.context.FRENCH_VOCAB.entries.find(e=>e.pair);
    app.nodes['answer-input'].value=pair.pair.m.fr;app.nodes['female-input'].value=pair.pair.f.fr;
    app.nodes['answer-form'].fire('submit');
    assert(!app.nodes.feedback.hidden&&JSON.parse(storage.get(key)).round.results[0].result.correct,'双框判分失败');
    app=boot();assert(!app.nodes.feedback.hidden&&app.nodes['next-button'].hidden===false,'答题后状态未恢复');
    assert(app.nodes['wrong-count'].textContent==='0','答对未移出错题');
    click('next-button');assert(!app.nodes.summary.hidden,'下一题/总结失败');
  });
  test('单框固定性别题与不会查看答案保留原行为', () => {
    const C=app.context.FrenchCore,V=app.context.FRENCH_VOCAB,e=V.entries.find(e=>C.needsGender(e)),state=C.newState(V.version);
    state.round=C.makeRound([e],{category:e.category,order:'ordered'});storage.set(key,JSON.stringify(state));app=boot();
    assert(app.nodes['female-wrap'].hidden&&!app.nodes['gender-fieldset'].hidden,'单框/性别显示错误');
    assert(app.nodes.feedback.hidden&&app.nodes['correct-answer'].textContent==='','提前显示答案');
    click('skip-button');assert(JSON.parse(storage.get(key)).wrong[e.id],'跳过未计错');
  });
  test('学习状态刷新恢复，页面不存在ID冲突，双框继续共用样式', () => {
    click('learn-mode-button');category('01');search('ami');app=boot();
    assert(!app.nodes['learning-panel'].hidden&&app.nodes['learn-search'].value==='ami'&&app.nodes['learn-category'].value==='01','学习状态未恢复');
    const ids=[...sources.html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert(ids.length===new Set(ids).size,'重复DOM ID');
    assert((sources.html.match(/class="answer-input"/g)||[]).length===2&&!/#(?:answer-input|female-input)\s*\{/.test(sources.css),'双框样式分叉');
    assert(sources.css.includes('.word-grid{grid-template-columns:minmax(0,1fr)'),'缺少窄屏单栏卡片布局');
  });
  test('12个分类的实际卡片节点使用对应词义图标', () => {
    for (const [cat,fr,emoji] of [['01','homme','👨'],['02','sommeil','😴'],['03','clé','🔑'],['04','football','⚽'],
      ['05','matin','🌅'],['06','froid','🥶'],['07','école','🏫'],['08','train','🚆'],['09','pomme','🍎'],
      ['10','pharmacie','💊'],['11','couteau','🔪'],['12','boire','🥤']]) {
      category(cat);search(fr);
      const entry=app.context.FRENCH_VOCAB.entries.find(e=>e.category===cat&&e.fr===fr);
      const rendered=cards().find(c=>c.dataset.entryId===entry.id);
      assert(rendered&&rendered.children[0].children[0].textContent===emoji,'卡片图标不符：'+fr);
      assert(rendered.textContent.includes(entry.zh),'中文释义缺失：'+fr);
    }
  });
  test('全词库图标合法、双词形一致、同形异义不误配', () => {
    const I=app.context.FRENCH_ICONS,V=app.context.FRENCH_VOCAB;
    for (const entry of V.entries) {
      const visual=I.resolve(entry);
      assert(visual.emoji||['big','small','tall','short'].includes(visual.svg),'非法图标：'+entry.id);
      if(entry.pair) {
        const female=I.resolve(entry.pair.f);
        assert(visual.emoji===female.emoji&&visual.svg===female.svg,'阴阳图标不一致：'+entry.id);
      }
    }
    assert(I.resolve({fr:'pomme de terre',category:'09'}).emoji==='🥔','土豆错误匹配苹果');
    assert(I.resolve({fr:'est',category:'06'}).emoji==='➡️','东未匹配方向');
    assert(I.resolve({fr:'est',zh:'是、处于',category:'12'}).emoji!=='➡️','动词误匹配方向');
    for(const [fr,emoji] of [['sommeil','😴'],['peur','😨'],['colère','😡'],['faim','🍽️'],['soif','🥤'],['froid','🥶'],['chaud','🥵'],['pomme','🍎'],['école','🏫']])
      assert(I.resolve({fr}).emoji===emoji,'示例映射错误：'+fr);
  });
  test('相对概念实际卡片使用本地SVG，统一图标区域', () => {
    category('02');search('petit');
    const entry=app.context.FRENCH_VOCAB.entries.find(e=>e.category==='02'&&e.fr==='petit');
    const rendered=cards().find(c=>c.dataset.entryId===entry.id), icon=rendered.children[0].children[0];
    assert(icon.children[0].src==='assets/icons/small.svg','大小图未加载');
    assert(sources.css.includes('flex:0 0 64px;width:64px;height:64px'),'展示区未统一');
  });
  return {passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
};
