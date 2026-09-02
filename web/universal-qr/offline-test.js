// Offline demonstration adapter only. Production uses the authenticated database RPC.
(function(){
'use strict';
const ID=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const seed=()=>({stamps:4,points:1000,cycle:0,receipts:{},log:[],rewards:[
 {id:ID(30),kind:'spin',item:'Chicken Tenders',category:'Chicken Tenders',status:'valid'},
 {id:ID(31),kind:'points',item:'Chicken Mayo Melt',category:'Dexter’s Street Subs',points_cost:650,status:'valid'},
 {id:ID(32),kind:'deal',item:'Chicken Mayo Melt + Chips + Can',category:'Dexter’s Street Subs',status:'valid'},
 {id:ID(35),kind:'offer',item:'Sausage Roll',category:'Hot Rolls',status:'valid'},
 {id:ID(33),kind:'deal',item:'Expired deal',category:'Chicken Tenders',status:'expired'},
 {id:ID(36),kind:'spin',item:'Already-used prize',category:'Chicken Tenders',status:'used',redeemed_at:'2026-09-02T10:00:00Z'}
]});
let fallback=seed(),dbPromise;
try{dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('dexters-universal-qr-offline-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}catch(e){dbPromise=Promise.reject(e);}
// Some file-preview viewers disable IndexedDB. Explain the limitation instead of pretending persistence.
async function transaction(fn){let db;try{db=await dbPromise;}catch{document.getElementById('testPersistence').textContent='This viewer stores the test for this session only.';const copy=structuredClone(fallback),result=fn(copy);fallback=copy;return result;}
 return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.get('current');let output;r.onsuccess=()=>{try{const s=r.result||seed();output=fn(s);store.put(s,'current');}catch(e){reject(e);tx.abort();}};tx.oncomplete=()=>resolve(output);tx.onerror=()=>reject(tx.error);});}
window.DextersQRTestAPI=async(action,data={})=>transaction(s=>{
 if(action==='reset'){Object.assign(s,seed());location.reload();return {};}
 if(action==='wallet')return {rewards:[{raw:'DEXTERS:123456',kind:'customer',item:'Test Customer',category:'Customer loyalty · '+s.stamps+' / 9 stamps · '+s.points+' points'},...s.rewards.filter(r=>r.status==='valid').map(r=>({...r,raw:'DEXTERS_'+r.kind.toUpperCase()+':'+r.id}))]};
 const q=DextersQR.parse(data.raw);let r;
 if(q.kind==='customer'){if(q.id!=='123456')throw new Error('Test customer not found. Use 123456.');}
 else{r=s.rewards.find(r=>r.id===q.id&&r.kind===q.kind);if(!r)throw new Error('Reward not found.');}
 if(action==='lookup')return q.kind==='customer'?{kind:'customer',customer:'Test Customer',stamps:s.stamps,points:s.points,can_stamp:true}: {...r,customer:'Test Customer'};
 const signature=JSON.stringify([action,q.raw,data.amount]);if(s.receipts[data.request_id]){if(s.receipts[data.request_id].signature!==signature)throw new Error('Request belongs to another action');return s.receipts[data.request_id].result;}
 let result;
 if(action==='stamp'){
  if(q.kind!=='customer')throw new Error('Customer code required');if(s.stamps>=9)throw new Error('Coffee reward ready — redeem first.');s.stamps++;
  if(s.stamps===9){s.cycle++;s.rewards.push({id:DextersQR.requestId(),kind:'coffee',item:'Free coffee',category:'Coffee',status:'valid',cycle:s.cycle});}
  result={ok:true,message:'Coffee stamp added',stamps:s.stamps};
 }else if(action==='points'){
  if(q.kind!=='customer')throw new Error('Customer code required');const amount=DextersQR.spend(data.amount);s.points+=amount.points;result={ok:true,message:'Points added',points_added:amount.points,points:s.points};
 }else if(action==='redeem'){
  if(!r||r.status!=='valid')return {ok:false,message:'QR already used or unavailable'};
  if(r.kind==='points'){if(s.points<r.points_cost)throw new Error('Customer no longer has enough points');s.points-=r.points_cost;}
  if(r.kind==='coffee'){if(s.stamps<9||r.cycle!==s.cycle)throw new Error('Coffee QR is no longer valid');s.stamps=0;}
  r.status='used';r.redeemed_at=new Date().toISOString();result={ok:true,message:'Redeemed: '+r.item,...(r.kind==='points'?{points:s.points}:{})};
 }else throw new Error('Unknown action');
 s.receipts[data.request_id]={signature,result};s.log.unshift(result.message);return result;
});
window.addEventListener('DOMContentLoaded',()=>{
 document.getElementById('testReset').onclick=()=>{if(confirm('Reset the test customer, rewards and balances?'))DextersQRTestAPI('reset');};
 document.getElementById('testUsed').onclick=()=>DextersQRTestScan('DEXTERS_SPIN:'+ID(36));document.getElementById('testExpired').onclick=()=>DextersQRTestScan('DEXTERS_DEAL:'+ID(33));document.getElementById('testInvalid').onclick=()=>DextersQRTestScan('NOT-A-DEXTERS-QR');
 document.getElementById('manualCheck').onclick=()=>DextersQRTestScan(document.getElementById('manualCode').value);
});
})();
