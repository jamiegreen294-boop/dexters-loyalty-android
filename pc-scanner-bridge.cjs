const http = require('http');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const path = require('path');

const PORT = Number(process.env.DEXTERS_SCANNER_PORT || 8787);
const CONFIG = path.join(process.cwd(), '.dexters-scanner-pair.json');
let pairCode = process.env.DEXTERS_SCANNER_PAIR_CODE || '';
if (!pairCode) {
  try { pairCode = JSON.parse(fs.readFileSync(CONFIG, 'utf8')).pairCode || ''; } catch {}
}
if (!pairCode) {
  pairCode = String(Math.floor(100000 + Math.random() * 900000));
  try { fs.writeFileSync(CONFIG, JSON.stringify({ pairCode }, null, 2)); } catch {}
}

let queue = [];
let sequence = 0;
const seen = new Map();

function json(res, status, body, extra = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type,x-dexters-pair-code',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    ...extra
  });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 32768) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function validPair(req, body = {}) {
  const supplied = String(req.headers['x-dexters-pair-code'] || body.pairCode || '').trim();
  return supplied && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(pairCode));
}
function localAddresses() {
  const out = [];
  for (const entries of Object.values(os.networkInterfaces())) for (const a of entries || []) {
    if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}
function scannerPage() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dexter Scanner</title><style>body{font-family:system-ui;background:#07111f;color:#fff;margin:0;padding:18px}h1{margin-top:0}input,select,button{font:inherit;width:100%;padding:14px;margin:7px 0;border-radius:12px;border:1px solid #31506f;box-sizing:border-box}input,select{background:#10213a;color:#fff}button{background:#ffd43b;color:#07111f;border:0;font-weight:900}.ok{color:#8ff0b3}.bad{color:#ffadb8}</style></head><body><h1>Dexter's Foodhub Scanner</h1><p>Enter the 6-digit pairing code shown on the till PC. Keep the scan box focused, then scan.</p><input id="pair" inputmode="numeric" maxlength="6" placeholder="Pairing code"><select id="type"><option value="product">Product barcode</option><option value="loyalty">Loyalty QR</option></select><input id="scan" autofocus autocomplete="off" placeholder="Scan barcode / QR"><button id="send">SEND TEST SCAN</button><div id="msg"></div><script>const $=id=>document.getElementById(id);async function send(){const value=$('scan').value.trim(),pairCode=$('pair').value.trim(),type=$('type').value;if(!value||!pairCode)return;try{const r=await fetch('/scan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({value,type,pairCode})});const d=await r.json();$('msg').className=r.ok?'ok':'bad';$('msg').textContent=r.ok?'Sent: '+value:(d.error||'Send failed');if(r.ok){$('scan').value='';$('scan').focus()}}catch(e){$('msg').className='bad';$('msg').textContent='Could not reach till PC'}}$('scan').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();send()}});$('send').onclick=send;</script></body></html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/foodhub')) {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    return res.end(scannerPage());
  }
  if (req.method === 'GET' && url.pathname === '/status') return json(res, 200, {ok:true,service:'dexters-pc-scanner-bridge'});
  if (req.method === 'POST' && url.pathname === '/scan') {
    let body; try { body = await readBody(req); } catch { return json(res, 400, {error:'Invalid JSON'}); }
    if (!validPair(req, body)) return json(res, 403, {error:'Pairing code incorrect'});
    const value = String(body.value || '').trim().slice(0, 300);
    const type = body.type === 'loyalty' ? 'loyalty' : 'product';
    if (!value) return json(res, 400, {error:'No scan value'});
    const fingerprint = type + ':' + value;
    const now = Date.now();
    if ((seen.get(fingerprint) || 0) + 700 > now) return json(res, 200, {ok:true,duplicate:true});
    seen.set(fingerprint, now);
    const item = {id: ++sequence, type, value, at: new Date().toISOString()};
    queue.push(item); if (queue.length > 100) queue = queue.slice(-100);
    return json(res, 200, {ok:true,id:item.id});
  }
  if (req.method === 'GET' && url.pathname === '/next-scan') {
    const supplied = String(req.headers['x-dexters-pair-code'] || url.searchParams.get('pairCode') || '').trim();
    if (supplied !== pairCode) return json(res, 403, {error:'Pairing code incorrect'});
    const after = Number(url.searchParams.get('after') || 0);
    return json(res, 200, {items: queue.filter(x => x.id > after).slice(0, 20)});
  }
  return json(res, 404, {error:'Not found'});
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dexter's PC Scanner Bridge running on port ${PORT}`);
  console.log(`Pairing code: ${pairCode}`);
  console.log('Foodhub scanner page:');
  for (const ip of localAddresses()) console.log(`  http://${ip}:${PORT}/foodhub`);
  console.log(`POS local endpoint: http://127.0.0.1:${PORT}`);
});
