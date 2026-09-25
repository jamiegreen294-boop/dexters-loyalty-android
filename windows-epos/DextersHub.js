const http=require('http');
const fs=require('fs');
const path=require('path');
const os=require('os');
const cp=require('child_process');

const ROOT=path.resolve(__dirname);
const CONFIG_PATH=process.env.DEXTERS_EPOS_CONFIG||path.join(ROOT,'config.json');
const LOG_PATH=path.join(ROOT,'hub-node.log');
const QUEUE_PATH=path.join(ROOT,'offline-queue.jsonl');
function log(msg){fs.appendFileSync(LOG_PATH,new Date().toISOString()+' '+msg+'\n');}
function loadConfig(){return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));}
function send(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','access-control-allow-headers':'content-type,x-dexters-key','access-control-allow-methods':'GET,POST,OPTIONS','cache-control':'no-store'});res.end(JSON.stringify(body));}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1024*1024)reject(new Error('Request too large'));});req.on('end',()=>{try{resolve(s?JSON.parse(s):{});}catch(e){reject(e);}});req.on('error',reject);});}
function launch(command,args){const parts=args?String(args).split(' ').filter(Boolean):[];const child=cp.spawn(command,parts,{detached:true,stdio:'ignore',windowsHide:false});child.unref();return true;}
function queue(event){fs.appendFileSync(QUEUE_PATH,JSON.stringify({...event,queued_at:new Date().toISOString()})+'\n');}
async function handle(req,res){
  const cfg=loadConfig();
  if(req.method==='OPTIONS')return send(res,200,{ok:true});
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/health'){
    return send(res,200,{ok:true,service:'Dexters Windows Hub',runtime:'node',version:'0.2.0-test',siteId:cfg.siteId,deviceId:cfg.deviceId,deviceName:cfg.deviceName,hostname:os.hostname(),platform:process.platform,node:process.version,integrations:{whatsapp:{enabled:!!cfg.apps?.whatsapp?.enabled},bonline:{enabled:!!cfg.apps?.bonline?.enabled},square:{enabled:!!cfg.apps?.square?.enabled,mode:cfg.apps?.square?.mode||null}},timestamp:new Date().toISOString()});
  }
  if(req.method==='POST'&&url.pathname==='/apps/launch'){
    const b=await body(req),name=String(b.name||'');const app=cfg.apps?.[name];if(!app?.enabled)return send(res,409,{ok:false,error:'Integration disabled'});
    if(name==='square')return send(res,200,{ok:true,launched:'square',mode:app.mode||'bridge',bridgeUrl:app.bridgeUrl||null});
    launch(app.command,app.arguments||'');log('app-launch '+name);return send(res,200,{ok:true,launched:name});
  }
  if(req.method==='POST'&&url.pathname==='/queue'){
    const b=await body(req);queue(b);return send(res,200,{ok:true,queued:true});
  }
  if(url.pathname==='/diagnostics'){
    let logTail='';try{logTail=fs.readFileSync(LOG_PATH,'utf8').split(/\r?\n/).slice(-40).join('\n');}catch{}
    return send(res,200,{ok:true,configPath:CONFIG_PATH,logPath:LOG_PATH,queuePath:QUEUE_PATH,logTail});
  }
  return send(res,404,{ok:false,error:'Not found'});
}
const cfg=loadConfig();const port=Number(cfg.listenPort||17654);
const server=http.createServer((req,res)=>Promise.resolve(handle(req,res)).catch(e=>{log('ERROR '+(e.stack||e.message));send(res,500,{ok:false,error:e.message});}));
server.listen(port,'127.0.0.1',()=>log('DextersHub Node started on 127.0.0.1:'+port));
process.on('uncaughtException',e=>log('UNCAUGHT '+(e.stack||e.message)));
process.on('unhandledRejection',e=>log('UNHANDLED '+String(e)));
