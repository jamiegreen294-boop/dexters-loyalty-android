const fs=require('fs');
const p='dist/pos.html';
if(!fs.existsSync(p))throw new Error('dist/pos.html missing');
const s=fs.readFileSync(p,'utf8');
const must=[
'PC TEST · TABLE SERVICE',
'openTablesTopBtn','qrOrdersBtn','qrCodesBtn','tableNo','Table Service','QR Orders',
'id="sendBtn"','SEND TO KITCHEN','id="authGate"','pcPinLoginMount',
'/functions/v1/uber-table-service-pc-test-api','window.DextersPinLogin','window.__DEXTERS_POS_BUILD'
];
for(const x of must)if(!s.includes(x))throw new Error('PC POS v3 missing: '+x);
if(s.includes('/functions/v1/uber-table-service-api'))throw new Error('Live table API leaked into PC test');
const deferred=['pos-pc-v3-addon.js','pos-pc-scanner.js','pos-pc-loyalty-test.js','pos-pc-category-home.js','pos-pc-offline.js','pos-pc-session-security.js','pos-order-management.js','pos-pc-manager.js','pos-pc-table-payments.js','pos-sunday-roast.js','pos-pc-phone-orders.js','pos-pc-advanced.js','pos-pc-whatsapp.js','pos-pc-xepos-plus.js','pos-pc-promotions-auto.js','pos-pc-recipes.js','pos-pc-purchasing.js','pos-pc-expiry.js','pos-pc-account-statements.js','pos-pc-capacity.js','pos-pc-close-day.js','pos-pc-security-audit.js'];
for(const f of deferred){if(!fs.existsSync('dist/'+f))throw new Error('PC deferred asset missing: '+f);if(s.includes('<script src="/'+f+'"'))throw new Error('PC feature loads before PIN authentication: '+f)}
const pin=fs.readFileSync('dist/pos-pc-pin-login.js','utf8');for(const f of deferred)if(!pin.includes("'"+f+"'"))throw new Error('PIN feature loader missing: '+f);
if(!s.includes(pin))throw new Error('PIN bootstrap must be inline so a stale external script cannot hang login');
const add=fs.readFileSync('dist/pos-pc-v3-addon.js','utf8');
for(const x of ['cashBtn','cardBtn','Money Owed','Sunday Roast','Cash up','Sales','dexters-table-order-pc-test','sunday-roast-pc-pos-api'])if(!add.includes(x))throw new Error('PC add-on missing: '+x);
const cats=fs.readFileSync('dist/pos-pc-category-home.js','utf8');
for(const x of ['pcCatCard','Categories','pcCatImage','pcCatGrid'])if(!cats.includes(x))throw new Error('PC category home missing: '+x);
console.log('PASS PC POS v3: PIN-only startup, deferred feature modules, safe test APIs and core POS assets present');
