const assert=require('assert');

function createOrder(items){return {status:'pending',items:[...items],amendment_items:null,amendment_note:null};}
function requestAmendment(order,itemIds,day,outages){
  assert(['pending','amended'].includes(order.status));
  const ordered=new Set(order.items.map(x=>x.id));
  itemIds.forEach(id=>assert(ordered.has(id)));
  itemIds.forEach(id=>outages.set(id,day));
  return {...order,status:'amendment_required',amendment_items:[...itemIds],amendment_note:'Sorry, you need to amend your order.'};
}
function customerBasket(order){
  const blocked=new Set(order.amendment_items||[]);
  return order.items.filter(x=>!blocked.has(x.id));
}
function submitAmendment(order,items,day,outages){
  items.forEach(x=>assert.notStrictEqual(outages.get(x.id),day,'daily-outage item must not be resubmitted'));
  return {...order,status:'amended',items:[...items],amendment_items:null,amendment_note:null};
}
function accept(order){assert(['pending','amended'].includes(order.status));return {...order,status:'accepted'};}

const DAY='2026-09-04',NEXT='2026-09-05';
const outages=new Map();
const original=createOrder([
  {id:'tenders',name:'Chicken Tenders Meal',mods:['Skinny chips','Garlic mayo']},
  {id:'coffee',name:'Latte',mods:['Oat milk']}
]);
assert.strictEqual(original.status,'pending');

const needsChange=requestAmendment(original,['tenders'],DAY,outages);
assert.strictEqual(needsChange.status,'amendment_required');
assert.strictEqual(outages.get('tenders'),DAY);
assert.strictEqual(needsChange.amendment_note,'Sorry, you need to amend your order.');

const kept=customerBasket(needsChange);
assert.deepStrictEqual(kept,[{id:'coffee',name:'Latte',mods:['Oat milk']}]);
assert.deepStrictEqual(kept[0].mods,['Oat milk'],'available item modifiers must survive amendment');

const replacement={id:'burger',name:'Chicken Burger Meal',mods:['Skinny chips','Garlic mayo']};
const amended=submitAmendment(needsChange,[...kept,replacement],DAY,outages);
assert.strictEqual(amended.status,'amended');
assert.deepStrictEqual(amended.items[0].mods,['Oat milk']);
assert.deepStrictEqual(amended.items[1].mods,['Skinny chips','Garlic mayo']);

const accepted=accept(amended);
assert.strictEqual(accepted.status,'accepted');

assert.strictEqual(outages.get('tenders')===NEXT,false,'outage must not carry into next day by date match');
outages.delete('tenders');
assert.strictEqual(outages.has('tenders'),false,'manual back-in-stock must restore item');

const customerPendingCopy='Order sent to Dexter\'s';
assert(!/stock|checking/i.test(customerPendingCopy),'customer pending copy must not mention stock checking');
assert(!/stripe/i.test(JSON.stringify({original,needsChange,amended,accepted})),'Stripe must not be part of this flow');

console.log('PASS collection amendment journey');
console.log('PASS modifiers preserved');
console.log('PASS daily stock outage + manual restore');
console.log('PASS customer copy hides stock checking');
console.log('PASS Stripe absent');
