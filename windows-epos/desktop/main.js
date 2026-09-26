'use strict';

const {app,BrowserWindow,dialog}=require('electron');
const {autoUpdater}=require('electron-updater');
const path=require('path');
const cp=require('child_process');
const http=require('http');

const TEST_URL='http://127.0.0.1:17654/epos';
const HUB_DIR=path.resolve(__dirname,'..');
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
  hubProcess=cp.spawn(process.execPath,[hub],{
    cwd:HUB_DIR,
    env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},
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
