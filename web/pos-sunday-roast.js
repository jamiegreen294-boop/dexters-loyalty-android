(()=>{'use strict';
const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',API=U+'/functions/v1/sunday-roast-pc-pos-api';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),mp=p=>'£'+(Number(p||0)/100).toFixed(2);
const meals={
 chicken:{name:'Roast Chicken Dinner',price:1499,photo:'https://www.nestleprofessional.co.uk/sites/default/files/styles/np_recipe_detail_2x/public/2022-04/roast-chicken.png?itok=QZPz3t1Q'},
 beef:{name:'Roast Beef Dinner',price:1499,photo:'https://drizzleanddip.com/wp-content/uploads/2023/04/O6A9029.jpg'},
 mixed:{name:'Adult Mixed Roast Dinner',price:1499,photo:'https://www.nestleprofessional.co.uk/sites/default/files/styles/np_recipe_detail_2x/public/2022-04/roast-chicken.png?itok=QZPz3t1Q'},
 kids_chicken:{name:"Kids' Roast Chicken Dinner",price:999,photo:'https://www.nestleprofessional.co.uk/sites/default/files/styles/np_recipe_detail_2x/public/2022-04/roast-chicken.png?itok=QZPz3t1Q'},
 kids_beef:{name:"Kids' Roast Beef Dinner",price:999,photo:'https://drizzleanddip.com/wp-content/uploads/2023/04/O6A9029.jpg'},
 kids_mixed:{name:'Kids Mixed Roast Dinner',price:999,photo:'https://www.nestleprofessional.co.uk/sites/default/files/styles/np_recipe_detail_2x/public/2022-04/roast-chicken.png?itok=QZPz3t1Q'}
};
const extras={
 yorkshire:{name:'Extra Yorkshire Pudding',price:75},
 gravy:{name:'Extra Gravy',price:100},
 stuffing:{name:'Extra Stuffing',price:100},
 potatoes:{name:'Extra Roast Potatoes',price:150},
 chicken:{name:'Extra Chicken',price:250},
 beef:{name:'Extra Beef',price:350}
};
const included=['Crispy roast potatoes','Creamy mashed potatoes','Mashed turnip','Carrots','Garden peas','Broccoli','Yorkshire pudding','Sage & onion stuffing','Rich gravy'];
let cfg=null,orders=[],selectedCustomer=null,editing=null,walkIn=false,state=blank();
function blank(){return{meals:Object.fromEntries(Object.keys(meals).map(k=>[k,0])),extras:Object.fromEntries(Object.keys(extras).map(k=>[k,0]))}}
function auth(){return{apikey:K,Authorization:'Bearer '+(S?.session?.access_token||''),'Content-Type':'application/json'}}
async function call(body){const r=await fetch(API,{method:'POST',headers:auth(),body:JSON.stringify(body)}),x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||'Sunday Roast request failed');return x}
function total(d=state){let n=0;for(const[k,q]of Object.entries(d.meals))n+=(meals[k]?.price||0)*Number(q||0);for(const[k,q]of Object.entries(d.extras))n+=(extras[k]?.price||0)*Number(q||0);return n}
function countMeals(d=state){return Object.values(d.meals).reduce((a,b)=>a+Number(b||0),0)}
function card(kind,key,item){const q=state[kind][key]||0;return kind==='meals'
 ?'<article class="srMeal"><img src="'+item.photo+'" alt="'+esc(item.name)+'"><div class="srMealBody"><small>'+(key.startsWith('kids_')?'KIDS SUNDAY':'SUNDAY FAVOURITE')+'</small><b>'+esc(item.name)+'</b><strong>'+mp(item.price)+'</strong><div class="srCounter"><button data-sr-minus="'+kind+':'+key+'">−</button><span>'+q+'</span><button data-sr-plus="'+kind+':'+key+'">+</button></div></div></article>'
 :'<div class="srExtra"><span><b>'+esc(item.name)+'</b><small>'+mp(item.price)+'</small></span><div class="srCounter"><button data-sr-minus="'+kind+':'+key+'">−</button><span>'+q+'</span><button data-sr-plus="'+kind+':'+key+'">+</button></div></div>'}
function stateFromOrder(o){const d=blank();for(const i of o.items||[])if((i.kind==='meals'||i.kind==='extras')&&Object.prototype.hasOwnProperty.call(d[i.kind],i.key))d[i.kind][i.key]=Number(i.qty)||0;return d}
function customerCreditHtml(c){const a=c?.credit;if(!a)return '<div class="srCredit no">No approved customer credit allowance</div>';return '<div class="srCredit '+(a.eligible?'yes':'no')+'"><b>Customer credit</b><br>Limit '+mp(a.credit_limit_pence)+' · Owed '+mp(a.balance_pence)+' · Available <b>'+mp(a.available_pence)+'</b></div>'}
function renderCustomer(){const box=$('srSelectedCustomer');if(!box)return;box.innerHTML=selectedCustomer?'<div class="held"><b>'+esc(selectedCustomer.full_name||'Customer')+'</b><br>'+esc(selectedCustomer.phone||'')+' · Loyalty '+esc(selectedCustomer.loyalty_code||'—')+customerCreditHtml(selectedCustomer)+'</div>':walkIn?'<div class="held"><b>Walk-in customer</b><br>This booking is not linked to a Loyalty App account.</div>':'<p class="muted">Search/select a Loyalty App customer, or choose Walk-in customer.</p>';renderPayment()}
function renderPayment(){const p=$('srPayment');if(!p)return;const old=p.value||'unpaid',credit=selectedCustomer?.credit?.eligible;let html='<option value="unpaid">Pay on collection</option><option value="deposit_paid">Deposit / part paid in store</option><option value="paid_full">Paid in full in store</option>';if(credit)html+='<option value="credit">Use customer credit allowance</option>';p.innerHTML=html;if([...p.options].some(o=>o.value===old))p.value=old;const paid=$('srPaid');if(paid)paid.disabled=p.value==='credit'||p.value==='unpaid';updateSummary()}
function renderEditor(){
 $('srMeals').innerHTML=Object.entries(meals).map(([k,v])=>card('meals',k,v)).join('');
 $('srExtras').innerHTML=Object.entries(extras).map(([k,v])=>card('extras',k,v)).join('');
 $('srIncluded').innerHTML=included.map(x=>'<li>'+esc(x)+'</li>').join('');
 document.querySelectorAll('[data-sr-plus],[data-sr-minus]').forEach(b=>b.onclick=()=>{const raw=b.dataset.srPlus||b.dataset.srMinus,[kind,key]=raw.split(':');state[kind][key]=Math.max(0,Number(state[kind][key]||0)+(b.dataset.srPlus?1:-1));renderEditor();updateSummary()});
 updateSummary();
}
function updateSummary(){if(!$('srTotal'))return;const t=total(),method=$('srPayment')?.value||'unpaid';let paid=Math.max(0,Math.round((Number($('srPaid')?.value||0)||0)*100));if(method==='paid_full'||method==='credit')paid=t;if(method==='unpaid')paid=0;paid=Math.min(t,paid);$('srTotal').textContent=mp(t);$('srPaidShow').textContent=method==='credit'?'ON ACCOUNT':mp(paid);$('srBalance').textContent=mp(method==='credit'?0:t-paid);$('srCreditUse').textContent=method==='credit'&&selectedCustomer?.credit?'This will add '+mp(t)+' to '+esc(selectedCustomer.full_name||'the customer')+'’s approved credit account.':''}
function paymentStateLabel(o){const total=Number(o.total_pence||0),bal=Number(o.balance_pence||0),paid=Math.max(0,total-bal),src=String(o.source||'');if(bal<=0&&total>0)return 'PAID IN FULL';if(paid>0&&bal>0)return 'DEPOSIT PAID';if(src==='pos'||src==='staff'||src==='backoffice')return 'AWAITING PAYMENT';return String(o.payment_status||'awaiting_payment').replace(/_/g,' ').toUpperCase()}
function orderCard(o){const closed=['collected','rejected','no_show','payment_failed'].includes(String(o.status||'')),payLabel=paymentStateLabel(o);return '<article class="srOrder"><div><b>SR-'+String(o.order_number||'').padStart(3,'0')+' · '+esc(o.customer_name||'Customer')+'</b><br>'+esc(o.collection_date)+' at '+esc(o.collection_slot)+'<br>'+(o.items||[]).map(i=>Number(i.qty||0)+' × '+esc(i.name)).join(' · ')+(o.order_notes?'<div class="srOrderNote"><b>NOTE:</b> '+esc(o.order_notes)+'</div>':'')+'<br><small>'+esc(payLabel)+' · '+mp(o.total_pence)+(Number(o.balance_pence||0)>0?' · DUE '+mp(o.balance_pence):'')+'</small></div><div class="srOrderBtns">'+(!closed?'<button data-sr-edit="'+o.id+'">EDIT</button>':'')+(Number(o.balance_pence||0)>0&&!closed?'<button data-sr-pay="'+o.id+'">TAKE PAYMENT</button>':'')+(String(o.status)==='pending'?'<button data-sr-ready="'+o.id+'">READY</button>':'')+(String(o.status)==='ready'?'<button data-sr-collected="'+o.id+'">COLLECTED</button>':'')+'</div></article>'}
async function refresh(){
 const s=await call({action:'status'});cfg=s.settings;if(!cfg)throw Error('No Sunday Roast week is currently configured.');
 $('srDate').textContent='Sunday '+new Date(cfg.collection_date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
 $('srSlot').innerHTML=(cfg.slots||[]).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');renderSlotButtons();
 const l=await call({action:'list',collection_date:cfg.collection_date});const allOrders=l.orders||[];orders=allOrders.filter(o=>{const ps=String(o.payment_status||'').toLowerCase(),st=String(o.status||'').toLowerCase(),src=String(o.source||'app').toLowerCase();if(src==='app'&&(st==='awaiting_payment'||ps==='awaiting_payment'||ps==='unpaid'||st==='payment_failed'))return false;if(['pos','staff','backoffice'].includes(src))return !['rejected','no_show','payment_failed'].includes(st);return ps==='completed'||ps==='paid_full'||ps==='deposit_paid'||['pending','accepted','preparing','ready','collected'].includes(st)});
 if($('srOrdersCount'))$('srOrdersCount').textContent='('+orders.length+')';
 $('srOrders').innerHTML=orders.length?orders.map(orderCard).join(''):'<p>No paid Sunday Roast orders for this week yet.</p>';
 bindOrders();
}
function bindOrders(){
 document.querySelectorAll('[data-sr-edit]').forEach(b=>b.onclick=()=>beginEdit(orders.find(o=>o.id===b.dataset.srEdit)));
 document.querySelectorAll('[data-sr-pay]').forEach(b=>b.onclick=()=>takePayment(orders.find(o=>o.id===b.dataset.srPay)));
 document.querySelectorAll('[data-sr-ready]').forEach(b=>b.onclick=()=>changeStatus(orders.find(o=>o.id===b.dataset.srReady),'ready'));
 document.querySelectorAll('[data-sr-collected]').forEach(b=>b.onclick=()=>changeStatus(orders.find(o=>o.id===b.dataset.srCollected),'collected'));
}
function renderSlotButtons(){
 const host=$('srSlotButtons'),sel=$('srSlot');if(!host||!sel)return;
 const slots=cfg?.slots||[];
 host.innerHTML=slots.length?slots.map(x=>'<button type="button" class="srSlotBtn '+(sel.value===x?'on':'')+'" data-sr-slot="'+esc(x)+'">'+esc(x)+'</button>').join(''):'<p class="bad">No collection times configured.</p>';
 host.querySelectorAll('[data-sr-slot]').forEach(b=>b.onclick=()=>{sel.value=b.dataset.srSlot;host.querySelectorAll('.srSlotBtn').forEach(x=>x.classList.toggle('on',x===b));});
}
function beginEdit(o){if(!o)return;editing=o;selectedCustomer={id:o.customer_id,full_name:o.customer_name,phone:o.customer_phone,loyalty_code:o.loyalty_code||''};state=stateFromOrder(o);$('srFormTitle').textContent='Edit SR-'+String(o.order_number).padStart(3,'0');$('srSlot').value=o.collection_slot||'';renderSlotButtons();$('srOrderNotes').value=o.order_notes||'';$('srPaymentRow').style.display='none';$('srCustomerSearchWrap').style.display='none';renderCustomer();renderEditor();$('srSave').textContent='SAVE ORDER CHANGES';$('srForm').scrollIntoView({behavior:'smooth',block:'start'})}
function resetNew(opts={}){const keepWalkIn=!!opts.keepWalkIn;editing=null;selectedCustomer=null;walkIn=keepWalkIn;state=blank();$('srFormTitle').textContent='Add Sunday Roast in store';$('srPaymentRow').style.display='grid';$('srCustomerSearchWrap').style.display='block';$('srSave').textContent='CREATE LIVE SUNDAY ROAST ORDER';$('srPaid').value='0.00';if($('srOrderNotes'))$('srOrderNotes').value='';if($('srSlot'))$('srSlot').value='';if($('srCustomerQuery'))$('srCustomerQuery').value='';if($('srCustomerResults'))$('srCustomerResults').innerHTML='';if($('srWalkName'))$('srWalkName').value='';if($('srWalkPhone'))$('srWalkPhone').value='';if($('srWalkFields'))$('srWalkFields').style.display=walkIn?'block':'none';if($('srWalkToggle'))$('srWalkToggle').textContent=walkIn?'WALK-IN CUSTOMER ✓':'WALK-IN CUSTOMER';renderSlotButtons();renderCustomer();renderEditor()}
async function searchCustomer(){const q=$('srCustomerQuery').value.trim(),out=$('srCustomerResults');out.innerHTML='<p>Searching…</p>';try{const x=await call({action:'customer_search',query:q}),rows=x.customers||[];out.innerHTML=rows.length?rows.map((c,i)=>'<button class="srCustomerPick" data-i="'+i+'"><b>'+esc(c.full_name||'Customer')+'</b><small>'+esc(c.phone||'')+' · Loyalty '+esc(c.loyalty_code||'—')+'</small>'+(c.credit?'<small>Credit available '+mp(c.credit.available_pence)+'</small>':'')+'</button>').join(''):'<p>No customer found.</p>';out.querySelectorAll('.srCustomerPick').forEach(b=>b.onclick=()=>{selectedCustomer=rows[Number(b.dataset.i)];out.innerHTML='';renderCustomer()})}catch(e){out.innerHTML='<p class="bad">'+esc(e.message)+'</p>'}}
async function save(){
 const msg=$('srMsg');msg.textContent='';try{
  if(countMeals()<1)throw Error('Choose at least one Sunday Roast dinner.');
  if(!$('srSlot').value)throw Error('Choose a collection time.');
  if(editing){
   await call({action:'update',id:editing.id,collection_slot:$('srSlot').value,meals:state.meals,extras:state.extras,order_notes:$('srOrderNotes').value});
   msg.textContent='Sunday Roast order updated.';resetNew();await refresh();collapseOrders();return;
  }
  if(!selectedCustomer?.id&&!walkIn)throw Error('Select a loyalty customer or choose Walk-in customer.');if(walkIn&&!$('srWalkName').value.trim())throw Error('Enter the walk-in customer name.');
  const method=$('srPayment').value,t=total();let paid=Math.max(0,Math.round((Number($('srPaid').value)||0)*100));
  if(method==='paid_full')paid=t;if(method==='unpaid'||method==='credit')paid=0;
  if(method==='credit'&&(!selectedCustomer.credit?.eligible||selectedCustomer.credit.available_pence<t))throw Error('This customer does not have enough approved credit available.');
  const x=await call({action:'create',customer_id:selectedCustomer?.id||null,customer_name:walkIn?$('srWalkName').value.trim():'',customer_phone:walkIn?$('srWalkPhone').value.trim():'',collection_date:cfg.collection_date,collection_slot:$('srSlot').value,meals:state.meals,extras:state.extras,payment_status:method==='credit'?'unpaid':method,paid_pence:paid,payment_method:method,credit_account_id:method==='credit'?selectedCustomer?.credit?.id:null,manual_override:!!$('srManualOverride')?.checked,order_notes:$('srOrderNotes').value});
  const createdNumber='SR-'+String(x.order.order_number).padStart(3,'0');
  const createdName=selectedCustomer?.full_name||$('srWalkName').value.trim();
  msg.textContent=createdNumber+' created for '+createdName+'.';
  resetNew();
  try{$('srLiveModal')?.classList.add('srHide')}catch{}
  try{if(typeof window.pcShowCategories==='function')window.pcShowCategories()}catch{}
  try{
    const toast=document.createElement('div');
    toast.textContent=createdNumber+' created for '+createdName;
    toast.style='position:fixed;right:22px;bottom:22px;z-index:30000;background:#123f2c;color:#d7ffe3;border:1px solid #2f7d55;border-radius:12px;padding:14px 18px;font-weight:900;box-shadow:0 8px 24px #0008';
    document.body.appendChild(toast);setTimeout(()=>toast.remove(),2800);
  }catch{}
  return;
 }catch(e){msg.textContent=e.message;msg.className='bad'}
}
async function takePayment(o){
 if(!o||Number(o.balance_pence||0)<=0)return;
 const due=Math.max(0,Number(o.balance_pence||0))/100;
 const ref='SR-'+String(o.order_number||'').padStart(3,'0');
 const title=ref+' · '+String(o.customer_name||'Customer');
 const d=document.createElement('div');d.className='modal';
 d.innerHTML='<div class="box" style="max-width:560px"><h2>Take Sunday Roast payment</h2><div style="font-size:13px;color:#9eb0c5">'+esc(title)+'</div><div style="font-size:42px;font-weight:1000;color:#ffd43b;margin:12px 0">£'+due.toFixed(2)+'</div><div id="srPayChoice" style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><button id="srPayCash" class="srBtn" style="background:#22c55e;color:#04210d;min-height:64px;font-size:22px">CASH</button><button id="srPaySquare" class="srBtn" style="background:#4d7cff;color:#fff;min-height:64px;font-size:22px">SQUARE</button></div><div id="srPayWork"></div><div style="margin-top:12px"><button id="srPayCancel" class="srBtn srSecondary" style="width:100%">CANCEL / BACK</button></div></div>';
 document.body.appendChild(d);
 const work=d.querySelector('#srPayWork'),choice=d.querySelector('#srPayChoice'),cancel=d.querySelector('#srPayCancel');
 let squareActive=false;
 const finish=async(method,meta={})=>{
   work.innerHTML='<p>Recording approved '+method+' payment…</p>';choice.style.display='none';cancel.disabled=true;
   try{await call({action:'payment',id:o.id,payment_method:method,payment_meta:meta});if(document.body.contains(d))d.remove();await refresh()}
   catch(e){work.innerHTML='<p class="bad">'+esc(e.message)+'</p>';choice.style.display='grid';cancel.disabled=false}
 };
 d.querySelector('#srPayCash').onclick=()=>{
   choice.style.display='none';
   work.innerHTML='<label>Cash received (£)<input id="srCashReceived" class="srField" inputmode="decimal" value="'+due.toFixed(2)+'"></label><div id="srCashChange" style="margin:10px 0;font-weight:900"></div><button id="srCashComplete" class="srBtn" style="width:100%;background:#22c55e;color:#04210d">COMPLETE CASH PAYMENT</button>';
   const input=d.querySelector('#srCashReceived'),chg=d.querySelector('#srCashChange'),btn=d.querySelector('#srCashComplete');
   const redraw=()=>{const got=Number(String(input.value||'0').replace(',','.'))||0;const change=Math.max(0,got-due);chg.textContent='Change due: £'+change.toFixed(2);btn.disabled=got<due};
   input.oninput=redraw;redraw();
   btn.onclick=()=>{const got=Number(String(input.value||'0').replace(',','.'))||0;if(got<due)return;finish('cash',{tendered:got,change:Math.max(0,got-due)})};
 };
 d.querySelector('#srPaySquare').onclick=async()=>{
   choice.style.display='none';squareActive=true;work.innerHTML='<p>Waiting for Foodhub / Square approval…</p>';cancel.textContent='CANCEL SQUARE / BACK';
   try{
     if(typeof window.DextersPcSquarePay!=='function')throw Error('Square bridge is not loaded.');
     const result=await window.DextersPcSquarePay(due,'Sunday Roast '+title);
     squareActive=false;
     if(!document.body.contains(d))return;
     await finish('square',{transaction_id:result?.transaction_id||''});
   }catch(e){squareActive=false;if(document.body.contains(d)){work.innerHTML='<p class="bad">Payment not completed: '+esc(e?.message||e)+'</p>';choice.style.display='grid';cancel.disabled=false;cancel.textContent='BACK TO ORDER'}}
 };
 cancel.onclick=async()=>{if(squareActive){cancel.disabled=true;try{if(typeof window.DextersPcSquareCancel==='function')await window.DextersPcSquareCancel()}catch{}}if(document.body.contains(d))d.remove()};
}
async function changeStatus(o,status){if(!o)return;try{if(status==='collected'&&Number(o.balance_pence||0)>0)throw Error('Take the outstanding payment before marking this order collected.');await call({action:'status_change',id:o.id,status});await refresh()}catch(e){alert(e.message)}}
function collapseOrders(){if(!$('srOrdersToggle')||!$('srOrders'))return;$('srOrdersToggle').setAttribute('aria-expanded','false');$('srOrders').classList.add('srOrdersCollapsed');if($('srOrdersChevron'))$('srOrdersChevron').textContent='▾'}
function open(){document.querySelectorAll('.pcToolGroup.open').forEach(x=>x.classList.remove('open'));$('srLiveModal').classList.remove('srHide');resetNew();collapseOrders();refresh().catch(e=>{$('srMsg').textContent=e.message;$('srMsg').className='bad'})}
function install(){
 if($('srLiveModal'))return;
 const st=document.createElement('style');st.textContent=`
 #srLiveModal{position:fixed;inset:0;background:#000b;z-index:10000;display:grid;place-items:center;padding:12px}.srHide{display:none!important}.srBox{width:min(1120px,97vw);max-height:94vh;overflow:auto;scrollbar-width:none;background:#10213a;border:1px solid #31506f;border-radius:20px;padding:16px;color:#fff}.srBox::-webkit-scrollbar{display:none}.srHead{display:flex;gap:10px;align-items:center}.srHead h2{flex:1;margin:0}.srBtn,.srCustomerPick,.srOrderBtns button{border:0;border-radius:10px;padding:11px 13px;font-weight:900;background:#ffd43b;color:#08101d}.srSecondary{background:#263c58;color:#fff}.srWeek{background:#0b192b;border-radius:12px;padding:12px;margin:12px 0}.srOrdersToggle{width:100%;display:flex;align-items:center;justify-content:space-between;border:0;border-radius:12px;padding:14px 16px;background:#162a45;color:#fff;font-size:20px;font-weight:1000;text-align:left;touch-action:manipulation}.srOrdersToggle span:last-child{color:#ffd43b;font-size:24px}.srOrders{display:grid;gap:8px;margin-top:8px}.srOrdersCollapsed{display:none}.srOrder{display:grid;grid-template-columns:1fr auto;gap:12px;background:#0b192b;border:1px solid #294663;border-radius:12px;padding:12px}.srOrderBtns{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.srOrderNote{margin-top:8px;padding:8px 10px;border-radius:9px;background:#3a2f13;color:#ffe99a;font-size:13px}.srForm{margin-top:16px;padding-top:16px;border-top:1px solid #31506f}.srCustomerSearch{display:grid;grid-template-columns:1fr auto;gap:8px}.srField{width:100%;padding:12px;border:1px solid #31506f;border-radius:10px;background:#09182a;color:#fff}.srSlotWrap{margin:12px 0}.srSlotButtons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:8px}.srSlotBtn{min-height:58px;border:2px solid #31506f;border-radius:12px;background:#162a45;color:#fff;font-size:20px;font-weight:1000;touch-action:manipulation}.srSlotBtn.on{background:#ffd43b;color:#08101d;border-color:#ffd43b;box-shadow:0 0 0 3px #ffd43b33}.srSlotSelectFallback{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}.srCustomerResults{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:8px 0}.srCustomerPick{background:#162a45;color:#fff;text-align:left}.srCustomerPick small{display:block;color:#b8c7d8;margin-top:3px}.srCredit{margin-top:8px;padding:8px;border-radius:9px}.srCredit.yes{background:#123f2c;color:#b8ffd0}.srCredit.no{background:#40212b;color:#ffd0da}.srMeals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.srMeal{background:#0b192b;border:1px solid #294663;border-radius:14px;overflow:hidden}.srMeal img{width:100%;height:125px;object-fit:cover;display:block}.srMealBody{padding:10px;display:grid;gap:4px}.srMealBody small{color:#ffd43b}.srMealBody strong{color:#ffd43b;font-size:18px}.srCounter{display:flex;align-items:center;gap:10px;margin-top:7px}.srCounter button{width:38px;height:38px;border:0;border-radius:50%;background:#203a5d;color:#fff;font-size:22px;font-weight:1000}.srCounter span{min-width:22px;text-align:center;font-weight:1000}.srExtras{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.srExtra{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#0b192b;padding:10px;border-radius:12px}.srExtra small{display:block;color:#b8c7d8}.srIncludes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;list-style:none;padding:0}.srIncludes li:before{content:'✓ ';color:#ffd43b}.srPayGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.srSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.srSummary>div{background:#0b192b;border-radius:12px;padding:10px;text-align:center}.srSummary b{font-size:20px}.srCreditUse{color:#ffd43b;font-weight:800}.bad{color:#ffadb8}@media(max-width:800px){.srSlotButtons{grid-template-columns:repeat(2,minmax(0,1fr))}.srMeals{grid-template-columns:repeat(2,1fr)}.srIncludes{grid-template-columns:repeat(2,1fr)}.srOrder{grid-template-columns:1fr}.srExtras{grid-template-columns:1fr}}`;
 document.head.appendChild(st);
 const d=document.createElement('div');d.id='srLiveModal';d.className='srHide';d.innerHTML=`<div class="srBox">
 <div class="srHead"><h2>Sunday Roast</h2><button id="srClose" class="srBtn srSecondary">Close</button></div>
 <div class="srWeek"><b id="srDate">Current Sunday</b><p>Live Sunday Roast orders for this week. Edit existing bookings or add an in-store booking linked to a Loyalty App customer.</p></div>
 <button id="srOrdersToggle" type="button" class="srOrdersToggle" aria-expanded="false"><span>This week's orders <span id="srOrdersCount">(0)</span></span><span id="srOrdersChevron">▾</span></button><div id="srOrders" class="srOrders srOrdersCollapsed"></div>
 <section id="srForm" class="srForm"><h3 id="srFormTitle">Add Sunday Roast in store</h3>
 <div id="srCustomerSearchWrap"><div class="srCustomerSearch"><input id="srCustomerQuery" class="srField" placeholder="Search loyalty customer by name, phone or loyalty code"><button id="srCustomerGo" class="srBtn">SEARCH</button></div><button id="srWalkToggle" class="srBtn srSecondary" style="margin-top:8px">WALK-IN CUSTOMER</button><div id="srWalkFields" style="display:none;margin-top:8px"><input id="srWalkName" class="srField" placeholder="Walk-in customer name"><input id="srWalkPhone" class="srField" placeholder="Phone number (optional)" style="margin-top:8px"></div><div id="srCustomerResults" class="srCustomerResults"></div></div>
 <div id="srSelectedCustomer"></div>
 <div class="srSlotWrap"><b>Collection time</b><div id="srSlotButtons" class="srSlotButtons"></div><select id="srSlot" class="srField srSlotSelectFallback" aria-hidden="true" tabindex="-1"></select></div>
 <h3>Dinners</h3><div id="srMeals" class="srMeals"></div>
 <h3>All the trimmings</h3><ul id="srIncluded" class="srIncludes"></ul>
 <h3>A little extra?</h3><div id="srExtras" class="srExtras"></div><label style="display:block;margin-top:12px"><b>Order note / preparation instructions</b><textarea id="srOrderNotes" class="srField" rows="3" maxlength="500" placeholder="e.g. Sandra — no mashed potatoes"></textarea></label>
 <div id="srPaymentRow" class="srPayGrid"><label>Payment<select id="srPayment" class="srField"></select></label><label>Amount already paid (£)<input id="srPaid" class="srField" inputmode="decimal" value="0.00"></label></div><label class="held" style="display:flex;gap:10px;align-items:center"><input id="srManualOverride" type="checkbox" style="width:22px;height:22px"><span><b>MANUAL OVERRIDE</b><br><small>Staff only — allow this Sunday booking after the normal pre-order cutoff. Stock and collection slots are still checked.</small></span></label>
 <div class="srSummary"><div><b id="srTotal">£0.00</b><span>Total</span></div><div><b id="srPaidShow">£0.00</b><span>Paid / account</span></div><div><b id="srBalance">£0.00</b><span>Balance due</span></div></div>
 <div id="srCreditUse" class="srCreditUse"></div><button id="srSave" class="srBtn" style="width:100%">CREATE LIVE SUNDAY ROAST ORDER</button><p id="srMsg"></p>
 </section></div>`;document.body.appendChild(d);
 $('srClose').onclick=()=>d.classList.add('srHide');$('srOrdersToggle').onclick=()=>{const open=$('srOrdersToggle').getAttribute('aria-expanded')==='true';$('srOrdersToggle').setAttribute('aria-expanded',String(!open));$('srOrders').classList.toggle('srOrdersCollapsed',open);$('srOrdersChevron').textContent=open?'▾':'▴'};$('srCustomerGo').onclick=searchCustomer;$('srWalkToggle').onclick=()=>{walkIn=!walkIn;selectedCustomer=null;$('srWalkFields').style.display=walkIn?'block':'none';$('srWalkToggle').textContent=walkIn?'WALK-IN CUSTOMER ✓':'WALK-IN CUSTOMER';if(!walkIn){$('srWalkName').value='';$('srWalkPhone').value=''}$('srCustomerResults').innerHTML='';renderCustomer()};$('srPayment').onchange=renderPayment;$('srPaid').oninput=updateSummary;$('srSave').onclick=save;
 let b=$('pcSundayBtn');if(!b){b=document.createElement('button');b.id='pcSundayBtn';b.textContent='Sunday Roast';document.querySelector('.top')?.insertBefore(b,$('staffBtn')||null)}b.onclick=open;
 window.DextersSundayOrders={open};window.DextersSundayCreate=open;window.DextersSundayEdit=beginEdit;
}
window.addEventListener('load',install);if(document.readyState!=='loading')install();
})();