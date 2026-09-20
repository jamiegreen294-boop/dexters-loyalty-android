const http=require('http');
const fs=require('fs');
const path=require('path');
const { chromium }=require('playwright');

const hard=setTimeout(()=>{console.error('HARD TIMEOUT: POS browser smoke did not finish within 40 seconds');process.exit(124)},40000);
const root=path.resolve('_site');
const requested=process.env.POS_TEST_URL||'';
let server=null;
function mime(p){if(p.endsWith('.js'))return'application/javascript';if(p.endsWith('.html'))return'text/html';if(p.endsWith('.json'))return'application/json';if(p.endsWith('.jpg')||p.endsWith('.jpeg'))return'image/jpeg';return'application/octet-stream'}
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
async function stableEvaluate(page,fn){
  let last;
  for(let i=0;i<4;i++){
    try{
      await page.waitForLoadState('domcontentloaded',{timeout:5000}).catch(()=>{});
      await page.waitForTimeout(350);
      return await page.evaluate(fn);
    }catch(e){
      last=e;
      if(!/Execution context was destroyed|Cannot find context|navigation/i.test(String(e)))throw e;
      await page.waitForLoadState('domcontentloaded',{timeout:5000}).catch(()=>{});
      await page.waitForTimeout(500);
    }
  }
  throw last;
}
async function checkCategoryPhotoAsset(page){
  const state=await stableEvaluate(page,async()=>{
    const catUrl=new URL('pos-pc-category-home.js',location.href);catUrl.searchParams.set('photoSmoke',Date.now());
    const code=await fetch(catUrl,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('category JS HTTP '+r.status);return r.text()});
    const modern=code.includes('const CATEGORY_IMAGES=')&&code.includes('const FALLBACK_IMAGE=')&&code.includes('const photo=name=>CATEGORY_IMAGES[name]||FALLBACK_IMAGE')&&code.includes('object-fit:cover');
    if(modern)return{modern:true,helper:true,cover:true};
    const legacy=code.includes("const SPRITE='./pc-category-sprite.jpg';")&&code.includes('pcCatImage');
    const imgUrl=new URL('pc-category-sprite.jpg',location.href);imgUrl.searchParams.set('photoSmoke',Date.now());
    const image=await new Promise(resolve=>{const i=new Image();const timer=setTimeout(()=>resolve({ok:false,error:'image timeout'}),7000);i.onload=()=>{clearTimeout(timer);resolve({ok:true,width:i.naturalWidth,height:i.naturalHeight,src:i.src})};i.onerror=()=>{clearTimeout(timer);resolve({ok:false,error:'image load error',src:i.src})};i.src=imgUrl.href});
    const probe=document.createElement('div');probe.style.cssText='position:absolute;left:-9999px;width:180px;height:108px;background-image:url("'+imgUrl.href+'");background-size:600% 400%;background-position:0 0';document.body.appendChild(probe);const bg=getComputedStyle(probe).backgroundImage;probe.remove();
    return{modern:false,legacy,image,backgroundApplied:bg.includes('pc-category-sprite.jpg')};
  });
  if(state.modern){console.log('PASS CATEGORY PHOTO ASSET MODERN',JSON.stringify(state));return}
  if(!state.legacy||!state.image?.ok||state.image.width<100||state.image.height<100||!state.backgroundApplied)throw new Error('Category photo asset smoke failed: '+JSON.stringify(state));
  console.log('PASS CATEGORY PHOTO ASSET LEGACY',JSON.stringify(state));
}
(async()=>{
  const url=requested||await localUrl();
  console.log('SMOKE URL',url);
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage();
  const pageErrors=[]; const consoleErrors=[]; const failed=[];
  page.on('pageerror',e=>{const s=String(e.stack||e.message||e);pageErrors.push(s);console.error('PAGEERROR',s)});
  page.on('console',m=>{if(m.type()==='error'){consoleErrors.push(m.text());console.error('CONSOLE',m.text())}});
  page.on('requestfailed',r=>{const s=`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`;failed.push(s);console.error('REQUESTFAILED',s)});
  page.setDefaultTimeout(8000);
  console.log('GOTO');
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
  console.log('DOMCONTENTLOADED');
  const early=await stableEvaluate(page,()=>({
    pinBootstrap:typeof window.DextersPinLogin,
    authGate:document.getElementById('authGate')?.innerText||null,
    pinMount:document.getElementById('pcPinLoginMount')?.innerText||null,
    setupCode:!!document.getElementById('pcSetupCode'),
    scripts:[...document.scripts].map(s=>s.src||'[inline]').slice(-30),
    bodyText:(document.body?.innerText||'').slice(0,1200)
  }));
  console.log('EARLY STATE',JSON.stringify(early));
  await page.waitForFunction(()=>document.body&&document.body.innerText.includes('Set up PIN'),null,{timeout:6000});
  console.log('PIN SETUP VISIBLE');
  const state=await page.evaluate(async()=>{
    const before=performance.now();
    await new Promise(r=>setTimeout(r,250));
    return {
      responsive:(performance.now()-before)<1500,
      setup:document.body.innerText.includes('Set up PIN'),
      loading:document.body.innerText.includes('Loading secure PIN login…'),
      legacyEmail:!!document.getElementById('staffEmail'),
      legacyPassword:!!document.getElementById('staffPassword'),
      setupCode:!!document.getElementById('pcSetupCode'),
      newPin:!!document.getElementById('pcNewPin'),
      activate:!!document.getElementById('pcActivate')
    };
  });
  if(!state.responsive||!state.setup||state.loading||state.legacyEmail||state.legacyPassword||!state.setupCode||!state.newPin||!state.activate){throw new Error('PIN startup smoke failed: '+JSON.stringify(state))}
  if(pageErrors.length)throw new Error('Browser page errors: '+pageErrors.join(' | '));
  await checkCategoryPhotoAsset(page);
  console.log('PASS PC POS browser smoke',JSON.stringify({url,state,consoleErrors,failed:failed.slice(0,8)}));
  await browser.close();if(server)server.closeAllConnections?.();if(server)await new Promise(r=>server.close(r));clearTimeout(hard);
})().catch(async e=>{console.error(e);try{if(server)server.closeAllConnections?.();if(server)await new Promise(r=>server.close(r))}catch{}clearTimeout(hard);process.exit(1)});
