(() => {
  'use strict';
  const themes=[
    ['standard','Standard'],['pride','Pride'],['burns','Burns'],
    ['standrew','St Andrew'],['halloween','Halloween'],
    ['christmas','Christmas'],['valentine','Valentine']
  ];
  const details={
    standard:{badge:'Standard',kicker:"DEXTER'S LOYALTY",title:"Good food. Better rewards.",message:'Rewards, ordering and offers in one place.'},
    pride:{badge:'Pride Month',kicker:'PRIDE AT DEXTER’S',title:'Love lives here.',message:'Celebrating love, equality and our whole community.'},
    burns:{badge:'Burns Night',kicker:'A BURNS NIGHT AT DEXTER’S',title:'A guid night.',message:'Celebrating Scotland’s National Bard with good food and warm company.'},
    standrew:{badge:"St Andrew's",kicker:'ST ANDREW’S DAY AT DEXTER’S',title:'Proudly Scottish.',message:'Celebrating Scotland, community and great food.'},
    halloween:{badge:'Halloween',kicker:'HALLOWEEN AT DEXTER’S',title:'Good treats.<br>Dark nights.',message:'Seasonal rewards and frightfully good food.'},
    christmas:{badge:'Christmas',kicker:'CHRISTMAS AT DEXTER’S',title:'A little magic.<br>Every visit.',message:'Festive food, seasonal rewards and Christmas cheer.'},
    valentine:{badge:"Valentine's",kicker:'VALENTINE’S AT DEXTER’S',title:'Made with love.<br>Shared with you.',message:'Good food and rewards worth sharing.'}
  };
  let chosen=sessionStorage.getItem('dexters.preview.theme')||'halloween';
  function renderHero(theme){
    const d=details[theme]||details.standard,hero=document.getElementById('seasonScene');
    if(!hero)return;
    hero.className='season-hero season-'+theme;
    hero.innerHTML='<div class="season-hero-copy"><small>'+d.kicker+'</small><strong>'+d.title+'</strong><span>'+d.message+'</span></div>';
  }
  function apply(theme){
    chosen=themes.some(x=>x[0]===theme)?theme:'standard';
    sessionStorage.setItem('dexters.preview.theme',chosen);
    document.documentElement.dataset.theme=chosen;
    const badge=document.getElementById('themeBadge');if(badge)badge.textContent=details[chosen].badge;
    document.querySelectorAll('.theme-preview-buttons button').forEach(b=>{const active=b.dataset.theme===chosen;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
    renderHero(chosen);
  }
  function build(){
    const bar=document.createElement('div');bar.className='theme-preview-bar';
    bar.innerHTML='<b>TEST THEMES — NOT LIVE</b><div class="theme-preview-buttons">'+themes.map(([id,label])=>'<button type="button" data-theme="'+id+'">'+label+'</button>').join('')+'</div>';
    const scene=document.createElement('section');scene.id='seasonScene';scene.setAttribute('aria-label','Seasonal theme preview');
    const shell=document.getElementById('appShell');shell?.prepend(scene);shell?.prepend(bar);
    bar.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>apply(b.dataset.theme)));
    apply(chosen);
    new MutationObserver(()=>{if(document.documentElement.dataset.theme!==chosen)document.documentElement.dataset.theme=chosen}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();