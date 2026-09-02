const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
async function run(source) {
  const nodes = new Map(), observers = [], tasks = [], intervals = [];
  let requests=0, draws=0, signedIn=true, redeemed=false;
  const document={readyState:'complete',getElementById:id=>nodes.get(id)||null,querySelectorAll:()=>[],createElement:tag=>new Element(tag)};
  function mutation(target,type) { for(const o of observers) if(o.target===target || o.options.subtree) if(o.options[type]) o.fn(); }
  class Element {
    constructor(id) { this.id=id;this.dataset={};this.parentElement=null; }
    appendChild(el){el.parentElement=this;nodes.set(el.id,el);mutation(this,'childList');}
    set innerHTML(value){this.html=value;if(value.includes('dextersDealsCustomerQr')) nodes.set('dextersDealsCustomerQr',new Element('dextersDealsCustomerQr'));mutation(this,'childList');}
    remove(){nodes.delete(this.id);mutation(this.parentElement,'childList');}
  }
  document.head=new Element('head');document.body=new Element('body');
  for(const id of ['rewardsPage','appView','dextersDealsLiveStyle','dextersDealScanModal'])nodes.set(id,new Element(id));
  const context={document,console,Date,JSON,encodeURIComponent,localStorage:{getItem:()=>signedIn?JSON.stringify({access_token:'unit-test-token'}):null},window:{QRCode:function(){draws++;}},MutationObserver:class{constructor(fn){this.fn=fn}observe(target,options){observers.push({fn:this.fn,target,options})}},setTimeout:fn=>tasks.push(fn),setInterval:(fn,ms)=>{intervals.push({fn,ms});return intervals.length;},clearInterval:()=>{},fetch:async url=>{requests++;return {ok:true,text:async()=>JSON.stringify(url.includes('loyalty_deal_settings')?[{auto_enabled:true}]:url.includes('loyalty_claim_deal')?{claim_id:'unit-test-claim',redeemed_at:redeemed?'now':null}:[{redeemed_at:redeemed?'now':null}])}}};
  vm.runInNewContext(source,context);
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  await settle();
  for(let n=0;tasks.length&&n<30;n++){tasks.shift()();await settle();}
  assert(requests<=6,`Self-triggering deal refresh: ${requests} requests after startup`);
  assert.equal(draws,1,'The same reward QR must keep its DOM between refreshes');
  const box=nodes.get('dextersDealsCustomerReward');
  mutation(document.body,'childList');await settle();
  assert.equal(tasks.length,0,'Unrelated DOM changes must not schedule network refresh');
  intervals.find(i=>i.ms===10000).fn();await settle();
  assert.equal(nodes.get('dextersDealsCustomerReward'),box);
  assert.equal(draws,1);
  redeemed=true;intervals.find(i=>i.ms===1500).fn();await settle();
  assert(!nodes.has('dextersDealsCustomerReward'),'Redeemed reward must disappear');
  intervals.find(i=>i.ms===10000).fn();await settle();
  assert(!nodes.has('dextersDealsCustomerReward'),'Redeemed reward must remain absent');
  signedIn=false;mutation(nodes.get('appView'),'attributes');await settle();
  assert(!nodes.has('dextersDealsCustomerReward'));
}
run(fs.readFileSync(process.argv[2]||'web/deals-live.js','utf8')).then(()=>console.log('PASS: bounded refreshes, stable QR, no DOM feedback loop, redemption removal and signed-out cleanup.')).catch(e=>{console.error(e.message);process.exitCode=1});
