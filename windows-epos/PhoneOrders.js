'use strict';

const {normalisePhone}=require('./IntegrationGateway');

function makePhoneOrderSession(call={}){
  const c=call.customer||{};
  return {
    type:'telephone',
    callId:String(call.call_id||call.id||''),
    incomingNumber:normalisePhone(call.caller_number||call.normalized_phone||c.phone||''),
    callerType:String(call.caller_type||'unknown'),
    customer:{
      id:c.id||null,
      name:String(c.name||call.customer_name||''),
      phone:normalisePhone(c.phone||call.caller_number||call.normalized_phone||''),
      loyaltyCode:String(c.loyalty_code||''),
      creditBalancePence:Number(c.credit_balance_pence||0),
      previousOrder:call.previous_order||null
    },
    fulfilment:null,
    delivery:null,
    collection:null,
    notes:'Telephone order',
    openedAt:new Date().toISOString()
  };
}

function chooseFulfilment(session,mode){
  const m=String(mode||'').toLowerCase();
  if(!['delivery','collection'].includes(m))throw new Error('Choose delivery or collection');
  return {
    ...session,
    fulfilment:m,
    delivery:m==='delivery'?{
      postcode:'',
      address1:'',
      address2:'',
      town:'',
      instructions:'',
      validated:false,
      zone:null,
      distanceMiles:null,
      deliveryFeePence:0
    }:null,
    collection:m==='collection'?{
      requestedTime:null
    }:null
  };
}

function callerCard(session){
  const c=session.customer||{};
  return {
    number:session.incomingNumber,
    displayName:c.name||'Unknown caller',
    loyaltyCode:c.loyaltyCode||null,
    moneyOwedPence:Number(c.creditBalancePence||0),
    hasPreviousOrder:!!c.previousOrder,
    actions:[
      'delivery',
      'collection',
      ...(c.previousOrder?['repeat_last_order']:[]),
      'customer_details'
    ]
  };
}

function toOrderDraft(session){
  if(!session.fulfilment)throw new Error('Delivery or collection must be selected first');
  return {
    source:'telephone',
    orderType:session.fulfilment,
    customerName:session.customer?.name||'',
    customerPhone:session.customer?.phone||session.incomingNumber||'',
    loyaltyCustomerId:session.customer?.id||null,
    notes:session.notes||'Telephone order',
    delivery:session.delivery,
    collection:session.collection,
    previousOrder:session.customer?.previousOrder||null,
    items:[]
  };
}

module.exports={makePhoneOrderSession,chooseFulfilment,callerCard,toOrderDraft};
