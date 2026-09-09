(() => {
const KEY='dexters_phone_test_v1';
const state=JSON.parse(localStorage.getItem(KEY)||'{"calls":[],"orders":[]}');
let active=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
function phoneNorm(v){return String(v||'').replace(/\D/g,'').replace(/^44/,'0')}
const demoCustomers=[
 {id:'c-1001',name:'Irene',phone:'07123456789',loyalty:true,lastOrder:'Sunday roast chicken',notes:'Registered loyalty customer'},
 {id:'c-1002',name:'Scott',phone:'07987654321',loyalty:true,lastOrder:'Sunday roast beef',notes:'Registered loyalty customer'}
];
function matchCustomer(phone){const n=phoneNorm(phone);return demoCustomers.find(c=>phoneNorm(c.phone)===n)||null}
function metrics(){$('callsToday').textContent=state.calls.length;$('callbacks').textContent=state.calls.filter(c=>c.status==='missed'||c.callback==='required').length;$('phoneOrders').textContent=state.orders.length}
function renderCustomer(){
 if(!active){$('customerCard').innerHTML='<p class="muted">Caller ID will be matched against the Dexter\'s customer database.</p>';return}
 const c=matchCustomer(active.phone);
 if(c){$('customerCard').innerHTML='<span class="badge live">Registered customer</span><h3>'+esc(c.name)+'</h3><p><b>'+esc(c.phone)+'</b></p><p class="muted">'+esc(c.notes)+'</p><p>Last order: '+esc(c.lastOrder)+'</p>'}
 else {$('customerCard').innerHTML='<span class="badge">Guest caller</span><h3>'+esc(active.phone)+'</h3><p class="muted">No existing customer match. Order can still be created and printed.</p><button class="btn" id="createCustomer">Create customer after call</button>';
 setTimeout(()=>{const b=$('createCustomer');if(b)b.onclick=()=>alert('Test: customer creation will use the existing customer database when connected.');},0)}
}
function addCall(phone,status='live'){
 const c={id:crypto.randomUUID(),phone,status,started:new Date().toISOString(),callback:status==='missed'?'required':'none'};
 state.calls.unshift(c);save();metrics();renderHistory();return c
}
function start(phone){
 active=addCall(phone,'live');
 const c=matchCustomer(phone);
 $('liveArea').innerHTML='<span class="badge live">CALL LIVE</span><h3>'+(c?esc(c.name):'Unknown caller')+'</h3><p>'+esc(phone)+'</p><div class="row"><button class="btn good" id="answered">Answered</button><button class="btn danger" id="endCall">End call</button></div>';
 $('answered').onclick=()=>{active.status='answered';save();renderHistory()};
 $('endCall').onclick=()=>{active.status='completed';active.ended=new Date().toISOString();save();renderHistory();$('liveArea').innerHTML='<span class="badge">Call ended</span>';};
 renderCustomer()
}
function missed(){
 const c=addCall('07700 900'+String(Math.floor(Math.random()*90)+10),'missed');
 active=c;$('liveArea').innerHTML='<span class="badge missed">MISSED CALL</span><p>'+esc(c.phone)+'</p><button class="btn warn" id="callbackBtn">Mark called back</button>';
 $('callbackBtn').onclick=()=>{c.callback='resolved';c.status='completed';save();metrics();renderHistory();$('liveArea').innerHTML='<span class="badge">Callback resolved</span>'};renderCustomer()
}
function renderHistory(){
 if(!state.calls.length){$('callHistory').innerHTML='<p class="muted">No test calls yet.</p>';return}
 $('callHistory').innerHTML=state.calls.slice(0,10).map(c=>'<div class="call"><b>'+esc(c.phone)+'</b> <span class="badge '+(c.status==='missed'?'missed':'')+'">'+esc(c.status)+'</span><div class="muted">'+new Date(c.started).toLocaleString()+(c.callback==='required'?' • CALLBACK REQUIRED':'')+'</div></div>').join('')
}
function blankLine(item='',qty=1,mods=''){return '<div class="order-line"><input class="qty" type="number" min="1" value="'+qty+'"><input class="item" placeholder="Menu item" value="'+esc(item)+'"><input class="mods" placeholder="Modifiers / notes" value="'+esc(mods)+'"><button class="btn danger remove">×</button></div>'}
function wireLines(){document.querySelectorAll('.remove').forEach(b=>b.onclick=()=>b.closest('.order-line').remove())}
function detect(){
 const t=$('transcript').value.toLowerCase().trim();if(!t){alert('Enter a sample transcript first.');return}
 const items=[];
 const patterns=[
  [/chicken wrap/g,'Chicken Wrap'],[/chips/g,'Chips'],[/chicken tenders?/g,'Chicken Tenders'],[/beef roast/g,'Sunday Roast Beef'],[/chicken roast/g,'Sunday Roast Chicken'],[/coke/g,'Coke'],[/irn bru/g,'Irn-Bru']
 ];
 patterns.forEach(([re,name])=>{const m=t.match(re);if(m)items.push({name,qty:m.length,mods:/no onion/.test(t)&&name==='Chicken Wrap'?'No onion':''})});
 if(!items.length) items.push({name:'REVIEW TRANSCRIPT',qty:1,mods:'AI uncertain — staff confirmation required'});
 $('orderLines').innerHTML=items.map(x=>blankLine(x.name,x.qty,x.mods)).join('');wireLines()
}
function confirmOrder(){
 const lines=[...document.querySelectorAll('.order-line')].map(r=>({qty:Number(r.querySelector('.qty').value||1),item:r.querySelector('.item').value.trim(),mods:r.querySelector('.mods').value.trim()})).filter(x=>x.item);
 if(!lines.length){alert('Add at least one item.');return}
 const customer=active?matchCustomer(active.phone):null;
 const order={id:'TEL-'+Date.now().toString().slice(-6),created:new Date().toISOString(),phone:active?.phone||'manual',customer:customer?.name||'Guest',lines,note:$('staffNote').value.trim(),status:'confirmed'};
 state.orders.unshift(order);save();metrics();
 $('ticket').textContent=["DEXTER'S — TELEPHONE ORDER",order.id,new Date(order.created).toLocaleString(),'Customer: '+order.customer,'Phone: '+order.phone,'------------------------',...lines.map(x=>x.qty+' x '+x.item+(x.mods?'\n   '+x.mods:'')),'------------------------',order.note?('NOTE: '+order.note):'','STAFF CONFIRMED'].filter(Boolean).join('\n');
}
$('knownCall').onclick=()=>start('07123 456789');
$('guestCall').onclick=()=>start('07700 900555');
$('missedCall').onclick=missed;
$('detectOrder').onclick=detect;
$('clearTranscript').onclick=()=>{$('transcript').value='';$('orderLines').innerHTML=''};
$('addLine').onclick=()=>{$('orderLines').insertAdjacentHTML('beforeend',blankLine());wireLines()};
$('confirmOrder').onclick=confirmOrder;
$('printTicket').onclick=()=>window.print();
$('markCollected').onclick=()=>alert('Test: order marked collected. Live build will update order history.');
metrics();renderHistory();renderCustomer();
})();