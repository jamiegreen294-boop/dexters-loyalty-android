'use strict';

function parseHHMM(v){
  const m=/^(\d{2}):(\d{2})$/.exec(String(v||''));
  if(!m)throw new Error('Invalid licensed time');
  return Number(m[1])*60+Number(m[2]);
}
function localMinutes(date=new Date()){
  return date.getHours()*60+date.getMinutes();
}
function withinLicensedHours(date,settings={}){
  const statutoryStart=parseHHMM('10:00'),statutoryEnd=parseHHMM('22:00');
  const premisesStart=Math.max(statutoryStart,parseHHMM(settings.offSalesStart||'10:00'));
  const premisesEnd=Math.min(statutoryEnd,parseHHMM(settings.offSalesEnd||'22:00'));
  const t=localMinutes(date);
  return {allowed:t>=premisesStart&&t<premisesEnd,start:premisesStart,end:premisesEnd};
}
function alcoholUnits(abv,volumeMl){
  return (Number(abv||0)*Number(volumeMl||0))/1000;
}
function minimumPricePence(abv,volumeMl,mupPencePerUnit=65){
  return Math.ceil(alcoholUnits(abv,volumeMl)*Number(mupPencePerUnit||65));
}
function validateAlcoholProduct(product,settings={}){
  if(!product?.alcohol)return {ok:true};
  const errors=[];
  const min=minimumPricePence(product.abv,product.volumeMl,settings.mupPencePerUnit||65);
  if(Number(product.pricePence||0)<min)errors.push('Price is below Scottish minimum unit pricing');
  if(!Number(product.abv)>0)errors.push('ABV is required for alcohol');
  if(!Number(product.volumeMl)>0)errors.push('Volume is required for alcohol');
  return {ok:errors.length===0,errors,minimumPricePence:min,units:alcoholUnits(product.abv,product.volumeMl)};
}
function checkoutGate(cart,date=new Date(),settings={}){
  const alcohol=(cart||[]).filter(x=>x.alcohol);
  if(!alcohol.length)return {ok:true,requiresAgeCheck:false};
  const hours=withinLicensedHours(date,settings);
  if(!hours.allowed)return {ok:false,code:'ALCOHOL_HOURS',message:'Alcohol off-sale blocked outside licensed hours.',requiresAgeCheck:false};
  for(const p of alcohol){
    const v=validateAlcoholProduct(p,settings);
    if(!v.ok)return {ok:false,code:'ALCOHOL_PRODUCT',message:v.errors.join('; '),product:p.name,details:v,requiresAgeCheck:false};
  }
  return {ok:true,requiresAgeCheck:true,challengeAge:Number(settings.challengeAge||25),minimumPurchaseAge:18};
}
function confirmAgeVerification(input={}){
  if(input.refused===true)return {ok:false,code:'AGE_REFUSED',message:'Alcohol sale refused'};
  if(input.appearsUnderChallengeAge===false)return {ok:true,method:'not_challenged'};
  if(input.idChecked!==true)return {ok:false,code:'ID_REQUIRED',message:'Valid proof of age is required'};
  if(Number(input.confirmedAge||0)<18)return {ok:false,code:'UNDER_18',message:'Alcohol sale prohibited to under-18s'};
  return {ok:true,method:'id_checked',confirmedAge:Number(input.confirmedAge)};
}
module.exports={withinLicensedHours,alcoholUnits,minimumPricePence,validateAlcoholProduct,checkoutGate,confirmAgeVerification};
