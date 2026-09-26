(()=>{
'use strict';
const API='http://127.0.0.1:17654';
const HOLD_KEY='dexters_epos_test_holds_v1';
const $=id=>document.getElementById(id);
const state={mode:'counter',activeCall:null,phoneSession:null,customer:null,cart:[],orders:[],calls:[],connectors:[],lastCallId:null,note:'',discount:{type:'none',value:0,label:''},timedFor:null,deliveryFeePence:0,scannerBuffer:'',scannerLast:0};

const money=p=>'£'+(Number(p||0)/100).toFixed(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(path,opt={}){
  const r=await fetch(API+path,{cache:'no-store',...opt});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||('HTTP '+r.status));
  return d;
}
function post(path,data){return api(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data||{})})}
function toast(msg){let n=$('eposToast');if(!n){n=document.createElement('div');n.id='eposToast';n.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#020617;color:white;border:1px solid #475569;border-radius:10px;padding:12px 16px;z-index:99;font-weight:800';document.body.appendChild(n)}n.textContent=msg;n.style.display='block';clearTimeout(n._t);n._t=setTimeout(()=>n.style.display='none',2800)}

function subtotalPence(){return state.cart.reduce((a,x)=>a+(Number(x.pricePence)||0)*(Number(x.qty)||1),0)}
function discountPence(){
  const sub=subtotalPence();
  if(state.discount.type==='percent')return Math.round(sub*(Number(state.discount.value)||0)/100);
  if(state.discount.type==='fixed')return Math.min(sub,Math.round(Number(state.discount.value)||0));
  return 0;
}
function totalPence(){return Math.max(0,subtotalPence()+Number(state.deliveryFeePence||0)-discountPence())}

function renderTotals(){
  if($('subtotalValue'))$('subtotalValue').textContent=money(subtotalPence());
  if($('deliveryValue'))$('deliveryValue').textContent=money(state.deliveryFeePence);
  if($('discountValue'))$('discountValue').textContent='-'+money(discountPence());
  if($('totalValue'))$('totalValue').textContent=money(totalPence());
}

function renderCart(){
  const host=$('lines');if(!host)return;
  if(!state.cart.length){host.innerHTML='<div style="padding:20px;text-align:center;color:#9fb1c7">Add items to start an order.</div>';renderTotals();return}
  host.innerHTML=state.cart.map((x,i)=>`<div class="line">
    <div class="lrow"><div class="lname">${esc(x.name)}</div><b>${money((x.pricePence||0)*(x.qty||1))}</b></div>
    ${x.mods?.length?`<div class="mods">${x.mods.map(esc).join(' · ')}</div>`:''}
    <div class="qty"><button data-cart-minus="${i}">−</button><b>${x.qty||1}</b><button data-cart-plus="${i}">+</button><button data-cart-note="${i}">NOTE</button><button class="remove" data-cart-remove="${i}">REMOVE</button></div>
  </div>`).join('');
  host.querySelectorAll('[data-cart-minus]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.cartMinus);state.cart[i].qty=Math.max(1,(state.cart[i].qty||1)-1);renderCart()});
  host.querySelectorAll('[data-cart-plus]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.cartPlus);state.cart[i].qty=(state.cart[i].qty||1)+1;renderCart()});
  host.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>{state.cart.splice(Number(b.dataset.cartRemove),1);renderCart()});
  host.querySelectorAll('[data-cart-note]').forEach(b=>b.onclick=()=>editLineNote(Number(b.dataset.cartNote)));
  renderTotals();
}

function addProduct(btn){
  const name=btn.dataset.name||btn.querySelector('strong')?.textContent||'Item';
  const pricePence=Number(btn.dataset.price||0);
  const existing=state.cart.find(x=>x.name===name&&(!x.mods||!x.mods.length));
  if(existing)existing.qty=(existing.qty||1)+1;
  else state.cart.push({name,pricePence,qty:1,mods:[]});
  renderCart();
}
function editLineNote(i){
  const x=state.cart[i];if(!x)return;
  const v=prompt('Item note / modifier',x.mods?.join(', ')||'');
  if(v===null)return;
  x.mods=String(v).trim()?[String(v).trim()]:[];
  renderCart();
}

function setMode(mode){
  state.mode=mode;
  document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
  if(mode==='phone'&&!state.phoneSession)$('fulfilmentModal')?.classList.remove('hide');
}
function renderCaller(){
  const host=$('callerCard');if(!host)return;
  const s=state.phoneSession,c=s?.customer||{};
  if(!s){host.querySelector('.callerName').textContent='No active caller';host.querySelector('small').textContent='Incoming calls will appear here automatically';return}
  host.querySelector('.callerName').textContent=c.name||s.incomingNumber||'Unknown caller';
  host.querySelector('small').textContent=(s.incomingNumber||'Withheld')+(c.loyaltyCode?' · Loyalty '+c.loyaltyCode:'')+(Number(c.creditBalancePence||0)>0?' · Money owed '+money(c.creditBalancePence):'');
}
async function startPhoneCall(call){
  const x=await post('/phone/session',{call});
  state.phoneSession=x.session;state.activeCall=call;setMode('phone');renderCaller();
  $('fulfilmentModal')?.classList.remove('hide');
}
async function chooseFulfilment(mode){
  if(!state.phoneSession)state.phoneSession=(await post('/phone/session',{call:{caller_number:'',customer:{}}})).session;
  const x=await post('/phone/fulfilment',{session:state.phoneSession,mode});
  state.phoneSession=x.session;setMode(mode);
  state.deliveryFeePence=0;
  $('fulfilmentModal')?.classList.add('hide');
  document.querySelectorAll('.callerActions button').forEach(b=>b.classList.toggle('chosen',b.id.toLowerCase().startsWith(mode)));
  const q=$('customerSearch');
  if(q&&mode==='delivery')q.placeholder='Postcode / address / customer / phone';
  else if(q)q.placeholder='Customer / phone / loyalty';
  renderTotals();toast((mode==='delivery'?'Delivery':'Collection')+' phone order ready');
}
async function pollCalls(){
  try{
    const x=await api('/local/calls?limit=20');state.calls=x.calls||[];
    const c=state.calls[0];if(c&&c.id!==state.lastCallId&&['incoming','answered'].includes(String(c.event_type))){
      state.lastCallId=c.id;
      const raw=c.payload||{id:c.id,caller_number:c.phone,customer_name:c.caller_name,caller_type:c.caller_type,event_type:c.event_type,received_at:c.received_at};
      await startPhoneCall(raw);
    }
  }catch{}
}

async function loadOrders(){try{state.orders=(await api('/local/orders?limit=100')).orders||[]}catch{state.orders=[]}}
async function showOrders(){
  await loadOrders();
  const body=state.orders.length?state.orders.map(o=>`<div style="padding:10px;border-bottom:1px solid #294663"><b>${esc(o.id)}</b> · ${esc(o.source)} · ${esc(o.fulfilment||'-')}<br><small>${esc(o.customer_name||'No customer')} · ${money(o.total_pence)} · ${esc(o.status)}</small></div>`).join(''):'<p>No local test orders yet.</p>';
  showSheet('Orders Hub',body);
}
async function showIntegrations(){
  const x=await api('/integrations');state.connectors=x.connectors||[];
  const body=state.connectors.map(c=>`<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px;border-bottom:1px solid #294663"><div><b>${esc(c.name)}</b><br><small>${esc(c.environment)} · ${esc(c.mode)}</small></div><b style="color:${c.enabled?'#22c55e':'#9fb1c7'}">${c.enabled?'ENABLED':'SAFE / OFF'}</b></div>`).join('');
  showSheet('Integrations',body||'<p>No connectors configured.</p>');
}
async function refreshCatalogProducts(){
  try{
    const x=await api('/catalog/products?limit=200');
    const rows=x.products||[];
    const host=$('products');if(!host)return;
    host.querySelectorAll('[data-local-catalog="1"]').forEach(n=>n.remove());
    for(const p of rows){
      const b=document.createElement('button');
      b.className='product';b.dataset.localCatalog='1';b.dataset.name=p.name;b.dataset.price=String(p.price_pence||0);b.dataset.barcode=p.barcode||'';
      b.innerHTML='<strong>'+esc(p.name)+'</strong><span class="price">'+money(p.price_pence)+'</span>';
      b.onclick=()=>addProduct(b);host.appendChild(b);
    }
  }catch{}
}
async function showSupplierCatalogue(title,category,query=''){
  const x=await api('/supplier/products?q='+encodeURIComponent(query)+'&limit=100');
  const rows=(x.products||[]).filter(p=>String(p.category||'')===category);
  const search='<div style="display:flex;gap:8px;margin-bottom:12px"><input id="supplierProductSearch" placeholder="Search products..." value="'+esc(query)+'" style="flex:1;padding:12px;border-radius:9px;border:1px solid #31506f;background:#08182a;color:#fff"><button id="supplierProductSearchBtn">SEARCH</button></div>';
  const body=search+(rows.length?rows.map((p,i)=>'<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px;border-bottom:1px solid #294663"><div><b>'+esc(p.name)+'</b><br><small>'+esc(p.unit_size||'')+' · '+esc(p.pack_size||'')+' · '+esc(p.brand||'')+'<br>Barcode: '+esc(p.barcode||'Not available')+' · SKU: '+esc(p.supplier_sku||'')+'<br>Source: '+esc(p.payload?.source||p.supplier||'')+'</small></div><button data-add-supplier="'+i+'">ADD TO EPOS</button></div>').join(''):'<p>No matching products found.</p>');
  showSheet(title,body);
  $('supplierProductSearchBtn').onclick=()=>showSupplierCatalogue(title,category,$('supplierProductSearch').value.trim());
  $('supplierProductSearch').onkeydown=e=>{if(e.key==='Enter')$('supplierProductSearchBtn').click()};
  document.querySelectorAll('[data-add-supplier]').forEach(b=>b.onclick=async()=>{
    const p=rows[Number(b.dataset.addSupplier)];
    const price=Number(prompt('Selling price for '+p.name+' (£)','1.50'));
    if(!Number.isFinite(price)||price<0)return toast('Invalid price');
    await post('/supplier/add-to-catalog',{productId:p.id,pricePence:Math.round(price*100),category:category==='Soft Drinks'?'Drinks':'Crisps & Snacks'});
    toast(p.name+' added to EPOS');
    await refreshCatalogProducts();
  });
}
async function showSnacksCatalogue(query=''){return showSupplierCatalogue('Snacks Catalogue','Crisps & Snacks',query)}
async function showDrinksCatalogue(query=''){
  const x=await api('/supplier/products?q='+encodeURIComponent(query)+'&limit=100');
  const rows=x.products||[];
  const search='<div style="display:flex;gap:8px;margin-bottom:12px"><input id="supplierDrinkSearch" placeholder="Search Coke, Irn-Bru, Sprite..." value="'+esc(query)+'" style="flex:1;padding:12px;border-radius:9px;border:1px solid #31506f;background:#08182a;color:#fff"><button id="supplierDrinkSearchBtn">SEARCH</button></div>';
  const body=search+(rows.length?rows.map((p,i)=>'<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px;border-bottom:1px solid #294663"><div><b>'+esc(p.name)+'</b><br><small>'+esc(p.unit_size||'')+' · '+esc(p.pack_size||'')+' · '+esc(p.brand||'')+'<br>Barcode: '+esc(p.barcode||'Not available')+' · SKU: '+esc(p.supplier_sku||'')+'<br>Source: '+esc(p.payload?.source||p.supplier||'')+'</small></div><button data-add-supplier="'+i+'">ADD TO EPOS</button></div>').join(''):'<p>No matching drinks found.</p>');
  showSheet('Supplier Drinks Catalogue',body);
  $('supplierDrinkSearchBtn').onclick=()=>showDrinksCatalogue($('supplierDrinkSearch').value.trim());
  $('supplierDrinkSearch').onkeydown=e=>{if(e.key==='Enter')$('supplierDrinkSearchBtn').click()};
  document.querySelectorAll('[data-add-supplier]').forEach(b=>b.onclick=async()=>{
    const p=rows[Number(b.dataset.addSupplier)];
    const price=Number(prompt('Selling price for '+p.name+' (£)','1.50'));
    if(!Number.isFinite(price)||price<0)return toast('Invalid price');
    await post('/supplier/add-to-catalog',{productId:p.id,pricePence:Math.round(price*100),category:'Drinks'});
    toast(p.name+' added to EPOS');
    await refreshCatalogProducts();
  });
}
async function showOperations(){
  const x=await api('/operations'),local=x.local||{};
  const body=`<div class="grid"><div class="card"><h3>Local database</h3><b>${local.orders||0}</b> orders · <b>${local.calls||0}</b> calls · <b>${local.queued||0}</b> queued</div><div class="card"><h3>Dexter AI</h3><b>${x.ai?.enabled?'Enabled':'Safe / disabled'}</b></div></div>`+
   (x.connectors||[]).map(c=>`<div style="padding:9px;border-bottom:1px solid #294663"><b>${esc(c.name)}</b> · ${esc(c.state)} · ${esc(c.environment)}</div>`).join('');
  showSheet('Operations Centre',body);
}
function showSheet(title,html){
  let o=$('eposSheet');if(!o){o=document.createElement('div');o.id='eposSheet';o.className='overlay';o.innerHTML='<div class="modal"><h2 id="eposSheetTitle"></h2><div id="eposSheetBody"></div><button id="eposSheetClose" style="margin-top:12px">CLOSE</button></div>';document.body.appendChild(o);$('eposSheetClose').onclick=()=>o.remove()}
  $('eposSheetTitle').textContent=title;$('eposSheetBody').innerHTML=html;
}
async function searchCustomer(){
  const q=String($('customerSearch')?.value||'').trim();if(!q)return;
  try{
    const x=await api('/local/customers?q='+encodeURIComponent(q)+'&limit=20');
    if(!x.customers?.length){toast('No local test customer match');return}
    const body=x.customers.map((c,i)=>`<button data-customer-i="${i}" style="display:block;width:100%;text-align:left;padding:12px;margin:6px 0;background:#172d49;color:white;border:0;border-radius:10px"><b>${esc(c.name||'Customer')}</b><br><small>${esc(c.phone||'')} ${c.loyalty_code?'· '+esc(c.loyalty_code):''}</small></button>`).join('');
    showSheet('Customer search',body);
    document.querySelectorAll('[data-customer-i]').forEach(b=>b.onclick=()=>{state.customer=x.customers[Number(b.dataset.customerI)];$('customerSearch').value=state.customer.name||state.customer.phone||'';$('eposSheet')?.remove();toast('Customer attached')});
  }catch(e){toast(e.message)}
}

function snapshot(){
  return {mode:state.mode,phoneSession:state.phoneSession,customer:state.customer,cart:JSON.parse(JSON.stringify(state.cart)),note:state.note,discount:{...state.discount},timedFor:state.timedFor,deliveryFeePence:state.deliveryFeePence,heldAt:new Date().toISOString()};
}
function restore(s){
  state.mode=s.mode||'counter';state.phoneSession=s.phoneSession||null;state.customer=s.customer||null;state.cart=s.cart||[];state.note=s.note||'';state.discount=s.discount||{type:'none',value:0,label:''};state.timedFor=s.timedFor||null;state.deliveryFeePence=Number(s.deliveryFeePence||0);
  setMode(state.mode);renderCaller();renderCart();if($('customerSearch'))$('customerSearch').value=state.customer?.name||state.phoneSession?.customer?.name||'';
}
function holdOrder(){
  if(!state.cart.length){toast('Nothing to hold');return}
  const arr=JSON.parse(localStorage.getItem(HOLD_KEY)||'[]');arr.unshift({id:'H-'+Date.now(),...snapshot()});localStorage.setItem(HOLD_KEY,JSON.stringify(arr.slice(0,100)));clearSale();toast('Order held');
}
function recallOrder(){
  const arr=JSON.parse(localStorage.getItem(HOLD_KEY)||'[]');
  if(!arr.length){toast('No held orders');return}
  const body=arr.map((h,i)=>`<button data-hold-i="${i}" style="display:block;width:100%;text-align:left;padding:12px;margin:6px 0;background:#172d49;color:white;border:0;border-radius:10px"><b>${esc(h.id)}</b> · ${esc(h.mode)}<br><small>${h.cart.length} item lines · ${new Date(h.heldAt).toLocaleString()}</small></button>`).join('');
  showSheet('Held orders',body);
  document.querySelectorAll('[data-hold-i]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.holdI),h=arr[i];restore(h);arr.splice(i,1);localStorage.setItem(HOLD_KEY,JSON.stringify(arr));$('eposSheet')?.remove();toast('Held order recalled')});
}
function clearSale(){
  state.cart=[];state.customer=null;state.phoneSession=null;state.activeCall=null;state.note='';state.discount={type:'none',value:0,label:''};state.timedFor=null;state.deliveryFeePence=0;state.mode='counter';
  if($('customerSearch'))$('customerSearch').value='';
  setMode('counter');renderCaller();renderCart();document.querySelectorAll('.callerActions button').forEach(b=>b.classList.remove('chosen'));
}
function editOrderNote(){const v=prompt('Order note',state.note||'');if(v!==null){state.note=String(v);toast(state.note?'Order note saved':'Order note cleared')}}
function editDiscount(){
  const type=prompt('Discount type: enter P for percentage, F for fixed amount, or C to clear','P');if(type===null)return;
  const t=type.trim().toUpperCase();
  if(t==='C'){state.discount={type:'none',value:0,label:''};renderTotals();toast('Discount cleared');return}
  if(t==='P'){const v=Number(prompt('Discount percentage','10'));if(!Number.isFinite(v)||v<0||v>100)return toast('Invalid percentage');state.discount={type:'percent',value:v,label:v+'%'};}
  else if(t==='F'){const v=Number(prompt('Fixed discount amount (£)','1.00'));if(!Number.isFinite(v)||v<0)return toast('Invalid amount');state.discount={type:'fixed',value:Math.round(v*100),label:money(Math.round(v*100))};}
  else return toast('Use P, F or C');
  renderTotals();toast('Discount '+state.discount.label+' applied');
}
function editTimedOrder(){
  const current=state.timedFor?new Date(state.timedFor).toLocaleString('sv-SE').slice(0,16).replace(' ','T'):'';
  const v=prompt('Timed order date/time (YYYY-MM-DDTHH:MM). Leave blank to clear.',current);if(v===null)return;
  if(!v.trim()){state.timedFor=null;toast('Timed order cleared');return}
  const d=new Date(v);if(Number.isNaN(d.getTime()))return toast('Invalid date/time');state.timedFor=d.toISOString();toast('Timed for '+d.toLocaleString());
}
function setDeliveryFee(){
  if((state.phoneSession?.fulfilment||state.mode)!=='delivery')return toast('Choose Delivery first');
  const v=Number(prompt('TEST delivery fee (£)','0.00'));if(!Number.isFinite(v)||v<0)return toast('Invalid fee');
  state.deliveryFeePence=Math.round(v*100);renderTotals();toast('Delivery fee updated');
}

async function completeTestOrder(paymentMethod){
  if(!state.cart.length)throw Error('Add items before payment');
  const id='local-'+Date.now();
  const order={id,source:state.phoneSession?'telephone':'pos',status:'paid_test',fulfilment:state.phoneSession?.fulfilment||state.mode,customerName:state.customer?.name||state.phoneSession?.customer?.name||'',customerPhone:state.customer?.phone||state.phoneSession?.customer?.phone||'',totalPence:totalPence(),subtotalPence:subtotalPence(),deliveryFeePence:state.deliveryFeePence,discountPence:discountPence(),discount:state.discount,note:state.note,timedFor:state.timedFor,paymentMethod,items:state.cart,createdAt:new Date().toISOString()};
  await post('/local/order',{order});
  await post('/local/queue',{connector:'kds',action:'order.upsert',entityId:id,payload:order});
  toast('TEST order saved locally · no live KDS write');
  clearSale();await loadOrders();
}
async function checkAlcoholBeforePayment(){
  const alcohol=state.cart.filter(x=>x.alcohol);
  if(!alcohol.length)return true;
  const x=await post('/alcohol/check',{cart:state.cart,settings:{offSalesStart:'10:00',offSalesEnd:'22:00',mupPencePerUnit:65,challengeAge:25}});
  const gate=x.gate||{};
  if(!gate.ok){toast(gate.message||'Alcohol sale blocked');return false}
  if(gate.requiresAgeCheck){
    const challenged=confirm('Challenge 25: Does the customer appear under 25?');
    if(challenged){
      const checked=confirm('Has acceptable proof of age been checked and confirmed customer is 18 or over?');
      const v=await post('/alcohol/verify-age',{appearsUnderChallengeAge:true,idChecked:checked,confirmedAge:checked?18:0});
      if(!v.result?.ok){toast(v.result?.message||'Alcohol sale refused');return false}
    }else{
      const v=await post('/alcohol/verify-age',{appearsUnderChallengeAge:false});
      if(!v.result?.ok)return false;
    }
  }
  return true;
}
function handleBarcode(code){
  const all=[...document.querySelectorAll('.product')];
  const btn=all.find(b=>(b.dataset.barcode||'')===code);
  if(btn){addProduct(btn);toast('Barcode added: '+(btn.dataset.name||code));return}
  showSheet('Unknown barcode','<p><b>'+esc(code)+'</b> is not assigned to a product in this test catalogue.</p><p>Use product setup to assign this barcode before live use.</p>');
}
function bindBarcodeScanner(){
  document.addEventListener('keydown',e=>{
    const now=Date.now();
    if(now-state.scannerLast>80)state.scannerBuffer='';
    state.scannerLast=now;
    if(e.key==='Enter'){
      const code=state.scannerBuffer;state.scannerBuffer='';
      if(/^\d{6,18}$/.test(code)){e.preventDefault();handleBarcode(code);if($('barcodeStatus'))$('barcodeStatus').textContent='Scanned '+code}
      return;
    }
    if(e.key.length===1&&/\d/.test(e.key)&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))state.scannerBuffer+=e.key;
  });
}
async function payOrder(){
  if(!state.cart.length)return toast('Add items first');
  if(!(await checkAlcoholBeforePayment()))return;
  const body=`<p>Total <b style="font-size:30px;color:#ffd43b">${money(totalPence())}</b></p><p>This is the isolated test EPOS. No real payment will be charged.</p><div class="choice"><button class="collection" id="testCash">CASH TEST</button><button class="delivery" id="testCard">CARD TEST</button></div>`;
  showSheet('Test payment',body);
  $('testCash').onclick=()=>{ $('eposSheet')?.remove();completeTestOrder('cash_test').catch(e=>toast(e.message)) };
  $('testCard').onclick=()=>{ $('eposSheet')?.remove();completeTestOrder('card_test').catch(e=>toast(e.message)) };
}
async function askDexter(message){
  const body=$('aiPanel')?.querySelector('.aiBody');if(!message)return;
  body.insertAdjacentHTML('beforeend','<p><b>You:</b> '+esc(message)+'</p>');
  try{
    const x=await post('/ai/chat',{message,context:{screen:'pos',order:{source:state.phoneSession?'telephone':'pos',customerName:state.customer?.name||state.phoneSession?.customer?.name||'',status:'draft',total:totalPence()},integrationStatus:state.connectors,hardware:null}});
    body.insertAdjacentHTML('beforeend','<p><b>Dexter:</b> '+esc(x.reply||x.message||'')+'</p>');
  }catch(e){body.insertAdjacentHTML('beforeend','<p style="color:#ffd43b"><b>Dexter:</b> '+esc(e.message)+'</p>')}
  body.scrollTop=body.scrollHeight;
}
async function health(){try{const h=await api('/health');$('hubStatus').textContent='Hub online · '+h.version}catch{$('hubStatus').textContent='Hub offline'}}

function bind(){
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  document.querySelectorAll('.product').forEach(b=>b.onclick=()=>addProduct(b));
  $('deliveryBtn').onclick=()=>$('fulfilmentModal').classList.remove('hide');$('collectionBtn').onclick=()=>$('fulfilmentModal').classList.remove('hide');
  $('closeFulfil').onclick=()=>$('fulfilmentModal').classList.add('hide');
  document.querySelectorAll('[data-fulfil]').forEach(b=>b.onclick=()=>chooseFulfilment(b.dataset.fulfil).catch(e=>toast(e.message)));
  $('customerSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')searchCustomer()});
  $('ordersBtn').onclick=showOrders;$('backOfficeBtn').onclick=showOperations;

  const rail=[...document.querySelectorAll('.rail button')];
  rail.forEach(b=>b.onclick=()=>{rail.forEach(x=>x.classList.toggle('on',x===b));const t=b.textContent.trim();if(t==='ORDERS')showOrders();else if(t==='INTEGRATIONS')showIntegrations();else if(t==='PHONE')setMode('phone');else if(t==='DELIVERY')setDeliveryFee();else if(t==='CUSTOMERS')searchCustomer();else if(t==='KDS')showSheet('KDS','<p>Test KDS connector is isolated. Orders can be queued locally, but no live KDS write is enabled.</p>');else if(t==='LOYALTY')showSheet('Loyalty','<p>Test Loyalty connector remains isolated from live customer data.</p>');else if(t==='EMAIL')showSheet('Email','<p>Gmail connector will use OAuth and remains disabled until test credentials are configured.</p>');else if(t==='DRINKS CATALOGUE')showDrinksCatalogue();else if(t==='SNACKS CATALOGUE')showSnacksCatalogue();else if(t==='STOCK')showSheet('Stock','<p>Local stock/86 controls are the next menu-data module. Live menu stock is not being changed.</p>')});

  $('aiBtn').onclick=()=>$('aiPanel').classList.remove('hide');$('closeAi').onclick=()=>$('aiPanel').classList.add('hide');
  const aiInput=$('aiPanel')?.querySelector('.aiComposer input'),aiSend=$('aiPanel')?.querySelector('.aiComposer button');if(aiSend)aiSend.onclick=()=>{const v=aiInput.value.trim();aiInput.value='';askDexter(v)};if(aiInput)aiInput.onkeydown=e=>{if(e.key==='Enter')aiSend.click()};

  const bottom=[...document.querySelectorAll('.bottom button')];
  const action=name=>bottom.find(b=>b.textContent.trim()===name);
  action('HOLD').onclick=holdOrder;action('RECALL').onclick=recallOrder;action('NOTE').onclick=editOrderNote;action('DISCOUNT').onclick=editDiscount;action('TIMED ORDER').onclick=editTimedOrder;action('PAY').onclick=payOrder;
  action('LAST ORDER').onclick=()=>{const p=state.phoneSession?.customer?.previousOrder;if(!p)return toast('No previous order in this test session');showSheet('Last order','<pre>'+esc(JSON.stringify(p,null,2))+'</pre>')};
}
bind();bindBarcodeScanner();renderCart();health();loadOrders();pollCalls();setInterval(health,15000);setInterval(pollCalls,3000);
})();