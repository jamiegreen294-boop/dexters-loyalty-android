'use strict';

function salesSummary(orders=[]){
  const paid=(orders||[]).filter(o=>!['voided','refunded','cancelled'].includes(String(o.status||'')));
  const total=paid.reduce((a,o)=>a+Number(o.total_pence||0),0);
  const bySource={};
  const byFulfilment={};
  for(const o of paid){
    bySource[o.source]=(bySource[o.source]||0)+Number(o.total_pence||0);
    const f=o.fulfilment||'unknown';byFulfilment[f]=(byFulfilment[f]||0)+Number(o.total_pence||0);
  }
  return {orderCount:paid.length,totalPence:total,averageOrderPence:paid.length?Math.round(total/paid.length):0,bySource,byFulfilment};
}
function stockValuation(stock=[]){
  return {
    lineCount:stock.length,
    lowStock:stock.filter(x=>Number(x.qty||0)<=Number(x.reorder_level||0)).length,
    unitsOnHand:stock.reduce((a,x)=>a+Number(x.qty||0),0)
  };
}
module.exports={salesSummary,stockValuation};
