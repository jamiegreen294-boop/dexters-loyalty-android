'use strict';

const fs=require('fs');
const path=require('path');
const {DatabaseSync}=require('node:sqlite');
const LOCAL_DB=process.env.DEXTERS_ADDRESS_DB||(process.env.APPDATA?path.join(process.env.APPDATA,'dexters-epos','address-data','addresses.sqlite'):path.join(__dirname,'data','addresses.sqlite'));
let addressDb=null;

const CACHE_FILE=process.env.DEXTERS_ADDRESS_CACHE||(process.env.APPDATA?path.join(process.env.APPDATA,'dexters-epos','runtime','address-cache.json'):path.join(__dirname,'data','address-cache.json'));
const CACHE_MAX_AGE_MS=30*24*60*60*1000;
const OVERPASS_URL=process.env.DEXTERS_OVERPASS_URL||'https://overpass.private.coffee/api/interpreter';
let memoryCache=null;

function normalisePostcode(input){
  const raw=String(input||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(raw.length<5)return raw;
  return raw.slice(0,-3)+' '+raw.slice(-3);
}
function validatePostcode(input){
  const p=normalisePostcode(input);
  return /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(p);
}
function buildAddressPlan(input={}){
  const postcode=normalisePostcode(input.postcode);
  return {
    postcode,
    validFormat:validatePostcode(postcode),
    address1:String(input.address1||''),
    address2:String(input.address2||''),
    town:String(input.town||'Glasgow'),
    instructions:String(input.instructions||''),
    source:String(input.source||'manual')
  };
}
function localZoneQuote(postcode,zones=[]){
  const p=normalisePostcode(postcode);
  for(const z of zones){
    const prefixes=Array.isArray(z.postcodePrefixes)?z.postcodePrefixes:[];
    if(prefixes.some(x=>p.replace(' ','').startsWith(String(x).toUpperCase().replace(' ','')))){
      return {
        matched:true,
        zone:String(z.name||'Delivery Zone'),
        feePence:Number(z.feePence||0),
        minimumOrderPence:Number(z.minimumOrderPence||0),
        estimatedMinutes:Number(z.estimatedMinutes||0)
      };
    }
  }
  return {matched:false,zone:null,feePence:0,minimumOrderPence:0,estimatedMinutes:0};
}
function readCache(){
  if(memoryCache)return memoryCache;
  try{memoryCache=JSON.parse(fs.readFileSync(CACHE_FILE,'utf8'))}catch(_){memoryCache={}}
  return memoryCache;
}
function writeCache(){
  try{
    fs.mkdirSync(path.dirname(CACHE_FILE),{recursive:true});
    fs.writeFileSync(CACHE_FILE,JSON.stringify(memoryCache||{},null,2),'utf8');
  }catch(_){}
}
function fromTags(tags,postcode){
  const number=String(tags['addr:housenumber']||'').trim();
  const name=String(tags['addr:housename']||'').trim();
  const unit=String(tags['addr:unit']||tags['addr:flats']||'').trim();
  const street=String(tags['addr:street']||tags['addr:place']||'').trim();
  const town=String(tags['addr:city']||tags['addr:town']||tags['addr:village']||tags['addr:suburb']||'Glasgow').trim();
  const first=[unit,name,number].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  const address1=[first,street].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  if(!address1)return null;
  return {address1,address2:'',town,postcode,source:'openstreetmap'};
}
function uniqueAddresses(rows){
  const seen=new Set(),out=[];
  for(const row of rows){
    if(!row)continue;
    const key=[row.address1,row.address2,row.town,row.postcode].join('|').toUpperCase();
    if(seen.has(key))continue;
    seen.add(key);out.push(row);
  }
  return out.sort((a,b)=>a.address1.localeCompare(b.address1,undefined,{numeric:true,sensitivity:'base'}));
}
function lookupLocal(postcode){
  if(!fs.existsSync(LOCAL_DB))return [];
  try{
    if(!addressDb)addressDb=new DatabaseSync(LOCAL_DB,{readOnly:true});
    return addressDb.prepare('SELECT source_id AS id,address1,address2,town,postcode FROM addresses WHERE postcode=? ORDER BY address1 COLLATE NOCASE LIMIT 250').all(postcode).map(r=>({...r,label:[r.address1,r.address2,r.town,r.postcode].filter(Boolean).join(', '),source:'openstreetmap-local'}));
  }catch(_){return []}
}
async function lookupAddresses(postcode){
  const p=normalisePostcode(postcode);
  if(!validatePostcode(p))return {postcode:p,validFormat:false,addresses:[],source:'invalid',cached:false};
  const local=lookupLocal(p);
  if(local.length)return {postcode:p,validFormat:true,addresses:uniqueAddresses(local),source:'openstreetmap-local',cached:true,local:true};
  const cache=readCache(),cached=cache[p];
  if(cached&&Array.isArray(cached.addresses)&&Date.now()-Number(cached.savedAt||0)<CACHE_MAX_AGE_MS){
    return {postcode:p,validFormat:true,addresses:cached.addresses,source:cached.source||'openstreetmap-cache',cached:true};
  }
  const compact=p.replace(' ','');
  const re='^'+p.replace(' ',' ?')+'$';
  const query='[out:json][timeout:20];(nwr["addr:postcode"~"'+re+'",i]["addr:housenumber"];nwr["addr:postcode"~"'+re+'",i]["addr:housename"];);out tags center 500;';
  try{
    const response=await fetch(OVERPASS_URL,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','User-Agent':'DextersEPOS/1.0 (internal address lookup)'},
      body:'data='+encodeURIComponent(query),
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)throw new Error('lookup '+response.status);
    const json=await response.json();
    const rows=uniqueAddresses((json.elements||[]).map(x=>fromTags(x.tags||{},p)));
    cache[p]={savedAt:Date.now(),source:'openstreetmap',addresses:rows};
    memoryCache=cache;writeCache();
    return {postcode:p,validFormat:true,addresses:rows,source:'openstreetmap',cached:false};
  }catch(error){
    if(cached&&Array.isArray(cached.addresses)){
      return {postcode:p,validFormat:true,addresses:cached.addresses,source:cached.source||'openstreetmap-cache',cached:true,stale:true};
    }
    return {postcode:p,validFormat:true,addresses:[],source:'manual-fallback',cached:false,error:String(error.message||error)};
  }
}

module.exports={normalisePostcode,validatePostcode,buildAddressPlan,localZoneQuote,lookupAddresses};
