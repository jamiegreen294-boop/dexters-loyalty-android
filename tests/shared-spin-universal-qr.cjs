const assert=require('node:assert/strict');
function route(q){const p=String(q||'').split('|');if(p[0]!=='DEXTERS'||p[2]!=='v1')return'INVALID';return({CUSTOMER:'CUSTOMER',REWARD:'REWARD',POINTS:'POINTS',OFFER:'OFFER'})[p[1]]||'UNSUPPORTED'}
assert.equal(route('DEXTERS|CUSTOMER|v1|123456'),'CUSTOMER');
assert.equal(route('DEXTERS|REWARD|v1|123456|spin|abc'),'REWARD');
assert.equal(route('DEXTERS|POINTS|v1|123456'),'POINTS');
assert.equal(route('DEXTERS|OFFER|v1|123456|deal'),'OFFER');
assert.equal(route('BAD|QR'),'INVALID');
console.log('PASS shared-spin QR routing compatibility checks');
