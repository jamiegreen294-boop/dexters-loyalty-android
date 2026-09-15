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
      .app,.main,.center,.cart{min-width:0}
      .top{overflow-x:auto!important;overflow-y:hidden!important;flex-wrap:nowrap!important;scrollbar-width:thin}
      .top>*{flex:0 0 auto}
      .main{grid-template-columns:minmax(0,1fr) minmax(340px,380px)!important}
      .cats{display:none!important}
      .center{padding:12px 14px!important;overflow:auto!important}
      .cart{width:100%!important;max-width:100%!important}
      .pcCategoryHeader{display:flex;align-items:center;gap:10px;margin:0 0 12px 0;min-height:48px}
      .pcCategoryHeader h2{margin:0;font-size:22px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pcBackBtn,.pcHomeBtn{border:0;border-radius:9px;padding:11px 15px;font-weight:1000;background:#203a5d;color:#fff;min-height:44px;touch-action:manipulation}
      .pcHomeBtn{background:#ffd43b;color:#08101d}
      .pcCatGrid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;align-content:start;width:100%}
      .pcCatCard{position:relative;min-width:0;min-height:96px;border:1px solid rgba(255,255,255,.18);color:#fff;border-radius:9px;padding:12px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation;box-shadow:0 2px 5px #0005;overflow:hidden;background:#28718a}
      .pcCatCard:nth-child(8n+2){background:#c36d12}.pcCatCard:nth-child(8n+3){background:#278448}.pcCatCard:nth-child(8n+4){background:#b54850}
      .pcCatCard:nth-child(8n+5){background:#355fa8}.pcCatCard:nth-child(8n+6){background:#7655a8}.pcCatCard:nth-child(8n+7){background:#3b7f74}.pcCatCard:nth-child(8n+8){background:#9b5b35}
      .pcCatCard:before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(0,0,0,.08));pointer-events:none}
      .pcCatCard:active{transform:scale(.98)}
      .pcCatName{position:relative;font-size:18px;font-weight:1000;line-height:1.08;text-shadow:0 1px 2px #0008;word-break:break-word}
      .pcCatCount{position:relative;font-size:11px;color:#eef7ff;opacity:.82;margin-top:7px}
      .pcCatArrow{display:none}
      .pcItemsMode{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;width:100%}
      .pcItemsMode .item{min-width:0!important}

      .pcCustomersModal .box{width:min(1120px,96vw)!important;max-width:1120px!important}
      .pcCustomersModal #cr{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px;align-items:stretch}
      .pcCustomersModal #cr>p{grid-column:1/-1}
      .pcCustomerCard{margin:0!important;min-width:0;min-height:150px!important;border:1px solid #35506c!important;border-radius:13px!important;background:#10233a!important;padding:14px!important;display:flex!important;flex-direction:column!important;gap:9px!important;box-shadow:0 2px 7px #0004}
      .pcCustomerCardHead{display:flex;align-items:center;gap:10px;min-width:0}
      .pcCustomerAvatar{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#ffd43b;color:#08101d;font-weight:1000;font-size:16px;flex:0 0 44px}
      .pcCustomerName{font-size:17px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pcCustomerMeta{font-size:12px;color:#b9c9d9;line-height:1.45;min-height:38px}
      .pcCustomerCard .co{margin-top:auto!important;width:100%;border:0;border-radius:9px;padding:10px 12px;background:#264968;color:#fff;font-weight:1000}
      .pcCustomerDetailModal .box{width:min(1040px,96vw)!important;max-width:1040px!important}
      .pcCustomerDetailModal .group,.pcCustomerDetailModal .held{border:1px solid #2e4966;background:#0d1d31}

      @media(max-width:1180px){
        .main{grid-template-columns:minmax(0,1fr) 335px!important}
        .pcCatGrid,.pcItemsMode{grid-template-columns:repeat(3,minmax(0,1fr))!important}
        .pcCustomersModal #cr{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:900px){
        .main{grid-template-columns:minmax(0,1fr) 300px!important}
        .pcCatGrid,.pcItemsMode{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
      @media(max-width:720px){
        .main{grid-template-columns:minmax(0,1fr) 270px!important}
        .pcCustomersModal #cr{grid-template-columns:1fr}
      }
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
      return '<button class="pcCatCard" data-pc-cat="'+esc(c.name)+'"><div class="pcCatName">'+esc(c.name)+'</div><div class="pcCatCount">'+count+' item'+(count===1?'':'s')+'</div></button>';
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

  function initials(name){
    return String(name||'C').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'C';
  }

  function styleCustomerModal(modal){
    const title=modal.querySelector('.box h2')?.textContent?.trim()||'';
    if(title==='Customers / Loyalty'){
      modal.classList.add('pcCustomersModal');
      const out=modal.querySelector('#cr');
      if(!out)return;
      out.querySelectorAll(':scope > .held').forEach(card=>{
        if(card.dataset.passStyled==='1')return;
        card.dataset.passStyled='1';
        card.classList.add('pcCustomerCard');
        const name=card.querySelector('b')?.textContent?.trim()||'Customer';
        const btn=card.querySelector('.co');
        const raw=card.innerText.replace(btn?.innerText||'','').replace(name,'').trim();
        card.innerHTML='<div class="pcCustomerCardHead"><div class="pcCustomerAvatar">'+initials(name)+'</div><div class="pcCustomerName"></div></div><div class="pcCustomerMeta"></div>'+(btn?btn.outerHTML:'');
        card.querySelector('.pcCustomerName').textContent=name;
        card.querySelector('.pcCustomerMeta').textContent=raw;
      });
    }else if(title.startsWith('Customer ·')){
      modal.classList.add('pcCustomerDetailModal');
    }
  }

  function installCustomerObserver(){
    const scan=()=>document.querySelectorAll('.modal:not(.hide)').forEach(styleCustomerModal);
    const obs=new MutationObserver(scan);
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
    scan();
  }

  function install(){
    if(installed) return;
    installCss();
    const h=ensureHeader();
    const search=$('search');
    if(!h||!search) return;
    installed=true;
    const baseRender=window.renderItems;
    window.renderItems=function(){
      const q=($('search')?.value||'').trim();
      if(home&&!q&&typeof S!=='undefined'&&Array.isArray(S.cats)&&S.cats.length){showHome();return}
      if(typeof baseRender==='function')return baseRender.apply(this,arguments);
    };
    search.oninput=searchChanged;
    window.pcShowCategories=showHome;
    installCustomerObserver();
    const tryHome=()=>{if(showHome()) return true;return false};
    if(!tryHome()){
      let n=0;
      const t=setInterval(()=>{n++;if(tryHome()||n>120)clearInterval(t)},250);
    }
  }

  window.addEventListener('load',install);
  if(document.readyState!=='loading') install();
})();
