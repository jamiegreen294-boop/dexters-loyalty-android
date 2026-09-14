const fs=require('fs');
function must(ok,msg){if(!ok){console.error('FAIL:',msg);process.exitCode=1}else console.log('PASS:',msg)}
const outer=fs.readFileSync('dist/pos.html','utf8');
const inner=fs.readFileSync('dist/pos-test.html','utf8');

must(outer.includes('id="pos"') && outer.includes('/pos-test.html'),'Sunday Roast wrapper loads the real POS iframe');
must(outer.includes('id="srLaunch"') && outer.includes('New order') && outer.includes('Edit order'),'Sunday Roast create/edit UI is present');
must(outer.includes('pc-test-wrapper-layout'),'PC wrapper layout bridge is present');
must(!outer.includes('<script src="/pos-pc-scanner.js"></script>'),'Scanner code is not incorrectly loaded in outer wrapper');
must(!outer.includes('<script src="/pos-pc-loyalty-test.js"></script>'),'Loyalty test code is not incorrectly loaded in outer wrapper');

for(const label of ['Sales','Cash up','Held orders','Back Office','KDS','Staff','Full screen','Clear sale']) must(inner.includes('>'+label+'<'),'Current tablet POS control '+label+' is present');
must(inner.includes('PC TEST · DEXTER\'S TERMINAL'),'PC test marker is present');
must(inner.includes('pos-money-owed.js'),'Money Owed feature is loaded');
must(inner.includes('pc-test-money-owed-layout'),'Money Owed is aligned into the POS top bar');
must(inner.includes('/pos-pc-scanner.js'),'Foodhub/PC scanner layer is loaded');
must(inner.includes('/pos-pc-loyalty-test.js'),'Loyalty/coffee test layer is loaded');
must(inner.includes('KDS TEST DISABLED'),'Live KDS send is blocked in PC test');
must(inner.includes('directSignIn') && inner.includes('/auth/v1/token?grant_type=password'),'Direct staff sign-in fallback is present');
must(inner.includes('service worker disabled') || !inner.includes("navigator.serviceWorker.register('/pos-sw.js')"),'POS service-worker cache is disabled for PC test');
must(inner.includes('Takeaway') && inner.includes('Eat in') && inner.includes('Collection'),'Order modes are present');
must(inner.includes('CASH') && inner.includes('CARD'),'Cash and card payment buttons are present');
must(inner.includes('Order note') && inner.includes('Discount') && inner.includes('Hold sale') && inner.includes('Customer'),'Cart tools are present');

if(process.exitCode) process.exit(process.exitCode);
console.log('PC POS mirror regression check passed');
