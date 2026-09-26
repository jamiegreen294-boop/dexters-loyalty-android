'use strict';

const http=require('http');

function ping(url,timeoutMs=1500){
  return new Promise(resolve=>{
    const req=http.get(url,res=>{
      let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({ok:res.statusCode>=200&&res.statusCode<300,status:res.statusCode,body}));
    });
    req.setTimeout(timeoutMs,()=>{req.destroy();resolve({ok:false,error:'timeout'})});
    req.on('error',e=>resolve({ok:false,error:e.message}));
  });
}
async function checkAll(config={}){
  const started=Date.now();
  const hub=await ping(config.hubUrl||'http://127.0.0.1:17654/health');
  return {
    ok:hub.ok,
    checkedAt:new Date().toISOString(),
    durationMs:Date.now()-started,
    components:{
      hub,
      database:{ok:!!config.databaseOk},
      ui:{ok:!!config.uiOk},
      printer:{ok:config.printerOk===true},
      integrations:config.integrations||[]
    }
  };
}
function unhealthyComponents(report){
  return Object.entries(report?.components||{}).filter(([,v])=>v&&v.ok===false).map(([k])=>k);
}
module.exports={ping,checkAll,unhealthyComponents};
