(()=>{
'use strict';
const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pounds=p=>{const n=Number(p||0);return '£'+(n/100).toFixed(2)};
function session(){try{return (typeof SECURE_SESSION!=='undefined'&&SECURE_SESSION)||null}catch{return null}}
function client(){try{return (typeof SB!=='undefined'&&SB)||null}catch{return null}}
function admin(){try{const r=String(SECURE_ACCOUNT?.role||'').toLowerCase();return ['staff','admin','team leader','manager','super user'].includes(r)}catch{return false}}
let loadedFor='';
function addTab(){
 const tabs=document.querySelector('.staff-subtabs');
 if(!tabs||tabs.querySelector('[data-custtab="credit"]'))return;
 const b=document.createElement('button');b.type='button';b.dataset.custtab='credit';b.textContent='Credit';
 b.onclick=()=>{tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active'));document.querySelectorAll('[id^="custPane-"]').forEach(x=>x.classList.remove('active'));b.classList.add('active');const p=$('custPane-credit');if(p)p.classList.add('active');render()};
 const loyaltyTab=tabs.querySelector('[data-custtab="loyalty"]');if(loyaltyTab)loyaltyTab.after(b);else tabs.appendChild(b);
 const wrap=$('custProfileWrap');if(!wrap)return;
 const pane=document.createElement('div');pane.className='staff-tabpane';pane.id='custPane-credit';pane.innerHTML='<div id="dxCreditBody"><span class="muted">Open Credit to load the customer credit file.</span></div>';
 wrap.appendChild(pane);
}
function style(){if($('dxCreditStyle'))return;const s=document.createElement('style');s.id='dxCreditStyle';s.textContent='#custPane-credit .dx-credit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0}#custPane-credit .dx-credit-box{background:#f7f7f9;border:1px solid #dedde3;border-radius:10px;padding:12px;color:#3e3941}#custPane-credit .dx-credit-box small{display:block;color:#77717b;margin-bottom:4px}#custPane-credit .dx-credit-box b{font-size:20px}#custPane-credit .dx-credit-form{background:#fff;border:1px solid #dedde3;border-radius:10px;padding:14px;margin:12px 0}#custPane-credit .dx-credit-tx{background:#fff;border:1px solid #dedde3;border-radius:10px;padding:11px;margin:7px 0}#custPane-credit .dx-credit-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}#custPane-credit .dx-credit-muted{font-size:12px;color:#77717b;margin-top:3px}#custPane-credit .dx-credit-ok{color:#18794e;font-weight:800}#custPane-credit .dx-credit-err{color:#b42318;font-weight:800}#custPane-credit .dx-credit-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}#custPane-credit .dx-credit-action{background:#fff;border:1px solid #dedde3;border-radius:10px;padding:14px}#custPane-credit .dx-credit-action h3{margin:0 0 5px}#custPane-credit .dx-credit-action .btn{margin-top:8px}@media(max-width:650px){#custPane-credit .dx-credit-grid,#custPane-credit .dx-credit-actions{grid-template-columns:1fr}}';document.head.appendChild(s)}
async function rpc(name,args){const c=client();const s=session();if(!c||!s?.access_token)throw Error('Please sign in again.');const {data,error}=await c.rpc(name,args);if(error)throw error;return data}
async function accountFor(cu){
 const c=client();if(!c)throw Error('Secure database is not available.');
 const select='id,loyalty_user_id,customer_name,phone,email,status,balance_pence,credit_limit_pence,notes,last_activity_at,payment_reference';
 if(cu.liveId){
  const {data,error}=await c.from('customer_credit_accounts').select(select).eq('loyalty_user_id',cu.liveId).maybeSingle();
  if(error)throw error;return data||null;
 }
 const rows=await rpc('credit_search_customers',{p_query:cu.name||'',p_limit:50});
 const found=(Array.isArray(rows)?rows:[]).find(x=>String(x.customer_name||'').toLowerCase()===String(cu.name||'').toLowerCase()&&(cu.phone?String(x.phone||'')===String(cu.phone):true));
 if(found?.account_id){
  const {data,error}=await c.from('customer_credit_accounts').select(select).eq('id',found.account_id).single();
  if(error)throw error;return data||null;
 }
 return null;
}
async function createApprovedAccount(cu,limitPence,notes){
 const id=await rpc('credit_create_customer',{p_customer_name:cu.name||'Customer',p_phone:cu.phone||null,p_email:cu.email||null,p_loyalty_user_id:cu.liveId||null,p_notes:notes||null});
 await rpc('credit_set_limit',{p_account_id:id,p_credit_limit_pence:limitPence,p_notes:notes||null});
 const c=client();const {data,error}=await c.from('customer_credit_accounts').select('id,loyalty_user_id,customer_name,phone,email,status,balance_pence,credit_limit_pence,notes,last_activity_at,payment_reference').eq('id',id).single();
 if(error)throw error;return data;
}
async function render(){
 addTab();style();const body=$('dxCreditBody'),cu=typeof selectedCustomer==='function'?selectedCustomer():null;
 if(!body||!cu)return;
 if(!admin()){body.innerHTML='<span class="muted">Staff/admin access required to view credit files.</span>';return}
 if(loadedFor===cu.id)return;
 loadedFor=cu.id;body.innerHTML='<span class="muted">Loading credit file…</span>';
 try{
  const a=await accountFor(cu);
  if(!a){
    body.innerHTML='<div class="summarybox"><b>No approved credit account</b><br><span class="muted">This customer does not currently have a credit allowance. Opening this record does not create one.</span></div>'+
      '<div class="dx-credit-form"><b>Approve / create credit allowance</b><div class="muted" style="margin:5px 0 9px">Only use this after you have decided to approve credit. This creates the customer\'s credit account and allowance.</div><div class="field">Approved credit limit (£)<input id="dxCreditLimit" inputmode="decimal" placeholder="e.g. 50.00"></div><div class="field">Internal approval notes<textarea id="dxCreditNotes" rows="3" placeholder="Why this allowance was approved"></textarea></div><button type="button" class="btn" id="dxCreditSave">Create approved credit account</button><div id="dxCreditStatus" class="dx-credit-muted"></div></div>';
    $('dxCreditSave').onclick=saveLimit;return;
  }
  const detail=await rpc('credit_account_detail',{p_account_id:a.id});const account=detail?.account||a,tx=Array.isArray(detail?.transactions)?detail.transactions:[];
  const bal=Number(account.balance_pence||0),lim=account.credit_limit_pence==null?null:Number(account.credit_limit_pence),available=lim==null?null:Math.max(0,lim-bal),overdue=Number(detail?.overdue_pence||0);
  body.innerHTML='<div class="dx-credit-grid"><div class="dx-credit-box"><small>Outstanding</small><b>'+pounds(bal)+'</b></div><div class="dx-credit-box"><small>Credit limit</small><b>'+(lim==null?'Not set':pounds(lim))+'</b></div><div class="dx-credit-box"><small>Available credit</small><b>'+(available==null?'—':pounds(available))+'</b></div></div>'+
   '<div class="summarybox"><b>Credit file</b><br><span class="muted">Reference: '+esc(account.payment_reference||'—')+' · Status: '+esc(String(account.status||'active').toUpperCase())+(overdue>0?' · Overdue '+pounds(overdue):'')+'</span></div>'+
   '<div class="dx-credit-form"><b>Set customer credit limit</b><div class="muted" style="margin:5px 0 9px">Leave blank to remove the limit. Enter the maximum outstanding balance this customer is allowed.</div><div class="field">Credit limit (£)<input id="dxCreditLimit" inputmode="decimal" value="'+(lim==null?'':(lim/100).toFixed(2))+'" placeholder="e.g. 100.00"></div><div class="field">Internal credit notes<textarea id="dxCreditNotes" rows="3" placeholder="Optional notes">'+esc(account.notes||'')+'</textarea></div><button type="button" class="btn" id="dxCreditSave">Save credit limit</button><div id="dxCreditStatus" class="dx-credit-muted"></div></div>'+
   '<div class="dx-credit-actions"><div class="dx-credit-action"><h3>Add credit charge</h3><div class="muted">Use this when the customer takes goods on credit. It increases the amount they owe.</div><div class="field">Amount (£)<input id="dxCreditChargeAmount" inputmode="decimal" placeholder="e.g. 15.00"></div><div class="field">What was the credit for?<input id="dxCreditChargeDesc" placeholder="e.g. Telephone order"></div><div class="field">Due date<input id="dxCreditChargeDue" type="date"></div><div class="field">Order reference (optional)<input id="dxCreditChargeRef" placeholder="e.g. POS-1234"></div><button type="button" class="btn" id="dxCreditAddCharge">Add to credit account</button><div id="dxCreditChargeStatus" class="dx-credit-muted"></div></div>'+
   '<div class="dx-credit-action"><h3>Record payment</h3><div class="muted">Use this when the customer pays money off their outstanding credit balance.</div><div class="field">Payment amount (£)<input id="dxCreditPaymentAmount" inputmode="decimal" placeholder="e.g. 10.00"></div><div class="field">Payment note<input id="dxCreditPaymentDesc" placeholder="e.g. Cash payment"></div><button type="button" class="btn alt" id="dxCreditRecordPayment">Record payment</button><div id="dxCreditPaymentStatus" class="dx-credit-muted"></div></div></div>'+
   '<div class="summarybox"><b>Customer</b><br><span class="muted">'+esc(account.customer_name||cu.name||'Customer')+(account.phone?' · '+esc(account.phone):'')+(account.email?' · '+esc(account.email):'')+'</span></div>'+
   '<h3 style="margin-top:16px">Credit history</h3>'+(tx.length?tx.map(t=>{const type=String(t.transaction_type||'').toLowerCase(),sign=(type==='payment'||type.includes('credit')||type==='refund')?'-':'+';return '<div class="dx-credit-tx"><div class="dx-credit-head"><div><b>'+esc(type==='charge'?'Credit purchase':type==='payment'?'Payment received':type==='refund'?'Refund':'Credit adjustment')+'</b><div class="dx-credit-muted">'+esc(t.description||'')+(t.order_ref?' · Order '+esc(t.order_ref):'')+(t.due_date?' · Due '+esc(t.due_date):'')+' · '+new Date(t.created_at).toLocaleString('en-GB')+'</div></div><b>'+sign+pounds(t.amount_pence)+'</b></div>'+(type==='charge'?'<div class="dx-credit-muted">Remaining on this charge: '+pounds(t.remaining_pence)+'</div>':'')+'</div>'}).join(''):'<span class="muted">No credit transactions recorded.</span>');
  $('dxCreditSave').onclick=saveLimit;
  $('dxCreditAddCharge').onclick=addCharge;
  $('dxCreditRecordPayment').onclick=recordPayment;
 }catch(e){body.innerHTML='<div class="dx-credit-err">Could not load credit file: '+esc(e.message||e)+'</div>';}
}
function moneyInput(id){const raw=$(id)?.value.trim()||'';const n=Number(raw.replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.round(n*100):NaN}
async function addCharge(){
 const cu=typeof selectedCustomer==='function'?selectedCustomer():null,status=$('dxCreditChargeStatus'),btn=$('dxCreditAddCharge');if(!cu||!status||!btn)return;
 const amount=moneyInput('dxCreditChargeAmount'),description=$('dxCreditChargeDesc')?.value.trim()||'',due=$('dxCreditChargeDue')?.value||null,orderRef=$('dxCreditChargeRef')?.value.trim()||null;
 if(!Number.isFinite(amount)||amount<=0)return status.innerHTML='<span class="dx-credit-err">Enter an amount greater than £0.00.</span>';
 if(!description)return status.innerHTML='<span class="dx-credit-err">Enter what the credit was for.</span>';
 btn.disabled=true;status.textContent='Adding credit charge…';
 try{const a=await accountFor(cu);if(!a)throw Error('Approve a credit allowance before adding a charge.');await rpc('credit_add_charge',{p_account_id:a.id,p_amount_pence:amount,p_description:description,p_due_date:due,p_source:'backoffice',p_order_ref:orderRef,p_metadata:{entered_from:'backoffice_customer_file'}});status.innerHTML='<span class="dx-credit-ok">✓ Credit charge added.</span>';loadedFor='';await render();}
 catch(e){status.innerHTML='<span class="dx-credit-err">'+esc(e.message||e)+'</span>'}finally{btn.disabled=false}
}
async function recordPayment(){
 const cu=typeof selectedCustomer==='function'?selectedCustomer():null,status=$('dxCreditPaymentStatus'),btn=$('dxCreditRecordPayment');if(!cu||!status||!btn)return;
 const amount=moneyInput('dxCreditPaymentAmount'),description=$('dxCreditPaymentDesc')?.value.trim()||'Payment received';
 if(!Number.isFinite(amount)||amount<=0)return status.innerHTML='<span class="dx-credit-err">Enter an amount greater than £0.00.</span>';
 btn.disabled=true;status.textContent='Recording payment…';
 try{const a=await accountFor(cu);if(!a)throw Error('This customer does not have an approved credit account.');await rpc('credit_record_payment',{p_account_id:a.id,p_amount_pence:amount,p_description:description,p_source:'backoffice',p_metadata:{entered_from:'backoffice_customer_file'}});status.innerHTML='<span class="dx-credit-ok">✓ Payment recorded.</span>';loadedFor='';await render();}
 catch(e){status.innerHTML='<span class="dx-credit-err">'+esc(e.message||e)+'</span>'}finally{btn.disabled=false}
}
async function saveLimit(){
 const cu=typeof selectedCustomer==='function'?selectedCustomer():null;if(!cu)return;const input=$('dxCreditLimit'),notes=$('dxCreditNotes'),status=$('dxCreditStatus'),btn=$('dxCreditSave');
 const raw=input.value.trim();let p=null;if(raw){const n=Number(raw.replace(/[^0-9.-]/g,''));if(!Number.isFinite(n)||n<0)return status.innerHTML='<span class="dx-credit-err">Enter a valid non-negative credit limit.</span>';p=Math.round(n*100)}
 btn.disabled=true;status.textContent='Saving…';
 try{let a=await accountFor(cu);if(!a){if(p==null||p<=0)throw Error('Enter an approved credit limit greater than £0.00.');a=await createApprovedAccount(cu,p,notes?.value.trim()||null);status.innerHTML='<span class="dx-credit-ok">✓ Approved credit account created.</span>'}else{await rpc('credit_set_limit',{p_account_id:a.id,p_credit_limit_pence:p,p_notes:notes?.value.trim()||null});status.innerHTML='<span class="dx-credit-ok">✓ Credit limit saved.</span>'}loadedFor='';await render();}catch(e){status.innerHTML='<span class="dx-credit-err">'+esc(e.message||e)+'</span>'}finally{btn.disabled=false}
}
function hook(){addTab();style();const old=window.selectCustomerRecord;if(typeof old==='function'&&!old.__dxCreditWrapped){const wrapped=function(id){loadedFor='';const r=old.apply(this,arguments);setTimeout(render,50);return r};wrapped.__dxCreditWrapped=true;window.selectCustomerRecord=wrapped;}const oldClose=window.closeCustomerRecord;if(typeof oldClose==='function'&&!oldClose.__dxCreditWrapped){const wrapped=function(){loadedFor='';return oldClose.apply(this,arguments)};wrapped.__dxCreditWrapped=true;window.closeCustomerRecord=wrapped;}render()}
let tries=0;const boot=()=>{tries++;hook();if(tries<30)setTimeout(boot,500)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();