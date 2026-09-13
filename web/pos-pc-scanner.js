(()=>{
  const BRIDGE='http://127.0.0.1:8787';
  const MAP_KEY='dexters_pos_test_barcode_map_v1';
  const PAIR_KEY='dexters_pos_test_scanner_pair_v1';
  let lastId=0,pendingBarcode='',pollTimer=null;
  const $=id=>document.getElementById(id);
  const getMap=()=>{try{return JSON.parse(localStorage.getItem(MAP_KEY)||'{}')}catch{return {}}};
  const saveMap=m=>localStorage.setItem(MAP_KEY,JSON.stringify(m));
  const status=msg=>{const el=$('status');if(el)el.textContent=msg};

  function allItems(){const out=[];for(const c of (window.S?.cats||[]))for(const i of(c.items||[]))out.push(i);return out}
  function itemForId(id){return allItems().find(i=>String(i.id||i.name)===String(id))||null}
  function addMappedProduct(item){
    if(!item)return false;
    if(typeof window.chooseItem==='function'){window.chooseItem(item);return true}
    return false;
  }
  function handleProduct(value){
    const code=String(value||'').trim();if(!code)return;
    const map=getMap(),mapped=map[code];
    if(mapped){const item=itemForId(mapped);if(item){pendingBarcode='';addMappedProduct(item);status('Barcode '+code+' · '+(item.name||'item')+' added');return}}
    const direct=allItems().find(i=>[i.barcode,i.ean,i.upc,i.sku].some(v=>v!=null&&String(v)===code));
    if(direct){map[code]=String(direct.id||direct.name);saveMap(map);addMappedProduct(direct);status('Barcode '+code+' · '+(direct.name||'item')+' added');return}
    pendingBarcode=code;
    const search=$('search');if(search){search.value='';search.placeholder='Unknown barcode '+code+' — tap matching product';}
    status('Unknown barcode '+code+' · tap the matching product once to link it');
  }
  function handleLoyalty(value){
    pendingBarcode='';
    window.dispatchEvent(new CustomEvent('dexters-loyalty-scan',{detail:{value:String(value||'')}}));
    status('Loyalty QR scanned · '+String(value||'').slice(0,40));
  }
  function handleScan(x){if(!x||!x.value)return;x.type==='loyalty'?handleLoyalty(x.value):handleProduct(x.value)}

  async function poll(){
    const pair=localStorage.getItem(PAIR_KEY)||'';
    if(!pair)return;
    try{
      const r=await fetch(BRIDGE+'/next-scan?after='+encodeURIComponent(lastId),{headers:{'x-dexters-pair-code':pair},cache:'no-store'});
      if(r.status===403){status('Scanner pairing code rejected · tap Scanner to pair again');return}
      if(!r.ok)return;
      const d=await r.json();for(const x of (d.items||[])){lastId=Math.max(lastId,Number(x.id)||0);handleScan(x)}
    }catch{}
  }
  function beginPolling(){if(pollTimer)return;pollTimer=setInterval(poll,450);poll()}
  function pair(){
    const current=localStorage.getItem(PAIR_KEY)||'';
    const code=prompt('Enter the 6-digit pairing code shown by the Dexter scanner bridge on this PC:',current);
    if(code===null)return;
    const cleaned=String(code).replace(/\D/g,'').slice(0,6);
    if(cleaned.length!==6){status('Scanner pairing code must be 6 digits');return}
    localStorage.setItem(PAIR_KEY,cleaned);lastId=0;status('Scanner pairing saved · checking local bridge…');beginPolling();poll();
  }
  function installButton(){
    const top=document.querySelector('.top');if(!top||document.getElementById('scannerBtn'))return;
    const b=document.createElement('button');b.id='scannerBtn';b.textContent='Scanner';b.title='Pair Foodhub scanner';
    const spacer=top.querySelector('.spacer');top.insertBefore(b,spacer?.nextSibling||null);b.onclick=pair;
  }
  document.addEventListener('click',e=>{
    if(!pendingBarcode)return;
    const btn=e.target.closest?.('[data-item]');if(!btn)return;
    const id=String(btn.dataset.item||'');const item=itemForId(id);if(!item)return;
    const map=getMap();map[pendingBarcode]=id;saveMap(map);
    status('Linked barcode '+pendingBarcode+' to '+(item.name||'item')+' · future scans will add it automatically');
    pendingBarcode='';const search=$('search');if(search)search.placeholder='Search menu';
  },true);

  // Also supports a scanner that behaves like a keyboard on Windows.
  let keys='',lastKeyAt=0;
  document.addEventListener('keydown',e=>{
    const tag=(e.target?.tagName||'').toLowerCase();if(['input','textarea','select'].includes(tag))return;
    const now=Date.now();if(now-lastKeyAt>120)keys='';lastKeyAt=now;
    if(e.key==='Enter'){if(keys.length>=4){e.preventDefault();handleProduct(keys)}keys='';return}
    if(e.key.length===1&&!e.ctrlKey&&!e.altKey&&!e.metaKey)keys+=e.key;
  },true);

  window.addEventListener('load',()=>{installButton();if(localStorage.getItem(PAIR_KEY))beginPolling()});
})();
