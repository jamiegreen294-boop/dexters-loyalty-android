'use strict';

const {app,BrowserWindow,dialog,screen}=require('electron');
const {autoUpdater}=require('electron-updater');
const path=require('path');
const fs=require('fs');
const cp=require('child_process');
const http=require('http');

const TEST_URL='http://127.0.0.1:17654/epos';
const HUB_DIR=app.isPackaged?path.join(process.resourcesPath,'hub'):path.resolve(__dirname,'..');
let hubProcess=null;
let win=null;
let customerWin=null;
let restartAttempts=0;
let hubMonitor=null;
let quitting=false;

function runtimePaths(){
  const dir=path.join(app.getPath('userData'),'runtime');
  fs.mkdirSync(dir,{recursive:true});
  const config=path.join(dir,'config.json');
  const integrations=path.join(dir,'integrations.json');
  const db=path.join(dir,'dexters-epos.sqlite');
  if(!fs.existsSync(config))fs.copyFileSync(path.join(HUB_DIR,'config.example.json'),config);
  if(!fs.existsSync(integrations))fs.copyFileSync(path.join(HUB_DIR,'integrations.example.json'),integrations);
  return {dir,config,integrations,db};
}

function health(){
  return new Promise(resolve=>{
    const req=http.get('http://127.0.0.1:17654/health',res=>{
      let body='';
      res.on('data',c=>body+=c);
      res.on('end',()=>{
        try{resolve(res.statusCode===200&&JSON.parse(body).ok===true)}
        catch{resolve(false)}
      });
    });
    req.setTimeout(1500,()=>{req.destroy();resolve(false)});
    req.on('error',()=>resolve(false));
  });
}

function postJson(pathname,payload={}){
  return new Promise(resolve=>{
    const data=JSON.stringify(payload);
    const req=http.request({
      hostname:'127.0.0.1',port:17654,path:pathname,method:'POST',
      headers:{'content-type':'application/json','content-length':Buffer.byteLength(data)}
    },res=>{
      let body='';
      res.on('data',c=>body+=c);
      res.on('end',()=>resolve(res.statusCode>=200&&res.statusCode<300));
    });
    req.setTimeout(1800,()=>{req.destroy();resolve(false)});
    req.on('error',()=>resolve(false));
    req.write(data);req.end();
  });
}

async function ensureHub(){
  if(await health())return true;
  const hub=path.join(HUB_DIR,'DextersHub.js');
  const runtime=runtimePaths();
  hubProcess=cp.spawn(process.execPath,[hub],{
    cwd:HUB_DIR,
    env:{
      ...process.env,
      ELECTRON_RUN_AS_NODE:'1',
      DEXTERS_EPOS_CONFIG:runtime.config,
      DEXTERS_INTEGRATIONS_CONFIG:runtime.integrations,
      DEXTERS_EPOS_DB:runtime.db
    },
    windowsHide:true,
    stdio:'ignore',
    detached:false
  });
  for(let i=0;i<20;i++){
    await new Promise(r=>setTimeout(r,500));
    if(await health())return true;
  }
  return false;
}

async function recoverHub(){
  if(quitting)return;
  if(await health()){restartAttempts=0;return}
  restartAttempts++;
  try{if(hubProcess&&!hubProcess.killed)hubProcess.kill()}catch{}
  const ok=await ensureHub();
  if(ok){
    restartAttempts=0;
    if(win&&!win.isDestroyed())win.webContents.reload();
    return;
  }
  if(restartAttempts>=3){
    dialog.showErrorBox(
      'Dexters EPOS Recovery',
      'The local EPOS service could not recover after 3 attempts. The local database has not been deleted.'
    );
  }
}

function startSupervisor(){
  clearInterval(hubMonitor);
  hubMonitor=setInterval(()=>recoverHub().catch(()=>{}),5000);
  setTimeout(()=>postJson('/system/mark-stable',{}).catch(()=>{}),60000);
}

function makeCustomerDisplay(){
  const displays=screen.getAllDisplays();
  if(displays.length<2)return null;
  const primary=screen.getPrimaryDisplay();
  const target=displays.find(d=>d.id!==primary.id)||displays[1];
  const w=new BrowserWindow({
    x:target.bounds.x,y:target.bounds.y,
    width:target.bounds.width,height:target.bounds.height,
    fullscreen:true,
    frame:false,
    show:true,
    backgroundColor:'#07111f',
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  w.loadURL('http://127.0.0.1:17654/customer-display');
  return w;
}
function makeWindow(){
  win=new BrowserWindow({
    width:1440,
    height:900,
    minWidth:1024,
    minHeight:700,
    autoHideMenuBar:true,
    backgroundColor:'#07111f',
    webPreferences:{
      preload:path.join(__dirname,'preload.js'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true
    }
  });
  win.setMenuBarVisibility(false);
  win.webContents.on('render-process-gone',(_event,details)=>{
    postJson('/system/record-crash',{component:'renderer',error:details.reason||'renderer gone'}).catch(()=>{});
    setTimeout(()=>{if(win&&!win.isDestroyed())win.reload()},1200);
  });
  win.on('unresponsive',()=>{
    postJson('/system/record-crash',{component:'renderer',error:'unresponsive'}).catch(()=>{});
  });
  win.loadURL(TEST_URL);
  customerWin=makeCustomerDisplay();
}

const gotLock=app.requestSingleInstanceLock();
if(!gotLock){
  app.quit();
}else{
  app.on('second-instance',()=>{
    if(win){
      if(win.isMinimized())win.restore();
      win.focus();
    }
  });
}

app.whenReady().then(async()=>{
  const ok=await ensureHub();
  if(!ok){
    dialog.showErrorBox('Dexters EPOS Test','The local Windows Hub did not start. No live system was changed.');
  }
  makeWindow();
  startSupervisor();
  if(app.isPackaged){
    autoUpdater.autoDownload=false;
    autoUpdater.checkForUpdates().catch(()=>{});
  }
});

app.on('window-all-closed',()=>{
  if(process.platform!=='darwin')app.quit();
});

app.on('before-quit',()=>{
  quitting=true;
  clearInterval(hubMonitor);
  try{if(customerWin&&!customerWin.isDestroyed())customerWin.close()}catch{}
  try{if(hubProcess&&!hubProcess.killed)hubProcess.kill()}catch{}
});
