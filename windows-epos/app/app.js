(()=>{
'use strict';
const API='http://127.0.0.1:17654';
const HOLD_KEY='dexters_epos_test_holds_v1';
const $=id=>document.getElementById(id);
const state={mode:'counter',activeCall:null,phoneSession:null,customer:null,cart:[],orders:[],calls:[],connectors:[],lastCallId:null,note:'',discount:{type:'none',value:0,label:''},timedFor:null,deliveryFeePence:0,scannerBuffer:'',scannerLast:0,staffSession:sessionStorage.getItem('dexters_staff_session')||'',staff:null};

const money=p=>'£'+(Number(p||0)/100).toFixed(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(path,opt={}){
  const headers={...(opt.headers||{})};
  if(state.staffSession)headers['x-staff-session']=state.staffSession;
  const r=await fetch(API+path,{cache:'no-store',...opt,headers});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||('HTTP '+r.status));
  return d;
}
function post(path,data){return api(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data||{})})}
async function ensureStaffLogin(){
  if(state.staffSession){
    try{const me=await api('/staff/me');state.staff=me.staff;return true}catch{state.staffSession='';sessionStorage.removeItem('dexters_staff_session')}
  }
  const st=await api('/staff/bootstrap-status').catch(()=>({required:false}));
  return new Promise(resolve=>{
    const o=document.createElement('div');o.className='overlay';o.style.display='flex';o.innerHTML='<div class="modal" style="max-width:480px"><h2>'+(st.required?'Create first manager':'Staff sign in')+'</h2><p>'+(st.required?'This only creates the first manager for this test installation.':'Enter your staff ID and PIN.')+'</p><input id="loginStaffId" placeholder="Staff ID" value="'+(st.required?'manager':'')+'" style="width:100%;padding:12px;margin:6px 0"><input id="loginName" placeholder="Display name" value="'+(st.required?'Manager':'')+'" style="width:100%;padding:12px;margin:6px 0;display:'+(st.required?'block':'none')+'"><input id="loginPin" type="password" inputmode="numeric" placeholder="PIN" style="width:100%;padding:12px;margin:6px 0"><button id="loginGo" style="width:100%;margin-top:10px">'+(st.required?'CREATE MANAGER':'SIGN IN')+'</button><p id="loginError" style="color:#ffd43b"></p></div>';
    document.body.appendChild(o);
    const go=async()=>{
      const staffId=$('loginStaffId').value.trim(),pin=$('loginPin').value.trim();
      try{
        if(st.required){
          await post('/staff/bootstrap',{staffId,displayName:$('loginName').value.trim()||'Manager',pin});
        }
        const x=await post('/staff/login',{staffId,pin});
        state.staffSession=x.session;state.staff=x.staff;sessionStorage.setItem('dexters_staff_session',x.session);o.remove();resolve(true);
      }catch(e){$('loginError').textContent=e.message}
    };
    $('loginGo').onclick=go;$('loginPin').onkeydown=e=>{if(e.key==='Enter')go()};
  });
}
function staffCan(permission){return Array.isArray(state.staff?.permissions)&&state.staff.permissions.includes(permission)}
async function requireUiPermission(permission){
  if(staffCan(permission))return true;
  toast('Manager permission required: '+permission);return false;
}
function toast(msg){let n=$('eposToast');if(!n){n=document.createElement('div');n.id='eposToast';n.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#020617;color:white;border:1px solid #475569;border-radius:10px;padding:12px 16px;z-index:99;font-weight:800';document.body.appendChild(n)}n.textContent=msg;n.style.display='block';clearTimeout(n._t);n._t=setTimeout(()=>n.style.display='none',2800)}

function subtotalPence(){return state.cart.reduce((a,x)=>a+(Number(x.pricePence)||0)*(Number(x.qty)||1),0)}
function discountPence(){
  const sub=subtotalPence();
  if(state.discount.type==='percent')return Math.round(sub*(Number(state.discount.value)||0)/100);
  if(state.discount.type==='fixed')return Math.min(sub,Math.round(Number(state.discount.value)||0));
  return 0;
}
function totalPence(){return Math.max(0,subtotalPence()+Number(state.deliveryFeePence||0)-discountPence())}

function syncCustomerDisplay(){
  post('/customer-display/state',{
    cart:state.cart,
    subtotalPence:subtotalPence(),
    discountPence:discountPence(),
    deliveryFeePence:Number(state.deliveryFeePence||0),
    totalPence:totalPence(),
    customer:state.customer?{name:state.customer.name||'',loyaltyCode:state.customer.loyalty_code||state.customer.loyaltyCode||''}:null
  }).catch(()=>{});
}
function renderTotals(){
  if($('subtotalValue'))$('subtotalValue').textContent=money(subtotalPence());
  if($('deliveryValue'))$('deliveryValue').textContent=money(state.deliveryFeePence);
  if($('discountValue'))$('discountValue').textContent='-'+money(discountPence());
  if($('totalValue'))$('totalValue').textContent=money(totalPence());
  syncCustomerDisplay();
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
  if(!(await requireUiPermission('price_change')))return;
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
  if(!(await requireUiPermission('price_change')))return;
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
async function showProductCatalogue(query=''){
  if(!(await requireUiPermission('price_change')))return;
  const x=await api('/supplier/products?q='+encodeURIComponent(query)+'&limit=200');
  const rows=x.products||[];
  const search='<div style="display:flex;gap:8px;margin-bottom:12px"><input id="allProductSearch" placeholder="Search Coke, Walkers, Guinness, barcode or SKU..." value="'+esc(query)+'" style="flex:1;padding:12px;border-radius:9px;border:1px solid #31506f;background:#08182a;color:#fff"><button id="allProductSearchBtn">SEARCH</button></div>';
  const filters='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><button data-cat="">ALL</button><button data-cat="Soft Drinks">DRINKS</button><button data-cat="Crisps & Snacks">SNACKS</button><button data-cat="Alcohol">ALCOHOL</button></div>';
  const list=rows.length?rows.map((p,i)=>'<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px;border-bottom:1px solid #294663"><div><b>'+esc(p.name)+'</b><br><small>'+esc(p.category||'')+' · '+esc(p.unit_size||'')+' · '+esc(p.pack_size||'')+'<br>Barcode: '+esc(p.barcode||'Not available')+' · SKU: '+esc(p.supplier_sku||'')+'<br>Source: '+esc(p.payload?.source||p.supplier||'')+(p.payload?.alcohol?' · '+esc(p.payload?.abv)+'% ABV':'')+'</small></div><button data-add-all="'+i+'">ADD TO EPOS</button></div>').join(''):'<p>No matching products found.</p>';
  showSheet('Product Catalogue',search+filters+list);
  $('allProductSearchBtn').onclick=()=>showProductCatalogue($('allProductSearch').value.trim());
  $('allProductSearch').onkeydown=e=>{if(e.key==='Enter')$('allProductSearchBtn').click()};
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{
    const c=b.dataset.cat;
    if(!c)return showProductCatalogue($('allProductSearch').value.trim());
    const q=$('allProductSearch').value.trim();
    showProductCatalogue((q?q+' ':'')+c);
  });
  document.querySelectorAll('[data-add-all]').forEach(b=>b.onclick=async()=>{
    const p=rows[Number(b.dataset.addAll)];
    const suggested=p.payload?.alcohol?'2.50':'1.50';
    const price=Number(prompt('Selling price for '+p.name+' (£)',suggested));
    if(!Number.isFinite(price)||price<0)return toast('Invalid price');
    try{
      await post('/supplier/add-to-catalog',{productId:p.id,pricePence:Math.round(price*100),category:p.payload?.alcohol?'Off Sales':(p.category==='Soft Drinks'?'Drinks':p.category||'Products')});
      toast(p.name+' added to EPOS');
      await refreshCatalogProducts();
    }catch(e){
      if(/minimum|pricing/i.test(e.message))toast('Price too low for this alcohol product');
      else toast(e.message);
    }
  });
}
async function showAlcoholCatalogue(query=''){
  if(!(await requireUiPermission('price_change')))return;
  const x=await api('/supplier/products?q='+encodeURIComponent(query)+'&limit=100');
  const rows=(x.products||[]).filter(p=>p.payload?.alcohol===true||String(p.category||'').startsWith('Alcohol'));
  const search='<div style="display:flex;gap:8px;margin-bottom:12px"><input id="alcoholSearch" placeholder="Search Tennent\'s, Stella, Guinness, gin..." value="'+esc(query)+'" style="flex:1;padding:12px;border-radius:9px;border:1px solid #31506f;background:#08182a;color:#fff"><button id="alcoholSearchBtn">SEARCH</button></div>';
  const list=rows.length?rows.map((p,i)=>'<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px;border-bottom:1px solid #294663"><div><b>'+esc(p.name)+'</b><br><small>'+esc(p.unit_size||'')+' · '+esc(p.pack_size||'')+' · '+esc(p.payload?.abv||'')+'% ABV<br>Barcode: '+esc(p.barcode||'Not available')+' · SKU: '+esc(p.supplier_sku||'')+'</small></div><button data-add-alcohol="'+i+'">ADD TO EPOS</button></div>').join(''):'<p>No matching alcohol products found.</p>';
  showSheet('Alcohol Catalogue',search+list);
  $('alcoholSearchBtn').onclick=()=>showAlcoholCatalogue($('alcoholSearch').value.trim());
  $('alcoholSearch').onkeydown=e=>{if(e.key==='Enter')$('alcoholSearchBtn').click()};
  document.querySelectorAll('[data-add-alcohol]').forEach(b=>b.onclick=async()=>{
    const p=rows[Number(b.dataset.addAlcohol)];
    const abv=Number(p.payload?.abv||0),ml=Number(p.payload?.volumeMl||0),min=Math.ceil((abv*ml/1000)*65);
    const price=Number(prompt('Selling price for '+p.name+' (£). Minimum legal test floor shown below: '+money(min),'3.00'));
    if(!Number.isFinite(price)||price<0)return toast('Invalid price');
    try{
      await post('/supplier/add-to-catalog',{productId:p.id,pricePence:Math.round(price*100),category:'Off Sales'});
      toast(p.name+' added to OFF SALES');
      await refreshCatalogProducts();
    }catch(e){toast(e.message)}
  });
}
async function showKDS(){
  if(!(await requireUiPermission('kds_update')))return;
  const x=await api('/kds/orders?limit=100'),rows=x.orders||[];
  const body=rows.length?rows.map((o,i)=>'<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px;border-bottom:1px solid #294663"><div><b>'+esc(o.id)+'</b> · '+esc(o.source)+' · '+esc(o.fulfilment||'')+'<br><small>'+esc(o.customer_name||'No customer')+' · '+money(o.total_pence)+' · '+esc(o.status)+'</small></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button data-kds-accept="'+i+'">ACCEPT</button><button data-kds-cook="'+i+'">COOKING</button><button data-kds-ready="'+i+'">READY</button><button data-kds-done="'+i+'">DONE</button></div></div>').join(''):'<p>No active local KDS orders.</p>';
  showSheet('KDS · Test Local Orders',body);
  const set=async(i,status)=>{await post('/orders/status',{orderId:rows[i].id,status});toast('Order '+status);showKDS()};
  document.querySelectorAll('[data-kds-accept]').forEach(b=>b.onclick=()=>set(Number(b.dataset.kdsAccept),'accepted'));
  document.querySelectorAll('[data-kds-cook]').forEach(b=>b.onclick=()=>set(Number(b.dataset.kdsCook),'cooking'));
  document.querySelectorAll('[data-kds-ready]').forEach(b=>b.onclick=()=>set(Number(b.dataset.kdsReady),'ready'));
  document.querySelectorAll('[data-kds-done]').forEach(b=>b.onclick=()=>set(Number(b.dataset.kdsDone),'completed'));
}
async function showDeliveryJobs(){
  if(!(await requireUiPermission('sale')))return;
  const x=await api('/delivery/jobs?limit=100'),rows=x.jobs||[];
  const body='<button id="newDeliveryJobBtn">NEW TEST DELIVERY JOB</button><div style="margin-top:12px">'+(rows.length?rows.map((j,i)=>'<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px;border-bottom:1px solid #294663"><div><b>'+esc(j.order_id)+'</b> · '+esc(j.status)+'<br><small>Driver: '+esc(j.driver||'Unassigned')+' · '+esc(j.notes||'')+'</small></div><div><button data-driver-i="'+i+'">ASSIGN DRIVER</button><button data-delivery-done="'+i+'">COMPLETE</button></div></div>').join(''):'<p>No delivery jobs yet.</p>')+'</div>';
  showSheet('Delivery & Drivers',body);const d=document.createElement('button');d.id='deliveryLookupBtn';d.textContent='POSTCODE / ADDRESS LOOKUP';d.style.marginTop='10px';$('eposSheetBody').prepend(d);d.onclick=showDeliveryLookup;
  $('newDeliveryJobBtn').onclick=async()=>{const orderId=prompt('Order ID','');if(!orderId)return;const notes=prompt('Delivery notes','')||'';await post('/delivery/jobs',{job:{orderId,status:'waiting',notes,address:{}}});toast('Delivery job created');showDeliveryJobs()};
  document.querySelectorAll('[data-driver-i]').forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.driverI),driver=prompt('Driver name',rows[i].driver||'');if(!driver)return;await post('/delivery/jobs',{job:{...rows[i],orderId:rows[i].order_id,driver,status:'assigned',assignedAt:new Date().toISOString(),address:rows[i].address||{}}});toast('Driver assigned');showDeliveryJobs()});
  document.querySelectorAll('[data-delivery-done]').forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.deliveryDone);await post('/delivery/jobs',{job:{...rows[i],orderId:rows[i].order_id,status:'completed',completedAt:new Date().toISOString(),address:rows[i].address||{}}});toast('Delivery completed');showDeliveryJobs()});
}
async function showOrderAdjustment(){
  if(!(await requireUiPermission('void')))return;
  await loadOrders();if(!state.orders.length)return toast('No local test orders');
  const body=state.orders.map((o,i)=>'<button data-adjust-order="'+i+'" style="display:block;width:100%;text-align:left;padding:12px;margin:6px 0;background:#172d49;color:white;border:0;border-radius:10px"><b>'+esc(o.id)+'</b> · '+esc(o.status)+'<br><small>'+esc(o.customer_name||'No customer')+' · '+money(o.total_pence)+'</small></button>').join('');
  showSheet('Refund / Void · Manager Test',body);
  document.querySelectorAll('[data-adjust-order]').forEach(b=>b.onclick=async()=>{
    const o=state.orders[Number(b.dataset.adjustOrder)];
    const type=(prompt('Type: VOID / REFUND / PARTIAL_REFUND','VOID')||'').trim().toLowerCase();
    if(!['void','refund','partial_refund'].includes(type))return toast('Invalid adjustment type');
    const reason=prompt('Reason','')||'';
    let amount=type==='partial_refund'?Number(prompt('Refund amount (£)','0')):Number(o.total_pence||0)/100;
    if(!Number.isFinite(amount)||amount<0)return toast('Invalid amount');
    await post('/orders/adjust',{adjustment:{orderId:o.id,type,amountPence:Math.round(amount*100),reason,staffId:'test-manager'}});
    toast(type.replace('_',' ')+' saved in local audit');
    $('eposSheet')?.remove();
  });
}
async function showCustomer360(){
  const key=state.customer?.id||state.customer?.phone||state.phoneSession?.customer?.id||state.phoneSession?.customer?.phone||String($('customerSearch')?.value||'').trim();
  if(!key)return toast('Attach or search a customer first');
  const x=await api('/customer/360?q='+encodeURIComponent(key));
  const p=x.profile;if(!p)return toast('No local customer profile found');
  const c=p.customer||{};
  const body='<div class="card"><h3>'+esc(c.name||'Customer')+'</h3><p>'+esc(c.phone||'')+(c.loyalty_code?' · Loyalty '+esc(c.loyalty_code):'')+'</p><p><b>'+p.totals.orderCount+'</b> orders · <b>'+money(p.totals.lifetimeSpendPence)+'</b> local test spend</p></div>'+
    '<h3>Recent orders</h3>'+(p.orders.length?p.orders.map(o=>'<div style="padding:8px;border-bottom:1px solid #294663"><b>'+esc(o.id)+'</b> · '+esc(o.status)+' · '+money(o.total_pence)+'</div>').join(''):'<p>No local orders.</p>')+
    '<h3>Recent calls</h3>'+(p.calls.length?p.calls.map(c=>'<div style="padding:8px;border-bottom:1px solid #294663">'+esc(c.received_at)+' · '+esc(c.event_type)+'</div>').join(''):'<p>No local calls.</p>');
  showSheet('Customer 360',body);
}
async function showDeliveryLookup(){
  const postcode=prompt('Delivery postcode','');if(!postcode)return;
  const x=await post('/delivery/lookup',{postcode});
  const a=x.address||{},q=x.quote||{};
  const body='<p><b>'+esc(a.postcode||postcode)+'</b> · '+(a.validFormat?'Valid postcode format':'Check postcode format')+'</p>'+
    '<p>Zone: <b>'+esc(q.zone||'Not matched')+'</b><br>Delivery fee: <b>'+money(q.feePence||0)+'</b><br>Minimum order: <b>'+money(q.minimumOrderPence||0)+'</b><br>Estimated delivery: <b>'+Number(q.estimatedMinutes||0)+' min</b></p>'+
    '<p>Google Maps connector: <b>'+esc(x.maps?.enabled?'enabled':'safe/off')+'</b></p>';
  showSheet('Delivery Lookup',body);
  if(q.matched){state.deliveryFeePence=Number(q.feePence||0);renderTotals()}
}
async function showMarketplaceSandbox(){
  const body='<p>Marketplace adapters are sandbox/test-only.</p><button id="jeDry">JUST EAT DRY RUN</button><button id="drDry" style="margin-left:8px">DELIVEROO DRY RUN</button>';
  showSheet('Marketplace Sandbox',body);
  $('jeDry').onclick=async()=>{try{const x=await post('/marketplace/dry-run',{source:'just_eat',action:'status.update',payload:{status:'ready'}});toast(x.result.message)}catch(e){toast(e.message)}};
  $('drDry').onclick=async()=>{try{const x=await post('/marketplace/dry-run',{source:'deliveroo',action:'status.update',payload:{status:'ready'}});toast(x.result.message)}catch(e){toast(e.message)}};
}
async function showChatGPTBuilder(){
  const st=await api('/builder/state').catch(()=>({builder:{enabled:false,apiKeyConfigured:false,model:'gpt-5.6-sol'}}));
  const b=st.builder||{};
  const body='<div class="card"><h3>ChatGPT Builder</h3><p>Model: <b>'+esc(b.model||'gpt-5.6-sol')+'</b></p><p>Status: <b>'+(b.enabled&&b.apiKeyConfigured?'READY':'SAFE / NOT CONNECTED')+'</b></p><p>Changes are test-first and require review before any patch is applied.</p></div>'+
    '<div id="builderChat" style="max-height:360px;overflow:auto;padding:8px;border:1px solid #294663;border-radius:10px;margin:10px 0"></div>'+
    '<div style="display:flex;gap:8px"><input id="builderInput" placeholder="Ask ChatGPT to diagnose or change the EPOS..." style="flex:1;padding:12px;border-radius:9px;border:1px solid #31506f;background:#08182a;color:#fff"><button id="builderSend">SEND</button></div>';
  showSheet('ChatGPT Builder',body);
  const send=async()=>{
    const input=$('builderInput');const msg=String(input?.value||'').trim();if(!msg)return;
    input.value='';$('builderChat').insertAdjacentHTML('beforeend','<p><b>You:</b> '+esc(msg)+'</p>');
    try{
      const [ops,low,kds]=await Promise.all([
        api('/operations').catch(()=>({})),
        api('/stock/low?limit=20').catch(()=>({stock:[]})),
        api('/kds/orders?limit=20').catch(()=>({orders:[]}))
      ]);
      const x=await post('/builder/chat',{message:msg,context:{
        screen:'windows-epos',
        requestType:'build',
        currentModule:'epos',
        diagnostics:ops,
        recentChanges:[],
        ui:{mode:state.mode,cartLines:state.cart.length},
        lowStock:low.stock||[],
        kds:kds.orders||[]
      }});
      $('builderChat').insertAdjacentHTML('beforeend','<p><b>ChatGPT:</b><br>'+esc(x.result?.reply||'')+'</p>');
    }catch(e){
      $('builderChat').insertAdjacentHTML('beforeend','<p style="color:#ffd43b"><b>ChatGPT:</b> '+esc(e.message)+'</p>');
    }
    $('builderChat').scrollTop=$('builderChat').scrollHeight;
  };
  $('builderSend').onclick=send;
  $('builderInput').onkeydown=e=>{if(e.key==='Enter')send()};
}
async function showSetupWizard(){
  if(!(await requireUiPermission('integration_admin')))return;
  const [x,printerResult,paymentResult]=await Promise.all([
    api('/setup/config'),
    api('/hardware/printers').catch(()=>({printers:[]})),
    api('/payments/state').catch(()=>({payments:{}}))
  ]);
  const c=x.config||{},p=c.printer||{},printers=printerResult.printers||[],payments=paymentResult.payments||{};
  const options=printers.map(v=>'<option value="'+esc(v.Name||'')+'" '+((v.Name||'')===p.name?'selected':'')+'>'+esc(v.Name||'Printer')+' · '+esc(v.PrinterStatus||'')+'</option>').join('');
  const body='<div class="card"><h3>Windows EPOS Setup</h3><p>Site, hardware and compliance settings for this installation.</p></div>'+
  '<label>Company ID</label><input id="setupCompany" value="'+esc(c.companyId||'dexters')+'" style="width:100%;padding:10px;margin:5px 0 10px">'+
  '<label>Site ID</label><input id="setupSite" value="'+esc(c.siteId||'')+'" style="width:100%;padding:10px;margin:5px 0 10px">'+
  '<label>Device ID</label><input id="setupDevice" value="'+esc(c.deviceId||'')+'" style="width:100%;padding:10px;margin:5px 0 10px">'+
  '<label>Device name</label><input id="setupName" value="'+esc(c.deviceName||'')+'" style="width:100%;padding:10px;margin:5px 0 10px">'+
  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div><label>Timezone</label><input id="setupTimezone" value="'+esc(c.timezone||'Europe/London')+'" style="width:100%;padding:10px"></div><div><label>Currency</label><input id="setupCurrency" value="'+esc(c.currency||'GBP')+'" style="width:100%;padding:10px"></div><div><label>Jurisdiction</label><input id="setupJurisdiction" value="'+esc(c.jurisdiction||'Scotland')+'" style="width:100%;padding:10px"></div></div>'+
  '<h3>Hardware</h3><label>Receipt printer</label><select id="setupPrinterSelect" style="width:100%;padding:10px;margin:5px 0 10px;background:#08182a;color:#fff"><option value="'+esc(p.name||'')+'">'+esc(p.name||'Choose printer')+'</option>'+options+'</select>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label>Paper width</label><input id="setupPaper" value="'+esc(p.paperWidth||80)+'" style="width:100%;padding:10px"></div><div><label>Drawer pulse pin</label><input id="setupDrawer" value="'+esc(p.drawerPulsePin??0)+'" style="width:100%;padding:10px"></div></div>'+
  '<button id="printerTestBtn" style="margin-top:10px">TEST PRINTER DETECTION</button><button id="openCustomerDisplay" style="margin:10px 0 0 8px">OPEN CUSTOMER DISPLAY</button>'+
  '<h3>Scottish Off-Sales</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"><input id="setupAlcoholStart" value="'+esc(c.alcohol?.offSalesStart||'10:00')+'" placeholder="Start"><input id="setupAlcoholEnd" value="'+esc(c.alcohol?.offSalesEnd||'22:00')+'" placeholder="End"><input id="setupMup" value="'+esc(c.alcohol?.mupPencePerUnit||65)+'" placeholder="MUP p/unit"><input id="setupChallenge" value="'+esc(c.alcohol?.challengeAge||25)+'" placeholder="Challenge age"></div>'+
  '<h3>Payments</h3><p>Cash: <b>READY</b> · Square: <b>'+(payments.square?.enabled?(payments.square?.liveAllowed?'LIVE ENABLED':'CONFIGURED / LIVE LOCKED'):'OFF')+'</b></p>'+
  '<button id="setupSave" style="margin-top:14px">SAVE SETUP</button>';
  showSheet('Setup Wizard',body);
  $('setupSave').onclick=async()=>{
    await post('/setup/config',{
      companyId:$('setupCompany').value,siteId:$('setupSite').value,deviceId:$('setupDevice').value,deviceName:$('setupName').value,
      timezone:$('setupTimezone').value,currency:$('setupCurrency').value,jurisdiction:$('setupJurisdiction').value,
      printerName:$('setupPrinterSelect').value,paperWidth:Number($('setupPaper').value||80),drawerPulsePin:Number($('setupDrawer').value||0),
      offSalesStart:$('setupAlcoholStart').value,offSalesEnd:$('setupAlcoholEnd').value,mupPencePerUnit:Number($('setupMup').value||65),challengeAge:Number($('setupChallenge').value||25)
    });
    toast('Setup saved');
  };
  $('printerTestBtn').onclick=async()=>{try{const x=await post('/hardware/action',{action:'test-print'});toast(x.message||'Printer detected')}catch(e){toast(e.message)}};
  $('openCustomerDisplay').onclick=()=>window.open(API+'/customer-display','_blank');
}
async function showReports(){
  if(!(await requireUiPermission('reports')))return;
  const x=await api('/reports/summary?limit=1000');
  const sales=x.sales||{},stock=x.stock||{};
  const src=Object.entries(sales.bySource||{}).map(([k,v])=>'<div class="sum"><span>'+esc(k)+'</span><b>'+money(v)+'</b></div>').join('');
  showSheet('Reports · Test Data','<div class="grid"><div class="card"><h3>Sales</h3><p><b>'+Number(sales.orderCount||0)+'</b> orders</p><p><b>'+money(sales.totalPence||0)+'</b> total</p><p>'+money(sales.averageOrderPence||0)+' average order</p></div><div class="card"><h3>Stock</h3><p><b>'+Number(stock.unitsOnHand||0)+'</b> units on hand</p><p><b>'+Number(stock.lowStock||0)+'</b> low-stock lines</p></div></div><h3>Sales by source</h3>'+ (src||'<p>No local test sales yet.</p>'));
}
async function showSystem(){
  const x=await api('/system/status'),h=x.health||{},r=x.release||{},cr=x.crash||{};
  const body='<div class="card"><h3>Stability</h3><p>Overall: <b>'+(h.ok?'HEALTHY':'CHECK REQUIRED')+'</b></p><p>Release channel: <b>'+esc(r.channel||'test')+'</b></p><p>Last stable: <b>'+esc(cr.lastStableAt||'Not marked yet')+'</b></p></div>'+
  '<button id="selfTestBtn">RUN FULL SELF-TEST</button><button id="markStableBtn" style="margin-left:8px">MARK BUILD STABLE</button><button id="backupBtn" style="margin-left:8px">CREATE BACKUP</button><button id="supportBtn" style="margin-left:8px">SUPPORT BUNDLE</button><button id="logoutBtn" style="margin-left:8px">SIGN OUT</button>'+
  '<div style="margin-top:10px"><button data-channel="test">TEST</button><button data-channel="pilot" style="margin-left:6px">PILOT</button><button data-channel="stable" style="margin-left:6px">STABLE</button></div>'+
  '<div style="margin-top:12px"><b>Components:</b><pre>'+esc(JSON.stringify(h.components||{},null,2))+'</pre></div>';
  showSheet('System Health & Recovery',body);
  $('selfTestBtn').onclick=async()=>{const t=await api('/system/self-test');const z=t.selfTest;showSheet('Full Self-Test','<h3>'+(z.ok?'PASS':'FAIL')+'</h3>'+z.checks.map(c=>'<div style="padding:7px;border-bottom:1px solid #294663"><b>'+(c.ok?'PASS':'FAIL')+'</b> · '+esc(c.name)+'<br><small>'+esc(c.detail||'')+'</small></div>').join(''))};
  $('markStableBtn').onclick=async()=>{await post('/system/mark-stable',{});toast('Build marked stable');showSystem()};
  $('backupBtn').onclick=async()=>{const b=await post('/backup/create',{});toast('Backup created: '+(b.file||''))};
  $('supportBtn').onclick=async()=>{await post('/support/bundle',{});toast('Support bundle created')};
  document.querySelectorAll('[data-channel]').forEach(b=>b.onclick=async()=>{await post('/release/channel',{channel:b.dataset.channel});toast('Release channel: '+b.dataset.channel);showSystem()});
  $('logoutBtn').onclick=async()=>{await post('/staff/logout',{}).catch(()=>{});state.staffSession='';state.staff=null;sessionStorage.removeItem('dexters_staff_session');location.reload()};
}
async function showStock(){
  if(!(await requireUiPermission('stock_adjust')))return;
  const x=await api('/stock?limit=500'),rows=x.stock||[];
  const body='<p>Local test inventory only. Live stock is untouched.</p>'+(rows.length?rows.map((p,i)=>'<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:9px;border-bottom:1px solid #294663"><div><b>'+esc(p.name)+'</b><br><small>'+esc(p.category)+' · '+esc(p.barcode||'')+'</small></div><button data-stock-i="'+i+'">'+Number(p.qty||0)+' '+esc(p.unit||'each')+'</button></div>').join(''):'<p>No local catalogue stock yet.</p>');
  showSheet('Stock Control',body);
  document.querySelectorAll('[data-stock-i]').forEach(b=>b.onclick=async()=>{
    const p=rows[Number(b.dataset.stockI)];
    const qty=Number(prompt('Current stock for '+p.name,p.qty||0));
    if(!Number.isFinite(qty))return;
    const reorder=Number(prompt('Low-stock warning level',p.reorder_level||0));
    if(!Number.isFinite(reorder))return;
    await post('/stock/set',{productId:p.id,qty,reorderLevel:reorder,unit:p.unit||'each'});
    toast('Stock updated locally');showStock();
  });
}
async function showPurchasing(){
  if(!(await requireUiPermission('stock_adjust')))return;
  const x=await api('/purchasing/orders?limit=100'),rows=x.orders||[];
  const body='<button id="newPOBtn">NEW PURCHASE ORDER</button><button id="receiveGoodsBtn" style="margin-left:8px">RECEIVE GOODS</button><div style="margin-top:12px">'+(rows.length?rows.map(p=>'<div style="padding:9px;border-bottom:1px solid #294663"><b>'+esc(p.id)+'</b> · '+esc(p.supplier)+' · '+esc(p.status)+'</div>').join(''):'<p>No purchase orders yet.</p>')+'</div>';
  showSheet('Purchasing',body);
  $('newPOBtn').onclick=async()=>{
    const supplier=prompt('Supplier name','');if(!supplier)return;
    const id=await post('/purchasing/order',{order:{supplier,status:'draft',items:[],createdAt:new Date().toISOString()}});
    toast('Purchase order '+id.id+' created');showPurchasing();
  };
  $('receiveGoodsBtn').onclick=async()=>{
    const po=prompt('Purchase order ID (optional)','');const productId=prompt('EPOS product ID','');if(!productId)return;
    const qty=Number(prompt('Quantity received','1'));if(!Number.isFinite(qty)||!qty)return;
    await post('/purchasing/receive',{receipt:{purchaseOrderId:po||'',supplier:'',items:[{productId,qty}]}});
    toast('Goods received and stock increased');showPurchasing();
  };
}
async function showCashup(){
  if(!(await requireUiPermission('cashup')))return;
  const x=await api('/cashups?limit=20'),rows=x.cashups||[];
  const body='<button id="newCashupBtn">START TEST CASH-UP</button><div style="margin-top:12px">'+(rows.length?rows.map(c=>'<div style="padding:9px;border-bottom:1px solid #294663"><b>'+esc(c.id)+'</b><br><small>Expected '+money(c.expected_cash_pence)+' · Counted '+money(c.counted_cash_pence)+' · Difference '+money(c.discrepancy_pence)+'</small></div>').join(''):'<p>No cash-ups yet.</p>')+'</div>';
  showSheet('Cash Up / End of Day',body);
  $('newCashupBtn').onclick=async()=>{
    const expected=Number(prompt('Expected cash (£)','0'));if(!Number.isFinite(expected))return;
    const counted=Number(prompt('Counted cash (£)','0'));if(!Number.isFinite(counted))return;
    const card=Number(prompt('Card total (£)','0'));if(!Number.isFinite(card))return;
    await post('/cashups',{cashup:{expectedCashPence:Math.round(expected*100),countedCashPence:Math.round(counted*100),cardPence:Math.round(card*100),otherPence:0}});
    toast('Test cash-up saved');showCashup();
  };
}
async function showStaff(){
  if(!(await requireUiPermission('staff_admin')))return;
  const list=await api('/staff/list').catch(()=>({staff:[]}));
  const rows=(list.staff||[]).map(x=>'<div style="padding:9px;border-bottom:1px solid #294663"><b>'+esc(x.display_name||x.staff_id)+'</b> · '+esc(x.role)+' · '+(x.active?'Active':'Disabled')+'</div>').join('');
  const body='<p>Staff roles and PINs are enforced on sensitive actions.</p><button id="staffRoleBtn">ADD / UPDATE STAFF</button><button id="staffPinBtn" style="margin-left:8px">SET STAFF PIN</button><div style="margin-top:12px">'+(rows||'<p>No staff configured.</p>')+'</div>';
  showSheet('Staff & Permissions',body);
  $('staffRoleBtn').onclick=async()=>{
    const id=prompt('Staff ID','test-staff');if(!id)return;
    const name=prompt('Display name','Test Staff')||'';
    const role=prompt('Role: staff / supervisor / manager','staff')||'staff';
    const perms=role==='manager'?['refund','void','discount','price_change','alcohol_setup','cashup','reports']:role==='supervisor'?['void','discount','cashup']:[];
    await post('/staff/role',{staffId:id,displayName:name,role,permissions:perms});
    toast('Staff role saved');showStaff();
  };
  $('staffPinBtn').onclick=async()=>{
    const id=prompt('Staff ID','');if(!id)return;
    const pin=prompt('New PIN (4-8 digits)','');if(pin===null)return;
    await post('/staff/pin',{staffId:id,pin});toast('PIN updated');
  };
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
async function editDiscount(){
  if(!(await requireUiPermission('discount')))return;
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
  await post('/stock/deduct-order',{order});
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
  if(!(await requireUiPermission('sale')))return;
  if(!(await checkAlcoholBeforePayment()))return;
  const ps=await api('/payments/state').catch(()=>({payments:{}})),sq=ps.payments?.square||{};
  const squareLabel=sq.enabled?(sq.liveAllowed?'SQUARE':'SQUARE LOCKED'):'CARD TEST';
  const body=`<p>Total <b style="font-size:30px;color:#ffd43b">${money(totalPence())}</b></p><div class="choice"><button class="collection" id="payCash">CASH</button><button class="delivery" id="payCard">${squareLabel}</button></div><p style="color:#9fb1c7">${sq.liveAllowed?'Square is live-enabled on this installation.':'External card charging remains locked; safe test payment is used.'}</p>`;
  showSheet('Payment',body);
  $('payCash').onclick=()=>{ $('eposSheet')?.remove();completeTestOrder('cash').catch(e=>toast(e.message)) };
  $('payCard').onclick=async()=>{
    if(sq.enabled&&sq.liveAllowed){
      const ref='epos-'+Date.now();
      try{await post('/payments/square',{amountPence:totalPence(),reference:ref});$('eposSheet')?.remove();await completeTestOrder('square')}catch(e){toast(e.message)}
    }else{
      $('eposSheet')?.remove();completeTestOrder('card_test').catch(e=>toast(e.message));
    }
  };
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
  rail.forEach(b=>b.onclick=()=>{rail.forEach(x=>x.classList.toggle('on',x===b));const t=b.textContent.trim();if(t==='ORDERS')showOrders();else if(t==='INTEGRATIONS'){showIntegrations();setTimeout(()=>{},0);}else if(t==='PHONE')setMode('phone');else if(t==='DELIVERY')showDeliveryJobs();else if(t==='CUSTOMERS')showCustomer360();else if(t==='KDS')showKDS();else if(t==='LOYALTY')showSheet('Loyalty','<p>Test Loyalty connector remains isolated from live customer data.</p>');else if(t==='EMAIL')showSheet('Email','<p>Gmail connector will use OAuth and remains disabled until test credentials are configured.</p>');else if(t==='CHATGPT BUILDER')showChatGPTBuilder();else if(t==='MARKETPLACE')showMarketplaceSandbox();else if(t==='PRODUCT CATALOGUE')showProductCatalogue();else if(t==='DRINKS CATALOGUE')showDrinksCatalogue();else if(t==='SNACKS CATALOGUE')showSnacksCatalogue();else if(t==='ALCOHOL CATALOGUE')showAlcoholCatalogue();else if(t==='STOCK')showStock();else if(t==='PURCHASING')showPurchasing();else if(t==='CASH UP')showCashup();else if(t==='REPORTS')showReports();else if(t==='STAFF')showStaff();else if(t==='SETUP')showSetupWizard();else if(t==='SYSTEM')showSystem()});

  $('aiBtn').onclick=()=>$('aiPanel').classList.remove('hide');$('closeAi').onclick=()=>$('aiPanel').classList.add('hide');
  const aiInput=$('aiPanel')?.querySelector('.aiComposer input'),aiSend=$('aiPanel')?.querySelector('.aiComposer button');if(aiSend)aiSend.onclick=()=>{const v=aiInput.value.trim();aiInput.value='';askDexter(v)};if(aiInput)aiInput.onkeydown=e=>{if(e.key==='Enter')aiSend.click()};

  const bottom=[...document.querySelectorAll('.bottom button')];
  const action=name=>bottom.find(b=>b.textContent.trim()===name);
  action('HOLD').onclick=holdOrder;action('RECALL').onclick=recallOrder;action('NOTE').onclick=editOrderNote;action('DISCOUNT').onclick=editDiscount;action('TIMED ORDER').onclick=editTimedOrder;action('PAY').onclick=payOrder;
  action('LAST ORDER').onclick=()=>{const p=state.phoneSession?.customer?.previousOrder;if(!p)return toast('No previous order in this test session');showSheet('Last order','<pre>'+esc(JSON.stringify(p,null,2))+'</pre>')};
  const rv=document.createElement('button');rv.textContent='REFUND/VOID';rv.className='warn';rv.onclick=showOrderAdjustment;document.querySelector('.bottom').insertBefore(rv,document.querySelector('.bottom').lastElementChild);
}
function openPreviewFromQuery(){
  const p=new URLSearchParams(location.search).get('preview');
  if(!p)return;
  setTimeout(()=>{
    if(p==='catalogue')showProductCatalogue();
    else if(p==='kds')showKDS();
    else if(p==='builder')showChatGPTBuilder();
    else if(p==='delivery')showDeliveryJobs();
    else if(p==='stock')showStock();
  },700);
}
(async()=>{
  await ensureStaffLogin();
  bind();bindBarcodeScanner();renderCart();health();loadOrders();pollCalls();refreshCatalogProducts();openPreviewFromQuery();setInterval(health,15000);setInterval(pollCalls,3000);
})();
})();