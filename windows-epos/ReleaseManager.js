'use strict';

const fs=require('fs');
const path=require('path');

const CHANNELS=['test','pilot','stable'];

function ensureDir(p){fs.mkdirSync(p,{recursive:true})}
function statePath(root){return path.join(root,'release-state.json')}
function loadState(root){
  const file=statePath(root);
  if(!fs.existsSync(file))return {channel:'test',current:null,lastGood:null,pending:null,history:[]};
  try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return {channel:'test',current:null,lastGood:null,pending:null,history:[]}}
}
function saveState(root,state){ensureDir(root);fs.writeFileSync(statePath(root),JSON.stringify(state,null,2),'utf8');return state}
function setChannel(root,channel){
  if(!CHANNELS.includes(channel))throw new Error('Invalid release channel');
  const s=loadState(root);s.channel=channel;return saveState(root,s);
}
function stage(root,version,meta={}){
  const s=loadState(root);
  s.pending={version:String(version),stagedAt:new Date().toISOString(),meta};
  s.history.unshift({event:'staged',version:String(version),at:new Date().toISOString()});
  s.history=s.history.slice(0,100);
  return saveState(root,s);
}
function markGood(root,version){
  const s=loadState(root);
  s.current=String(version);s.lastGood=String(version);s.pending=null;
  s.history.unshift({event:'good',version:String(version),at:new Date().toISOString()});
  s.history=s.history.slice(0,100);
  return saveState(root,s);
}
function markFailed(root,version,error=''){
  const s=loadState(root);
  s.history.unshift({event:'failed',version:String(version),error:String(error),at:new Date().toISOString()});
  s.pending=null;s.history=s.history.slice(0,100);
  return saveState(root,s);
}
function rollbackPlan(root){
  const s=loadState(root);
  return {canRollback:!!s.lastGood&&s.lastGood!==s.current,target:s.lastGood,current:s.current,channel:s.channel};
}
module.exports={CHANNELS,loadState,setChannel,stage,markGood,markFailed,rollbackPlan};
