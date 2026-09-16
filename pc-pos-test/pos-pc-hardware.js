(()=>{
'use strict';
const VERSION='2026-09-15.3';
const INSTALLER='windows-hardware/Install-DextersPOSHardware.cmd';
const CLAIM_API=U+'/functions/v1/pc-pos-receipt-claim';
const $h=id=>document.getElementById(id);
const escH=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const moneyH=n=>'£'+Number(n||0).toFixed(2);
function status(msg){const el=$h('status');if(el)el.textContent=msg}
function b64Json(obj){const txt=JSON.stringify(obj);return btoa(unescape(encodeURIComponent(txt))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function launch(action,payload){
  const q=payload?'?payload='+encodeURIComponent(b64Json(payload)):'';
  try{window.location.href='dexterscitaq://'+action+q;return true}catch(e){status('Dexter’s hardware helper could not open. Use Hardware → Install helper.');return false}
}
function safeLoyalty(sale){
  const x=sale?.loyalty;if(x?.loyalty_code)return x;
  try{const y=JSON.parse(localStorage.getItem('dexters_pos_test_loyalty_customer_v1')||'null');return y?.loyalty_code?y:null}catch{return null}
}
function normaliseSale(sale){
  const loyalty=safeLoyalty(sale);
  const saleId=String(sale?.id||('PC-'+Date.now()));
  const transactionRef=saleId.replace(/[^A-Za-z0-9]/g,'').slice(-8).toUpperCase();
  return {
    schema:1,
    action:'print_sale',
    printer:'POS-80',
    drawer:String(sale?.method||'').toLowerCase()==='cash',
    receipt_kind:loyalty?'loyalty':'standard',
    test_mode:true,
    sale:{
      id:saleId,
      transaction_ref:transactionRef,
      transaction_barcode:'DXT-'+transactionRef,
      order_number:sale?.orderNumber||sale?.order_number||'',
      created_at:sale?.created_at||sale?.createdAt||new Date().toISOString(),
      method:String(sale?.method||'').toUpperCase(),
      subtotal:Number(sale?.subtotal??sale?.total??0),
      discount:Number(sale?.discount||0),
      discount_name:String(sale?.discount_name||''),
      total:Number(sale?.total||0),
      tendered:Number(sale?.tendered||0),
      change:Number(sale?.change||0),
      mode:sale?.mode||S?.mode||'Counter',
      table_no:sale?.tableNo||S?.tableNo||'',
      staff:sale?.staff||S?.staffName||S?.staffEmail?.split('@')[0]||'Staff',
      customer:sale?.customer||S?.customer||'',
      items:(sale?.items||[]).map(i=>({name:i.name||i.item_name||'Item',qty:Number(i.qty||i.quantity||1),unit:Number(i.unit||i.price||0),mods:i.mods||i.modifiers||[]}))
    },
    loyalty:loyalty?{
      full_name:loyalty.full_name||loyalty.name||S?.customer||'Customer',
      loyalty_code:String(loyalty.loyalty_code||''),
      points:Number(loyalty.points||0),
      coffee_stamps_earned:Number(loyalty.coffee_stamps_earned||0)
    }:null
  };
}
async function rewardClaim(p){
  const token=S?.session?.access_token||'';
  if(!token||Number(p?.sale?.total||0)<1)return '';
  const r=await fetch(CLAIM_API,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({receipt_id:String(p.sale.id),order_value_pence:Math.round(Number(p.sale.total||0)*100)})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.claim_token)throw new Error(d.error||'Reward QR unavailable');
  return String(d.claim_token);
}
async function printSale(sale){
  const p=normaliseSale(sale);
  try{p.sale.claim_token=await rewardClaim(p)}catch(e){status('Receipt will print, but the Scan to Win QR could not be created: '+String(e.message||e))}
  launch('print-pos',p);
  if(p.sale.claim_token)status((p.receipt_kind==='loyalty'?'Loyalty':'Standard')+' receipt sent to POS-80 · Scan to Win QR ready'+(p.drawer?' · cash drawer requested':' · drawer stays closed'));
}
function testReceipt(kind='standard',drawer=false){
  const sale={id:'HW-TEST-'+Date.now(),created_at:new Date().toISOString(),method:drawer?'cash':'card',total:3.5,tendered:drawer?5:3.5,change:drawer?1.5:0,mode:'Counter',staff:S?.staffName||S?.staffEmail?.split('@')[0]||'Test',items:[{name:'Hardware Test Item',qty:1,unit:3.5,mods:[]}],loyalty:kind==='loyalty'?{full_name:'Dexter Test Customer',loyalty_code:'123456',points:125,coffee_stamps_earned:1}:null};
  printSale(sale);
}
function hardwareDialog(){
  const html='<div class="group"><b>POS-80 Receipt Printer</b><br><span style="color:#9eb0c5">Hardware bridge '+VERSION+'</span><br><br>Cash payments: <b>print + open drawer</b><br>Card payments: <b>print only — drawer stays closed</b><br>Loyalty customer attached: <b>Dexter’s Loyalty receipt layout</b><br>No loyalty customer: <b>standard receipt layout</b></div>'+
    '<div class="actions"><button id="hwPrintCard">TEST CARD RECEIPT</button><button id="hwPrintCash">TEST CASH + DRAWER</button></div>'+
    '<div class="actions"><button id="hwPrintLoyalty">TEST LOYALTY RECEIPT</button><button id="hwDrawer">OPEN DRAWER</button></div>'+
    '<p style="color:#9eb0c5">The Windows helper must be installed once on this till.</p><a id="hwInstaller" class="confirm" style="display:block;text-align:center;text-decoration:none;padding:13px;border-radius:12px;color:#08101d" href="'+INSTALLER+'" download>DOWNLOAD WINDOWS HARDWARE HELPER</a>';
  let d=null;
  if(window.DextersPosModal)d=window.DextersPosModal('Printer / Cash Drawer',html,false);
  else if(typeof window.modal==='function')d=window.modal('Printer / Cash Drawer',html,false);
  if(!d){alert('Hardware helper: '+location.origin+'/'+location.pathname.replace(/[^/]+$/,'')+INSTALLER);return}
  d.querySelector('#hwPrintCard').onclick=()=>testReceipt('standard',false);
  d.querySelector('#hwPrintCash').onclick=()=>testReceipt('standard',true);
  d.querySelector('#hwPrintLoyalty').onclick=()=>testReceipt('loyalty',false);
  d.querySelector('#hwDrawer').onclick=()=>{launch('drawer');status('Cash drawer open command sent.')};
}
function installButton(){
  if($h('pcHardwareBtn'))return;
  const top=document.querySelector('.top');if(!top)return;
  const b=document.createElement('button');b.id='pcHardwareBtn';b.textContent='Hardware';b.title='POS-80 printer and cash drawer';
  top.insertBefore(b,$h('staffBtn')||null);b.onclick=hardwareDialog;
}
window.DextersPosHardware={printSale,openDrawer:()=>launch('drawer'),testReceipt,version:VERSION};
window.addEventListener('dexters-pc-test-sale-complete',e=>{if(e?.detail)printSale(e.detail)});
window.addEventListener('load',installButton);if(document.readyState!=='loading')setTimeout(installButton,0);
})();
