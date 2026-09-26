'use strict';

const {app,BrowserWindow,dialog}=require('electron');
const {autoUpdater}=require('electron-updater');
const path=require('path');
const fs=require('fs');
const cp=require('child_process');
const http=require('http');

const TEST_URL='http://127.0.0.1:17654/epos';
const HUB_DIR=app.isPackaged?path.join(process.resourcesPath,'hub'):path.resolve(__dirname,'..');
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
let hubProcess=null;
let win=null;

function health(){
  return new Promise(resolve=>{
    const req=http.get('http://127.0.0.1:17654/health',res=>{
      let body='';res.on('data',c=>body+=c);res.on('end',()=>{
        try{resolve(res.statusCode===200&&JSON.parse(body).ok===true)}catch{resolve(false)}
      });
    });
    req.setTimeout(1500,()=>{req.destroy();resolve(false)});
    req.on('error',()=>resolve(false));
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
  win.loadURL(TEST_URL);
}

app.whenReady().then(async()=>{
  const ok=await ensureHub();
  if(!ok){
    dialog.showErrorBox('Dexters EPOS Test','The local Windows Hub did not start. No live system was changed.');
  }
  makeWindow();
  if(app.isPackaged){
    autoUpdater.autoDownload=false;
    autoUpdater.checkForUpdates().catch(()=>{});
  }
});

app.on('window-all-closed',()=>{
  if(process.platform!=='darwin')app.quit();
});
app.on('before-quit',()=>{
  try{if(hubProcess&&!hubProcess.killed)hubProcess.kill()}catch{}
});
