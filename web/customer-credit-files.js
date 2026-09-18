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
 tabs.appendChild(b);
 const wrap=$('custProfileWrap');if(!wrap)return;
 const pane=document.createElement('div');pane.className='staff-tabpane';pane.id='custPane-credit';pane.innerHTML='<div id="dxCreditBody"><span class="muted">Open Credit to load the customer credit file.</span></div>';
 wrap.appendChild(pane);
}
function style(){if($('dxCreditStyle'))return;const s=document.createElement('style');s.id='dxCreditStyle';s.textContent='#custPane-credit .dx-credit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0}#custPane-credit .dx-credit-box{background:#f7f7f9;border:1px solid #dedde3;border-radius:10px;padding:12px;color:#3e3941}#custPane-credit .dx-credit-box small{display:block;color:#77717b;margin-bottom:4px}#custPane-credit .dx-credit-box b{font-size:20px}#custPane-credit .dx-credit-form{background:#fff;border:1px solid #dedde3;border-radius:10px;padding:14px;margin:12px 0}#custPane-credit .dx-credit-tx{background:#fff;border:1px solid #dedde3;border-radius:10px;padding:11px;margin:7px 0}#custPane-credit .dx-credit-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}#custPane-credit .dx-credit-muted{font-size:12px;color:#77717b;margin-top:3px}#custPane-credit .dx-credit-ok{color:#18794e;font-weight:800}#custPane-credit .dx-credit-err{color:#b42318;font-weight:800}@media(max-width:650px){#custPane-credit .dx-credit-grid{grid-template-columns:1fr}}';document.head.appendChild(s)}
async function rpc(name,args){const c=client();const s=session();if(!c||!s?.access_token)throw Error('Please sign in again.');const {data,error}=await c.rpc(name,args);if(error)throw error;return data}
async function accountFor(cu){
 const c=client();if(!c)throw Error('Secure database is not available.');
 const select='id,loyalty_user_id,customer_name,phone,email,status,balance_pence,credit_limit_pence,notes,last_activity_at,payment_reference';
 if(cu.liveId){
  const {data,error}=await c.from('customer_credit_accounts').select(select).eq('loyalty_user_id',cu.liveId).maybeSingle();
  if(error)throw error;if(data)return data;
 }else{
  const rows=await rpc('credit_search_customers',{p_query:cu.name||'',p_limit:50});
  const found=(Array.isArray(rows)?rows:[]).find(x=>String(x.customer_name||'').toLowerCase()===String(cu.name||'').toLowerCase()&&(cu.phone?String(x.phone||'')===String(cu.phone):true));
  if(found?.account_id){
   const {data,error}=await c.from('customer_credit_accounts').select(select).eq('id',found.account_id).single();
   if(error)throw error;if(data)return data;
  }
 }
 const id=await rpc('credit_create_customer',{p_customer_name:cu.name||'Customer',p_phone:cu.phone||null,p_email:cu.email||null,p_loyalty_user_id:cu.liveId||null,p_notes:null});
 const r=await c.from('customer_credit_accounts').select(select).eq('id',id).single();
 if(r.error)throw r.error;return r.data;
}
async function render(){
 addTab();style();const body=$('dxCreditBody'),cu=typeof selectedCustomer==='function'?selectedCustomer():null;
 if(!body||!cu)return;
 if(!admin()){body.innerHTML='<span class="muted">Staff/admin access required to view credit files.</span>';return}
 if(loadedFor===cu.id)return;
 loadedFor=cu.id;body.innerHTML='<span class="muted">Loading credit file…</span>';
 try{
  const a=await accountFor(cu);const detail=await rpc('credit_account_detail',{p_account_id:a.id});const account=detail?.account||a,tx=Array.isArray(detail?.transactions)?detail.transactions:[];
  const bal=Number(account.balance_pence||0),lim=account.credit_limit_pence==null?null:Number(account.credit_limit_pence),available=lim==null?null:Math.max(0,lim-bal),overdue=Number(detail?.overdue_pence||0);
  body.innerHTML='<div class="dx-credit-grid"><div class="dx-credit-box"><small>Outstanding</small><b>'+pounds(bal)+'</b></div><div class="dx-credit-box"><small>Credit limit</small><b>'+(lim==null?'Not set':pounds(lim))+'</b></div><div class="dx-credit-box"><small>Available credit</small><b>'+(available==null?'—':pounds(available))+'</b></div></div>'+
   '<div class="summarybox"><b>Credit file</b><br><span class="muted">Reference: '+esc(account.payment_reference||'—')+' · Status: '+esc(String(account.status||'active').toUpperCase())+(overdue>0?' · Overdue '+pounds(overdue):'')+'</span></div>'+
   '<div class="dx-credit-form"><b>Set customer credit limit</b><div class="muted" style="margin:5px 0 9px">Leave blank to remove the limit. Enter the maximum outstanding balance this customer is allowed.</div><div class="field">Credit limit (£)<input id="dxCreditLimit" inputmode="decimal" value="'+(lim==null?'':(lim/100).toFixed(2))+'" placeholder="e.g. 100.00"></div><div class="field">Internal credit notes<textarea id="dxCreditNotes" rows="3" placeholder="Optional notes">'+esc(account.notes||'')+'</textarea></div><button type="button" class="btn" id="dxCreditSave">Save credit limit</button><div id="dxCreditStatus" class="dx-credit-muted"></div></div>'+
   '<div class="summarybox"><b>Customer</b><br><span class="muted">'+esc(account.customer_name||cu.name||'Customer')+(account.phone?' · '+esc(account.phone):'')+(account.email?' · '+esc(account.email):'')+'</span></div>'+
   '<h3 style="margin-top:16px">Credit history</h3>'+(tx.length?tx.map(t=>{const type=String(t.transaction_type||'').toLowerCase(),sign=(type==='payment'||type.includes('credit')||type==='refund')?'-':'+';return '<div class="dx-credit-tx"><div class="dx-credit-head"><div><b>'+esc(type==='charge'?'Credit purchase':type==='payment'?'Payment received':type==='refund'?'Refund':'Credit adjustment')+'</b><div class="dx-credit-muted">'+esc(t.description||'')+(t.order_ref?' · Order '+esc(t.order_ref):'')+(t.due_date?' · Due '+esc(t.due_date):'')+' · '+new Date(t.created_at).toLocaleString('en-GB')+'</div></div><b>'+sign+pounds(t.amount_pence)+'</b></div>'+(type==='charge'?'<div class="dx-credit-muted">Remaining on this charge: '+pounds(t.remaining_pence)+'</div>':'')+'</div>'}).join(''):'<span class="muted">No credit transactions recorded.</span>');
  $('dxCreditSave').onclick=saveLimit;
 }catch(e){body.innerHTML='<div class="dx-credit-err">Could not load credit file: '+esc(e.message||e)+'</div>';}
}
async function saveLimit(){
 const cu=typeof selectedCustomer==='function'?selectedCustomer():null;if(!cu)return;const input=$('dxCreditLimit'),notes=$('dxCreditNotes'),status=$('dxCreditStatus'),btn=$('dxCreditSave');
 const raw=input.value.trim();let p=null;if(raw){const n=Number(raw.replace(/[^0-9.-]/g,''));if(!Number.isFinite(n)||n<0)return status.innerHTML='<span class="dx-credit-err">Enter a valid non-negative credit limit.</span>';p=Math.round(n*100)}
 btn.disabled=true;status.textContent='Saving…';
 try{const a=await accountFor(cu);await rpc('credit_set_limit',{p_account_id:a.id,p_credit_limit_pence:p,p_notes:notes?.value.trim()||null})status.innerHTML='<span class="dx-credit-ok">✓ Credit limit saved.</span>';loadedFor='';await render();}catch(e){status.innerHTML='<span class="dx-credit-err">'+esc(e.message||e)+'</span>'}finally{btn.disabled=false}
}
function hook(){addTab();style();const old=window.selectCustomerRecord;if(typeof old==='function'&&!old.__dxCreditWrapped){const wrapped=function(id){loadedFor='';const r=old.apply(this,arguments);setTimeout(render,50);return r};wrapped.__dxCreditWrapped=true;window.selectCustomerRecord=wrapped;}const oldClose=window.closeCustomerRecord;if(typeof oldClose==='function'&&!oldClose.__dxCreditWrapped){const wrapped=function(){loadedFor='';return oldClose.apply(this,arguments)};wrapped.__dxCreditWrapped=true;window.closeCustomerRecord=wrapped;}render()}
let tries=0;const boot=()=>{tries++;hook();if(tries<30)setTimeout(boot,500)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();