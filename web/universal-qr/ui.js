(function(){
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const test=!!window.DextersQRTestAPI;
const api=test?window.DextersQRTestAPI:async(action,data={})=>{
 const session=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');
 const token=session?.access_token||session?.currentSession?.access_token||session?.session?.access_token;
 if(!token)throw new Error('Please sign in again.');
 const r=await fetch('https://bpnkouymdvcogeaqjmxl.supabase.co/rest/v1/rpc/universal_qr_action',{method:'POST',headers:{apikey:'sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p_action:action,p_raw:data.raw||'',p_request_id:data.request_id||null,p_amount:data.amount??null})});
 const d=await r.json();if(!r.ok)throw new Error(r.status===404?'Scanner update is not active yet. Please use the manual staff options.':d.message||'Unable to check this QR. Please retry.');return d;
};
const scanner=new DextersQR.Scanner(api);let stream=null,frame=0,cameraGeneration=0,walletBusy=false,walletKey='',pending=false;
function stop(){cameraGeneration++;cancelAnimationFrame(frame);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if($('uqVideo')){$('uqVideo').srcObject=null;$('uqVideo').hidden=true;}$('uqCamera')&&($('uqCamera').textContent='Use camera');}
function status(message){$('uqStatus').textContent=message;}
function close(){if(pending)return;stop();scanner.cancel();$('uqDialog').close();$('uqResult').replaceChildren();}
function open(){if(!$('uqDialog').open)$('uqDialog').showModal();$('uqCode').focus();$('uqCode').select();}
function result(d){
 if(!d)return;
 if(d.kind==='customer'){
  $('uqResult').innerHTML='<h3>'+esc(d.customer)+'</h3><p><b>'+esc(d.stamps)+' / 9 coffee stamps</b> · <b>'+esc(d.points)+' points</b></p><button class="btn" id="uqStamp" '+(d.can_stamp===false?'disabled':'')+'>Confirm +1 coffee stamp</button><label for="uqAmount">Order value (£)</label><input class="input" id="uqAmount" inputmode="decimal" placeholder="12.80"><p id="uqEarn">1 point for every full £1 spent.</p><button class="btn" id="uqPoints">Confirm add points</button><p class="muted">For a new purchase only. Collected app orders earn points automatically.</p>';
  $('uqAmount').oninput=()=>{try{$('uqEarn').textContent=DextersQR.spend($('uqAmount').value).points+' points will be added.';}catch{$('uqEarn').textContent='1 point for every full £1 spent.';}};
  $('uqStamp').onclick=()=>act('stamp');$('uqPoints').onclick=()=>act('points',$('uqAmount').value);
 }else{
  const labels={spin:'Spin to Win',deal:'Dexter’s Deal',points:'Points reward',offer:'Customer offer',coffee:'Coffee reward'};
  $('uqResult').innerHTML='<p class="uqTag">'+esc(labels[d.kind]||d.kind)+'</p><h3>'+esc(d.item)+'</h3><p><b>Category:</b> '+esc(d.category)+'</p><p><b>Customer:</b> '+esc(d.customer)+'</p>'+(d.points_cost&&d.status==='valid'?'<p><b>'+esc(d.points_cost)+' points</b> will be deducted on confirmation.</p>':'')+(d.instructions?'<p>'+esc(d.instructions)+'</p>':'')+'<p><b>Status:</b> '+esc(d.status)+(d.redeemed_at?' · '+esc(new Date(d.redeemed_at).toLocaleString('en-GB')):'')+'</p>'+(d.status==='valid'?'<button class="btn" id="uqRedeem">Confirm redemption</button><button class="btn secondary" id="uqCancel">Cancel</button>':'<p>This QR cannot be used again.</p>');
  if($('uqRedeem'))$('uqRedeem').onclick=()=>act('redeem');if($('uqCancel'))$('uqCancel').onclick=()=>{scanner.cancel();$('uqResult').replaceChildren();status('Cancelled. The reward remains unused.');};
 }
}
async function scan(raw){if(pending)return;open();stop();$('uqResult').replaceChildren();status('Checking QR…');try{const d=await scanner.scan(raw);if(d){$('uqCode').value='';result(d);status('QR recognised. Check the details before confirming.');}}catch(e){status(e.message);}}
async function act(action,amount){if(pending)return;pending=true;const buttons=[...$('uqDialog').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{const d=await scanner.act(action,amount);status(d.message+(d.points_added!==undefined?' · '+d.points_added+' points':'')+(d.points!==undefined?' · Balance: '+d.points+' points':'')+(d.stamps!==undefined?' · '+d.stamps+' / 9 stamps':''));$('uqResult').replaceChildren();await wallet();window.dispatchEvent(new Event('dexters:loyalty-changed'));}catch(e){status(e.message+' If the connection failed, retry this same action before starting another.');}finally{pending=false;buttons.forEach(b=>b.disabled=false);}}
async function camera(){if(stream){stop();return;}const generation=++cameraGeneration;try{
 if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera unavailable. Use the manual code box or a USB scanner.');
 const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(generation!==cameraGeneration){media.getTracks().forEach(t=>t.stop());return;}stream=media;
 const v=$('uqVideo');v.srcObject=stream;v.hidden=false;await v.play();if(generation!==cameraGeneration)return;$('uqCamera').textContent='Stop camera';status('Hold the QR inside the camera view.');
 let detector=null;try{if(window.BarcodeDetector)detector=new BarcodeDetector({formats:['qr_code']});}catch{}const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 async function tick(){if(generation!==cameraGeneration||!stream)return;let raw;try{if(detector)raw=(await detector.detect(v))[0]?.rawValue;else if(v.videoWidth&&window.jsQR){const scale=Math.min(1,800/v.videoWidth);canvas.width=v.videoWidth*scale;canvas.height=v.videoHeight*scale;ctx.drawImage(v,0,0,canvas.width,canvas.height);const im=ctx.getImageData(0,0,canvas.width,canvas.height);raw=jsQR(im.data,im.width,im.height)?.data;}}catch{detector=null;}if(generation!==cameraGeneration)return;if(raw){await scan(raw);return;}frame=requestAnimationFrame(tick);}tick();
 }catch(e){stop();status(e.message||'Camera unavailable. Enter the code manually.');}}
function boot(){
 const staff=$('staffPage');if(!staff||$('uqCard'))return;
 const card=document.createElement('section');card.id='uqCard';card.className='card';card.dataset.staffCollapseReady='1';card.innerHTML='<h2>Scan Customer QR</h2><p>Customer loyalty, coffee stamps, points, deals and prizes.</p><button class="btn" id="uqOpen">Scan Customer QR</button><p class="muted">Your manual staff options are still available below.</p>';staff.prepend(card);
 const modal=document.createElement('dialog');modal.id='uqDialog';modal.innerHTML='<div class="uqHead"><h2>Scan Customer QR</h2><button class="btn secondary" id="uqClose">Close</button></div><button class="btn secondary" id="uqCamera">Use camera</button><video id="uqVideo" hidden muted playsinline></video><form id="uqForm"><label for="uqCode">QR code or 6-digit customer code</label><input id="uqCode" class="input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Scan with USB reader or enter code"><button class="btn" type="submit">Check code</button></form><p id="uqStatus" role="status" aria-live="polite">Ready to scan.</p><div id="uqResult"></div>';document.body.appendChild(modal);
 $('uqOpen').onclick=open;$('uqClose').onclick=close;modal.addEventListener('cancel',e=>{e.preventDefault();close();});$('uqCamera').onclick=camera;$('uqForm').onsubmit=e=>{e.preventDefault();scan($('uqCode').value);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else wallet();});window.addEventListener('pagehide',stop);
 if(test)window.DextersQRTestScan=scan;
}
async function wallet(){
 if(walletBusy||document.hidden)return;const host=$('qrPage');if(!host)return;walletBusy=true;
 try{const d=await api('wallet');const key=JSON.stringify(d.rewards||[]);if(key===walletKey&&$('uqWallet'))return;walletKey=key;
 let card=$('uqWallet');if(!card){card=document.createElement('section');card.id='uqWallet';card.className='card';host.appendChild(card);}card.innerHTML='<h2>Reward QR codes</h2>'+((d.rewards||[]).length?'':'<p>No reward QR codes waiting to be used.</p>');
 for(const r of d.rewards||[]){const box=document.createElement('article');box.className='uqReward';box.innerHTML='<h3>'+esc(r.item)+'</h3><p><b>Category:</b> '+esc(r.category)+'</p>'+(r.points_cost?'<p>'+esc(r.points_cost)+' points</p>':'')+'<div class="uqQR"></div><details><summary>Manual reward code</summary><p class="uqCode">'+esc(r.raw)+'</p></details>'+(test?'<button class="btn secondary uqTest">Test this QR</button>':'');card.appendChild(box);DextersDrawQR(box.querySelector('.uqQR'),r.raw);if(test)box.querySelector('.uqTest').onclick=()=>scan(r.raw);}
 }catch(e){if($('uqWallet')){$('uqWallet').replaceChildren();walletKey='';}if(test)status(e.message);}finally{walletBusy=false;}
}
boot();wallet();setInterval(()=>{boot();wallet();},5000);
})();
