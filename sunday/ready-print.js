(function(root){
'use strict';
if(!root.SundayApi||!root.SundayPrinter||root.__dextersSundayReadyPrintHook)return;
root.__dextersSundayReadyPrintHook=true;
const PRINTER_IP='192.168.0.10';
const send=root.SundayPrinter.createSender();
const originalReady=root.SundayApi.ready.bind(root.SundayApi);
function marker(id){return 'dextersSundayReadyPrinted:'+String(id||'')}
root.SundayApi.ready=async function(id){
  const result=await originalReady(id);
  const order=result&&result.order;
  if(!order||!order.id)throw Error('Order is READY, but the ticket could not be prepared for printing.');
  if(localStorage.getItem(marker(order.id))==='1')return result;
  try{
    const text=root.SundayPrinter.ticket(order);
    await send(PRINTER_IP,text);
    localStorage.setItem(marker(order.id),'1');
    return result;
  }catch(e){
    throw Error('Order is READY, but the ticket did not print. Check the Epson printer, paper and Wi-Fi before retrying. '+(e&&e.message?e.message:''));
  }
};
})(window);
