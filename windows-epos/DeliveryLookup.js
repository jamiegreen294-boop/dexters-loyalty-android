'use strict';

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
    source:'manual-or-maps-test'
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
module.exports={normalisePostcode,validatePostcode,buildAddressPlan,localZoneQuote};
