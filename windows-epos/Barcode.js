'use strict';

const DEFAULT_TIMEOUT_MS=80;

function normaliseBarcode(value){
  return String(value||'').trim().replace(/\s+/g,'');
}
function looksLikeBarcode(value){
  const v=normaliseBarcode(value);
  return /^\d{6,18}$/.test(v);
}
function makeScannerBuffer(onScan,opts={}){
  let buf='',last=0;
  const timeout=Number(opts.timeoutMs||DEFAULT_TIMEOUT_MS);
  return function feed(key){
    const now=Date.now();
    if(now-last>timeout)buf='';
    last=now;
    if(key==='Enter'){
      const out=normaliseBarcode(buf);buf='';
      if(looksLikeBarcode(out))onScan(out);
      return;
    }
    if(key.length===1&&/\d/.test(key))buf+=key;
  };
}
function findSkuByBarcode(products,barcode){
  const code=normaliseBarcode(barcode);
  return (products||[]).find(p=>(p.barcodes||[]).map(normaliseBarcode).includes(code))||null;
}
module.exports={normaliseBarcode,looksLikeBarcode,makeScannerBuffer,findSkuByBarcode};
