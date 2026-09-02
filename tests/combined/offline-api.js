// Entirely local review data; never calls the real customer or news APIs.
(function(){
const store='dexters-combined-admin-demo-v1';let state;
try{state=JSON.parse(localStorage.getItem(store)||'null')}catch{}
state=state||{news:{message:'Dexter’s is hosting a Macmillan Coffee Morning on 23rd September.',active:true},customers:[{id:'demo-alice',full_name:'Alice — Test customer',phone:'',loyalty_code:'222222',last_active:'2023-01-01',points:180,stamps:2},{id:'demo-bob',full_name:'Bob — Test customer',phone:'',loyalty_code:'333333',last_active:new Date().toISOString(),points:22,stamps:3}],offers:[]};
function save(){try{localStorage.setItem(store,JSON.stringify(state))}catch{}}
// Use an explicit fake session only within this self-contained file's origin.
const sessionKey='sb-bpnkouymdvcogeaqjmxl-auth-token';
const realGet=Storage.prototype.getItem;
Storage.prototype.getItem=function(key){if(key===sessionKey)return JSON.stringify({access_token:'OFFLINE-DEMO-NOT-A-REAL-SESSION'});return realGet.call(this,key)};
window.fetch=async function(url,options={}){const body=JSON.parse(options.body||'{}');let result,status=200;
 if(String(url).includes('/customer-offers-admin')){
  if(body.action==='customers')result={customers:state.customers};
  else if(body.action==='delete_customer'){
   const c=state.customers.find(c=>c.id===body.customer_id),days=c?Math.floor((Date.now()-new Date(c.last_active).getTime())/86400000):0;
   if(!c||body.confirm!==true||days<Number(body.min_inactive_days)){status=409;result={error:'Test customer is not eligible for deletion'};}
   else{state.customers=state.customers.filter(c=>c.id!==body.customer_id);result={ok:true};save();}
  }else if(body.action==='create'){state.offers.push(body);result={ok:true};save();}else{status=400;result={error:'Not available in this isolated test'};}
 }else if(String(url).includes('/app-news-api')){
  if(body.action==='save'){state.news={message:String(body.message||''),active:true};save();}
  if(body.action==='unpublish'){state.news.active=false;save();}
  result=state.news;
 }else{status=403;result={error:'Live services are disabled in this test'};}
 return {ok:status===200,status,json:async()=>structuredClone(result),text:async()=>JSON.stringify(result)};
};
})();
