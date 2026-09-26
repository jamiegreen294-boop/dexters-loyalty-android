'use strict';
const {contextBridge}=require('electron');
contextBridge.exposeInMainWorld('dextersDesktop',{
  platform:process.platform,
  testBuild:true,
  shellVersion:'0.1.0-test'
});
