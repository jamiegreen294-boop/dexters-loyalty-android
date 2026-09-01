// Preview-only gateway. All business writes are rejected before any upstream call.
const ROOT='https://bpnkouymdvcogeaqjmxl.supabase.co';
const KEY='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
const rpcs=new Set(['app_theme_mode','loyalty_menu_public','loyalty_modifier_public','spin_wheel_is_enabled','spin_wheel_my_status','staff_spin_winners','staff_spin_lookup','staff_lookup_customer']);
const actions={'collection-orders-api':['status','my_orders','stock_list'],'loyalty-menu-admin':['list'],'admin-manage-staff':['list'],'customer-offers-admin':['customers','customer_offers','offer_details']};
function permitted(url,method,body){
 const path=url.pathname;
 if(method==='GET'&&['/auth/v1/user','/rest/v1/profiles','/rest/v1/loyalty_accounts','/rest/v1/offers_v2'].includes(path))return true;
 if(method==='POST'&&path==='/auth/v1/token')return ['password','refresh_token'].includes(url.searchParams.get('grant_type'));
 if(method==='POST'&&path==='/auth/v1/logout')return true;
 if(method==='POST'&&path.startsWith('/rest/v1/rpc/'))return rpcs.has(path.slice('/rest/v1/rpc/'.length));
 if(method==='POST'&&path.startsWith('/functions/v1/'))return (actions[path.slice('/functions/v1/'.length)]||[]).includes(body?.action);
 return false;
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Authorization');
 try{
 const path=req.query.path;if(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//')||path.includes('\\'))return res.status(400).json({error:'Invalid preview path'});
 const url=new URL(path,ROOT);if(url.origin!==ROOT)return res.status(400).json({error:'Invalid preview origin'});
 const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
 if(!permitted(url,req.method,body))return res.status(403).json({error:'Read-only integration test: this change was blocked. Nothing was sent.',message:'Read-only integration test: changes are disabled.'});
 if(url.pathname==='/auth/v1/logout')url.searchParams.set('scope','local');
 const headers={apikey:KEY,'Content-Type':'application/json'};
 for(const h of ['authorization','accept','range','range-unit','x-client-info','x-supabase-api-version'])if(req.headers[h])headers[h]=req.headers[h];
 const upstream=await fetch(url,{method:req.method,headers,body:req.method==='POST'?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(20000)});
 res.setHeader('Content-Type',upstream.headers.get('content-type')||'application/json');
 for(const h of ['content-range','x-supabase-api-version'])if(upstream.headers.get(h))res.setHeader(h,upstream.headers.get(h));
 res.status(upstream.status).send(await upstream.text());
 }catch(e){res.status(502).json({error:'Preview connection could not complete. Please retry.'})}
};
module.exports.permitted=permitted;
