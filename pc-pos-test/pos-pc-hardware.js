(()=>{
const $h=id=>document.getElementById(id);
function encodeReceipt(text){return btoa(unescape(encodeURIComponent(text)))}
function bridge(text,{drawer=false}={}){
  try{
    const payload=encodeReceipt(text);
    window.location.href='dexterscitaq://print-pos?payload='+encodeURIComponent(payload);
    return true;
}catch(e){throw new Error('Hardware Bridge could not be opened: '+String(e?.message||e))}
}
function modalH(title,html){if(window.DextersPosModal)return window.DextersPosModal(title,html,true);const d=document.createElement('div');d.className='modal';d.innerHTML='<div class="box"><h2>'+title+'</h2>'+html+'<div class="actions"><button class="cancel pcClose">Close</button></div></div>';document.body.appendChild(d);d.querySelector('.pcClose').onclick=()=>d.remove();return d}
function openHardware(){
 const d=modalH('Hardware','<div class="held"><b>Windows Hardware Bridge</b><br>Printer: POS-80 · USB001<br>Cash drawer: connected through printer</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><button id="hwPrint" class="confirm" style="padding:14px">TEST PRINTER</button><button id="hwDrawer" class="confirm" style="padding:14px">TEST DRAWER</button></div><div id="hwMsg" style="margin-top:12px;color:#9eb0c5">Use these tests before opening for service.</div>');
 const msg=d.querySelector('#hwMsg');
 d.querySelector('#hwPrint').onclick=()=>{try{bridge("DEXTER'S\nHARDWARE TEST\nPrinter: POS-80 / USB001\n"+new Date().toLocaleString('en-GB')+"\n\n");msg.textContent='Printer test sent to Windows Hardware Bridge.'}catch(e){msg.textContent=e.message}};
 d.querySelector('#hwDrawer').onclick=()=>{try{bridge("DEXTER'S\nDRAWER TEST\n"+new Date().toLocaleString('en-GB')+"\nCash\n\n",{drawer:true});msg.textContent='Drawer test sent to Windows Hardware Bridge.'}catch(e){msg.textContent=e.message}};
}
function install(){
 let b=$h('pcHardwareBtn');
 if(!b){b=document.createElement('button');b.id='pcHardwareBtn';b.textContent='Hardware';const top=document.querySelector('.top');top?.insertBefore(b,$h('staffBtn')||null)}
 if(b)b.onclick=openHardware;
}
window.DextersHardware={open:openHardware,bridge};
window.addEventListener('load',install);
if(document.readyState==='complete')install();
})();