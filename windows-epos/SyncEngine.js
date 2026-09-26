'use strict';

const LocalStore=require('./LocalStore');
const IntegrationGateway=require('./IntegrationGateway');

const MAX_ATTEMPTS=8;
const BACKOFF=[5,15,30,60,120,300,600,900];

function now(){return new Date().toISOString();}
function delaySeconds(attempts){return BACKOFF[Math.min(Math.max(0,attempts),BACKOFF.length-1)];}

function canDispatch(connector){
  const s=IntegrationGateway.connectorState(connector);
  return s.configured&&s.enabled;
}

function classifyError(err){
  const msg=String(err?.message||err||'Unknown sync error');
  if(/401|403|unauthor|forbidden/i.test(msg))return {retry:false,kind:'auth',message:msg};
  if(/404|not found/i.test(msg))return {retry:false,kind:'not_found',message:msg};
  if(/duplicate|already exists|conflict/i.test(msg))return {retry:false,kind:'duplicate_or_conflict',message:msg};
  return {retry:true,kind:'transient',message:msg};
}

async function dispatch(row){
  if(!canDispatch(row.connector)) throw new Error(row.connector+' connector is disabled or not configured');
  // Real connector adapters plug in here. Test build deliberately performs no live writes.
  return {
    ok:true,
    dryRun:true,
    connector:row.connector,
    action:row.action,
    entityId:row.entity_id||null,
    message:'Test-only dispatch accepted; no live system was changed.'
  };
}

async function processOne(row){
  try{
    const result=await dispatch(row);
    LocalStore.markQueueDone(row.id,result);
    LocalStore.audit(null,'sync.done','sync_queue',String(row.id),result);
    return {id:row.id,state:'done',result};
  }catch(err){
    const c=classifyError(err);
    const attempts=Number(row.attempts||0)+1;
    if(!c.retry||attempts>=MAX_ATTEMPTS){
      LocalStore.markQueueFailed(row.id,attempts,c.message,c.kind);
      LocalStore.audit(null,'sync.failed','sync_queue',String(row.id),{attempts,...c});
      return {id:row.id,state:'failed',error:c.message};
    }
    const retryAt=new Date(Date.now()+delaySeconds(attempts-1)*1000).toISOString();
    LocalStore.markQueueRetry(row.id,attempts,c.message,retryAt,c.kind);
    return {id:row.id,state:'queued',retryAt,error:c.message};
  }
}

async function runBatch(limit=25){
  const rows=LocalStore.nextQueued(limit);
  const out=[];
  for(const row of rows) out.push(await processOne(row));
  return {ok:true,testOnly:true,processed:out.length,results:out,summary:LocalStore.queueSummary(),at:now()};
}

module.exports={runBatch,processOne,classifyError,delaySeconds};
