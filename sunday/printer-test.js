(function(){
'use strict';
const $=id=>document.getElementById(id),P=SundayPrinter,send=P.createSender();
let orders=[],selected=null,busy=false,loading=false,attempted=new Set(),loadVersion=0;
const nextSunday=new Date();nextSunday.setDate(nextSunday.getDate()+((7-nextSunday.getDay())%7));
const date=[nextSunday.getFullYear(),String(nextSunday.getMonth()+1).padStart(2,'0'),String(nextSunday.getDate()).padStart(2,'0')].join('-');
$('date').value=date;
const sample={order_number:'TEST',customer_name:'Sample Customer',customer_phone:'TEST - no customer phone',collection_date:date,collection_slot:'12:30',status:'sample',items:[{name:'Adult Chicken Sunday Roast',qty:1},{name:'Kids Beef Sunday Roast',qty:1},{name:'Extra Gravy',qty:1}],total_pence:2598};
function key(){return selected?'order:'+selected.id:'sample';}
function preview(){
  try{$('ticket').textContent=P.ticket(selected||sample,{sample:!selected});$('print').disabled=busy||loading;}
  catch(e){$('ticket').textContent='';$('message').textContent=e.message;$('print').disabled=true;}
  $('print').textContent=(attempted.has(key())?'Print again: ':'Print ')+(selected?'customer order':'sample ticket');
}
function sampleTicket(){selected=null;$('orders').value='';$('message').textContent='Sample selected. This does not create a customer order.';preview();}
$('sample').addEventListener('click',sampleTicket);
$('orders').addEventListener('change',()=>{selected=orders.find(o=>o.id===$('orders').value)||null;$('message').textContent='';preview();});
$('date').addEventListener('change',()=>{loadVersion++;orders=[];$('orders').replaceChildren(new Option('Sample ticket — not a real order',''));sampleTicket();});
$('load').addEventListener('click',async()=>{
  if(busy||loading)return;
  const value=$('date').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T12:00:00Z').getUTCDay()!==0){$('message').textContent='Choose a Sunday collection date.';return;}
  loading=true;const version=++loadVersion;$('load').disabled=true;orders=[];selected=null;$('orders').replaceChildren(new Option('Sample ticket — not a real order',''));preview();$('message').textContent='Loading Sunday orders…';
  try{
    const data=await SundayApi.allOrders(value);
    if(version!==loadVersion)return;
    orders=(data.orders||[]).filter(o=>o.id && o.collection_date===value);
    for(const o of orders)$('orders').add(new Option('SR-'+String(o.order_number).padStart(3,'0')+' · '+o.customer_name+' · '+o.collection_slot+' · '+o.status,o.id));
    $('message').textContent=orders.length?'Choose a customer order to preview its ticket.':'No customer orders for this Sunday. You can print the sample ticket.';
  }catch(e){if(version===loadVersion)$('message').textContent=e.message||'Could not load orders.';}
  finally{loading=false;$('load').disabled=false;preview();}
});
$('print').addEventListener('click',async()=>{
  if(busy||loading)return;
  if(attempted.has(key())&&!confirm('This ticket was already sent or attempted. Check the paper first. Print another copy?'))return;
  let text;
  try{P.endpoint($('ip').value);text=P.ticket(selected||sample,{sample:!selected});}catch(e){$('message').textContent=e.message;return;}
  busy=true;attempted.add(key());
  for(const id of ['print','sample','load','orders','date','ip'])$(id).disabled=true;
  $('message').textContent='Sending ticket to Epson. Waiting for the printer’s confirmation…';
  try{await send($('ip').value,text);$('message').textContent='Epson confirmed the print request. Check that the complete ticket came out.';}
  catch(e){$('message').textContent=e.message;}
  finally{busy=false;for(const id of ['print','sample','load','orders','date','ip'])$(id).disabled=false;preview();}
});
preview();
})();
