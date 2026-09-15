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
html=html.replace("$('updateBtn').onclick=()=>{try{if(window.DextersUpdater)window.DextersUpdater.checkForUpdates();$('status').textContent='Checking for POS update…'}catch(e){$('status').textContent='Could not check for update.'}};","$('updateBtn').onclick=()=>{const st=$('status');try{st.textContent='Checking for POS update…';if(window.DextersUpdater&&typeof window.DextersUpdater.checkForUpdates==='function'){window.DextersUpdater.checkForUpdates();return}fetch(location.href,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);st.textContent='Update check complete · latest PC TEST build reachable.'}).catch(()=>{st.textContent='Could not check for update.'})}catch(e){st.textContent='Could not check for update.'}};");
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
html=html.replaceAll('Menu loaded · Live POS','Menu loaded · PC TEST');
html=html.replace('DEXTER\'S · TABLE SERVICE','PC TEST · TABLE SERVICE');
fs.writeFileSync('dist/pos.html',html);
fs.writeFileSync('dist/pos-test.html',html);
for(const f of ['pos-pc-pin-login.js','pos-pc-offline.js','pos-pc-session-security.js','pos-pc-v3-addon.js','pos-pc-scanner.js','pos-pc-loyalty-test.js','pos-pc-category-home.js','pos-pc-collection-orders.js','pos-order-management.js','pos-pc-manager.js','pos-pc-table-payments.js','pos-sunday-roast.js','pos-pc-phone-orders.js','pos-pc-advanced.js','pos-pc-whatsapp.js','pos-pc-xepos-plus.js','pos-pc-promotions-auto.js','pos-pc-recipes.js','pos-pc-purchasing.js','pos-pc-expiry.js','pos-pc-account-statements.js','pos-pc-capacity.js','pos-pc-close-day.js','pos-pc-security-audit.js'])fs.copyFileSync('web/'+f,'dist/'+f);
// The PAY button is dynamically injected. On Chromium/Edge a plain synthetic/default button click
// was locking the event dispatch path in the full PC build. Make it an explicit non-submit button
// and stop the click at the POS payment handler.
const addonPath='dist/pos-pc-v3-addon.js';
let addonJs=fs.readFileSync(addonPath,'utf8');
const payOld="b.onclick=choosePay";
const payNew="b.type='button';b.onclick=e=>{e.preventDefault();e.stopPropagation();choosePay()}";
if(!addonJs.includes(payOld))throw new Error('PC PAY handler signature missing');
addonJs=addonJs.replace(payOld,payNew);
// Later feature modules can reorganise/recreate top toolbar controls. Rebind the core test
// actions after every deferred feature has loaded so Sales/Cash Up/Money Owed/Sunday stay live.
const initOld="window.addEventListener('load',initV3);if(document.readyState!=='loading')initV3();";
const initNew="window.addEventListener('dexters-pos-features-ready',()=>{installTop();forceTestRoutes()});window.addEventListener('load',initV3);if(document.readyState!=='loading')initV3();";
if(!addonJs.includes(initOld))throw new Error('PC v3 init handler signature missing');
addonJs=addonJs.replace(initOld,initNew);
// Guard the key top-bar controls at capture phase. Some later UI layers can replace/rebind
// toolbar buttons after their modules initialise. These are PC-test-only actions and must keep
// opening the correct screens even after the toolbar is reorganised.
const closeMark='\n})();';
const closeAt=addonJs.lastIndexOf(closeMark);
if(closeAt<0)throw new Error('PC v3 addon closing marker missing');
const toolbarGuard=`\nif(!window.__dextersPcCoreToolbarCapture){\n window.__dextersPcCoreToolbarCapture=true;\n document.addEventListener('click',e=>{\n  const b=e.target?.closest?.('#pcSalesBtn,#pcCashupBtn,#qrOrdersBtn');if(!b)return;\n  e.preventDefault();e.stopImmediatePropagation();\n  if(b.id==='pcSalesBtn'){salesView();return}\n  if(b.id==='pcCashupBtn'){cashup();return}\n  if(typeof window.showQrOrders==='function'){window.showQrOrders();return}\n  modal('Customer QR orders · PC TEST','<p>No QR table orders yet.</p>',true);\n },true);\n}\n`;
addonJs=addonJs.slice(0,closeAt)+toolbarGuard+addonJs.slice(closeAt);
fs.writeFileSync(addonPath,addonJs);
// The original category photos were embedded as one large data URI. Chromium rendered the card
// structure but left that data-URI background blank on the actual POS. Decode the same generated
// food-photo sheet into a normal JPG asset and make the category cards load that file instead.
const catPath='dist/pos-pc-category-home.js';
let catJs=fs.readFileSync(catPath,'utf8');
const spriteMatch=catJs.match(/const SPRITE='data:image\/jpeg;base64,([^']+)'/);
if(!spriteMatch)throw new Error('PC category photo sprite data missing');
const sprite=Buffer.from(spriteMatch[1],'base64');
if(sprite.length<1000||sprite[0]!==0xff||sprite[1]!==0xd8||sprite[sprite.length-2]!==0xff||sprite[sprite.length-1]!==0xd9)throw new Error('PC category photo sprite is not a valid complete JPEG');
fs.writeFileSync('dist/pc-category-sprite.jpg',sprite);
catJs=catJs.replace(/const SPRITE='data:image\/jpeg;base64,[^']+';/,"const SPRITE='./pc-category-sprite.jpg';");
if(!catJs.includes("const SPRITE='./pc-category-sprite.jpg';"))throw new Error('PC category photo sprite URL replacement failed');
fs.writeFileSync(catPath,catJs);
fs.copyFileSync('web/customer-display.html','dist/customer-display.html');
console.log('PC POS v3 built with PIN-only startup; PAY click guarded; critical toolbar handlers pinned; category food photos exported as JPG; operational modules deferred until authenticated staff session');
