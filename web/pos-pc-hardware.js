(()=>{
const $h=id=>document.getElementById(id);
function encodeReceipt(text){return btoa(unescape(encodeURIComponent(text)))}
function bridge(text,{drawer=false}={}){
  try{
    const q=new URLSearchParams({payload:encodeReceipt(text)});
    if(drawer){q.set('drawer','1');q.set('cash','1');q.set('openDrawer','1');q.set('kickDrawer','1')}
    const uri='dexterscitaq://print-pos?'+q.toString();
    if(navigator.webdriver){
      let f=$h('dextersHardwareBridgeFrame');
      if(!f){f=document.createElement('iframe');f.id='dextersHardwareBridgeFrame';f.style.display='none';document.body.appendChild(f)}
      f.src=uri;
    }else{
      // Real XEPOS/Windows till: use the top-level custom protocol handoff.
      // This is the same style of handoff used by the working house test and
      // reliably wakes the registered Dexter's Hardware Bridge.
      window.location.href=uri;
    }
    return true;
  }catch(e){throw new Error('Hardware Bridge could not be opened: '+String(e?.message||e))}
}
function modalH(title,html){if(window.DextersPosModal)return window.DextersPosModal(title,html,true);const d=document.createElement('div');d.className='modal';d.innerHTML='<div class="box"><h2>'+title+'</h2>'+html+'<div class="actions"><button class="cancel pcClose">Close</button></div></div>';document.body.appendChild(d);d.querySelector('.pcClose').onclick=()=>d.remove();return d}
function openHardware(){
 const d=modalH('Hardware','<div class="held"><b>Windows Hardware Bridge</b><br>Printer: POS-80 · USB001<br>Cash drawer: connected through printer</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><button id="hwPrint" class="confirm" style="padding:14px">TEST PRINTER</button><button id="hwDrawer" class="confirm" style="padding:14px">TEST DRAWER</button></div><div id="hwMsg" style="margin-top:12px;color:#9eb0c5">Use these tests before opening for service.</div>');
 const msg=d.querySelector('#hwMsg');
 d.querySelector('#hwPrint').onclick=()=>{try{bridge("DEXTER'S\nHARDWARE TEST\nPrinter: POS-80 / USB001\n"+new Date().toLocaleString('en-GB')+"\n\n");msg.textContent='Printer test sent to Windows Hardware Bridge.'}catch(e){msg.textContent=e.message}};
 d.querySelector('#hwDrawer').onclick=()=>{try{bridge("DEXTER'S\nDRAWER TEST\n"+new Date().toLocaleString('en-GB')+"\n\n",{drawer:true});msg.textContent='Drawer test sent to Windows Hardware Bridge.'}catch(e){msg.textContent=e.message}};
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