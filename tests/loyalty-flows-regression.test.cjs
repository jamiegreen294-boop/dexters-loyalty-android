const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('dist/index.html','utf8');
const collection=fs.readFileSync('dist/collection-order-test.html','utf8');
const sundayCustomer=fs.readFileSync('dist/sunday/customer.html','utf8');
const sundayAdmin=fs.readFileSync('dist/sunday/admin.html','utf8');
const sundayCore=fs.readFileSync('dist/sunday/core.js','utf8');
const sundayApi=fs.readFileSync('dist/sunday/api.js','utf8');

for(const id of ['dextersPointsLiveScript','dextersPointsRedeemScript','dextersSpinClaimLoader','dextersSpinPrizeGuide']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must load exactly once');
}
assert(html.includes("action:'redeem_request'")&&html.includes("action:'confirm_redemption'"),'points redemption request and confirmation must remain wired');
assert(html.includes('dexters_pending_spin_prize'),'Spin to Win claim handoff must remain wired');
assert(collection.includes("action:'spin_prizes'")&&collection.includes('spin_prize_id'),'collection orders must validate and submit Spin prizes');
assert(collection.includes("action:'create'")&&collection.includes("action:'my_orders'"),'collection create and status flows must remain wired');
assert(sundayCore.includes("price:1499,group:'adult'")&&sundayCore.includes("price:999,group:'kids'"),'Sunday Roast customer prices must remain correct');
assert(sundayApi.includes("FN='sunday-roast-api'")&&sundayCustomer.includes('/sunday/api.js')&&sundayAdmin.includes('/sunday/api.js'),'Sunday Roast customer and admin must use the same API');
assert(sundayAdmin.includes('id="enabled"')&&sundayAdmin.includes('id="chicken"')&&sundayAdmin.includes('id="beef"'),'Sunday Roast opening and stock controls must remain wired');

console.log('PASS rewards, Spin claims, collection orders and Sunday Roast wiring');
