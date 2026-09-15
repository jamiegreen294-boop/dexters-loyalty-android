const fs=require('fs');
const path=require('path');
const out='_site';
const files=['pos-pc-pin-login.js','pos-pc-offline.js','pos-pc-session-security.js','pos-pc-v3-addon.js','pos-pc-scanner.js','pos-pc-loyalty-test.js','pos-pc-category-home.js','pos-order-management.js','pos-pc-manager.js','pos-pc-table-payments.js','pos-sunday-roast.js','pos-pc-phone-orders.js','pos-pc-advanced.js','pos-pc-whatsapp.js','pos-pc-xepos-plus.js','pos-pc-promotions-auto.js','pos-pc-recipes.js','pos-pc-purchasing.js','pos-pc-expiry.js','pos-pc-account-statements.js','pos-pc-capacity.js','pos-pc-close-day.js','pos-pc-security-audit.js'];
const featureFiles=files.filter(f=>f!=='pos-pc-pin-login.js');
if(!fs.existsSync('dist/pos.html')) throw new Error('dist/pos.html missing - run npm run build first');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
let html=fs.readFileSync('dist/pos.html','utf8');
for(const f of files){
  if(!fs.existsSync('dist/'+f)) throw new Error('Missing '+f);
  fs.copyFileSync('dist/'+f,path.join(out,f));
  html=html.replaceAll('src="/'+f+'"','src="./'+f+'"');
}
if(!fs.existsSync('dist/customer-display.html')) throw new Error('Missing customer-display.html');
fs.copyFileSync('dist/customer-display.html',path.join(out,'customer-display.html'));
html=html.replace('<title>Dexter\'s POS + Table Service</title>','<title>Dexter\'s POS · GitHub Pages Test</title>');
html=html.replace('PC TEST · TABLE SERVICE','PC TEST · GITHUB PAGES');
html=html.replace('</head>','<meta name="robots" content="noindex,nofollow">\n</head>');
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'pos.html'),html);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({build:'pc-pos-github-pages',generatedAt:new Date().toISOString(),branch:'dexters-pos-pc-test-v3'},null,2));
const check=fs.readFileSync(path.join(out,'index.html'),'utf8');
for(const required of ['pos-pc-pin-login.js','dexters-table-order-pc-test','uber-table-service-pc-test-api','customer_phone:S.phone','discount_pence','pcPinLoginMount']){
  if(!check.includes(required)) throw new Error('GitHub Pages PC POS missing '+required);
}
for(const f of featureFiles){
  if(check.includes('<script src="./'+f+'"')||check.includes('<script src="/'+f+'"')) throw new Error('Feature module must not execute before PIN authentication: '+f);
}
for(const bad of ['src="/pos-pc-','src="/pos-order-management.js"','src="/pos-sunday-roast.js"','id="staffEmail"','id="staffPassword"']) if(check.includes(bad)) throw new Error('Legacy/root-relative PC POS content leaked into Pages build: '+bad);
const pin=fs.readFileSync(path.join(out,'pos-pc-pin-login.js'),'utf8');
for(const required of ['SIGN IN WITH PIN','ACTIVATE PIN LOGIN','6-digit setup code','pc-pos-pin-auth','device_secret','dexters-pos-session','FEATURE_SCRIPTS','__dextersFeatureLoadComplete','loadFeatures'])if(!pin.includes(required))throw new Error('PIN login layer missing '+required);
for(const f of featureFiles)if(!pin.includes("'"+f+"'"))throw new Error('Deferred feature loader missing '+f);
const session=fs.readFileSync(path.join(out,'pos-pc-session-security.js'),'utf8');for(const required of ['LOCK','refresh_token','staffRole','dexters_pc_force_pin_lock_v1'])if(!session.includes(required))throw new Error('Session security layer missing '+required);
const scanner=fs.readFileSync(path.join(out,'pos-pc-scanner.js'),'utf8');for(const required of ['Pair Barcode Scanner','PAIR SCANNER','6-digit code','next-scan','dexters-loyalty-scan'])if(!scanner.includes(required))throw new Error('Scanner layer missing '+required);
const manager=fs.readFileSync(path.join(out,'pos-pc-manager.js'),'utf8');for(const required of ['Square Payment','Refunds / Voids','Cash Up','Manager PIN','Cash Drawer']) if(!manager.includes(required)) throw new Error('Manager layer missing '+required);
const table=fs.readFileSync(path.join(out,'pos-pc-table-payments.js'),'utf8');for(const required of ['PART PAY / SPLIT BILL','CLOSE ACCOUNT','PAYMENT HISTORY','SQUARE']) if(!table.includes(required)) throw new Error('Table payment layer missing '+required);
const roast=fs.readFileSync(path.join(out,'pos-sunday-roast.js'),'utf8');for(const required of ['Sunday Roast Payment Due','TAKE PAYMENT','MAKE READY','COLLECTED','SQUARE','balance_pence']) if(!roast.includes(required)) throw new Error('Sunday Roast layer missing '+required);
const phone=fs.readFileSync(path.join(out,'pos-pc-phone-orders.js'),'utf8');for(const required of ['Phone Orders / Recent Calls','Incoming Call','START TELEPHONE ORDER','REPEAT LAST ORDER','CUSTOMER DETAILS','telephone-events-admin-test']) if(!phone.includes(required)) throw new Error('Phone-order layer missing '+required);
const advanced=fs.readFileSync(path.join(out,'pos-pc-advanced.js'),'utf8');for(const required of ['Table Plan','Timed Orders','Transaction Search','X / Y / Z Reports','Stock / OOS','TRANSFER TABLE']) if(!advanced.includes(required)) throw new Error('Advanced POS layer missing '+required);
const wa=fs.readFileSync(path.join(out,'pos-pc-whatsapp.js'),'utf8');for(const required of ['WhatsApp Inbox','OPEN CHAT','TAKE OVER','SEND REPLY','RETURN TO AI','CUSTOMER DETAILS','pos-whatsapp-inbox']) if(!wa.includes(required)) throw new Error('WhatsApp POS layer missing '+required);
const plus=fs.readFileSync(path.join(out,'pos-pc-xepos-plus.js'),'utf8');for(const required of ['Customers / Loyalty','Ingredient Stock / Suppliers','Table Split / Move / Merge','Promotions / Price Rules','Invoices / Digital Receipts','Customer Display','pc-pos-xepos-test-api']) if(!plus.includes(required)) throw new Error('XEPOS-plus POS layer missing '+required);
const promos=fs.readFileSync(path.join(out,'pos-pc-promotions-auto.js'),'utf8');for(const required of ['promotions_list','S.discount','start_time','weekdays'])if(!promos.includes(required))throw new Error('Automatic promotion layer missing '+required);
const recipes=fs.readFileSync(path.join(out,'pos-pc-recipes.js'),'utf8');for(const required of ['Ingredient Recipes','recipe_set','consume','pc-pos-inventory-auto-test','dexters-pc-order-sent'])if(!recipes.includes(required))throw new Error('Recipe/inventory layer missing '+required);
const purchasing=fs.readFileSync(path.join(out,'pos-pc-purchasing.js'),'utf8');for(const required of ['Supplier Purchase Orders','CREATE FROM LOW STOCK','RECEIVE INTO STOCK','po_create','pc_pos_purchase_orders_test'])if(!purchasing.includes(required))throw new Error('Purchasing layer missing '+required);
const expiry=fs.readFileSync(path.join(out,'pos-pc-expiry.js'),'utf8');for(const required of ['Expiry / Stocktake','EXPIRES TODAY','SAVE EXPIRY','SAVE STOCKTAKE'])if(!expiry.includes(required))throw new Error('Expiry/stocktake layer missing '+required);
const statements=fs.readFileSync(path.join(out,'pos-pc-account-statements.js'),'utf8');for(const required of ['Money Owed · Statements','OPEN STATEMENT','PRINT STATEMENT','SEND EMAIL REMINDER','SEND WHATSAPP REMINDER','pc-pos-credit-statements-test','pc-pos-credit-reminders'])if(!statements.includes(required))throw new Error('Account statement/reminder layer missing '+required);
const capacity=fs.readFileSync(path.join(out,'pos-pc-capacity.js'),'utf8');for(const required of ['Kitchen Capacity / Busy Mode','NORMAL','BUSY','VERY BUSY','PAUSE COLLECTION','pc-pos-capacity-test','slot_capacity','collection_enabled','phone_enabled','whatsapp_enabled','table_enabled'])if(!capacity.includes(required))throw new Error('Kitchen capacity layer missing '+required);
const closeDay=fs.readFileSync(path.join(out,'pos-pc-close-day.js'),'utf8');for(const required of ['Close Day / End of Day','NOT READY TO CLOSE','READY TO CLOSE','Expected drawer cash','offline order','shift/close'])if(!closeDay.includes(required))throw new Error('Close Day layer missing '+required);
const sec=fs.readFileSync(path.join(out,'pos-pc-security-audit.js'),'utf8');for(const required of ['Staff Security / Audit','manual_drawer_open','audit_add','audit_list']) if(!sec.includes(required)) throw new Error('Security audit layer missing '+required);
const off=fs.readFileSync(path.join(out,'pos-pc-offline.js'),'utf8');for(const required of ['Offline Queue','client_request_id','queued_offline','replay','dexters-pc-order-sent']) if(!off.includes(required)) throw new Error('Offline queue layer missing '+required);
console.log('PASS GitHub Pages PC POS build: only PIN bootstrap executes before authentication; all operational modules are present and deferred');
