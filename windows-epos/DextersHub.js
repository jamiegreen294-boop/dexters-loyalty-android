const http=require('http');
const fs=require('fs');
const path=require('path');
const os=require('os');
const cp=require('child_process');
const IntegrationGateway=require('./IntegrationGateway');
const PhoneOrders=require('./PhoneOrders');
const DexterAI=require('./DexterAI');
const LocalStore=require('./LocalStore');
const OperationsCentre=require('./OperationsCentre');
const SyncEngine=require('./SyncEngine');

const ROOT=path.resolve(__dirname);
const CONFIG_PATH=process.env.DEXTERS_EPOS_CONFIG||path.join(ROOT,'config.json');
const LOG_PATH=path.join(ROOT,'hub-node.log');
const QUEUE_PATH=path.join(ROOT,'offline-queue.jsonl');
const DASHBOARD=path.join(ROOT,'dashboard','index.html');
const EPOS_APP=path.join(ROOT,'app','index.html');
function log(msg){fs.appendFileSync(LOG_PATH,new Date().toISOString()+' '+msg+'\n');}
function loadConfig(){return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));}
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'content-type':type,'access-control-allow-origin':'*','access-control-allow-headers':'content-type,x-dexters-key','access-control-allow-methods':'GET,POST,OPTIONS','cache-control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(body):String(body));}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1024*1024)reject(new Error('Request too large'));});req.on('end',()=>{try{resolve(s?JSON.parse(s):{});}catch(e){reject(e);}});req.on('error',reject);});}
function launch(command,args){const parts=args?String(args).split(' ').filter(Boolean):[];const child=cp.spawn(command,parts,{detached:true,stdio:'ignore',windowsHide:false});child.unref();return true;}
function queue(event){fs.appendFileSync(QUEUE_PATH,JSON.stringify({...event,queued_at:new Date().toISOString()})+'\n');}
function queueCount(){try{return fs.readFileSync(QUEUE_PATH,'utf8').split(/\r?\n/).filter(Boolean).length}catch{return 0}}
function runPS(script){return new Promise((resolve,reject)=>cp.execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true,timeout:8000},(e,stdout,stderr)=>e?reject(new Error((stderr||e.message).trim())):resolve(stdout.trim())))}
async function printerStatus(name){if(!name)return null;try{const safe=String(name).replace(/'/g,"''");const out=await runPS("$p=Get-Printer -Name '"+safe+"' -ErrorAction Stop; [pscustomobject]@{Name=$p.Name;PrinterStatus=[string]$p.PrinterStatus;WorkOffline=[bool]$p.WorkOffline}|ConvertTo-Json -Compress");return JSON.parse(out)}catch{return null}}
async function handle(req,res){
  const cfg=loadConfig();
  if(req.method==='OPTIONS')return send(res,200,{ok:true});
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='GET'&&url.pathname==='/epos'){if(!fs.existsSync(EPOS_APP))return send(res,404,'EPOS app not installed','text/plain; charset=utf-8');return send(res,200,fs.readFileSync(EPOS_APP,'utf8'),'text/html; charset=utf-8');}
  if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/dashboard')){if(!fs.existsSync(DASHBOARD))return send(res,404,'Dashboard not installed','text/plain; charset=utf-8');return send(res,200,fs.readFileSync(DASHBOARD,'utf8'),'text/html; charset=utf-8');}
  if(req.method==='POST'&&url.pathname==='/sync/run'){
    const b=await body(req);return send(res,200,await SyncEngine.runBatch(Number(b.limit||25)));
  }
  if(req.method==='GET'&&url.pathname==='/operations'){
    return send(res,200,{ok:true,...OperationsCentre.overview(LocalStore.stats())});
  }
  if(req.method==='GET'&&url.pathname==='/local/orders'){
    return send(res,200,{ok:true,orders:LocalStore.recentOrders(Number(url.searchParams.get('limit')||50))});
  }
  if(req.method==='POST'&&url.pathname==='/local/order'){
    const b=await body(req);const id=LocalStore.saveOrder(b.order||{});LocalStore.audit(b.staffId||null,'order.save','order',id,{source:'test-epos'});return send(res,200,{ok:true,id});
  }
  if(req.method==='POST'&&url.pathname==='/local/queue'){
    const b=await body(req);const id=LocalStore.queue(b.connector,b.action,b.entityId,b.payload);return send(res,200,{ok:true,id,summary:LocalStore.queueSummary()});
  }
  if(req.method==='GET'&&url.pathname==='/ai/state'){
    return send(res,200,{ok:true,assistant:DexterAI.state()});
  }
  if(req.method==='POST'&&url.pathname==='/ai/chat'){
    const b=await body(req);try{return send(res,200,{ok:true,...await DexterAI.chat(b.message,b.context||{})})}catch(e){return send(res,409,{ok:false,error:e.message})}
  }
  if(req.method==='GET'&&url.pathname==='/integrations'){
    return send(res,200,{ok:true,testOnly:true,connectors:IntegrationGateway.allStates(),config:IntegrationGateway.safeConfig()});
  }
  if(req.method==='POST'&&url.pathname==='/phone/session'){
    const b=await body(req);const session=PhoneOrders.makePhoneOrderSession(b.call||{});return send(res,200,{ok:true,session,card:PhoneOrders.callerCard(session)});
  }
  if(req.method==='POST'&&url.pathname==='/phone/fulfilment'){
    const b=await body(req);const session=PhoneOrders.chooseFulfilment(b.session||{},b.mode);return send(res,200,{ok:true,session,orderDraft:PhoneOrders.toOrderDraft(session)});
  }
  if(req.method==='POST'&&url.pathname==='/phone/lookup-plan'){
    const b=await body(req);return send(res,200,{ok:true,...IntegrationGateway.phoneLookupPlan(b.number)});
  }
  if(req.method==='POST'&&url.pathname==='/orders/normalise'){
    const b=await body(req);return send(res,200,{ok:true,order:IntegrationGateway.normaliseOrder(b.source,b.payload||{})});
  }
  if(url.pathname==='/health'){
    const p=await printerStatus(cfg.printer?.name);return send(res,200,{ok:true,service:'Dexters Windows Hub',runtime:'node',version:'0.3.0-test',siteId:cfg.siteId,deviceId:cfg.deviceId,deviceName:cfg.deviceName,hostname:os.hostname(),platform:process.platform,node:process.version,printer:{configured:cfg.printer?.name||null,connected:!!p,status:p},offlineQueue:queueCount(),integrations:{whatsapp:{enabled:!!cfg.apps?.whatsapp?.enabled},bonline:{enabled:!!cfg.apps?.bonline?.enabled},square:{enabled:!!cfg.apps?.square?.enabled,mode:cfg.apps?.square?.mode||null}},timestamp:new Date().toISOString()});
  }
  if(req.method==='POST'&&url.pathname==='/apps/launch'){
    const b=await body(req),name=String(b.name||'');const app=cfg.apps?.[name];if(!app?.enabled)return send(res,409,{ok:false,error:'Integration disabled'});
    if(name==='square')return send(res,200,{ok:true,launched:'square',mode:app.mode||'bridge',bridgeUrl:app.bridgeUrl||null});
    launch(app.command,app.arguments||'');log('app-launch '+name);return send(res,200,{ok:true,launched:name});
  }
  if(req.method==='POST'&&url.pathname==='/hardware/action'){
    const b=await body(req),action=String(b.action||'');
    if(action==='test-print'){const p=await printerStatus(cfg.printer?.name);if(!p)return send(res,409,{ok:false,error:'Configured receipt printer is not available on this test PC'});return send(res,200,{ok:true,action:'test-print',message:'Printer detected; raw print acceptance test must be run on a till with the configured printer'})}
    if(action==='open-drawer')return send(res,409,{ok:false,error:'Drawer test is disabled on the home-PC test device because no till drawer is attached'});
    return send(res,400,{ok:false,error:'Unknown hardware action'});
  }
  if(req.method==='POST'&&url.pathname==='/queue'){
    const b=await body(req);queue(b);return send(res,200,{ok:true,queued:true,count:queueCount()});
  }
  if(url.pathname==='/diagnostics'){
    let logTail='';try{logTail=fs.readFileSync(LOG_PATH,'utf8').split(/\r?\n/).slice(-40).join('\n');}catch{}
    return send(res,200,{ok:true,configPath:CONFIG_PATH,logPath:LOG_PATH,queuePath:QUEUE_PATH,queueCount:queueCount(),logTail});
  }
  return send(res,404,{ok:false,error:'Not found'});
}
const cfg=loadConfig();const port=Number(cfg.listenPort||17654);
const server=http.createServer((req,res)=>Promise.resolve(handle(req,res)).catch(e=>{log('ERROR '+(e.stack||e.message));send(res,500,{ok:false,error:e.message});}));
server.listen(port,'127.0.0.1',()=>log('DextersHub Node started on 127.0.0.1:'+port));
process.on('uncaughtException',e=>log('UNCAUGHT '+(e.stack||e.message)));
process.on('unhandledRejection',e=>log('UNHANDLED '+String(e)));
