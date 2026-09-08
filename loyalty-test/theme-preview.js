(() => {
  'use strict';
  const themes=[
    ['standard','Standard'],['pride','Pride'],['burns','Burns'],
    ['standrew','St Andrew'],['halloween','Halloween'],
    ['christmas','Christmas'],['valentine','Valentine']
  ];
  const details={
    standard:{badge:'Standard',icon:'D',title:"Welcome to Dexter's",message:'Rewards, ordering and offers in one place.',particles:['✦','•','✦','•']},
    pride:{badge:'Pride Month',icon:'🏳️‍🌈',title:'Pride at Dexter’s',message:'Celebrating love, equality and our whole community.',particles:['❤️','🧡','💛','💚','💙','💜']},
    burns:{badge:'Burns Night',icon:'✒️',title:'Burns Night',message:'A guid night celebrating Scotland’s National Bard.',particles:['✒️','🏴','✨','📜','✨','🏴']},
    standrew:{badge:"St Andrew's",icon:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',title:'St Andrew’s Day',message:'Celebrating Scotland with Dexter’s.',particles:['✦','🏴󠁧󠁢󠁳󠁣󠁴󠁿','✦','❄️','✦','🏴󠁧󠁢󠁳󠁣󠁴󠁿']},
    halloween:{badge:'Halloween',icon:'🎃',title:'Halloween at Dexter’s',message:'Spooky treats, rewards and frightfully good food.',particles:['🦇','🎃','👻','🕸️','🦇','✨']},
    christmas:{badge:'Christmas',icon:'🎄',title:'Christmas at Dexter’s',message:'Festive food, seasonal rewards and a little Christmas magic.',particles:['❄️','✨','🎁','❄️','⭐','❄️']},
    valentine:{badge:"Valentine's",icon:'💝',title:'Valentine’s at Dexter’s',message:'Made with love—and plenty of good food.',particles:['♥','💕','♥','💗','♥','✨']}
  };
  let chosen=sessionStorage.getItem('dexters.preview.theme')||'halloween';
  function renderScene(theme){
    const d=details[theme]||details.standard,scene=document.getElementById('seasonScene');
    if(!scene)return;
    scene.className='season-scene season-'+theme;
    scene.innerHTML='<div class="season-particles" aria-hidden="true">'+d.particles.map((p,i)=>'<i style="--i:'+i+'">'+p+'</i>').join('')+'</div><div class="season-art" aria-hidden="true">'+d.icon+'</div><div class="season-copy"><small>SEASONAL APP THEME</small><strong>'+d.title+'</strong><span>'+d.message+'</span></div>';
  }
  function apply(theme){
    chosen=themes.some(x=>x[0]===theme)?theme:'standard';
    sessionStorage.setItem('dexters.preview.theme',chosen);
    document.documentElement.dataset.theme=chosen;
    const badge=document.getElementById('themeBadge');if(badge)badge.textContent=details[chosen].badge;
    document.querySelectorAll('.theme-preview-buttons button').forEach(b=>b.classList.toggle('active',b.dataset.theme===chosen));
    renderScene(chosen);
  }
  function build(){
    const bar=document.createElement('div');bar.className='theme-preview-bar';
    bar.innerHTML='<b>TEST THE FULL SEASONAL THEMES</b><div class="theme-preview-buttons">'+themes.map(([id,label])=>'<button type="button" data-theme="'+id+'">'+label+'</button>').join('')+'</div>';
    const scene=document.createElement('section');scene.id='seasonScene';
    const shell=document.getElementById('appShell');shell?.prepend(scene);shell?.prepend(bar);
    bar.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>apply(b.dataset.theme)));
    apply(chosen);
    const observer=new MutationObserver(()=>{if(document.documentElement.dataset.theme!==chosen)document.documentElement.dataset.theme=chosen;});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
