const assert=require('assert');
function calc(price,qty,status,paidPence){
  const total=price*qty;
  let paid=Math.max(0,Math.round(paidPence||0));
  if(status==='paid_full')paid=total;
  if(status==='unpaid')paid=0;
  paid=Math.min(total,paid);
  return{total,paid,balance:total-paid};
}
assert.deepStrictEqual(calc(1499,1,'paid_full',0),{total:1499,paid:1499,balance:0});
assert.deepStrictEqual(calc(1499,1,'deposit_paid',500),{total:1499,paid:500,balance:999});
assert.deepStrictEqual(calc(999,2,'deposit_paid',500),{total:1998,paid:500,balance:1498});
assert.deepStrictEqual(calc(1499,1,'unpaid',1499),{total:1499,paid:0,balance:1499});
console.log('Sunday manual staff payment tests passed');