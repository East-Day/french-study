(function(root) {
  const v=root.FRENCH_VOCAB, c=root.FrenchCore;
  const groups=new Map(), removed=new Set(), aliases={};
  for(const e of v.entries) {
    if(!['person','adjective'].includes(e.genderMode)) continue;
    const key=[e.category,e.sourceRef,e.genderMode].join('|');
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(e);
  }
  for(const group of groups.values()) {
    const m=group.find(e=>e.formGender==='m'||e.gender==='m'||/请写男性/.test(e.formHint));
    const f=group.find(e=>e.formGender==='f'||e.gender==='f'||/请写女性/.test(e.formHint));
    if(!m||!f||m===f) continue;
    const male={...m},female={...f};
    m.pair={m:male,f:female};m.genderMode='pair';m.gender=null;
    m.formHint='请分别填写阳性和阴性形式';
    m.zh=m.zh.replace(/男性|女性/g,'').replace(/男大学生|女大学生/g,'大学生');
    removed.add(f.id);aliases[f.id]=m.id;
  }
  v.entries=v.entries.filter(e=>!removed.has(e.id));v.version+='-paired-v1';
  const grade=c.grade,restore=c.restoreState;
  c.grade=function(e,input,gender,entries,options={}) {
    if(!e.pair)return grade(e,input,gender,entries,options);
    const m=grade(e.pair.m,input,'m',[e.pair.m],options);
    const f=grade(e.pair.f,options.femaleInput||'','f',[e.pair.f],options);
    return {...m,correct:m.correct&&f.correct,spellingCorrect:m.spellingCorrect&&f.spellingCorrect,
      matchedId:e.id,genderRequired:false,genderCorrect:null,pairResults:{m,f},femaleInput:options.femaleInput||''};
  };
  c.restoreState=function(raw,entries,version) {
    try {
      const s=typeof raw==='string'?JSON.parse(raw):raw;
      if(s?.wrong)for(const [old,id] of Object.entries(aliases))if(s.wrong[old]) {
        s.wrong[id]=s.wrong[id]||s.wrong[old];delete s.wrong[old];
      }
      return restore(s,entries,version);
    }catch{return restore(raw,entries,version);}
  };
})(globalThis);
