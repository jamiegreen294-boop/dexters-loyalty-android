(()=>{
  const $=id=>document.getElementById(id);
  let home=true;
  let installed=false;
  const originalRenderItems=window.renderItems;

  function installCss(){
    if(document.getElementById('pcCategoryCss')) return;
    const s=document.createElement('style');
    s.id='pcCategoryCss';
    s.textContent=`
      .main{grid-template-columns:1fr 360px!important}
      .cats{display:none!important}
      .center{padding:12px 14px!important}
      .pcCategoryHeader{display:flex;align-items:center;gap:10px;margin:0 0 12px 0;min-height:48px}
      .pcCategoryHeader h2{margin:0;font-size:22px;flex:1}
      .pcBackBtn,.pcHomeBtn{border:0;border-radius:12px;padding:12px 16px;font-weight:1000;background:#203a5d;color:#fff;min-height:46px;touch-action:manipulation}
      .pcHomeBtn{background:#ffd43b;color:#08101d}
      .pcCatGrid{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(170px,1fr))!important;gap:12px!important;align-content:start}
      .pcCatCard{min-height:118px;border:1px solid #31506f;background:#142641;color:#fff;border-radius:16px;padding:16px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;touch-action:manipulation;box-shadow:0 2px 0 #06101d}
      .pcCatCard:active{transform:scale(.98)}
      .pcCatName{font-size:19px;font-weight:1000;line-height:1.1}
      .pcCatCount{font-size:12px;color:#9eb0c5;margin-top:12px}
      .pcCatArrow{font-size:22px;color:#ffd43b;font-weight:1000}
      .pcItemsMode{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(155px,1fr))!important;gap:10px!important}
      @media(max-width:950px){.main{grid-template-columns:1fr 320px!important}.pcCatGrid{grid-template-columns:repeat(auto-fill,minmax(145px,1fr))!important}}
    `;
    document.head.appendChild(s);
  }

  function ensureHeader(){
    let h=document.getElementById('pcCategoryHeader');
    if(h) return h;
    const center=document.querySelector('.center');
    const search=document.querySelector('.search');
    if(!center||!search) return null;
    h=document.createElement('div');
    h.id='pcCategoryHeader';
    h.className='pcCategoryHeader';
    h.innerHTML='<button id="pcBackBtn" class="pcBackBtn" style="display:none">← Categories</button><h2 id="pcCategoryTitle">Menu categories</h2><button id="pcHomeBtn" class="pcHomeBtn">Categories</button>';
    center.insertBefore(h,search);
    h.querySelector('#pcBackBtn').onclick=()=>showHome();
    h.querySelector('#pcHomeBtn').onclick=()=>showHome();
    return h;
  }

  function showHome(){
    if(!window.S||!Array.isArray(S.cats)||!S.cats.length) return false;
    home=true;
    const search=$('search');
    if(search) search.value='';
    const items=$('items');
    const title=$('pcCategoryTitle');
    const back=$('pcBackBtn');
    if(title) title.textContent='Menu categories';
    if(back) back.style.display='none';
    if(!items) return false;
    items.className='grid pcCatGrid';
    items.innerHTML=S.cats.map(c=>{
      const count=(c.items||[]).filter(i=>i.in_stock!==false).length;
      return '<button class="pcCatCard" data-pc-cat="'+esc(c.name)+'"><div class="pcCatName">'+esc(c.name)+'</div><div><div class="pcCatCount">'+count+' item'+(count===1?'':'s')+'</div><div class="pcCatArrow">→</div></div></button>';
    }).join('');
    items.querySelectorAll('[data-pc-cat]').forEach(b=>b.onclick=()=>openCategory(b.dataset.pcCat));
    return true;
  }

  function openCategory(name){
    home=false;
    S.cat=name;
    const search=$('search');
    if(search) search.value='';
    const title=$('pcCategoryTitle');
    const back=$('pcBackBtn');
    const items=$('items');
    if(title) title.textContent=name;
    if(back) back.style.display='inline-block';
    if(items) items.className='grid pcItemsMode';
    if(typeof originalRenderItems==='function') originalRenderItems();
  }

  function searchChanged(){
    const q=($('search')?.value||'').trim();
    if(!q){
      if(home) showHome();
      else openCategory(S.cat);
      return;
    }
    home=false;
    const title=$('pcCategoryTitle');
    const back=$('pcBackBtn');
    const items=$('items');
    if(title) title.textContent='Search results';
    if(back) back.style.display='inline-block';
    if(items) items.className='grid pcItemsMode';
    if(typeof window.renderCats==='function') try{window.renderCats()}catch{}
    if(typeof originalRenderItems==='function') originalRenderItems();
  }

  function install(){
    if(installed) return;
    installCss();
    const h=ensureHeader();
    const search=$('search');
    if(!h||!search) return;
    installed=true;
    search.oninput=searchChanged;
    window.pcShowCategories=showHome;
    const tryHome=()=>{if(showHome()) return true;return false};
    if(!tryHome()){
      let n=0;
      const t=setInterval(()=>{n++;if(tryHome()||n>40)clearInterval(t)},250);
    }
  }

  window.addEventListener('load',install);
  if(document.readyState==='complete') install();
})();
