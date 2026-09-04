(function(){
 const U='https://bpnkouymdvcogeaqjmxl.supabase.co',K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
 async function token(){const {data}=await sb.auth.getSession();return data.session?.access_token||''}
 async function amendApi(body){const t=await token();const r=await fetch(U+'/functions/v1/collection-order-amend-test-api',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
 window.dextersKdsAmend={
   request:async(orderId,itemIds,note)=>amendApi({action:'request_amendment',id:orderId,item_ids:itemIds,note}),
   restore:async(menuItemId)=>amendApi({action:'restore_daily_stock',menu_item_id:menuItemId})
 };
})();