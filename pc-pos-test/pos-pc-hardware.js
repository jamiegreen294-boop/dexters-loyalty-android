(()=>{
const $h=id=>document.getElementById(id);
function encodeReceipt(text){return btoa(unescape(encodeURIComponent(text)))}
function bridge(text,{drawer=false}={}){
  try{
    // Direct ESC/POS drawer pulse. This bypasses any cash-text parsing in the
    // Windows helper and sends the kick command through the same raw print path.
    const pulse=drawer?'\x1b\x70\x00\x3c\x78\x1b\x70\x01\x3c\x78':'';
    const payload=encodeReceipt(pulse+text);
    location.href='dexterscitaq://print-pos?payload='+encodeURIComponent(payload);
    return true;
}catch(e){throw new Error('Hardware Bridge could not be opened: '+String(e?.message||e))}
}
function modalH(title,html){if(window.DextersPosModal)return window.DextersPosModal(title,html,true);const d=document.createElement('div');d.className='modal';d.innerHTML='<div class="box"><h2>'+title+'</h2>'+html+'<div class="actions"><button class="cancel pcClose">Close</button></div></div>';document.body.appendChild(d);d.querySelector('.pcClose').onclick=()=>d.remove();return d}
function openHardware(){
 const d=modalH('Hardware','<div class="held"><b>Windows Hardware Bridge</b><br>Printer: POS-80 · USB001<br>Cash drawer: connected through printer</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><button id="hwPrint" class="confirm" style="padding:14px">TEST PRINTER</button><button id="hwDrawer" class="confirm" style="padding:14px">TEST DRAWER</button></div><button id="hwDirect" class="confirm" style="width:100%;padding:14px;margin-top:10px">DOWNLOAD DIRECT WINDOWS DRAWER TEST</button><div id="hwMsg" style="margin-top:12px;color:#9eb0c5">Use these tests before opening for service.</div>');
 const msg=d.querySelector('#hwMsg');
 d.querySelector('#hwPrint').onclick=()=>{try{bridge("DEXTER'S\nHARDWARE TEST\nPrinter: POS-80 / USB001\n"+new Date().toLocaleString('en-GB')+"\n\n");msg.textContent='Printer test sent to Windows Hardware Bridge.'}catch(e){msg.textContent=e.message}};
 d.querySelector('#hwDrawer').onclick=()=>{try{bridge("DEXTER'S\nPOS RECEIPT\n"+new Date().toLocaleString('en-GB')+"\n----------------\nDRAWER TEST\n----------------\nTOTAL £0.00\nPayment: CASH\n\nThank you for choosing Dexter's",{drawer:true});msg.textContent='Drawer test sent to Windows Hardware Bridge.'}catch(e){msg.textContent=e.message}};
 d.querySelector('#hwDirect').onclick=()=>{
   try{
     const cmd='@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -Command "irm \'https://raw.githubusercontent.com/jamiegreen294-boop/dexters-loyalty-android/dexters-pos-pc-test-v3/tools/windows/Test-DextersCashDrawer.ps1\' | iex"\r\npause\r\n';
     const blob=new Blob([cmd],{type:'text/plain'});
     const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Dexter-Drawer-Test.cmd';document.body.appendChild(a);a.click();
     setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
     msg.textContent='Downloaded Dexter-Drawer-Test.cmd. Open Downloads and double-click it.';
   }catch(e){msg.textContent='Could not create drawer test file: '+String(e?.message||e)}
 };
}
function install(){
 const top=document.querySelector('.top');if(!top)return;
 let b=$h('pcHardwareBtn');
 if(!b){b=document.createElement('button');b.id='pcHardwareBtn';b.textContent='Hardware'}
 b.style.cssText='flex:0 0 auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:82px!important;visibility:visible!important';
 b.onclick=openHardware;
 const buttons=[...top.querySelectorAll('button')];
 const manage=buttons.find(x=>/^manage\b/i.test(String(x.textContent||'').trim()));
 const stock=buttons.find(x=>/^stock\b/i.test(String(x.textContent||'').trim()));
 const anchor=manage||stock;
 if(anchor&&anchor.parentNode===top)top.insertBefore(b,anchor.nextSibling);
 else top.insertBefore(b,top.querySelector('.spacer')?.nextSibling||top.firstChild);
}
window.DextersHardware={open:openHardware,bridge};
window.addEventListener('load',install);
install();
setTimeout(install,250);
setTimeout(install,1200);
})();