(function(){
  const $=id=>document.getElementById(id);
  function priceNumber(v){
    const s=String(v||'').replace(/,/g,'');
    const m=s.match(/£\s*([0-9]+(?:\.[0-9]{1,2})?)/);
    return m?Number(m[1]):0;
  }
  function money(n){return '£'+Number(n||0).toFixed(2)}
  function ensure(){
    const btn=$('placeBtn');
    if(!btn||$('orderTotalBox'))return;
    const box=document.createElement('div');
    box.id='orderTotalBox';
    box.innerHTML='<div class="order-total-row"><span>Order total</span><strong id="orderTotalValue">£0.00</strong></div><div id="orderTotalNote" class="order-total-note">Add items to see your total before confirming.</div>';
    btn.parentNode.insertBefore(box,btn);
    update();
  }
  function update(){
    ensure();
    const value=$('orderTotalValue'),note=$('orderTotalNote');
    if(!value||typeof categories==='undefined'||typeof cart==='undefined')return;
    let total=0,count=0;
    for(const c of (categories||[]))for(const i of (c.items||[])){
      const k=typeof keyFor==='function'?keyFor(i):String(i.id||i.name);
      const q=Number(cart[k]||0);
      if(q>0&&i.in_stock!==false){total+=priceNumber(i.price)*q;count+=q}
    }
    const nextValue=money(total);
    const nextNote=count?count+' item'+(count===1?'':'s')+' selected. Check the total before placing your order.':'Add items to see your total before confirming.';
    if(value.textContent!==nextValue)value.textContent=nextValue;
    if(note.textContent!==nextNote)note.textContent=nextNote;
  }
  const style=document.createElement('style');
  style.id='dextersCollectionTotalStyle';
  style.textContent='#orderTotalBox{background:#0d1829;border:1px solid #3b5275;border-radius:14px;padding:14px;margin:14px 0 8px}.order-total-row{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:20px;font-weight:900}.order-total-row strong{color:#ffd43b;font-size:24px}.order-total-note{font-size:12px;color:#aab4c3;margin-top:5px}';
  document.head.appendChild(style);
  ensure();
  // Update only when the customer actually changes the basket. Watching the whole DOM
  // caused repeated self-triggered work and contributed to scrolling/jumping on mobile.
  document.addEventListener('click',e=>{if(e.target.closest('[data-add],[data-plus],[data-minus],[data-live-standard],[data-live-custom],[data-live-remove]'))setTimeout(update,0)});
  document.addEventListener('change',e=>{if(e.target.closest('#menu,#orderReviewList'))setTimeout(update,0)});
  setInterval(update,15000);
})();