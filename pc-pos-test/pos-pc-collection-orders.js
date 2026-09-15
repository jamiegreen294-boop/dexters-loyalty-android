(()=>{
const API=U+'/functions/v1/collection-orders-test-api';
const $c=id=>document.getElementById(id), escC=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
let orders=[],reasons=[],busy=false,lastWaiting='';
let collectionOpen=null,toggleBusy=false;
const headers=()=>({apikey:K,Authorization:'Bearer '+(S?.session?.access_token||''),'Content-Type':'application/json'});
async function api(body){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),7000);try{const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify(body),cache:'no-store',signal:ctrl.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Collection order request failed');return d}finally{clearTimeout(timer)}}
function modalC(title,html){if(window.DextersPosModal)return window.DextersPosModal(title,html,true);if(typeof modal==='function')return modal(title,html,true);throw Error('POS dialog is unavailable')}
function waiting(o){return ['pending','amended'].includes(String(o.status))}
function paint(){const b=$c('pcCollectionOrdersBtn');if(!b)return;const n=orders.filter(waiting).length;b.innerHTML='Collection Orders'+(n?' <span class="pcCollectionCount">'+n+'</span>':'');b.classList.toggle('pcCollectionFlash',n>0);b.setAttribute('aria-label',n?n+' collection order'+(n===1?'':'s')+' waiting':'Collection orders');}
function paintToggle(){const b=$c('pcCollectionToggleBtn');if(!b)return;b.textContent=collectionOpen===true?'COLLECTION OPEN':collectionOpen===false?'COLLECTION CLOSED':'COLLECTION…';b.className=collectionOpen===true?'pcCollectionOn':'pcCollectionOff';b.setAttribute('aria-pressed',collectionOpen===true?'true':'false')}
async function refreshToggle(){try{const d=await api({action:'status'});collectionOpen=!!d.enabled;paintToggle()}catch{}}
async function toggleCollection(){if(toggleBusy)return;const next=!collectionOpen;if(!confirm((next?'Open':'Close')+' app collection ordering on the PC TEST system?'))return;toggleBusy=true;const b=$c('pcCollectionToggleBtn');if(b)b.textContent='SAVING…';try{const d=await api({action:'set_enabled',enabled:next});collectionOpen=!!d.enabled;paintToggle()}catch(e){alert(e.message);paintToggle()}finally{toggleBusy=false}}
function lines(o,check=false){return (o.items||[]).map((i,n)=>'<div class="held" style="font-size:16px">'+(check?'<label><input type="checkbox" class="amendLine" value="'+n+'"> ':'')+'<b>'+escC(i.qty||1)+' × '+escC(i.name||i.item_name||'Item')+'</b>'+((i.modifiers||[]).length?'<br><small>'+escC((i.modifiers||[]).join(' · '))+'</small>':'')+(check?'</label>':'')+'</div>').join('')}
async function act(id,action,reason){await api({action,id,reason});await poll(true)}
function openAmend(o,parent){const d=modalC('Ask customer to amend #'+o.order_number,'<p>Select every unavailable line. The order will pause until the customer sends the amended order back.</p>'+lines(o,true)+'<label>Message to customer</label><textarea id="collectionAmendNote" class="field" rows="3">Sorry, one or more items are unavailable today. Please amend your order.</textarea><div class="actions"><button class="confirm" id="collectionSendAmend">REQUEST AMENDMENT</button></div><div id="collectionAmendMsg" class="bad"></div>');d.querySelector('#collectionSendAmend').onclick=async()=>{const btn=d.querySelector('#collectionSendAmend'),selected=[...d.querySelectorAll('.amendLine:checked')].map(x=>Number(x.value));if(!selected.length){d.querySelector('#collectionAmendMsg').textContent='Select at least one unavailable item.';return}btn.disabled=true;try{await api({action:'request_amendment',id:o.id,item_indexes:selected,note:d.querySelector('#collectionAmendNote').value});d.remove();parent?.remove();await poll(true);openInbox()}catch(e){d.querySelector('#collectionAmendMsg').textContent=e.message;btn.disabled=false}}}
function openOrder(o,parent){const canDecide=waiting(o),state=String(o.status).replaceAll('_',' ').toUpperCase();const d=modalC('Collection #'+o.order_number,'<div class="held"><b>'+escC(o.customer_name||'Customer')+'</b> · '+escC(o.customer_phone||'No phone')+'<br>Collection: <b>'+escC(o.collection_time||'ASAP')+'</b><br>Status: <b>'+escC(state)+'</b></div>'+lines(o)+(o.order_notes?'<p><b>Notes:</b> '+escC(o.order_notes)+'</p>':'')+(canDecide?'<div class="actions"><button class="confirm collectionAccept">ACCEPT ORDER</button><button class="cancel collectionAmend">ITEM OOS / AMEND</button></div><label>Reject reason</label><select class="field collectionReason">'+reasons.map(r=>'<option>'+escC(r)+'</option>').join('')+'</select><button class="cancel collectionReject" style="width:100%;padding:12px">REJECT ORDER</button>':'<p>This order is waiting for the customer’s amendment. It cannot be accepted or sent to the kitchen yet.</p>'));const a=d.querySelector('.collectionAccept');if(a)a.onclick=async()=>{a.disabled=true;try{await act(o.id,'accept');d.remove();parent?.remove();openInbox()}catch(e){a.disabled=false;alert(e.message)}};const m=d.querySelector('.collectionAmend');if(m)m.onclick=()=>openAmend(o,d);const r=d.querySelector('.collectionReject');if(r)r.onclick=async()=>{if(!confirm('Reject this test collection order?'))return;r.disabled=true;try{await act(o.id,'reject',d.querySelector('.collectionReason').value);d.remove();parent?.remove();openInbox()}catch(e){r.disabled=false;alert(e.message)}}}
function openInbox(){const d=modalC('Loyalty / App Collection Orders',orders.length?orders.map((o,i)=>'<button class="held collectionOpen" data-i="'+i+'" style="display:block;width:100%;text-align:left;color:inherit;border:1px solid #31506f"><b>#'+escC(o.order_number)+' · '+escC(String(o.status).replaceAll('_',' ').toUpperCase())+'</b><br>'+escC(o.customer_name||'Customer')+' · '+escC(o.collection_time||'ASAP')+'<br><small>'+escC((o.items||[]).map(x=>(x.qty||1)+'× '+(x.name||'Item')).join(' · '))+'</small></button>').join(''):'<p>No active test collection orders.</p>');d.querySelectorAll('.collectionOpen').forEach(b=>b.onclick=()=>openOrder(orders[Number(b.dataset.i)],d))}
async function poll(force=false){if(busy||!S?.session?.access_token)return;busy=true;try{const d=await api({action:'kds_orders'});orders=d.orders||[];reasons=d.rejection_reasons||[];paint();const key=orders.filter(waiting).map(o=>o.id+':'+o.status).join(',');if(key&&key!==lastWaiting){lastWaiting=key;if(force!==true)try{navigator.vibrate?.([180,100,180])}catch{}}if(!key)lastWaiting=''}catch(e){const b=$c('pcCollectionOrdersBtn');if(b)b.title='Collection feed: '+e.message}finally{busy=false}}
function install(){if($c('pcCollectionOrdersBtn'))return;const top=document.querySelector('.top')||document.body,b=document.createElement('button'),t=document.createElement('button');b.id='pcCollectionOrdersBtn';b.textContent='Collection Orders';top.insertBefore(b,$c('staffBtn')||null);b.onclick=openInbox;t.id='pcCollectionToggleBtn';t.textContent='COLLECTION…';top.insertBefore(t,b);t.onclick=toggleCollection;const s=document.createElement('style');s.textContent='.pcCollectionCount{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#dc3345;color:#fff}.pcCollectionOn{background:#15803d!important;color:#fff!important}.pcCollectionOff{background:#991b1b!important;color:#fff!important}.pcCollectionFlash{background:#ffd43b!important;color:#08101d!important;animation:pcCollectionPulse 1s step-end infinite}@keyframes pcCollectionPulse{50%{background:#dc3345;color:#fff;box-shadow:0 0 0 5px #dc334555}}@media(prefers-reduced-motion:reduce){.pcCollectionFlash{animation:none;box-shadow:0 0 0 4px #dc3345}}';document.head.appendChild(s);poll();refreshToggle();setInterval(poll,3000);setInterval(refreshToggle,15000)}
window.DextersCollectionOrders={open:openInbox,poll};window.addEventListener('load',install);if(document.readyState==='complete')install();
})();

(()=>{
const ITEM_IMG={
  'Breakfast':[0,0],'Hot Rolls':[1,0],'Cold Rolls':[2,0],'Toasties':[3,0],'Paninis':[4,0],'Wraps':[5,0],
  'Baked Potatoes':[0,1],'Soups':[1,1],'Hot Meals':[2,1],'Street Subs':[3,1],'Chinese Style':[4,1],'Greek Style':[5,1],
  'Rice Bowls':[0,2],'Smash Burgers':[1,2],'Chicken Burgers':[2,2],'Chicken Tenders':[1,3],'Inferno Chicken Tenders':[1,3],
  'Loaded Fries':[3,2],'Pizzas':[4,2],'Waffles':[5,2],'Chippy Style':[2,3],'Kids Menu':[1,3],'Kids Meals':[1,3],
  'Reaper Box':[5,3],'Beast Box':[5,3],'Dirty Soda Bar':[3,3],'Cakes & Bakes':[4,3],'Milkshakes':[0,3],'Coffee':[0,3],
  'Sauces & Dips':[1,3],'Cans of Juice':[3,3],'Sides':[2,3],'Drinks':[3,3],'Desserts':[4,3],'Meal Deals':[5,3]
};
function categoryForCard(card){
  try{const item=typeof itemById==='function'?itemById(card.dataset.item):null;if(item?.category_name)return item.category_name}catch{}
  try{if(typeof S!=='undefined'&&S?.cat)return S.cat}catch{}
  return '';
}
function decorateFoodCards(){
  const root=document.getElementById('items');if(!root)return;
  root.querySelectorAll('.item[data-item]').forEach(card=>{
    if(card.dataset.pcFoodImage==='1')return;
    const category=categoryForCard(card),p=ITEM_IMG[category]||[4,3],img=document.createElement('div');
    img.className='pcItemImage';img.setAttribute('aria-hidden','true');img.style.setProperty('--px',(p[0]*20)+'%');img.style.setProperty('--py',(p[1]*33.3333)+'%');
    card.insertBefore(img,card.firstChild);card.dataset.pcFoodImage='1';card.classList.add('pcItemCardWithImage');
  });
}
function installFoodCardImages(){
  if(document.getElementById('pcFoodCardImageCss')){decorateFoodCards();return}
  const css=document.createElement('style');css.id='pcFoodCardImageCss';css.textContent=`
    .pcItemsMode .item.pcItemCardWithImage{padding:0!important;overflow:hidden!important;min-height:205px!important;justify-content:flex-start!important}
    .pcItemImage{height:92px;width:100%;flex:0 0 92px;background-image:var(--pc-cat-sprite);background-repeat:no-repeat;background-size:600% 400%;background-position:var(--px) var(--py);background-color:#172b43;border-bottom:1px solid #294663}
    .pcItemCardWithImage>div:not(.pcItemImage){padding:10px 12px 0}
    .pcItemCardWithImage>.price{padding:0 12px 12px!important;margin-top:auto!important}
    .pcItemCardWithImage.sold .pcItemImage{filter:grayscale(1);opacity:.65}
    @media(max-width:560px){.pcItemImage{height:82px;flex-basis:82px}.pcItemsMode .item.pcItemCardWithImage{min-height:190px!important}}
  `;document.head.appendChild(css);
  const root=document.getElementById('items');if(root)new MutationObserver(()=>decorateFoodCards()).observe(root,{childList:true,subtree:true});
  decorateFoodCards();
}
window.addEventListener('load',installFoodCardImages);if(document.readyState!=='loading')installFoodCardImages();
})();
