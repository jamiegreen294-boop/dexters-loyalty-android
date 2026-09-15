(()=>{
  const BRIDGE='http://127.0.0.1:8787';
  const MAP_KEY='dexters_pos_test_barcode_map_v1';
  const PAIR_KEY='dexters_pos_test_scanner_pair_v1';
  let lastId=0,pendingBarcode='',pollTimer=null;
  const $=id=>document.getElementById(id);
  const getMap=()=>{try{return JSON.parse(localStorage.getItem(MAP_KEY)||'{}')}catch{return {}}};
  const saveMap=m=>localStorage.setItem(MAP_KEY,JSON.stringify(m));
  const status=msg=>{const el=$('status');if(el)el.textContent=msg};
  const itemForId=id=>typeof window.itemById==='function'?window.itemById(id):null;
  function addMappedProduct(item){if(!item)return false;if(typeof window.chooseItem==='function'){window.chooseItem(item);return true}return false}
  function handleProduct(value){const code=String(value||'').trim();if(!code)return;const map=getMap(),mapped=map[code];if(mapped){const item=itemForId(mapped);if(item){pendingBarcode='';addMappedProduct(item);status('Barcode '+code+' · '+(item.name||'item')+' added');return}}pendingBarcode=code;const search=$('search');if(search){search.value='';search.placeholder='Unknown barcode '+code+' — tap matching product'}status('Unknown barcode '+code+' · tap the matching product once to link it')}
  function handleLoyalty(value){pendingBarcode='';window.dispatchEvent(new CustomEvent('dexters-loyalty-scan',{detail:{value:String(value||'')}}));status('Loyalty QR scanned · '+String(value||'').slice(0,40))}
  function readRows(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}}
  function handleTransaction(value){
    pendingBarcode='';const ref=String(value||'').trim().toUpperCase().replace(/^DXT-/,'');
    const rows=[...readRows('dexters-pos-sales-v1'),...readRows('dexters_pc_pos_sales_v3')];
    try{const last=JSON.parse(localStorage.getItem('dexters-pos-last-sale')||'null');if(last)rows.unshift(last)}catch{}
    const sale=rows.find(r=>String(r?.id||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase().endsWith(ref));
    if(!sale){status('Transaction '+ref+' was not found on this POS');return}
    const items=(sale.items||[]).map(i=>'<div class="sumrow"><span>'+String(i.qty||i.quantity||1)+' × '+String(i.name||i.item_name||'Item').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</span><b>£'+((Number(i.unit||i.price||0))*(Number(i.qty||i.quantity||1))).toFixed(2)+'</b></div>').join('');
    const html='<div class="group"><b>Receipt '+ref+'</b><br>'+new Date(sale.createdAt||sale.created_at||Date.now()).toLocaleString('en-GB')+'<br>'+String(sale.method||'').toUpperCase()+' · '+String(sale.mode||'Counter')+'</div><div class="group">'+items+'<div class="sumrow grand"><span>TOTAL</span><b>£'+Number(sale.total||sale.amount||0).toFixed(2)+'</b></div></div>';
    if(typeof window.DextersPosModal==='function')window.DextersPosModal('Transaction found',html,true);else if(typeof modal==='function')modal('Transaction found',html,true);
    status('Transaction '+ref+' opened');
  }
  function handleScan(x){if(!x||!x.value)return;const v=String(x.value).trim();if(/^DXT-[A-Z0-9]{4,}$/i.test(v))handleTransaction(v);else x.type==='loyalty'?handleLoyalty(v):handleProduct(v)}
  async function poll(){const pair=localStorage.getItem(PAIR_KEY)||'';if(!pair)return;try{const r=await fetch(BRIDGE+'/next-scan?after='+encodeURIComponent(lastId),{headers:{'x-dexters-pair-code':pair},cache:'no-store'});if(r.status===403){status('Scanner pairing code rejected · tap Scanner to pair again');return}if(!r.ok)return;const d=await r.json();for(const x of(d.items||[])){lastId=Math.max(lastId,Number(x.id)||0);handleScan(x)}}catch{}}
  function beginPolling(){if(pollTimer)return;pollTimer=setInterval(poll,450);poll()}
  function savePair(code,d){const cleaned=String(code||'').replace(/\D/g,'').slice(0,6);if(cleaned.length!==6){status('Scanner pairing code must be 6 digits');return false}localStorage.setItem(PAIR_KEY,cleaned);lastId=0;status('Scanner pairing saved · checking local bridge…');if(d?.remove)d.remove();beginPolling();poll();return true}
  async function pair(){const current=localStorage.getItem(PAIR_KEY)||'';if(typeof modal==='function'){
    const d=modal('Foodhub Scanner Bridge','<p id="scannerBridgeState">Checking the scanner service on this Windows PC…</p><input id="scannerPairCode" class="field" inputmode="numeric" maxlength="6" autocomplete="one-time-code" value="'+current.replace(/[^0-9]/g,'')+'" placeholder="6-digit bridge code"><div class="actions"><button id="scannerPairSave" class="confirm">CONNECT SCANNER</button></div><p style="color:#9eb0c5;font-size:13px">The Foodhub Bluetooth scanner is read through its Windows COM port. Keyboard-mode scanners also continue to work.</p>',false);
    const input=d.querySelector('#scannerPairCode'),save=d.querySelector('#scannerPairSave');
    if(input){input.focus();input.select();input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,6)});input.addEventListener('keydown',e=>{if(e.key==='Enter')save?.click()})}
    if(save)save.onclick=()=>{if(!savePair(input?.value||'',d)){save.textContent='ENTER 6 DIGITS';setTimeout(()=>save.textContent='PAIR SCANNER',1200)}};
    try{const r=await fetch(BRIDGE+'/status',{cache:'no-store'});const x=await r.json();if(r.ok&&x.pair_code){input.value=String(x.pair_code);d.querySelector('#scannerBridgeState').innerHTML='<b style="color:#8ff0b3">Scanner bridge is running.</b><br>Bluetooth ports: '+((x.ports||[]).join(', ')||'Waiting for Windows COM port');status('Foodhub scanner bridge connected')}}catch{d.querySelector('#scannerBridgeState').innerHTML='<b class="bad">Scanner bridge is not running.</b><br>Open Hardware and reinstall the Windows helper.'}
    return;
  }
  const code=prompt('Enter the 6-digit pairing code shown by the Dexter scanner bridge on this PC:',current);if(code!==null)savePair(code,null)}
  function installButton(){const top=document.querySelector('.top');if(!top||document.getElementById('scannerBtn'))return;const b=document.createElement('button');b.id='scannerBtn';b.textContent='Scanner';b.title='Pair Dexter scanner';const staff=document.getElementById('staffBtn');top.insertBefore(b,staff||null);b.onclick=pair}
  document.addEventListener('click',e=>{if(!pendingBarcode)return;const btn=e.target.closest?.('[data-item]');if(!btn)return;const id=String(btn.dataset.item||'');const item=itemForId(id);if(!item)return;const map=getMap();map[pendingBarcode]=id;saveMap(map);status('Linked barcode '+pendingBarcode+' to '+(item.name||'item')+' · future scans will add it automatically');pendingBarcode='';const search=$('search');if(search)search.placeholder='Search menu'},true);
  let keys='',lastKeyAt=0;document.addEventListener('keydown',e=>{const tag=(e.target?.tagName||'').toLowerCase();if(['input','textarea','select'].includes(tag))return;const now=Date.now();if(now-lastKeyAt>120)keys='';lastKeyAt=now;if(e.key==='Enter'){if(keys.length>=4){e.preventDefault();/^DXT-[A-Z0-9]{4,}$/i.test(keys)?handleTransaction(keys):/^\d{6}$/.test(keys)?handleLoyalty(keys):handleProduct(keys)}keys='';return}if(e.key.length===1&&!e.ctrlKey&&!e.altKey&&!e.metaKey)keys+=e.key},true);
  function initScanner(){installButton();if(localStorage.getItem(PAIR_KEY))beginPolling()}
  window.addEventListener('load',initScanner);if(document.readyState!=='loading')initScanner();
})();
