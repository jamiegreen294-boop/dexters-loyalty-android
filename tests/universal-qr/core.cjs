const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const {parse,spend,Scanner}=require('../../web/universal-qr/core.js');
const jsQR=require(process.env.DEXTERS_QA_MODULES+'/jsqr');
async function run(){let count=0;for(const [v,w] of [['12.80',12],['1',1],['9.99',9],['10000',10000]]){assert.equal(spend(v).points,w);count++;}for(const x of ['','1e2','-1','12.999','Infinity','£12','0.99']){assert.throws(()=>spend(x));count++;}
 assert.equal(parse('DEXTERS:123456').kind,'customer');count++;assert.throws(()=>parse('evil123456'));count++;
 let calls=[],fail=true;const s=new Scanner(async(action,data)=>{calls.push([action,data]);if(action==='lookup')return {kind:'customer'};if(fail){fail=false;throw Error('Network lost');}return {ok:true};});await s.scan('123456');await assert.rejects(()=>s.act('points','12.80'));await assert.rejects(()=>s.act('points','13'));await s.act('points','12.80');assert.equal(calls[1][1].request_id,calls[2][1].request_id);count++;
 let resolve;const late=new Scanner(()=>new Promise(r=>resolve=r));const pending=late.scan('123456');late.cancel();resolve({kind:'customer'});assert.equal(await pending,null);assert.equal(late.current,null);count++;
 const compatible={};vm.runInNewContext(fs.readFileSync('web/universal-qr/core.js','utf8'),{window:compatible,crypto:{getRandomValues:require('crypto').webcrypto.getRandomValues.bind(require('crypto').webcrypto)},Uint8Array});assert.match(compatible.DextersQR.requestId(),/^[0-9a-f-]{36}$/);count++;
 const window={};vm.runInNewContext(fs.readFileSync('web/universal-qr/qr.js','utf8'),{window});
 for(const raw of ['DEXTERS:123456',...['SPIN','DEAL','POINTS','OFFER','COFFEE'].map(t=>'DEXTERS_'+t+':00000000-0000-4000-8000-000000000030')]){
  const q=window.DextersQRMatrix(raw),n=q.getModuleCount(),scale=8,width=(n+8)*scale,pixels=new Uint8ClampedArray(width*width*4);pixels.fill(255);for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.isDark(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const p=(((y+4)*scale+dy)*width+(x+4)*scale+dx)*4;pixels[p]=pixels[p+1]=pixels[p+2]=0;}assert.equal(jsQR(pixels,width,width).data,raw);count++;
 }
 console.log('PASS '+count+' parser, amount, retry, cancel and real QR encode/decode checks.');
}run().catch(e=>{console.error(e);process.exitCode=1});
