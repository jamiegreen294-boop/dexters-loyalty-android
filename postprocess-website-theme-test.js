const fs=require('fs');
const path=require('path');
const https=require('https');

const dist=path.join(__dirname,'dist');
const indexFile=path.join(dist,'index.html');
const RAW='https://raw.githubusercontent.com/jamiegreen294-boop/dexters-website/main/';
const THEMES=['default','valentine','burns','pride','halloween','st-andrews','christmas'];
const files={
  default:'theme-default.html',
  valentine:'theme-valentine.html',
  burns:'theme-burns.html',
  pride:'theme-pride.html',
  halloween:'theme-halloween.html',
  'st-andrews':'theme-st-andrews.html',
  christmas:'theme-christmas.html'
};

function get(url,binary=false){
  return new Promise((resolve,reject)=>{
    https.get(url,res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location)return resolve(get(res.headers.location,binary));
      if(res.statusCode!==200)return reject(new Error('HTTP '+res.statusCode+' '+url));
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const b=Buffer.concat(chunks);resolve(binary?b:b.toString('utf8'))});
    }).on('error',reject);
  });
}

function actionHref(action){return `javascript:parent.postMessage({type:'dexters-loyalty-nav',action:'${action}'},'*')`}

function rewriteTheme(html,theme){
  const q='?loyaltyTheme='+encodeURIComponent(theme);
  html=html
    .replaceAll('https://app.dextersspot.co.uk/collection-order-test.html',actionHref('order'))
    .replaceAll('https://app.dextersspot.co.uk/catering.html',actionHref('catering'))
    .replaceAll('https://app.dextersspot.co.uk/',actionHref('home'))
    .replaceAll('href="theme-clean.html?name=default#about"','href="https://dextersspot.co.uk/theme-clean.html?name=default#about" target="_top"')
    .replaceAll('href="customer-information.html"','href="https://dextersspot.co.uk/customer-information.html" target="_top"');
  const bridge=`<script>document.documentElement.dataset.loyaltyWebsiteLayout='${theme}';window.addEventListener('message',function(e){if(e.data&&e.data.type==='dexters-theme-scroll-top')scrollTo(0,0)});</script>`;
  return html.replace('</body>',bridge+'</body>');
}

async function prepareWebsiteLayouts(){
  for(const theme of THEMES){
    const html=await get(RAW+files[theme]);
    fs.writeFileSync(path.join(dist,'loyalty-site-'+theme+'.html'),rewriteTheme(html,theme));
  }
  for(const asset of ['burns-theme.webp','st-andrews-theme.webp']){
    try{fs.writeFileSync(path.join(dist,asset),await get(RAW+asset,true));}catch(e){console.warn('Could not copy '+asset+': '+e.message)}
  }
}

async function main(){
  await prepareWebsiteLayouts();
  let html=fs.readFileSync(indexFile,'utf8');
  html=html.replace(/<style id="dextersWebsiteThemeTestStyle">[\s\S]*?<\/style>/g,'').replace(/<script id="dextersWebsiteThemeTest">[\s\S]*?<\/script>/g,'');

  const css=`<style id="dextersWebsiteThemeTestStyle">
#dextersWebsiteThemeTestBar{position:fixed;left:8px;right:8px;top:8px;z-index:100000;background:rgba(3,16,29,.96);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:8px 10px;display:flex;gap:8px;align-items:center;box-shadow:0 8px 26px #0008;backdrop-filter:blur(12px)}
#dextersWebsiteThemeTestBar label{font:800 11px/1 system-ui;color:#ffd45f;letter-spacing:.06em;white-space:nowrap}
#dextersWebsiteThemeSelect{min-width:0;flex:1;border:1px solid rgba(255,255,255,.25);border-radius:10px;background:#0b2033;color:#fff;padding:8px;font:700 13px system-ui}
#dextersWebsiteThemeBadge{font:800 10px/1 system-ui;color:#fff;background:#9d2430;padding:6px 8px;border-radius:999px;white-space:nowrap}
body[data-website-theme-test] .wrap{padding-top:58px!important}
body[data-website-theme-test] #homePage{padding:0!important;margin:0!important;max-width:none!important;width:100%!important;background:#071421!important}
body[data-website-theme-test] #homePage>:not(#dextersWebsiteThemeVisual){display:none!important}
#dextersWebsiteThemeVisual{display:block!important;width:100%!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#071421!important;box-shadow:none!important;overflow:hidden!important}
#dextersWebsiteThemeVisual iframe{display:block;width:100%;height:calc(100vh - 116px);min-height:640px;border:0;background:#071421}
@media(max-width:600px){#dextersWebsiteThemeVisual iframe{height:calc(100vh - 108px);min-height:620px}}
</style>`;

  const js=`<script id="dextersWebsiteThemeTest">(function(){
const THEMES=['default','valentine','burns','pride','halloween','st-andrews','christmas'];
function calendarTheme(){const d=new Date(),m=d.getMonth()+1,day=d.getDate();if(m===1&&day>=10&&day<=25)return'burns';if((m===1&&(day<=9||day>=26))||(m===2&&day<=15))return'valentine';if(m===6)return'pride';if(m===9||m===10)return'halloween';if(m===11&&day>=24&&day<=30)return'st-andrews';if(m===11||m===12)return'christmas';return'default'}
function chosen(){const q=new URLSearchParams(location.search).get('loyaltyTheme');return THEMES.includes(q)?q:calendarTheme()}
function ensureBar(theme){let bar=document.getElementById('dextersWebsiteThemeTestBar');if(!bar){bar=document.createElement('div');bar.id='dextersWebsiteThemeTestBar';bar.innerHTML='<label>TEST THEME</label><select id="dextersWebsiteThemeSelect"></select><span id="dextersWebsiteThemeBadge">TEST ONLY</span>';document.body.appendChild(bar);const s=bar.querySelector('select');THEMES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t==='st-andrews'?"St Andrew’s":t.charAt(0).toUpperCase()+t.slice(1);s.appendChild(o)});s.onchange=function(){const u=new URL(location.href);u.searchParams.set('loyaltyTheme',this.value);location.href=u.toString()}}bar.querySelector('select').value=theme}
function ensureLayout(theme){const home=document.getElementById('homePage');if(!home)return;let shell=document.getElementById('dextersWebsiteThemeVisual');if(!shell){shell=document.createElement('div');shell.id='dextersWebsiteThemeVisual';home.insertBefore(shell,home.firstChild||null)}const url='/loyalty-site-'+theme+'.html';if(shell.dataset.url!==url){shell.dataset.url=url;shell.innerHTML='<iframe title="Dexter’s '+theme+' loyalty home" src="'+url+'" loading="eager"></iframe>'}}
function goHome(){const home=document.getElementById('homePage');if(home){document.querySelectorAll('[id$="Page"]').forEach(x=>{if(x!==home)x.style.display='none'});home.style.display='';home.removeAttribute('hidden');scrollTo(0,0)}else location.href='/?loyaltyTheme='+encodeURIComponent(chosen())}
window.addEventListener('message',function(e){if(!e.data||e.data.type!=='dexters-loyalty-nav')return;const t=chosen();if(e.data.action==='order')location.href='/collection-order-test.html?loyaltyTheme='+encodeURIComponent(t);else if(e.data.action==='catering')location.href='/catering.html?loyaltyTheme='+encodeURIComponent(t);else if(e.data.action==='home')goHome()});
function apply(){const theme=chosen();document.body.dataset.websiteThemeTest=theme;document.documentElement.dataset.websiteThemeTest=theme;ensureBar(theme);ensureLayout(theme)}
apply();setTimeout(apply,250);setTimeout(apply,1000);new MutationObserver(()=>setTimeout(apply,0)).observe(document.body,{childList:true,subtree:true});
})();</script>`;

  html=html.replace('</head>',css+'</head>').replace('</body></html>',js+'</body></html>');
  fs.writeFileSync(indexFile,html);
  console.log('Injected exact website-layout loyalty test');
}

main().catch(err=>{console.error(err);process.exit(1)});
