'use strict';

const fs=require('fs');
const path=require('path');

const ROOT=__dirname;
const CONFIG_PATH=process.env.DEXTERS_INTEGRATIONS_CONFIG||path.join(ROOT,'integrations.json');

function connector(){
  const all=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
  return all.connectors?.chatgpt_builder||{};
}
function state(){
  const c=connector();
  return {
    enabled:!!c.enabled,
    environment:c.environment||'test',
    model:c.model||'gpt-5.6-sol',
    apiKeyConfigured:!!(process.env.OPENAI_API_KEY||c.api_key),
    mode:c.mode||'builder-review',
    liveWrites:false
  };
}
function safeContext(input={}){
  return {
    screen:String(input.screen||'epos'),
    requestType:String(input.requestType||'build'),
    currentModule:String(input.currentModule||''),
    error:String(input.error||''),
    diagnostics:input.diagnostics||null,
    ui:input.ui||null,
    recentChanges:Array.isArray(input.recentChanges)?input.recentChanges.slice(0,20):[],
    safety:{
      testOnly:true,
      liveWrites:false,
      requireApprovalForPatch:true
    }
  };
}
async function ask(message,context={}){
  const c=connector(),key=process.env.OPENAI_API_KEY||c.api_key;
  if(!c.enabled)throw new Error('ChatGPT Builder is disabled in this test build');
  if(!key)throw new Error('OPENAI_API_KEY is not configured');
  if((c.environment||'test')==='live')throw new Error('ChatGPT Builder live mode is blocked');

  const system=`You are the Dexters EPOS Builder assistant.
You may diagnose and propose code/UI changes for the isolated Windows EPOS test build.
Never claim a change was applied unless the host application confirms it.
Never modify live Dexter systems.
When code changes are requested, return:
1. a concise explanation,
2. files_to_change,
3. a unified diff proposal inside a JSON object under patch,
4. test_steps.
Do not include secrets or credentials.`;

  const r=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'content-type':'application/json','authorization':'Bearer '+key},
    body:JSON.stringify({
      model:c.model||'gpt-5.6-sol',
      input:[
        {role:'developer',content:system},
        {role:'user',content:JSON.stringify({message:String(message||''),context:safeContext(context)})}
      ]
    })
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error?.message||'OpenAI request failed');
  return {reply:data.output_text||'',responseId:data.id||null,model:data.model||c.model||'gpt-5.6-sol'};
}
module.exports={state,safeContext,ask};
