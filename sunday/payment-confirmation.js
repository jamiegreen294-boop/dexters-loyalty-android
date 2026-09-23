(function(){
'use strict';
const A=window.SundayApi;
const params=new URLSearchParams(location.search);
if(!A)return;
const squareOrder=String(params.get('square_order')||'').trim();
const stripeSession=String(params.get('session_id')||'').trim();
const squareReturn=params.get('payment')==='square_success'&&squareOrder;
const stripeReturn=params.get('payment')==='success'&&stripeSession;
if(!squareReturn&&!stripeReturn)return;
const key='dexters-sunday-payment-confirmed-'+(squareOrder||stripeSession);
let stopped=false,tries=0;
const money=p=>'£'+(Number(p||0)/100).toFixed(2);
const fmtDate=d=>{try{return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(String(d)+'T12:00:00Z'))}catch{return String(d||'')}};
function show(o){
 const msg=document.getElementById('message');
 const paid=Math.max(0,Number(o.total_pence||0)-Number(o.balance_pence||0));
 const bal=Math.max(0,Number(o.balance_pence||0));
 const text=bal<=0
  ?'✅ Paid in full — Sunday Roast confirmed. Collection: '+fmtDate(o.collection_date)+' at '+String(o.collection_slot||'')+'.'
  :'✅ Deposit paid — Sunday Roast confirmed. Collection: '+fmtDate(o.collection_date)+' at '+String(o.collection_slot||'')+'. Paid '+money(paid)+'. Remaining balance '+money(bal)+' is payable on collection.';
 if(msg)msg.textContent=text;
 try{if(localStorage.getItem(key)!=='1'){localStorage.setItem(key,'1');setTimeout(()=>alert(text),150)}}catch{}
 stopped=true;
}
async function check(){
 if(stopped)return;
 tries++;
 try{
   if(squareReturn)await A.verifySquare(squareOrder);
   const r=await A.myOrders(),orders=r?.orders||[];
   const o=squareReturn?orders.find(x=>String(x.id||'')===squareOrder):orders.find(x=>String(x.stripe_checkout_session_id||'')===stripeSession);
   if(o&&String(o.payment_status||'')==='completed'){show(o);return}
   const msg=document.getElementById('message');
   if(msg)msg.textContent=squareReturn?'Payment received. Waiting for secure Square confirmation…':'Payment received. Waiting for secure Stripe confirmation…';
 }catch{}
 if(tries<30)setTimeout(check,2000);
}
setTimeout(check,300);
})();