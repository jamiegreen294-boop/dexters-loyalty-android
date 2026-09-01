(function(){
'use strict';
let mode='auto';
function apply(){
 let season=mode;
 if(mode==='auto'){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric',day:'numeric'}).formatToParts(new Date());
  const m=Number(parts.find(p=>p.type==='month').value),d=Number(parts.find(p=>p.type==='day').value);
  season=m===1||(m===2&&d<=15)?'valentines':m===9||m===10?'halloween':m===11||m===12?'christmas':'normal';
 }
 document.body.classList.remove('season-halloween','season-christmas','season-valentines');
 if(season!=='normal')document.body.classList.add('season-'+season);
}
async function refresh(){
 try{
  const r=await fetch('https://bpnkouymdvcogeaqjmxl.supabase.co/rest/v1/rpc/app_theme_mode',{method:'POST',headers:{apikey:'sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa','Content-Type':'application/json'},body:'{}'});
  if(!r.ok)return;
  const value=await r.json();
  if(['auto','normal','halloween','christmas','valentines'].includes(value)){mode=value;apply()}
 }catch{} // A theme request must never prevent ordering.
}
apply();refresh();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
setInterval(()=>{if(!document.hidden)refresh()},60000);
})();
