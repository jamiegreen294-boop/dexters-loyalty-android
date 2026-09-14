const http=require('http');
const fs=require('fs');
const path=require('path');
const { chromium }=require('playwright');

const hard=setTimeout(()=>{console.error('HARD TIMEOUT: POS browser smoke did not finish within 35 seconds');process.exit(124)},35000);
const root=path.resolve('_site');
const requested=process.env.POS_TEST_URL||'';
let server=null;
function mime(p){if(p.endsWith('.js'))return'application/javascript';if(p.endsWith('.html'))return'text/html';if(p.endsWith('.json'))return'application/json';return'application/octet-stream'}
async function localUrl(){
  server=http.createServer((req,res)=>{
    try{
      const u=new URL(req.url,'http://127.0.0.1');
      let rel=decodeURIComponent(u.pathname).replace(/^\/+/, '');
      if(!rel||rel.endsWith('/'))rel+=(rel?'':'')+'index.html';
      const f=path.resolve(root,rel);
      if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('not found')}
      res.writeHead(200,{'content-type':mime(f),'cache-control':'no-store'});fs.createReadStream(f).pipe(res);
    }catch(e){res.writeHead(500);res.end(String(e))}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  return `http://127.0.0.1:${server.address().port}/`;
}
(async()=>{
  const url=requested||await localUrl();
  console.log('SMOKE URL',url);
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  const pageErrors=[]; const consoleErrors=[]; const failed=[];
  page.on('pageerror',e=>{const s=String(e.message||e);pageErrors.push(s);console.error('PAGEERROR',s)});
  page.on('console',m=>{if(m.type()==='error'){consoleErrors.push(m.text());console.error('CONSOLE',m.text())}});
  page.on('requestfailed',r=>{const s=`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`;failed.push(s);console.error('REQUESTFAILED',s)});
  page.setDefaultTimeout(8000);
  console.log('GOTO');
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
  console.log('DOMCONTENTLOADED');
  await page.waitForFunction(()=>document.body&&document.body.innerText.includes('Set Up Dexter’s POS PIN'),null,{timeout:6000});
  console.log('PIN SETUP VISIBLE');
  const state=await page.evaluate(async()=>{
    const before=performance.now();
    await new Promise(r=>setTimeout(r,250));
    return {
      responsive:(performance.now()-before)<1500,
      setup:document.body.innerText.includes('Set Up Dexter’s POS PIN'),
      loading:document.body.innerText.includes('Loading secure PIN login…'),
      legacyEmail:!!document.getElementById('staffEmail'),
      legacyPassword:!!document.getElementById('staffPassword'),
      setupCode:!!document.getElementById('pcSetupCode'),
      newPin:!!document.getElementById('pcNewPin'),
      activate:!!document.getElementById('pcActivate')
    };
  });
  if(!state.responsive||!state.setup||state.loading||state.legacyEmail||state.legacyPassword||!state.setupCode||!state.newPin||!state.activate){
    throw new Error('PIN startup smoke failed: '+JSON.stringify(state));
  }
  if(pageErrors.length)throw new Error('Browser page errors: '+pageErrors.join(' | '));
  console.log('PASS PC POS browser smoke',JSON.stringify({url,state,consoleErrors,failed:failed.slice(0,8)}));
  await browser.close();if(server)server.closeAllConnections?.();if(server)await new Promise(r=>server.close(r));clearTimeout(hard);
})().catch(async e=>{console.error(e);try{if(server)server.closeAllConnections?.();if(server)await new Promise(r=>server.close(r))}catch{}clearTimeout(hard);process.exit(1)});
