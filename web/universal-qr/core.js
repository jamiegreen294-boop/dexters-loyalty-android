(function(root){
  'use strict';
  const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  function parse(raw){
    const value=String(raw||'').trim();
    if(/^(?:DEXTERS:)?\d{6}$/.test(value))return {kind:'customer',id:value.slice(-6),raw:'DEXTERS:'+value.slice(-6)};
    const match=value.match(new RegExp('^DEXTERS(?:_|-)(DEAL|SPIN|POINTS|OFFER|COFFEE):('+uuid+')$','i'));
    if(!match)throw new Error('Not a valid Dexter’s QR. Enter the customer’s 6-digit code or the full reward code.');
    return {kind:match[1].toLowerCase(),id:match[2].toLowerCase(),raw:'DEXTERS_'+match[1].toUpperCase()+':'+match[2].toLowerCase()};
  }
  function spend(value){
    const s=String(value).trim();
    if(!/^\d{1,5}(\.\d{1,2})?$/.test(s))throw new Error('Enter a valid amount with no more than two decimal places.');
    const [whole,fraction='']=s.split('.'),pence=Number(whole)*100+Number(fraction.padEnd(2,'0'));
    if(pence<100||pence>1000000)throw new Error('Enter an order value between £1 and £10,000.');
    return {pence,points:Math.floor(pence/100),value:(pence/100).toFixed(2)};
  }
  function requestId(){
    if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
    const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
    const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  class Scanner {
    constructor(api){this.api=api;this.current=null;this.busy=false;this.generation=0;this.request=null;}
    cancel(){this.generation++;this.current=null;this.request=null;}
    async scan(raw){
      if(this.busy)throw new Error('Wait for the current action to finish.');
      this.cancel();const generation=this.generation,code=parse(raw);
      const result=await this.api('lookup',{raw:code.raw});
      if(generation!==this.generation)return null;
      this.current={...result,raw:code.raw};return this.current;
    }
    async act(action,amount){
      if(this.busy)throw new Error('Please wait — checking the result.');
      if(!this.current)throw new Error('Scan or enter a code first.');
      const raw=this.current.raw;
      if(action==='redeem'&&(this.current.kind==='customer'||this.current.status!=='valid'))throw new Error('This QR cannot be redeemed.');
      if(action!=='redeem'&&this.current.kind!=='customer')throw new Error('Scan the customer loyalty QR to add stamps or points.');
      const value=action==='points'?spend(amount).value:null;
      const signature=JSON.stringify([action,raw,value]);
      // Preserve the same request ID on retries after an uncertain network result.
      if(this.request&&this.request.signature!==signature)throw new Error('Retry the previous action first, or check the customer balance before scanning again.');
      if(!this.request)this.request={signature,id:requestId()};
      this.busy=true;
      try{const result=await this.api(action,{raw,amount:value,request_id:this.request.id});this.request=null;this.cancel();return result;}
      finally{this.busy=false;}
    }
  }
  const api={parse,spend,requestId,Scanner};if(typeof module!=='undefined')module.exports=api;else root.DextersQR=api;
})(typeof window==='undefined'?{}:window);
