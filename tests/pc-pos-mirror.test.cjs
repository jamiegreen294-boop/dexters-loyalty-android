const fs=require('fs');
function must(ok,msg){if(!ok){console.error('FAIL:',msg);process.exitCode=1}else console.log('PASS:',msg)}
const pos=fs.readFileSync('dist/pos.html','utf8');
const sunday=fs.readFileSync('dist/pos-sunday-pc.html','utf8');

must(!pos.includes('<iframe id="pos"'),'Main PC POS loads directly with no blocked iframe');
for(const label of ['Sales','Cash up','Held orders','Back Office','KDS','Staff','Full screen','Clear sale']) must(pos.includes('>'+label+'<'),'Current POS control '+label+' is present');
must(pos.includes('PC TEST · DEXTER\'S TERMINAL'),'PC test marker is present');
must(pos.includes('pos-money-owed.js'),'Money Owed feature is loaded');
must(pos.includes('pc-test-money-owed-layout'),'Money Owed is aligned into the POS top bar');
must(pos.includes('pc-test-sunday-button'),'Sunday Roast top-bar button is present');
must(pos.includes('/pos-sunday-pc.html'),'Sunday Roast button opens direct PC Sunday page');
must(pos.includes('/pos-pc-scanner.js'),'Foodhub/PC scanner layer is loaded');
must(pos.includes('/pos-pc-loyalty-test.js'),'Loyalty/coffee test layer is loaded');
must(pos.includes('KDS TEST DISABLED'),'Live KDS send is blocked in PC test');
must(pos.includes('directSignIn') && pos.includes('/auth/v1/token?grant_type=password'),'Direct staff sign-in fallback is present');
must(!pos.includes("navigator.serviceWorker.register('/pos-sw.js')"),'POS service-worker cache is disabled for PC test');
must(pos.includes('Takeaway') && pos.includes('Eat in') && pos.includes('Collection'),'Order modes are present');
must(pos.includes('CASH') && pos.includes('CARD'),'Cash and card payment buttons are present');
must(pos.includes('Order note') && pos.includes('Discount') && pos.includes('Hold sale') && pos.includes('Customer'),'Cart tools are present');

must(!sunday.includes('<iframe id="pos"'),'Sunday Roast PC page has no blocked iframe');
must(sunday.includes('id="srLaunch"') && sunday.includes('New order') && sunday.includes('Edit order'),'Sunday Roast create/edit UI is present');
must(sunday.includes('pc-sunday-auto-open'),'Sunday Roast PC page auto-opens the order UI');

if(process.exitCode) process.exit(process.exitCode);
console.log('PC POS direct-page regression check passed');
