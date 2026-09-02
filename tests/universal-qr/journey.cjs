// Production scanner/wallet UI and SQL, connected through a local HTTP adapter.
// The adapter supplies fixture identities; this is not a live sign-in test.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.DEXTERS_QA_MODULES+'/jsdom');
const jsQR=require(process.env.DEXTERS_QA_MODULES+'/jsqr');
const {createDb,ID}=require('./database.cjs');
const tick=async()=>{for(let n=0;n<12;n++)await new Promise(setImmediate);};
async function run(){
 const db=await createDb();let queue=Promise.resolve(),checks=0,loseNext=false;
 const errors=[],windows=[];
 function client(actor){
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM('<div id="staffPage"><input id="staffCode"><button id="addStampBtn">Add stamp</button></div><div id="qrPage"></div>',{url:'https://qa.invalid',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window,intervals=[];windows.push(w);
  w.localStorage.setItem('sb-bpnkouymdvcogeaqjmxl-auth-token',JSON.stringify({access_token:actor}));
  w.setInterval=f=>{intervals.push(f);return intervals.length;};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  // Render the production QR drawing commands to pixels for the real decoder.
  w.HTMLCanvasElement.prototype.getContext=function(){
   const canvas=this;
   if(!canvas.pixels)canvas.pixels=new Uint8ClampedArray(canvas.width*canvas.height*4);
   return {fillStyle:'white',fillRect(x,y,width,height){const colour=this.fillStyle==='white'?255:0;for(let row=y;row<y+height;row++)for(let col=x;col<x+width;col++){const offset=(row*canvas.width+col)*4;canvas.pixels.set([colour,colour,colour,255],offset);}}};
  };
  w.fetch=async(url,options)=>{
   assert.equal(url,'https://bpnkouymdvcogeaqjmxl.supabase.co/rest/v1/rpc/universal_qr_action');
   const body=JSON.parse(options.body),identity=options.headers.Authorization.slice(7);
   const task=queue.then(async()=>{
    await db.exec('reset role');await db.query("select set_config('test.actor',$1,false)",[identity]);await db.exec('set role authenticated');
    try{const result=await db.query('select public.universal_qr_action($1,$2,$3,$4) result',[body.p_action,body.p_raw,body.p_request_id,body.p_amount]);return {ok:true,json:async()=>result.rows[0].result};}
    catch(error){return {ok:false,status:400,json:async()=>({message:error.message})};}
   });queue=task.catch(()=>{});const response=await task;
   if(loseNext&&body.p_action==='points'){loseNext=false;throw Error('Connection lost after server confirmation');}
   return response;
  };
  for(const file of ['qr.js','core.js','ui.js'])w.eval(fs.readFileSync('web/universal-qr/'+file,'utf8'));
  const $=id=>w.document.getElementById(id);
  const settle=async()=>{await tick();await queue;await tick();};
  return {w,$,settle,async refresh(){intervals.forEach(f=>f());await settle();},async scan(raw){$('uqOpen').click();$('uqCode').value=raw;$('uqForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();},async click(id){assert($(id),'Missing '+id);$(id).click();await settle();},walletCodes(){return Array.from(w.document.querySelectorAll('#uqWallet canvas')).map(c=>jsQR(c.pixels,c.width,c.height)?.data);}};
 }
 const customer=client(ID(1)),staff=client(ID(2));await customer.settle();await staff.settle();
 const check=(condition,message)=>{assert(condition,message);checks++;};
 const pointCode='DEXTERS_POINTS:'+ID(31),spinCode='DEXTERS_SPIN:'+ID(30);
 check(customer.walletCodes().includes(pointCode),'Customer gets a decodable points QR');
 check(customer.walletCodes().includes(spinCode),'Customer gets a decodable spin QR');
 check(customer.$('uqWallet').textContent.includes('Dexter’s Street Subs'),'Wallet has food category');
 check(!customer.w.DextersQRTestScan,'Production UI path, not demo scanner');
 await staff.scan(pointCode);
 check(staff.$('uqResult').textContent.includes('650 points'),'Staff sees cost before confirmation');
 check(staff.$('uqResult').textContent.includes('Dexter’s Street Subs'),'Staff sees authoritative category');
 await staff.click('uqCancel');await customer.refresh();
 check(customer.walletCodes().includes(pointCode),'Cancel keeps customer QR');
 await staff.scan(pointCode);await staff.click('uqRedeem');await customer.refresh();
 check(staff.$('uqStatus').textContent.includes('350 points'),'Exactly 650 points deducted');
 check(!customer.walletCodes().includes(pointCode),'Redeemed QR disappears on customer refresh');
 await staff.scan(pointCode);
 check(!staff.$('uqRedeem')&&staff.$('uqResult').textContent.includes('used'),'Screenshot replay has no redeem button');
 await staff.scan('123456');staff.$('uqAmount').value='12.80';staff.$('uqAmount').dispatchEvent(new staff.w.Event('input'));
 check(staff.$('uqEarn').textContent==='12 points will be added.','Whole-pound earning preview');
 loseNext=true;await staff.click('uqPoints');
 check(staff.$('uqStatus').textContent.includes('retry'),'Uncertain result offers retry');
 await staff.click('uqPoints');
 check(staff.$('uqStatus').textContent.includes('362 points'),'Lost-response retry adds points only once');
 for(let n=0;n<5;n++){await staff.scan('123456');await staff.click('uqStamp');}
 await customer.refresh();const coffee=customer.walletCodes().find(c=>c.startsWith('DEXTERS_COFFEE:'));
 check(!!coffee,'Ninth stamp creates decodable customer coffee QR');
 await staff.scan(coffee);await staff.click('uqRedeem');await customer.refresh();
 check(!customer.walletCodes().includes(coffee),'Used coffee QR disappears');
 await staff.scan(coffee);check(!staff.$('uqRedeem'),'Coffee screenshot replay blocked');
 await staff.scan(spinCode);await staff.click('uqRedeem');await customer.refresh();
 check(!customer.walletCodes().includes(spinCode),'Redeemed spin QR disappears');
 for(const kind of ['DEAL','OFFER']){const code='DEXTERS_'+kind+':'+ID(kind==='DEAL'?32:35);await staff.scan(code);await staff.click('uqRedeem');await staff.scan(code);check(!staff.$('uqRedeem'),kind+' manual-code replay blocked');}
 await staff.scan('DEXTERS_DEAL:'+ID(33));check(!staff.$('uqRedeem')&&staff.$('uqResult').textContent.includes('expired'),'Expired QR blocked');
 await staff.scan('invalid');check(staff.$('uqStatus').textContent.includes('Not a valid'),'Invalid QR rejected');
 check(!!staff.$('staffCode')&&!!staff.$('addStampBtn'),'Existing manual controls retained');
 customer.w.localStorage.removeItem('sb-bpnkouymdvcogeaqjmxl-auth-token');await customer.refresh();
 check(customer.walletCodes().length===0,'Customer QR cleared when signed out');
 check(errors.length===0,errors.map(e=>e.message).join('\n'));
 windows.forEach(w=>w.close());await db.close();
 console.log('PASS '+checks+' production-UI/SQL customer-to-staff journey checks. Local identities and transport; no live customer changes.');
}
run().catch(e=>{console.error(e);process.exitCode=1});
