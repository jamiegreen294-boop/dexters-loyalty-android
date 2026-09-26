(()=>{
'use strict';
const API='http://127.0.0.1:17654';
const $=id=>document.getElementById(id);
const state={mode:'counter',activeCall:null,phoneSession:null,customer:null,cart:[],orders:[],calls:[],connectors:[],lastCallId:null};
const money=p=>'£'+(Number(p||0)/100).toFixed(2);
async function api(path,opt={}){
  const r=await fetch(API+path,{cache:'no-store',...opt});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||('HTTP '+r.status));
  return d;
}
function post(path,data){return api(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data||{})})}
function toast(msg){let n=$('eposToast');if(!n){n=document.createElement('div');n.id='eposToast';n.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#020617;color:white;border:1px solid #475569;border-radius:10px;padding:12px 16px;z-index:99;font-weight:800';document.body.appendChild(n)}n.textContent=msg;n.style.display='block';clearTimeout(n._t);n._t=setTimeout(()=>n.style.display='none',2800)}
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
  if(!state.phoneSession){
    state.phoneSession=(await post('/phone/session',{call:{caller_number:'',customer:{}}})).session;
  }
  const x=await post('/phone/fulfilment',{session:state.phoneSession,mode});
  state.phoneSession=x.session;setMode(mode);
  $('fulfilmentModal')?.classList.add('hide');
  document.querySelectorAll('.callerActions button').forEach(b=>b.classList.toggle('chosen',b.id.toLowerCase().startsWith(mode)));
  const q=$('customerSearch');if(q&&mode==='delivery')q.placeholder='Postcode / address / customer / phone';else if(q)q.placeholder='Customer / phone / loyalty';
  toast((mode==='delivery'?'Delivery':'Collection')+' phone order ready');
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
async function loadOrders(){
  try{state.orders=(await api('/local/orders?limit=100')).orders||[]}catch{state.orders=[]}
}
async function showOrders(){
  await loadOrders();
  const body=state.orders.length?state.orders.map(o=>`<div style="padding:10px;border-bottom:1px solid #294663"><b>${o.id}</b> · ${o.source} · ${o.fulfilment||'-'}<br><small>${o.customer_name||'No customer'} · ${money(o.total_pence)} · ${o.status}</small></div>`).join(''):'<p>No local test orders yet.</p>';
  showSheet('Orders Hub',body);
}
async function showIntegrations(){
  const x=await api('/integrations');state.connectors=x.connectors||[];
  const body=state.connectors.map(c=>`<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px;border-bottom:1px solid #294663"><div><b>${c.name}</b><br><small>${c.environment} · ${c.mode}</small></div><b style="color:${c.enabled?'#22c55e':'#9fb1c7'}">${c.enabled?'ENABLED':'SAFE / OFF'}</b></div>`).join('');
  showSheet('Integrations',body||'<p>No connectors configured.</p>');
}
async function showOperations(){
  const x=await api('/operations');
  const local=x.local||{};
  const body=`<div class="grid"><div class="card"><h3>Local database</h3><b>${local.orders||0}</b> orders · <b>${local.calls||0}</b> calls · <b>${local.queued||0}</b> queued</div><div class="card"><h3>Dexter AI</h3><b>${x.ai?.enabled?'Enabled':'Safe / disabled'}</b></div></div>`+
   (x.connectors||[]).map(c=>`<div style="padding:9px;border-bottom:1px solid #294663"><b>${c.name}</b> · ${c.state} · ${c.environment}</div>`).join('');
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
    const body=x.customers.map((c,i)=>`<button data-customer-i="${i}" style="display:block;width:100%;text-align:left;padding:12px;margin:6px 0;background:#172d49;color:white;border:0;border-radius:10px"><b>${c.name||'Customer'}</b><br><small>${c.phone||''} ${c.loyalty_code?'· '+c.loyalty_code:''}</small></button>`).join('');
    showSheet('Customer search',body);
    document.querySelectorAll('[data-customer-i]').forEach(b=>b.onclick=()=>{state.customer=x.customers[Number(b.dataset.customerI)];$('customerSearch').value=state.customer.name||state.customer.phone||'';$('eposSheet')?.remove();toast('Customer attached')});
  }catch(e){toast(e.message)}
}
async function saveDraft(){
  const id='local-'+Date.now(),totalPence=state.cart.reduce((a,x)=>a+Number(x.pricePence||0)*Number(x.qty||1),0);
  const order={id,source:state.phoneSession?'telephone':'pos',status:'draft',fulfilment:state.phoneSession?.fulfilment||state.mode,customerName:state.customer?.name||state.phoneSession?.customer?.name||'',customerPhone:state.customer?.phone||state.phoneSession?.customer?.phone||'',totalPence,items:state.cart,createdAt:new Date().toISOString()};
  await post('/local/order',{order});await post('/local/queue',{connector:'kds',action:'order.upsert',entityId:id,payload:order});toast('Saved locally and queued safely');await loadOrders();
}
async function askDexter(message){
  const body=$('aiPanel')?.querySelector('.aiBody');if(!message)return;
  body.insertAdjacentHTML('beforeend','<p><b>You:</b> '+message.replace(/[&<>]/g,'')+'</p>');
  try{
    const x=await post('/ai/chat',{message,context:{screen:'pos',order:{source:state.phoneSession?'telephone':'pos',customerName:state.customer?.name||state.phoneSession?.customer?.name||''},integrationStatus:state.connectors}});
    body.insertAdjacentHTML('beforeend','<p><b>Dexter:</b> '+String(x.reply||x.message||'').replace(/[&<>]/g,'')+'</p>');
  }catch(e){body.insertAdjacentHTML('beforeend','<p style="color:#ffd43b"><b>Dexter:</b> '+e.message.replace(/[&<>]/g,'')+'</p>')}
  body.scrollTop=body.scrollHeight;
}
async function health(){try{const h=await api('/health');$('hubStatus').textContent='Hub online · '+h.version}catch{$('hubStatus').textContent='Hub offline'}}
function bind(){
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  $('deliveryBtn').onclick=()=>$('fulfilmentModal').classList.remove('hide');$('collectionBtn').onclick=()=>$('fulfilmentModal').classList.remove('hide');
  $('closeFulfil').onclick=()=>$('fulfilmentModal').classList.add('hide');
  document.querySelectorAll('[data-fulfil]').forEach(b=>b.onclick=()=>chooseFulfilment(b.dataset.fulfil).catch(e=>toast(e.message)));
  $('customerSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')searchCustomer()});
  $('ordersBtn').onclick=showOrders;
  $('backOfficeBtn').onclick=showOperations;
  const rail=[...document.querySelectorAll('.rail button')];
  rail.forEach(b=>b.onclick=()=>{rail.forEach(x=>x.classList.toggle('on',x===b));const t=b.textContent.trim();if(t==='ORDERS')showOrders();else if(t==='INTEGRATIONS')showIntegrations();else if(t==='PHONE')setMode('phone');else if(t==='CUSTOMERS')searchCustomer();else if(t==='KDS')showSheet('KDS','<p>Test KDS connector is isolated and currently disabled from live writes.</p>');else if(t==='LOYALTY')showSheet('Loyalty','<p>Test Loyalty connector is isolated and currently disabled from live writes.</p>');else if(t==='EMAIL')showSheet('Email','<p>Gmail connector will use OAuth and remains disabled until test credentials are configured.</p>')});
  $('aiBtn').onclick=()=>$('aiPanel').classList.remove('hide');$('closeAi').onclick=()=>$('aiPanel').classList.add('hide');
  const aiInput=$('aiPanel')?.querySelector('.aiComposer input'),aiSend=$('aiPanel')?.querySelector('.aiComposer button');if(aiSend)aiSend.onclick=()=>{const v=aiInput.value.trim();aiInput.value='';askDexter(v)};if(aiInput)aiInput.onkeydown=e=>{if(e.key==='Enter')aiSend.click()};
  const bottom=[...document.querySelectorAll('.bottom button')];const pay=bottom.find(b=>b.textContent.trim()==='PAY');if(pay)pay.onclick=()=>saveDraft().catch(e=>toast(e.message));
  const last=bottom.find(b=>b.textContent.trim()==='LAST ORDER');if(last)last.onclick=()=>toast(state.phoneSession?.customer?.previousOrder?'Previous order available':'No previous order in test session');
}
bind();health();loadOrders();pollCalls();setInterval(health,15000);setInterval(pollCalls,3000);
})();