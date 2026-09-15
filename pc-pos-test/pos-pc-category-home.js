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

      /* PASS-style card layout, while keeping the existing POS dark colour scheme. */
      .pcCatGrid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;align-content:start;width:100%}
      .pcCatCard{position:relative;min-width:0;min-height:112px;border:1px solid #35506c!important;color:#fff!important;border-radius:7px!important;padding:16px!important;text-align:left!important;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;touch-action:manipulation;box-shadow:0 2px 7px #0004!important;overflow:hidden;background:#10233a!important;transition:.15s}
      .pcCatCard:nth-child(n){background:#10233a!important}
      .pcCatCard:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:#ffd43b;pointer-events:none}
      .pcCatCard:hover{border-color:#58789a!important;box-shadow:0 5px 13px #0005!important;transform:translateY(-1px)}
      .pcCatCard:active{transform:scale(.985)}
      .pcCatName{position:relative;font-size:18px;font-weight:1000;line-height:1.1;text-shadow:none!important;word-break:break-word}
      .pcCatCount{position:relative;font-size:11px;color:#b9c9d9!important;opacity:1;margin-top:10px}
      .pcCatArrow{display:none}
      .pcItemsMode{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;width:100%}
      .pcItemsMode .item{min-width:0!important}

      /* Customers use the same PASS card structure, but retain the POS colours. */
      .pcCustomersModal .box{width:min(1120px,96vw)!important;max-width:1120px!important}
      .pcCustomersModal #cr{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px!important;margin-top:12px;align-items:stretch}
      .pcCustomersModal #cr>p{grid-column:1/-1}
      .pcCustomerCard{appearance:none;margin:0!important;min-width:0;min-height:190px!important;background:#10233a!important;border:1px solid #35506c!important;border-radius:7px!important;padding:16px!important;color:#fff!important;cursor:pointer;box-shadow:0 2px 7px #0004!important;transition:.15s;display:flex!important;flex-direction:column!important;gap:10px!important}
      .pcCustomerCard:hover{border-color:#58789a!important;box-shadow:0 5px 13px #0005!important;transform:translateY(-1px)}
      .pcCustomerCardHead{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
      .pcCustomerIdentity{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
      .pcCustomerAvatar{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#ffd43b;color:#08101d;font-weight:1000;font-size:16px;flex:0 0 48px}
      .pcCustomerName{font-size:17px;font-weight:1000;color:#fff!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pcCustomerType{border-radius:999px;padding:5px 8px;background:#203a5d;color:#dbe9f7;font-size:10px;font-weight:1000;letter-spacing:.04em;white-space:nowrap;border:1px solid #35506c}
      .pcCustomerBadge{align-self:flex-start;background:#203a5d;color:#ffd43b;border:1px solid #35506c;border-radius:999px;padding:4px 7px;font-size:10px;font-weight:1000}
      .pcCustomerMeta{font-size:12px;color:#b9c9d9!important;line-height:1.45;min-height:18px}
      .pcCustomerMetrics{margin-top:2px;border-top:1px solid #2e4966;border-bottom:1px solid #2e4966;display:grid;grid-template-columns:1fr 1fr;gap:0}
      .pcCustomerMetrics span{padding:8px 4px;text-align:center;min-width:0}
      .pcCustomerMetrics span+span{border-left:1px solid #2e4966}
      .pcCustomerMetrics b{display:block;color:#fff!important;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pcCustomerMetrics small{display:block;color:#8fa7bd!important;font-size:9px;text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
      .pcCustomerCard .co{margin-top:auto!important;width:100%;border:0!important;background:transparent!important;color:#ffd43b!important;text-align:left!important;padding:6px 0 0!important;font-weight:1000!important;cursor:pointer}
      .pcCustomerDetailModal .box{width:min(1040px,96vw)!important;max-width:1040px!important}
      .pcCustomerDetailModal .group,.pcCustomerDetailModal .held{border-radius:7px!important}

      @media(max-width:1180px){
        .main{grid-template-columns:minmax(0,1fr) 335px!important}
        .pcCatGrid,.pcItemsMode{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      }
      @media(max-width:900px){
        .main{grid-template-columns:minmax(0,1fr) 300px!important}
        .pcCatGrid,.pcItemsMode{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .pcCustomersModal #cr{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:720px){
        .main{grid-template-columns:minmax(0,1fr) 270px!important}
      }
      @media(max-width:560px){
        .pcCustomersModal #cr{grid-template-columns:1fr}
        .pcCustomerCard{padding:14px!important}
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
    if(typeof S==='undefined'||!Array.isArray(S.cats)||!S.cats.length) return false;
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

  function customerFacts(card,btn,name){
    const raw=card.innerText.replace(btn?.innerText||'','').replace(name,'').trim().replace(/\n+/g,' ');
    const parts=raw.split('·').map(x=>x.trim()).filter(Boolean);
    const phone=parts[0]||'';
    const loyaltyPart=parts.find(x=>/^Loyalty\b/i.test(x))||'';
    const loyalty=loyaltyPart.replace(/^Loyalty\s*/i,'').trim()||'—';
    return {phone,loyalty};
  }

  function styleCustomerModal(modal){
    const title=modal.querySelector('.box h2')?.textContent?.trim()||'';
    if(title==='Customers / Loyalty'){
      modal.classList.add('pcCustomersModal');
      const out=modal.querySelector('#cr');
      if(!out)return;
      out.querySelectorAll(':scope > .held').forEach(card=>{
        if(card.dataset.passStyled==='1')return;
        const name=card.querySelector('b')?.textContent?.trim()||'Customer';
        const btn=card.querySelector('.co');
        const facts=customerFacts(card,btn,name);
        card.dataset.passStyled='1';
        card.classList.add('pcCustomerCard');
        card.innerHTML='';

        const head=document.createElement('div');
        head.className='pcCustomerCardHead';
        head.innerHTML='<div class="pcCustomerIdentity"><div class="pcCustomerAvatar"></div><div class="pcCustomerName"></div></div><span class="pcCustomerType">CUSTOMER</span>';
        head.querySelector('.pcCustomerAvatar').textContent=initials(name);
        head.querySelector('.pcCustomerName').textContent=name;
        card.appendChild(head);

        if(facts.loyalty&&facts.loyalty!=='—'){
          const badge=document.createElement('div');
          badge.className='pcCustomerBadge';
          badge.textContent='LIVE LOYALTY';
          card.appendChild(badge);
        }

        const meta=document.createElement('div');
        meta.className='pcCustomerMeta';
        meta.textContent=facts.phone||'No phone number';
        card.appendChild(meta);

        const metrics=document.createElement('div');
        metrics.className='pcCustomerMetrics';
        metrics.innerHTML='<span><b></b><small>Loyalty code</small></span><span><b></b><small>Contact</small></span>';
        metrics.querySelectorAll('b')[0].textContent=facts.loyalty||'—';
        metrics.querySelectorAll('b')[1].textContent=facts.phone?'Phone':'—';
        card.appendChild(metrics);

        if(btn){
          btn.textContent='Open customer record →';
          card.appendChild(btn);
          card.tabIndex=0;
          card.setAttribute('role','button');
          card.onclick=e=>{if(e.target===btn||btn.contains(e.target))return;btn.click()};
          card.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target===card){e.preventDefault();btn.click()}};
        }
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