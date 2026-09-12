const fs=require('fs');

const indexPath='dist/index.html';
let html=fs.readFileSync(indexPath,'utf8');

const bootstrap=`<script id="dextersEarlyThemeBootstrap">(function(){try{var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric',day:'numeric'}).formatToParts(new Date()),m=Number(p.find(function(x){return x.type==='month'}).value),d=Number(p.find(function(x){return x.type==='day'}).value),s=(m===1||(m===2&&d<=15))?'valentines':(m===9||m===10)?'halloween':(m===11||m===12)?'christmas':'normal';document.body.classList.remove('season-halloween','season-christmas','season-valentines');if(s!=='normal')document.body.classList.add('season-'+s);document.documentElement.dataset.dextersThemeReady='1'}catch(e){document.documentElement.dataset.dextersThemeReady='1'}})();</script>`;

if(!html.includes('dextersEarlyThemeBootstrap')){
  html=html.replace(/<body([^>]*)>/i,function(all,attrs){return '<body'+attrs+'>'+bootstrap});
}

html=html.replace(
  'setInterval(check,10000)',
  "document.addEventListener('visibilitychange',function(){if(!document.hidden)check()});setInterval(function(){if(!document.hidden)check()},60000)"
);

fs.writeFileSync(indexPath,html);

const sundayPath='dist/sunday-order-tracking.js';
if(fs.existsSync(sundayPath)){
  let js=fs.readFileSync(sundayPath,'utf8');
  js=js.replace(
    "setInterval(()=>{refreshHome();decorateHistory()},10000)",
    "document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshHome();decorateHistory()}});setInterval(()=>{if(!document.hidden){refreshHome();decorateHistory()}},15000)"
  );
  fs.writeFileSync(sundayPath,js);
}

if(!html.includes('dextersEarlyThemeBootstrap'))throw new Error('Early theme bootstrap injection failed');
console.log('Theme startup and polling performance fixes applied');

require('./postprocess-website-theme-mirror.cjs');
