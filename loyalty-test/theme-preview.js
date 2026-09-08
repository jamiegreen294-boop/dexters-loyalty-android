(() => {
  'use strict';
  const themes=[
    ['standard','Standard'],['pride','Pride'],['burns','Burns'],
    ['standrew','St Andrew'],['halloween','Halloween'],
    ['christmas','Christmas'],['valentine','Valentine']
  ];
  const labels={standard:'Standard',pride:'Pride Month',burns:'Burns Night',standrew:"St Andrew's",halloween:'Halloween',christmas:'Christmas',valentine:"Valentine's"};
  let chosen=sessionStorage.getItem('dexters.preview.theme')||'halloween';
  function apply(theme){
    chosen=themes.some(x=>x[0]===theme)?theme:'standard';
    sessionStorage.setItem('dexters.preview.theme',chosen);
    document.documentElement.dataset.theme=chosen;
    const badge=document.getElementById('themeBadge');if(badge)badge.textContent=labels[chosen];
    document.querySelectorAll('.theme-preview-buttons button').forEach(b=>b.classList.toggle('active',b.dataset.theme===chosen));
  }
  function build(){
    const bar=document.createElement('div');bar.className='theme-preview-bar';
    bar.innerHTML='<b>TEST THE SEASONAL THEMES</b><div class="theme-preview-buttons">'+themes.map(([id,label])=>'<button type="button" data-theme="'+id+'">'+label+'</button>').join('')+'</div>';
    document.getElementById('appShell')?.prepend(bar);
    bar.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>apply(b.dataset.theme)));
    apply(chosen);
    const observer=new MutationObserver(()=>{if(document.documentElement.dataset.theme!==chosen)document.documentElement.dataset.theme=chosen;});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
