(function(){
'use strict';
const A=window.SundayApi;
const params=new URLSearchParams(location.search);
if(!A||params.get('payment')!=='success')return;
const sessionId=String(params.get('session_id')||'').trim();
if(!sessionId)return;
const key='dexters-sunday-payment-confirmed-'+sessionId;
let stopped=false,tries=0;
const money=p=>'£'+(Number(p||0)/100).toFixed(2);
const fmtDate=d=>{try{return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(String(d)+'T12:00:00Z'))}catch{return String(d||'')}};
function show(o){
 const msg=document.getElementById('message');
 const dep=Number(o.deposit_pence||0);
 const bal=Number(o.balance_due_pence??Math.max(0,(Number(o.total_pence)||0)-dep));
 const text='✅ Deposit paid — Sunday Roast confirmed. Collection: '+fmtDate(o.collection_date)+' at '+String(o.collection_slot||'')+'. Remaining balance '+money(bal)+' is payable on collection.';
 if(msg)msg.textContent=text;
 try{
   if(localStorage.getItem(key)!=='1'){
     localStorage.setItem(key,'1');
     setTimeout(()=>alert(text),150);
   }
 }catch{}
 stopped=true;
}
async function check(){
 if(stopped)return;
 tries++;
 try{
   const r=await A.myOrders();
   const orders=r?.orders||[];
   const o=orders.find(x=>String(x.stripe_checkout_session_id||'')===sessionId);
   if(o&&String(o.payment_status||'')==='completed'){show(o);return;}
   const msg=document.getElementById('message');
   if(msg)msg.textContent='Payment received. Waiting for secure Stripe confirmation…';
 }catch{}
 if(tries<30)setTimeout(check,2000);
}
setTimeout(check,300);
})();
