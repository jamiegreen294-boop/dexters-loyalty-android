(function(root){
'use strict';
if(!root.SundayApi||!root.SundayPrinter||root.__dextersSundayReadyPrintHook)return;
root.__dextersSundayReadyPrintHook=true;
const PRINTER_IP='192.168.0.10',U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const send=root.SundayPrinter.createSender();
const originalReady=root.SundayApi.ready.bind(root.SundayApi);
function marker(id){return 'dextersSundayReadyPrinted:'+String(id||'')}
function token(){try{const x=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');return x?.access_token||x?.currentSession?.access_token||x?.session?.access_token||''}catch{return''}}
async function receipt(order){
  const t=token();if(!t)throw Error('Please sign in again before printing the Sunday ticket.');
  const r=await fetch(U+'/rest/v1/rpc/staff_issue_sunday_receipt_points',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({p_order_id:order.id})});
  const d=await r.json().catch(()=>null);if(!r.ok)throw Error((d&&d.message)||'Could not prepare the Sunday receipt details.');
  const x=Array.isArray(d)?d[0]:d;if(!x)throw Error('Could not prepare the Sunday receipt details.');
  return {...order,claim_token:x.claim_token||'',points:Number(x.points)||0,app_customer:!!x.app_customer,deposit_pence:Number(x.deposit_pence??order.deposit_pence)||0,balance_pence:Number(x.balance_pence??order.balance_pence)||0,payment_status:x.payment_status||order.payment_status};
}
root.SundayApi.ready=async function(id){
  const result=await originalReady(id);
  const order=result&&result.order;
  if(!order||!order.id)throw Error('Order is READY, but the ticket could not be prepared for printing.');
  if(localStorage.getItem(marker(order.id))==='1')return result;
  try{
    const printable=await receipt(order);
    const text=root.SundayPrinter.ticket(printable);
    await send(PRINTER_IP,text,printable.claim_token||'');
    localStorage.setItem(marker(order.id),'1');
    return result;
  }catch(e){
    throw Error('Order is READY, but the ticket did not print. Check the Epson printer, paper and Wi-Fi before retrying. '+(e&&e.message?e.message:''));
  }
};
})(window);
