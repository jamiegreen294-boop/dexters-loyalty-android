// Test-only Epson TM-m30II direct print hook for Sunday customer tickets.
// Reuses the exact working KDS ePOS route/config used by dexters-kds.
// Visible Sunday KDS layout and normal order behaviour are unchanged.
const SUNDAY_PRINTER_CFG='dexters-printer-config-v1';
function sundayPrinterCfg(){
  try{return Object.assign({ip:'192.168.0.10',proto:'https'},JSON.parse(localStorage.getItem(SUNDAY_PRINTER_CFG)||'{}'))}
  catch{return {ip:'192.168.0.10',proto:'https'}}
}
function sundayXmlEsc(s){return String(s??'').replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[c]))}
function sundayTicketXml(o){
  const number='SR-'+String(o.order_number).padStart(3,'0');
  const rows=[
    'SUNDAY DINNER',
    'Customer: '+String(o.customer_name||''),
    'Phone: '+String(o.customer_phone||''),
    'Collection: '+String(o.collection_date||'')+' '+String(o.collection_slot||''),
    '--------------------------------'
  ];
  (o.items||[]).forEach(i=>rows.push((Number(i.qty)||0)+' x '+String(i.name||'')));
  if(o.rejection_reason)rows.push('NOTE: '+String(o.rejection_reason));
  rows.push('','Attach this ticket to prepared order.');
  const inner='<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print"><text align="center" width="1" height="1">DEXTER&apos;S KITCHEN\n</text><text align="center" width="2" height="2">'+sundayXmlEsc(number)+'\n</text><text align="left" width="1" height="1">'+rows.map(x=>sundayXmlEsc(x)+'\n').join('')+'</text><feed line="1"/><cut type="feed"/></epos-print>';
  return '<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>'+inner+'</s:Body></s:Envelope>';
}
async function sundayEposPrint(o){
  const c=sundayPrinterCfg();
  const url=c.proto+'://'+c.ip+'/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000';
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/xml; charset=utf-8','If-Modified-Since':'Thu, 01 Jan 1970 00:00:00 GMT','SOAPAction':''},body:sundayTicketXml(o)});
  const txt=await r.text();
  if(!r.ok)throw Error('Printer HTTP '+r.status);
  if(/success="false"/i.test(txt)){const m=txt.match(/code="([^"]*)"/i);throw Error(m&&m[1]?m[1]:'Printer rejected the job')}
  return txt;
}
async function printCustomerOrder(id){
  const o=lastAll.find(x=>x.id===id);
  if(!o){alert('Customer order not found. Refresh and try again.');return}
  const number='SR-'+String(o.order_number).padStart(3,'0');
  try{
    await sundayEposPrint(o);
    alert(number+' printed on Epson TM-m30.');
  }catch(e){
    alert('Epson print failed for '+number+': '+(e?.message||e));
  }
}
