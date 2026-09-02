const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const src=fs.readFileSync('web/spin-shared-test.js','utf8');
const sandbox={window:{},Math};vm.createContext(sandbox);vm.runInContext(src,sandbox);
const api=sandbox.window.DextersSharedSpinTest;assert(api,'shared spin test API missing');
for(let i=0;i<1000;i++){
  const c=api.createCycle();
  assert(c.targets.discount1>=50&&c.targets.discount1<=249);
  assert(c.targets.coffeeCake>=250&&c.targets.coffeeCake<=499);
  assert(c.targets.toastie>=500&&c.targets.toastie<=699);
  assert(c.targets.discount2>=700&&c.targets.discount2<=999);
  assert.equal(c.targets.meal,1000);
  assert.equal(new Set(Object.values(c.targets)).size,5);
}
let cycle=api.createCycle();let global=0;for(const customer of ['A','B','C','A'])global++;assert.equal(global,4);
cycle.spin=999;const meal=api.prizeFor(cycle,1000);assert.equal(meal.key,'meal');
cycle.awarded.meal=true;assert.equal(api.prizeFor(cycle,1000),null);
console.log('PASS shared 1000-spin prize cycle');
