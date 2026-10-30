// Reproducible transformation of source-extracted.json. No network or dependencies.
// Run with Node, or import and call buildVocabulary in an existing JS runtime.
export function buildVocabulary(blocks) {
  const categories = blocks.filter(b => b.type === 'paragraph' && b.index >= 23 && /^(0[1-9]|1[0-2]) [\u4e00-\u9fff]/.test(b.text)).map(b => ({id: b.text.slice(0,2), label: b.text.slice(3)}));
  const entries = [], issues = [], coverage = [];
  let category = '01', subcategory = '', vocabRows = 0;
  const normalize = s => s.trim().replace(/[’‘]/g,"'").normalize('NFC').toLowerCase();
  const cleanZh = s => s.split('；').filter(t => !/[a-zA-Z\u00c0-\u024f]/.test(t) && !/^(常用|单复数|两性|词形|阴阳|无论|通常|中心词|一把可说|课件|复数|作计量|不变形|不省音)/.test(t)).join('；').trim();
  function add(raw, zh, sourcePos, ref, sourceRaw, options = {}) {
    let fr = raw.trim(), article = null, articles = [], gender = null;
    const noun = /^n\.|^专名/.test(sourcePos);
    const adjective = /adj\.|形容词/.test(sourcePos);
    const m = fr.match(/^(le |la |les |un |une |des |l[’'])/);
    const originalArticle = noun && m ? m[0].trim() : null;
    if (noun && m) fr = fr.slice(m[0].length);
    if (noun) gender = /n\.f\.|阴性/.test(sourcePos) ? 'f' : /n\.m\.|阳性/.test(sourcePos) ? 'm' : null;
    const number = /pl\.|复数/.test(sourcePos) ? 'plural' : 'singular';
    if (noun && gender) {
      const vowel = /^[aeiouàâäéèêëîïôöùûüœæ]/i.test(fr);
      const muteH = /^(homme|heure|horaire|hélicoptère)/i.test(fr);
      article = number === 'plural' ? 'les' : originalArticle && /^l[’']$/.test(originalArticle) ? 'l’' : vowel || muteH ? 'l’' : gender === 'f' ? 'la' : 'le';
      articles = [article, number === 'plural' ? 'des' : gender === 'f' ? 'une' : 'un'];
    }
    let pos = noun ? /^专名/.test(sourcePos) ? '专有名词' : /短语/.test(sourcePos) ? '名词短语' : '名词' : adjective ? /序数/.test(sourcePos) ? '序数形容词' : /短语/.test(sourcePos) ? '形容词短语' : '形容词' : /^v\./.test(sourcePos) ? /短语/.test(sourcePos) ? '动词短语' : /代词式/.test(sourcePos) ? '代词式动词' : '动词' : /adv\.|副词/.test(sourcePos) ? /loc|短语/.test(sourcePos) ? '副词短语' : '副词' : /prép\.|介词/.test(sourcePos) ? /短语/.test(sourcePos) ? '介词短语' : '介词' : sourcePos === 'loc.' ? '固定短语' : sourcePos;
    const entry = { id: `${ref.replace(/[^a-zA-Z0-9-]/g,'-')}-${entries.filter(e=>e.sourceRef===ref).length+1}`, category, subcategory, fr, zh: cleanZh(zh), pos, sourcePos, gender, genderMode: noun && gender ? 'fixed' : adjective ? 'adjective' : 'none', number, formHint: number === 'plural' ? '请写复数形式' : adjective ? '阴阳同形' : '', article, articles, originalArticle, accepted: [], note: sourceRaw, sourceRef: ref, sourceRaw, ...options };
    if (!entry.zh) throw new Error('Missing Chinese gloss: '+ref+' '+raw);
    if (/[a-zA-Z\u00c0-\u024f]/.test(entry.zh)) throw new Error('French leaked in gloss: '+ref);
    entries.push(entry);
    return entry;
  }
  const glossOverrides = {
    'T29R12':['儿童','儿童'], 'T66R5':['看电影','看剧集'], 'T66R6':['读书','读小说'],
    'T104R2':['在……里','在……上','在……下'], 'T104R3':['在……前面','在……后面'],
    'T104R6':['离……近','离……远'], 'T104R8':['在……右边','在……左边'],
    'T112R28':['去','乘坐；走某条路'], 'T121R11':['吃','喝','吃或喝；拿取'],
    'T89R32':['下雨','下雪','结冰'], 'T112R39':['第八','第九','第十']
  };
  const formOverrides = {'T66R5':['regarder un film','regarder une série'], 'T66R6':['lire un livre','lire un roman']};
  for (const b of blocks) {
    if (b.type === 'paragraph') {
      if (b.index >= 23 && /^(0[1-9]|1[0-2]) [\u4e00-\u9fff]/.test(b.text)) { category=b.text.slice(0,2); subcategory=''; }
      else if (b.text.length < 22 && !/^[A-Z0-9]|^对应|^主要|^附录|^来源|^已规范/.test(b.text)) subcategory=b.text;
      continue;
    }
    if (b.rows[0].cells[0] === '法语词汇或搭配') {
      for (const r of b.rows.slice(1)) {
        vocabRows++;
        const [raw,sourcePos,meaning]=r.cells, ref=`T${b.index}R${r.row}`, sourceRaw=r.cells.join(' | ');
        let forms=formOverrides[ref] || raw.split(/\s*\/\s*/);
        const person = (b.index===29 && r.row>=12 && r.row<=15) || (b.index===144 && r.row>=2 && r.row<=21);
        const adjective = /adj\.|形容词/.test(sourcePos);
        const genderPair = adjective && forms.length===2 && !/阴阳同形/.test(sourcePos) && !/阴阳同形/.test(meaning);
        const zhParts=meaning.split('；')[0].split('／');
        const zhs=glossOverrides[ref] || (!genderPair && !person && zhParts.length===forms.length && forms.length>1 ? zhParts : forms.map(()=>meaning));
        const created=[];
        for (let i=0;i<forms.length;i++) {
          const separatePos = sourcePos.includes(' / ') ? sourcePos.split(' / ')[i] : sourcePos;
          const opt = {};
          if(person) { opt.genderMode='person'; opt.formHint=i===0?'请写男性称谓':'请写女性称谓'; }
          if(genderPair) { opt.genderMode='adjective'; opt.gender=null; opt.formHint=i===0?'请写阳性单数形式':'请写阴性单数形式'; opt.formGender=i===0?'m':'f'; }
          if(ref==='T78R7') { opt.gender=null; opt.genderMode='none'; opt.article='l’'; opt.articles=['l’','un','une']; opt.formHint='名词；两性均可，无需选择阴阳性'; }
          if(ref==='T101R39') opt.zh='旅游指南';
          const e=add(forms[i],zhs[i]||meaning,separatePos,ref,sourceRaw,opt);
          created.push(e);
        }
        // A slash without a corresponding meaning change denotes alternatives, not a combined answer.
        if(forms.length>1 && !person && !genderPair && new Set(created.map(e=>e.zh)).size===1) {
          for(const e of created) e.accepted=created.filter(x=>x!==e && x.gender===e.gender).map(x=>x.fr);
        }
        coverage.push({sourceRef:ref,kind:'vocabulary-row',entryIds:created.map(e=>e.id)});
      }
    } else if(b.index===32) {
      for(const r of b.rows.slice(1)) {
        const ref=`T32R${r.row}`, sourceRaw=r.cells.join(' | '), m=r.cells[0].match(/^(.+?) ([\u4e00-\u9fff].*)$/);
        if(!m) throw new Error(ref);
        const country=add(m[1],m[2],`专名 ${r.cells[1]}`,ref,sourceRaw);
        const forms=r.cells[2].split(' / '), created=[country];
        for(let i=0;i<forms.length;i++) created.push(add(forms[i],`${m[2]}的；${m[2]}人的`,'adj.',ref,sourceRaw,{formHint:i===0?'国籍形容词；请写阳性单数形式':'国籍形容词；请写阴性单数形式',formGender:i===0?'m':'f'}));
        coverage.push({sourceRef:ref,kind:'country-row',entryIds:created.map(e=>e.id)});
      }
    }
  }
  // Word lists embedded in prose.
  category='05'; subcategory='星期和月份';
  for(const p of blocks.filter(b=>b.index===81||b.index===82)) {
    const list=p.text.split('：')[1].split('。')[0].split('；');
    for(const item of list) {const [fr,zh]=item.split(' '); add(fr,zh,'n.m.',`P${p.index}`,p.text,{formHint:'',note:p.text+' 编辑说明：词性与阳性来自该段总说明。'});}
  }
  category='12'; subcategory='数字复习';
  for(const p of blocks.filter(b=>b.index===190||b.index===191)) {
    for(const item of p.text.replace(/。$/,'').split('；')) {
      const m=item.match(/^(\d+) (.+)$/); if(!m) throw new Error(item);
      add(m[2],`数字 ${m[1]}`,'基数词',`P${p.index}`,p.text,{formHint:'请写完整法文基数词'});
    }
  }
  subcategory='物主限定词';
  const possessives=blocks.find(b=>b.index===179);
  for(const r of possessives.rows.slice(1)) {
    for(let i=1;i<=3;i++) add(r.cells[i],`${r.cells[0]}的`,'物主限定词',`T179R${r.row}`,r.cells.join(' | '),{formHint:i===1?'修饰阳性单数名词':i===2?'修饰阴性单数名词（辅音或嘘音开头）':'修饰复数名词'});
  }
  subcategory='核心动词现在时';
  const conjugations=blocks.find(b=>b.index===186);
  const persons=['第一人称单数（我）','第二人称单数（你）','第三人称单数（他、她或泛指）','第一人称复数（我们）','第二人称复数或敬称（你们或您）','第三人称复数（他们或她们）'];
  for(const r of conjugations.rows.slice(1)) {
    const m=r.cells[0].match(/^(\S+) (.+)$/), ref=`T186R${r.row}`, sourceRaw=r.cells.join(' | ');
    const infinitive=add(m[1],m[2],'v.',ref,sourceRaw,{formHint:'请写动词原形'});
    const created=[infinitive];
    for(const [i,fr] of r.cells[1].split(' · ').entries()) created.push(add(fr,m[2],'动词变位',ref,sourceRaw,{formHint:`现在时；${persons[i]}；只写动词，不写主语`}));
    coverage.push({sourceRef:ref,kind:'verb-conjugation-row',entryIds:created.map(e=>e.id)});
  }
  // Extra lexical items explicitly present in notes and teaching explanations.
  const extras = [
    ['01','P37','le français','法语','n.m.',{}],
    ['01','P37','une Française','法国女性','n.f.',{genderMode:'person',formHint:'请写女性称谓'}],
    ['01','T29R19','parler français','说法语','v.短语',{}],
    ['02','T47R5','bel','美的','adj.',{formHint:'请写阳性单数、置于元音开头名词前的特殊形式',formGender:'m'}],
    ['02','T44R18','avoir faim','感到饥饿','v.短语',{}],
    ['02','T44R19','avoir soif','感到口渴','v.短语',{}],
    ['02','T44R20','avoir sommeil','感到困倦','v.短语',{}],
    ['02','T44R21','avoir peur','感到害怕','v.短语',{}],
    ['02','T44R22','être en colère','生气','v.短语',{}],
    ['03','T55R17','une paire de ciseaux','一把剪刀','n.f.短语',{}],
    ['03','T58R21','des patins','冰鞋','n.m.pl.',{}],
    ['04','T66R23','une BD','漫画','n.f.',{formHint:'请写文档给出的缩写',accepted:[]}],
    ['04','T66R28','les loisirs','休闲活动','n.m.pl.',{}],
    ['04','T66R4','la musique','音乐','n.f.',{}],
    ['04','T66R5','un film','电影','n.m.',{}],
    ['04','T66R5','une série','剧集','n.f.',{}],
    ['04','T66R6','un roman','小说','n.m.',{}],
    ['04','T66R8','un jeu','游戏','n.m.',{}],
    ['04','T66R11','le shopping','购物','n.m.',{}],
    ['04','T66R12','une photo','照片','n.f.',{}],
    ['05','T78R17','les horaires','时刻表','n.m.pl.',{}],
    ['06','T89R24','le froid','寒冷','n.m.',{}],
    ['09','T124R9','une gousse d’ail','一瓣蒜','n.f.短语',{}],
    ['09','T127R17','un coco','椰子','n.m.',{}],
    ['09','T127R26','des fruits secs','干果','n.m.pl.',{}],
    ['09','T133R4','la pâte','面团','n.f.',{}],
    ['09','T133R5','des œufs','鸡蛋','n.m.pl.',{}],
    ['10','T144R23','les courses','食品或日用品采购','n.f.pl.',{}],
    ['11','T156R7','des couteaux','刀','n.m.pl.',{}],
    ['12','P175','où','哪里','疑问副词',{formHint:'询问地点'}],
    ['12','P175','comment','怎样','疑问副词',{formHint:'询问方式'}],
    ['12','P175','combien','多少','疑问副词',{formHint:'询问数量或价格'}],
    ['12','P175','à quelle heure','在几点','疑问短语',{formHint:'询问时间'}],
    ['12','P175','oui','是；是的','应答词',{}],
    ['12','P175','non','不；不是','应答词',{}],
    ['12','P176','ne… plus','不再','否定结构',{formHint:'请写完整否定结构，用省略号表示动词位置',accepted:['ne ... plus','ne...plus','ne … plus']}],
    ['12','P176','ne… jamais','从不','否定结构',{formHint:'请写完整否定结构，用省略号表示动词位置',accepted:['ne ... jamais','ne...jamais','ne … jamais']}],
    ['12','P188','voudrais','想要','动词变位',{formHint:'条件式现在时；第一人称单数（我）；礼貌表达；只写动词，不写主语'}],
    ['08','P114','allez','去','动词变位',{formHint:'命令式；第二人称复数或敬称（你们或您）；不写主语'}],
    ['08','P114','prenez','乘坐；走某条路','动词变位',{formHint:'命令式；第二人称复数或敬称（你们或您）；不写主语'}],
    ['08','P114','tournez','转弯','动词变位',{formHint:'命令式；第二人称复数或敬称（你们或您）；不写主语'}],
    ['08','P114','continuez','继续','动词变位',{formHint:'命令式；第二人称复数或敬称（你们或您）；不写主语'}],
    ['08','P114','traversez','穿过','动词变位',{formHint:'命令式；第二人称复数或敬称（你们或您）；不写主语'}],
  ];
  for(const [cat,ref,fr,zh,pos,opt] of extras) {
    category=cat;
    subcategory='正文与词表备注补充';
    const m=ref.match(/^T(\d+)R(\d+)$/);
    const sourceRaw=m?blocks.find(b=>b.index===Number(m[1])).rows.find(r=>r.row===Number(m[2])).cells.join(' | '):blocks.find(b=>b.index===Number(ref.slice(1))).text;
    add(fr,zh,pos,ref,sourceRaw,{...opt,note:sourceRaw+' 编辑说明：本条从原文备注或说明中单独提取；中文释义按原文对应含义整理。',extractionKind:'note-extra'});
  }
  // Equivalent source words, including alternatives whose grammatical genders differ.
  const synonymGroups = [
    ['question','problème'],['aliment','nourriture'],['magasin','commerce'],
    ['noix de coco','coco'],['éplucher','peler'],['puis','ensuite'],
  ];
  for(const group of synonymGroups) {
    const candidates=entries.filter(e=>group.includes(normalize(e.fr)) && e.pos!=='动词变位');
    for(const e of candidates) e.alternateIds=candidates.filter(x=>x!==e && x.number===e.number && x.genderMode===e.genderMode).map(x=>x.id);
  }
  // Notes that require a teacher's preference rather than an invented grammatical answer.
  issues.push({sourceRef:'T144R10',original:'un traiteur / une traiteuse',detail:'原文将 traiteuse 用作女性餐饮供应者称谓；本词库按原文保留。不同地区或教师可能偏好其他女性职业称谓，建议与老师确认课堂要求；未添加文档外替代词。'});
  issues.push({sourceRef:'T101R39',original:'un guide touristique',detail:'原文同条释义兼有“旅游指南”和“男导游”。当前题目采用“旅游指南”避免指人/指物歧义，完整原释义保留在答案说明。若希望单独练人物用法，可由老师确认后添加。'});
  const mainQuestions=entries.filter(e=>e.extractionKind!=='note-extra').length;
  const uniqueFr=new Set(entries.map(e=>normalize(e.fr))).size;
  const stats={sourceVocabularyRows:vocabRows,sourceCountryRows:15,sourceCoreVerbRows:14,sourceTables:blocks.filter(b=>b.type==='table').length,sourceBlocks:blocks.length,totalEntries:entries.length,uniqueFrenchForms:uniqueFr,mainQuestions,noteExtraQuestions:extras.length,categoryCount:categories.length,unreadableBlocks:0,issueCount:issues.length,byCategory:Object.fromEntries(categories.map(c=>[c.id,entries.filter(e=>e.category===c.id).length]))};
  return {version:'2026-10-29-v1',source:'外教法语课分类复习手册.docx',categories,entries,issues,coverage,stats};
}

