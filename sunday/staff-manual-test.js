(function(){
'use strict';
const C=SundayRoast,$=id=>document.getElementById(id),KEY='dexters_sunday_staff_manual_test_v1';
const priceMap={beef:1499,chicken:1499,kids_beef:999,kids_chicken:999};
const nameMap={beef:'Adult Beef Roast',chicken:'Adult Chicken Roast',kids_beef:'Kids Beef Roast',kids_chicken:'Kids Chicken Roast'};
function money(p){return '£'+(Math.max(0,Math.round(p))/100).toFixed(2)}
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function write(v){localStorage.setItem(KEY,JSON.stringify(v))}
function calc(){
 const meal=$('meal').value,qty=Math.max(1,Math.min(50,parseInt($('qty').value||'1',10)||1));
 const total=priceMap[meal]*qty;
 const status=$('paymentStatus').value;
 let paid=Math.max(0,Math.round((Number($('amountPaid').value)||0)*100));
 if(status==='paid_full')paid=total;
 if(status==='unpaid')paid=0;
 paid=Math.min(total,paid);
 $('amountPaid').value=(paid/100).toFixed(2);
 $('orderTotal').textContent=money(total);
 $('balance').textContent=money(total-paid);
 return{meal,qty,total,paid,balance:total-paid,status};
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){
 const items=read();
 $('orders').innerHTML=items.length?items.map(o=>`<article class="order-card">
 <div><span class="badge">${esc(o.testOrderNo)}</span><span class="badge">${esc(o.paymentLabel)}</span></div>
 <h3>${esc(o.customerName)} — ${o.qty} × ${esc(nameMap[o.meal])}</h3>
 <p>${esc(o.collectionDate)} at ${esc(o.collectionTime||'time not set')}</p>
 <p>Total <strong>${money(o.total)}</strong> · Paid <strong>${money(o.paid)}</strong> · Balance <strong>${money(o.balance)}</strong></p>
 ${o.phone?'<p>'+esc(o.phone)+'</p>':''}
 ${o.notes?'<p>'+esc(o.notes)+'</p>':''}
 </article>`).join(''):'<p class="muted">No manual test orders saved yet.</p>';
}
function paymentLabel(s){return s==='paid_full'?'PAID IN FULL':s==='deposit_paid'?'DEPOSIT PAID':'UNPAID'}
['meal','qty','paymentStatus','amountPaid'].forEach(id=>$(id).addEventListener('input',calc));
$('paymentStatus').addEventListener('change',()=>{
 const meal=$('meal').value,qty=Math.max(1,parseInt($('qty').value||'1',10)||1),total=priceMap[meal]*qty;
 if($('paymentStatus').value==='paid_full')$('amountPaid').value=(total/100).toFixed(2);
 else if($('paymentStatus').value==='unpaid')$('amountPaid').value='0.00';
 else if(Number($('amountPaid').value)*100>=total)$('amountPaid').value=(Math.min(500,total)/100).toFixed(2);
 calc();
});
$('meal').addEventListener('change',()=>{
 if($('paymentStatus').value==='paid_full'){
   const total=priceMap[$('meal').value]*(parseInt($('qty').value||'1',10)||1);
   $('amountPaid').value=(total/100).toFixed(2);
 }
 calc();
});
$('qty').addEventListener('input',()=>{
 if($('paymentStatus').value==='paid_full'){
   const total=priceMap[$('meal').value]*(parseInt($('qty').value||'1',10)||1);
   $('amountPaid').value=(total/100).toFixed(2);
 }
 calc();
});
$('save').onclick=()=>{
 $('message').textContent='';
 const customerName=$('customerName').value.trim(),phone=$('customerPhone').value.trim(),collectionDate=$('collectionDate').value,collectionTime=$('collectionTime').value;
 if(!customerName){$('message').textContent='Enter the customer name.';return}
 if(!collectionDate){$('message').textContent='Choose the collection date.';return}
 const p=calc();
 if(p.status==='deposit_paid'&&p.paid<=0){$('message').textContent='Enter the deposit amount already paid.';return}
 if(p.status==='deposit_paid'&&p.balance<=0){$('message').textContent='Deposit Paid must leave a balance. Choose Paid in Full if the whole order has been paid.';return}
 const items=read();
 const order={
   id:crypto.randomUUID(),
   testOrderNo:'TEST-SR-'+String(items.length+1).padStart(3,'0'),
   createdAt:new Date().toISOString(),customerName,phone,meal:p.meal,qty:p.qty,
   collectionDate,collectionTime,notes:$('notes').value.trim(),
   paymentStatus:p.status,paymentLabel:paymentLabel(p.status),total:p.total,paid:p.paid,balance:p.balance,
   source:'staff_manual_test',testOnly:true
 };
 items.unshift(order);write(items);render();
 $('message').textContent=order.testOrderNo+' saved locally as '+order.paymentLabel+'.';
};
$('clear').onclick=()=>{localStorage.removeItem(KEY);render();$('message').textContent='Test orders cleared.'};
calc();render();
})();