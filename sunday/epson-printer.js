(function(root){
'use strict';
const clean=value=>String(value??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const xml=value=>clean(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function ticket(order,{sample=false}={}){
  if(!order || !Array.isArray(order.items) || !order.items.length)throw Error('This order has no ticket items.');
  const lines=[sample?'TEST TICKET - NOT A REAL ORDER':'SUNDAY CUSTOMER ORDER',
    'SR-'+String(order.order_number??'').padStart(3,'0'),
    'Collection: '+clean(order.collection_date)+' at '+clean(order.collection_slot),
    'Customer: '+clean(order.customer_name), 'Phone: '+clean(order.customer_phone),
    'Status: '+clean(order.status||'sample'), '--------------------------------'];
  for(const item of order.items){
    if(!Number.isInteger(Number(item.qty)) || Number(item.qty)<=0 || !item.name)throw Error('An item has an invalid quantity or name.');
    lines.push(Number(item.qty)+' x '+clean(item.name));
  }
  if(order.notes)lines.push('Notes: '+clean(order.notes));
  if(!Number.isInteger(Number(order.total_pence)) || Number(order.total_pence)<0)throw Error('The order total is invalid.');
  lines.push('--------------------------------','Order total: GBP '+(Number(order.total_pence)/100).toFixed(2));
  if(sample)lines.push('TEST ONLY - DO NOT PREPARE');
  return lines.join('\n')+'\n';
}
function envelope(text){return '<?xml version="1.0" encoding="utf-8"?>'+
  '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>'+ 
  '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">'+
  '<text align="center" width="1" height="1">DEXTER&apos;S KITCHEN\n</text>'+
  '<text align="left" width="1" height="1">'+xml(text)+'</text><feed line="2"/><cut type="feed"/>'+
  '</epos-print></s:Body></s:Envelope>';}
function endpoint(ip){
  const parts=String(ip).trim().split('.');
  if(parts.length!==4 || parts.some(p=>!/^\d{1,3}$/.test(p)||Number(p)>255))throw Error('Enter the Epson printer’s IPv4 address, for example 192.168.0.10.');
  return 'https://'+parts.map(Number).join('.')+'/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000';
}
function acknowledgement(text,Parser=root.DOMParser){
  const doc=new Parser().parseFromString(text,'text/xml');
  if(doc.getElementsByTagName('parsererror').length)throw Error('The printer returned an unreadable response. Check the paper before retrying.');
  const response=doc.getElementsByTagNameNS('http://www.epson-pos.com/schemas/2011/03/epos-print','response')[0];
  if(!response)throw Error('No Epson confirmation was received. Check the paper before retrying.');
  if(response.getAttribute('success')!=='true')throw Error('Epson did not confirm printing ('+(response.getAttribute('code')||'unknown printer error')+'). Check the printer and paper before retrying.');
  return true;
}
function createSender(fetcher=root.fetch.bind(root),Parser=root.DOMParser){
  let busy=false;
  return async function send(ip,text){
    if(busy)throw Error('A ticket is already being sent.');
    const url=endpoint(ip),body=envelope(text),controller=new AbortController();
    busy=true;const timer=setTimeout(()=>controller.abort(),15000);
    try{
      let response,reply;
      try{
        response=await fetcher(url,{method:'POST',headers:{'Content-Type':'text/xml; charset=utf-8','SOAPAction':'','If-Modified-Since':'Thu, 01 Jan 1970 00:00:00 GMT'},body,signal:controller.signal,credentials:'omit',cache:'no-store'});
        reply=await response.text();
      }catch(e){throw Error((e.name==='AbortError'?'The printer timed out.':'Could not confirm the printer connection.')+' Check the paper before retrying. Use the same Wi-Fi as the printer and confirm its current IP address.');}
      if(!response.ok)throw Error('Printer HTTP '+response.status+'. Check the paper before retrying.');
      return acknowledgement(reply,Parser);
    }finally{clearTimeout(timer);busy=false;}
  };
}
root.SundayPrinter={ticket,envelope,endpoint,acknowledgement,createSender};
if(typeof module==='object' && module.exports)module.exports=root.SundayPrinter;
})(typeof window==='object'?window:globalThis);
