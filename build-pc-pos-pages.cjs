const fs=require('fs');
const path=require('path');
const out='_site';
if(!fs.existsSync('dist/pos.html')) throw new Error('dist/pos.html missing - run npm run build first');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
let html=fs.readFileSync('dist/pos.html','utf8');
for(const f of ['pos-pc-v3-addon.js','pos-pc-scanner.js','pos-pc-loyalty-test.js','pos-pc-category-home.js','pos-order-management.js','pos-pc-manager.js','pos-pc-table-payments.js','pos-sunday-roast.js','pos-pc-phone-orders.js','pos-pc-advanced.js']){
  if(!fs.existsSync('dist/'+f)) throw new Error('Missing '+f);
  fs.copyFileSync('dist/'+f,path.join(out,f));
  html=html.replaceAll('src="/'+f+'"','src="./'+f+'"');
}
html=html.replace('<title>Dexter\'s POS + Table Service</title>','<title>Dexter\'s POS · GitHub Pages Test</title>');
html=html.replace('PC TEST · TABLE SERVICE','PC TEST · GITHUB PAGES');
html=html.replace('</head>','<meta name="robots" content="noindex,nofollow">\n</head>');
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'pos.html'),html);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({build:'pc-pos-github-pages',generatedAt:new Date().toISOString(),branch:'dexters-pos-pc-test-v3'},null,2));
const check=fs.readFileSync(path.join(out,'index.html'),'utf8');
for(const required of ['pos-pc-v3-addon.js','pos-pc-scanner.js','pos-pc-loyalty-test.js','pos-pc-category-home.js','pos-order-management.js','pos-pc-manager.js','pos-pc-table-payments.js','pos-sunday-roast.js','pos-pc-phone-orders.js','pos-pc-advanced.js','dexters-table-order-pc-test','uber-table-service-pc-test-api']){
  if(!check.includes(required)) throw new Error('GitHub Pages PC POS missing '+required);
}
for(const bad of ['src="/pos-pc-','src="/pos-order-management.js"','src="/pos-sunday-roast.js"']) if(check.includes(bad)) throw new Error('Root-relative PC POS asset path leaked into GitHub Pages build: '+bad);
const manager=fs.readFileSync(path.join(out,'pos-pc-manager.js'),'utf8');
for(const required of ['Square Payment','Refunds / Voids','Cash Up','Manager PIN','Cash Drawer']) if(!manager.includes(required)) throw new Error('Manager layer missing '+required);
const table=fs.readFileSync(path.join(out,'pos-pc-table-payments.js'),'utf8');
for(const required of ['PART PAY / SPLIT BILL','CLOSE ACCOUNT','PAYMENT HISTORY','SQUARE']) if(!table.includes(required)) throw new Error('Table payment layer missing '+required);
const roast=fs.readFileSync(path.join(out,'pos-sunday-roast.js'),'utf8');
for(const required of ['Sunday Roast Payment Due','TAKE PAYMENT','MAKE READY','COLLECTED','SQUARE','balance_pence']) if(!roast.includes(required)) throw new Error('Sunday Roast layer missing '+required);
const phone=fs.readFileSync(path.join(out,'pos-pc-phone-orders.js'),'utf8');
for(const required of ['Phone Orders / Recent Calls','Incoming Call','START TELEPHONE ORDER','REPEAT LAST ORDER','telephone-events-admin-test']) if(!phone.includes(required)) throw new Error('Phone-order layer missing '+required);
const advanced=fs.readFileSync(path.join(out,'pos-pc-advanced.js'),'utf8');
for(const required of ['Table Plan','Timed Orders','Transaction Search','X / Y / Z Reports','Stock / OOS','TRANSFER TABLE']) if(!advanced.includes(required)) throw new Error('Advanced POS layer missing '+required);
console.log('PASS GitHub Pages PC POS build: category cards, scanner, loyalty, held/table/QR accounts, Square, refunds, manager, part-pay/split-bill, Sunday Roast payment flags, caller-aware phone orders, table plan, timed orders, transactions, X/Y/Z and stock controls present');
