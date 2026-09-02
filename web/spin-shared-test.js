(function(){
  'use strict';
  const CONFIG={
    cycleSize:1000,
    ranges:[
      {key:'discount1',min:50,max:249,label:'£2 off any order over £10'},
      {key:'coffeeCake',min:250,max:499,label:'Free coffee + cake'},
      {key:'toastie',min:500,max:699,label:'Free toastie'},
      {key:'discount2',min:700,max:999,label:'£2 off any order over £10'},
      {key:'meal',min:1000,max:1000,label:'Random eligible meal — max £15'}
    ]
  };
  function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min}
  function createCycle(){
    const targets={};
    for(const r of CONFIG.ranges)targets[r.key]=r.key==='meal'?1000:randomInt(r.min,r.max);
    return {spin:0,targets,awarded:{}};
  }
  function prizeFor(cycle,spin){
    for(const r of CONFIG.ranges){if(cycle.targets[r.key]===spin&&!cycle.awarded[r.key])return r}
    return null;
  }
  window.DextersSharedSpinTest={CONFIG,createCycle,prizeFor};
})();
