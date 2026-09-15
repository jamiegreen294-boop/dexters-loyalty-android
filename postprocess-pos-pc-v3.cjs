const fs=require('fs');
const src='app/src/main/assets/index.html';
if(!fs.existsSync(src))throw new Error('Android tablet POS source missing');
let html=fs.readFileSync(src,'utf8');
html=html.replaceAll('/functions/v1/uber-table-service-api','/functions/v1/uber-table-service-pc-test-api');
html=html.replaceAll('/functions/v1/dexters-table-order','/functions/v1/dexters-table-order-pc-test');
html=html.replace('}:{customer_name:S.customer,notes:S.note,items:', '}:{customer_name:S.customer,customer_phone:S.phone,notes:S.note,discount_pence:Math.round(Number(S.discount||0)*100),items:');
html=html.replace(/<div id="authGate" class="modal">[\s\S]*?<\/div><\/div>\s*\n\s*<script>/,'<div id="authGate" class="modal"><div class="box" style="max-width:430px"><h2>Dexter’s POS</h2><div id="pcPinLoginMount" style="color:#9eb0c5">Loading secure PIN login…</div></div></div>\n\n<script>');
html=html.replace("$('loginBtn').addEventListener('click',e=>{e.preventDefault();posLogin()});",'/* PIN-first PC build: legacy email/password click handler removed. */');
html=html.replace("try{const saved=JSON.parse(localStorage.getItem('dexters-pos-session')||'null');applySession(saved)}catch{applySession(null)}","try{const saved=JSON.parse(localStorage.getItem('dexters-pos-session')||'null');if(saved&&localStorage.getItem('dexters_pc_pin_device_id_v1'))S.session=saved}catch{}");
html=html.replace('</head>','<script>try{if(!localStorage.getItem("dexters_pc_pin_device_id_v1")){localStorage.removeItem("dexters-pos-session");localStorage.removeItem("dexters_pc_force_pin_lock_v1")}}catch(e){}</script>\n</head>');
// Critical startup rule: only the PIN bootstrap is allowed to execute before authentication.
// All operational POS modules are loaded by pos-pc-pin-login.js after a valid staff session.
// Inline the tiny authentication bootstrap. A stale/blocked external bootstrap used to leave
// the modal on "Loading secure PIN login…" forever before any error UI could run.
const pinBootstrap=fs.readFileSync('web/pos-pc-pin-login.js','utf8');
const featureFingerprint=fs.readdirSync('web').filter(f=>/^pos-.*\.js$/.test(f)).sort().map(f=>fs.readFileSync('web/'+f)).join('\n');
const buildId=require('crypto').createHash('sha256').update(pinBootstrap).update(featureFingerprint).digest('hex').slice(0,12);
html=html.replace('</head>','<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<script>window.__DEXTERS_POS_BUILD='+JSON.stringify(buildId)+'</script>\n</head>');
html=html.replace('</body>','<script>'+pinBootstrap+'</script>\n</body>');
html=html.replace("Live POS · connected to Dexter's order system.","PC TEST · isolated POS/table/KDS data");
html=html.replace('DEXTER\'S · TABLE SERVICE','PC TEST · TABLE SERVICE');
fs.writeFileSync('dist/pos.html',html);
fs.writeFileSync('dist/pos-test.html',html);
for(const f of ['pos-pc-pin-login.js','pos-pc-offline.js','pos-pc-session-security.js','pos-pc-v3-addon.js','pos-pc-scanner.js','pos-pc-loyalty-test.js','pos-pc-category-home.js','pos-order-management.js','pos-pc-manager.js','pos-pc-table-payments.js','pos-sunday-roast.js','pos-pc-phone-orders.js','pos-pc-advanced.js','pos-pc-whatsapp.js','pos-pc-xepos-plus.js','pos-pc-promotions-auto.js','pos-pc-recipes.js','pos-pc-purchasing.js','pos-pc-expiry.js','pos-pc-account-statements.js','pos-pc-capacity.js','pos-pc-close-day.js','pos-pc-security-audit.js'])fs.copyFileSync('web/'+f,'dist/'+f);
fs.copyFileSync('web/customer-display.html','dist/customer-display.html');
console.log('PC POS v3 built with PIN-only startup; operational modules deferred until authenticated staff session');
