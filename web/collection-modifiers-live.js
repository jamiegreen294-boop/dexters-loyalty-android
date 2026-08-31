(function(){
  const state={lines:[],current:null,removed:new Set()};
  const byId=id=>document.getElementById(id);
  const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ingredients(desc){
    if(!desc)return[];
    let s=String(desc).replace(/;.*$/,'').replace(/\.$/,'').trim();
    if(!s)return[];
    s=s.replace(/\band\b/gi,',').replace(/\s*&\s*/g,',');
    const parts=s.split(',').map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/^(with|served with|topped with|finished with)\s+/i,'').trim());
    const bad=/^(freshly cooked|large freshly cooked|crispy battered fish|two crispy battered fish)$/i;
    return [...new Set(parts.filter(x=>x.length>1&&!bad.test(x)))].slice(0,14);
  }
  function money(v){const m=String(v||'').replace(',','.').match(/£?\s*(\d+(?:\.\d{1,2})?)/);return m?Number(m[1]):0}
  function findItem(k){try{for(const c of categories||[])for(const i of c.items||[])if(String(i.id||i.name)===String(k))return i}catch(e){}return null}
  function ensureUi(){
    if(byId('liveModifierModal'))return;
    const style=document.createElement('style');
    style.id='liveModifierStyle';
    style.textContent='.live-custom-btn{border:0;border-radius:10px;padding:10px 12px;font-weight:900;background:#ffd43b;color:#08101d}.live-mod-modal{position:fixed;inset:0;background:#000b;display:grid;place-items:end center;z-index:80}.live-mod-modal.hide{display:none!important}.live-mod-sheet{width:min(700px,100%);max-height:88vh;overflow:auto;background:#132038;border-radius:22px 22px 0 0;padding:18px;box-sizing:border-box}.live-mod-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.live-mod-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid #ffffff18}.live-mod-toggle{border:0;border-radius:10px;padding:10px 12px;min-width:110px;font-weight:900}.live-mod-toggle.in{background:#166534;color:#dcfce7}.live-mod-toggle.out{background:#991b1b;color:#fee2e2}.live-mod-close{border:0;border-radius:10px;padding:10px 12px;background:#243a5e;color:#fff;font-weight:900}.live-mod-summary{font-size:13px;color:#ffc1cb;margin-top:10px}.live-mod-add{width:100%;border:0;border-radius:12px;padding:14px;background:#ffd43b;color:#08101d;font-weight:900;margin-top:14px}.review-mods{font-size:12px;color:#ffc1cb;margin-top:4px}.review-standard{font-size:12px;color:#aab4c3;margin-top:4px}';
    document.head.appendChild(style);
    const modal=document.createElement('div');
    modal.id='liveModifierModal';modal.className='live-mod-modal hide';
    modal.innerHTML='<div class="live-mod-sheet"><div class="live-mod-top"><div><h2 id="liveModName" style="margin:0"></h2><div id="liveModPrice" class="item-price"></div></div><button type="button" id="liveModClose" class="live-mod-close">Close</button></div><p id="liveModDesc" class="item-desc"></p><h3>Included ingredients</h3><div id="liveModList"></div><div id="liveModSummary" class="live-mod-summary">No changes</div><button type="button" id="liveModAdd" class="live-mod-add">Add customised item</button></div>';
    document.body.appendChild(modal);
    byId('liveModClose').onclick=()=>modal.classList.add('hide');
    modal.onclick=e=>{if(e.target===modal)modal.classList.add('hide')};
    byId('liveModAdd').onclick=()=>{
      if(!state.current)return;
      const list=ingredients(state.current.description),removed=[...state.removed].map(i=>list[i]).filter(Boolean);
      state.lines.push({id:state.current.id,name:state.current.name,price:state.current.price||'',qty:1,removed});
      modal.classList.add('hide');
      cart={};renderMenu();renderReview();
    };
  }
  function openCustom(k){
    ensureUi();state.current=findItem(k);if(!state.current)return;state.removed=new Set();
    byId('liveModName').textContent=state.current.name;byId('liveModPrice').textContent=state.current.price||'';byId('liveModDesc').textContent=state.current.description||'';
    byId('liveModifierModal').classList.remove('hide');drawMods();
  }
  function drawMods(){
    const list=ingredients(state.current?.description),root=byId('liveModList');if(!root)return;
    root.innerHTML=list.map((x,idx)=>'<div class="live-mod-row"><span><b>'+esc2(x)+'</b></span><button type="button" class="live-mod-toggle '+(state.removed.has(idx)?'out':'in')+'" data-live-mod="'+idx+'">'+(state.removed.has(idx)?'REMOVED':'INCLUDED')+'</button></div>').join('');
    root.querySelectorAll('[data-live-mod]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.liveMod);state.removed.has(n)?state.removed.delete(n):state.removed.add(n);drawMods()});
    const gone=[...state.removed].map(i=>list[i]);byId('liveModSummary').textContent=gone.length?'Changes: '+gone.map(x=>'NO '+x.toUpperCase()).join(' · '):'No changes';
  }
  const oldRender=renderMenu;
  renderMenu=function(){
    const q=(byId('search')?.value||'').toLowerCase().trim();let html='';
    for(const c of categories||[]){
      const items=(c.items||[]).filter(i=>!q||(`${c.name} ${i.name} ${i.description||''}`).toLowerCase().includes(q));if(!items.length)continue;
      html+=`<div class="menu-cat ${q?'open':''}"><button class="menu-head" type="button"><span>${esc(c.name)} <small class="tiny">(${items.length})</small></span><span>▾</span></button><div class="menu-body">${items.map(i=>{const mods=ingredients(i.description);const count=state.lines.filter(x=>String(x.id)===String(i.id)).length;let control;if(i.in_stock===false)control='<span class="sold">OUT OF STOCK</span>';else if(mods.length)control=`<button class="live-custom-btn" data-live-custom="${esc(i.id||i.name)}">${count?'CUSTOMISE +':'CUSTOMISE'}</button>`;else control=`<button class="qbtn" data-live-standard="${esc(i.id||i.name)}">${count?'ADD +':'ADD'}</button>`;return `<div class="item ${i.in_stock===false?'out':''}"><div class="item-main"><div class="item-name">${esc(i.name)}</div>${i.description?`<div class="item-desc">${esc(i.description)}</div>`:''}<div class="item-price">${esc(i.price||'')}</div>${count?`<div class="tiny">${count} in your order</div>`:''}</div>${control}</div>`}).join('')}</div></div>`;
    }
    byId('menu').innerHTML=html||'<div class="menu-empty">No menu items match your search.</div>';
    byId('menu').querySelectorAll('.menu-head').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('open'));
    byId('menu').querySelectorAll('[data-live-custom]').forEach(b=>b.onclick=()=>openCustom(b.dataset.liveCustom));
    byId('menu').querySelectorAll('[data-live-standard]').forEach(b=>b.onclick=()=>{const i=findItem(b.dataset.liveStandard);if(i)state.lines.push({id:i.id,name:i.name,price:i.price||'',qty:1,removed:[]});renderMenu();renderReview()});
  };
  function renderReview(){
    const root=byId('orderReviewList'),tot=byId('orderReviewTotal'),cnt=byId('orderReviewCount'),value=byId('orderTotalValue'),note=byId('orderTotalNote');if(!root)return;
    let sum=0;state.lines.forEach(x=>sum+=money(x.price)*Number(x.qty||1));
    root.innerHTML=state.lines.length?state.lines.map((x,idx)=>'<div class="review-row"><div><div class="review-name">'+esc2(x.name)+'</div><div class="review-meta">Qty 1 × '+esc2(x.price||'')+'</div>'+(x.removed.length?'<div class="review-mods">'+x.removed.map(v=>'NO '+esc2(v.toUpperCase())).join(' · ')+'</div>':'<div class="review-standard">Standard build</div>')+'</div><div class="review-right"><div class="review-line-total">£'+money(x.price).toFixed(2)+'</div><button type="button" class="review-remove" data-live-remove="'+idx+'">Remove</button></div></div>').join(''):'<div class="review-empty">Your order is empty. Add items from the menu above.</div>';
    root.querySelectorAll('[data-live-remove]').forEach(b=>b.onclick=()=>{state.lines.splice(Number(b.dataset.liveRemove),1);renderMenu();renderReview()});
    if(tot)tot.textContent='£'+sum.toFixed(2);if(cnt)cnt.textContent=state.lines.length+' item'+(state.lines.length===1?'':'s');if(value)value.textContent='£'+sum.toFixed(2);if(note)note.textContent=state.lines.length?state.lines.length+' item'+(state.lines.length===1?'':'s')+' selected. Check the total before placing your order.':'Add items to see your total before confirming.';
  }
  window.renderOrderReview=renderReview;
  async function placeModified(){
    const name=byId('customerName').value.trim(),phone=byId('customerPhone').value.trim();if(!name){byId('msg').innerHTML='<div class="status bad">Please enter your full name.</div>';return}if(phone.replace(/\D/g,'').length<7){byId('msg').innerHTML='<div class="status bad">Please enter a valid phone number.</div>';return}if(!state.lines.length){byId('msg').innerHTML='<div class="status bad">Please add at least one available item.</div>';return}
    const items=state.lines.map(x=>({id:x.id,name:x.name,qty:1,removed:x.removed}));
    try{const d=await api({action:'create',items,collection_time:byId('collectionTime').value,order_notes:byId('notes').value,customer_name:name,customer_phone:phone});byId('msg').innerHTML='<div class="status ok">Order #'+d.order.order_number+' sent to the kitchen. Waiting for the restaurant to accept or reject it.</div>';state.lines=[];cart={};renderMenu();renderReview();loadOrders()}catch(e){byId('msg').innerHTML='<div class="status bad">'+esc2(e.message)+'</div>';loadMenu()}
  }
  function init(){ensureUi();cart={};if(byId('search'))byId('search').oninput=renderMenu;if(byId('placeBtn')){byId('placeBtn').onclick=placeModified;byId('placeBtn').textContent='Confirm & Place Order'}renderMenu();renderReview()}
  setTimeout(init,0);setTimeout(init,500);
})();
