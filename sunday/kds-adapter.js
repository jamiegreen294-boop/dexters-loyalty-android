// Routes the existing KDS renderer to this browser's isolated sample store.
const testReasons=['Item unavailable','Kitchen too busy to accept this order','Requested collection time unavailable','Unable to fulfil order today','Other'];
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'offline-fixture'}}})}})};
window.fetch=async(url,options)=>{
 const b=JSON.parse(options?.body||'{}'),C=SundayRoast,S=SundayStore;let data;
 try{if(b.action==='status')data={enabled:S.read().config.enabled,rejection_reasons:testReasons};
 else if(b.action==='kds_orders')data={orders:S.read().orders.filter(o=>!['rejected','collected'].includes(o.status))};
 else if(b.action==='set_enabled')throw Error('Manage Sunday availability in the dedicated test admin screen.');
 else data={order:await S.mutate(s=>C.transition(s,b.id,b.action,b.reason))};
 return{ok:true,json:async()=>data};}catch(e){return{ok:false,json:async()=>({error:e.message})}}
};
