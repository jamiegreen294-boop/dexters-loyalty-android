const fs=require('fs');
const p='dist/pos.html';
if(!fs.existsSync(p))throw new Error('dist/pos.html missing');
const s=fs.readFileSync(p,'utf8');
const must=[
'PC TEST · TABLE SERVICE',
'openTablesTopBtn','qrOrdersBtn','qrCodesBtn','tableNo','Table Service','QR Orders',
'id="sendBtn"','SEND TO KITCHEN','id="authGate"','posLogin',
'/functions/v1/uber-table-service-pc-test-api',
'/pos-pc-v3-addon.js','/pos-pc-scanner.js','/pos-pc-loyalty-test.js','/pos-pc-category-home.js',
'qrcode@1.5.4'
];
for(const x of must)if(!s.includes(x))throw new Error('PC POS v3 missing: '+x);
if(s.includes('/functions/v1/uber-table-service-api'))throw new Error('Live table API leaked into PC test');
const add=fs.readFileSync('dist/pos-pc-v3-addon.js','utf8');
for(const x of ['cashBtn','cardBtn','Money Owed','Sunday Roast','Cash up','Sales','dexters-table-order-pc-test','sunday-roast-pc-pos-test-api'])if(!add.includes(x))throw new Error('PC add-on missing: '+x);
const cats=fs.readFileSync('dist/pos-pc-category-home.js','utf8');
for(const x of ['pcCatCard','Menu categories','← Categories','pcCatGrid'])if(!cats.includes(x))throw new Error('PC category home missing: '+x);
console.log('PASS PC POS v3: tablet UI, category-card menu, table/QR, auth, cash/card, money owed, Sunday Roast, scanner and loyalty test layers present; live table API blocked');
// force Vercel preview deployment for category-card build
