const fs=require('fs');
const path='dist/index.html';
let html=fs.readFileSync(path,'utf8');

const css=`<style id="dextersWebsiteThemeMirrorExactTest">
:root{--dex-theme-radius:18px;--dex-theme-border:rgba(255,255,255,.16);--dex-theme-shadow:0 12px 28px rgba(0,0,0,.28)}
body{padding-top:54px!important;transition:none!important}
#dexThemeTestBar{position:fixed;left:8px;right:8px;top:8px;z-index:2147483646;background:rgba(0,0,0,.94);color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:14px;padding:8px;display:flex;align-items:center;gap:7px;overflow-x:auto;box-shadow:0 6px 22px rgba(0,0,0,.45);font:700 12px/1.1 Arial,sans-serif;scrollbar-width:none}
#dexThemeTestBar::-webkit-scrollbar{display:none}#dexThemeTestBar strong{flex:0 0 auto;color:#ffd43c;margin:0 3px}#dexThemeTestBar button{flex:0 0 auto;border:0;border-radius:999px;padding:8px 11px;background:#242424;color:#fff;font-weight:800}#dexThemeTestBar button.active{background:#ffd43c;color:#111}
#dexExactWebsiteArt{display:none;width:min(100%,1122px);margin:8px auto 14px;border-radius:16px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.38);background:#111;position:relative;z-index:1}
#dexExactWebsiteArt.show{display:block}
#dexExactWebsiteHero{display:block;width:100%;height:auto;max-height:520px;object-fit:cover;object-position:center top;background:#111}
#dexExactWebsiteCards{display:flex;gap:8px;padding:8px;overflow-x:auto;scrollbar-width:none;background:rgba(0,0,0,.22)}
#dexExactWebsiteCards::-webkit-scrollbar{display:none}#dexExactWebsiteCards img{width:126px;height:168px;object-fit:cover;border-radius:10px;flex:0 0 auto}
#dexExactWebsiteArt .dex-art-label{position:absolute;left:10px;top:10px;background:rgba(0,0,0,.72);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:999px;padding:6px 9px;font:800 10px/1 Arial,sans-serif;z-index:2;pointer-events:none}
#dexExactWebsiteArt[data-loading="1"]:after{content:'Loading exact website artwork…';display:grid;place-items:center;min-height:180px;color:#fff;font-weight:800;padding:20px}
#dexExactWebsiteArt[data-error="1"]:after{content:'Exact website artwork failed to load — do not approve this theme.';display:grid;place-items:center;min-height:180px;color:#ffd0d0;font-weight:900;padding:20px;text-align:center}
:is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{border:1px solid var(--dex-theme-border)!important;border-radius:var(--dex-theme-radius)!important;box-shadow:var(--dex-theme-shadow)!important}
body.season-halloween{--navy:#17111f;--navy2:#241629;--card:rgba(25,16,27,.93);--yellow:#ff7a1a;--orange:#ff7a1a;--dex-theme-border:rgba(255,122,26,.34)}
body.season-christmas{--navy:#03483f;--navy2:#075b4e;--card:rgba(3,54,47,.93);--yellow:#ffd43c;--orange:#e8bf59;--dex-theme-border:rgba(255,212,60,.28)}
body.season-valentines{--navy:#4a0718;--navy2:#6b1027;--card:rgba(74,7,24,.93);--yellow:#ffd6df;--orange:#f5a6ba;--dex-theme-border:rgba(255,214,223,.25)}
body.season-pride,body.season-burns,body.season-st-andrews{--navy:#03243a;--navy2:#073a58;--card:rgba(3,36,58,.93);--yellow:#ffd43c;--orange:#ff7a1a;--dex-theme-border:rgba(255,255,255,.22)}
@media(max-width:600px){#dexExactWebsiteArt{margin-top:4px;border-radius:12px}#dexExactWebsiteHero{max-height:none;object-fit:contain}#dexExactWebsiteCards img{width:105px;height:140px}}
</style>`;

const js=`<script id="dextersWebsiteThemeMirrorExactBootstrapTest">(function(){
var SITE_COMMIT='1ea2f2263ebfd6d7253a2c200cd122a4c6915b1e';
var RAW='https://raw.githubusercontent.com/jamiegreen294-boop/dexters-website/'+SITE_COMMIT+'/';
var cfg={
 normal:{label:'Normal',file:'theme-default.html',cls:''},
 halloween:{label:'Halloween',file:'theme-halloween.html',cls:'season-halloween'},
 christmas:{label:'Christmas',file:'theme-christmas.html',cls:'season-christmas'},
 valentine:{label:'Valentine’s',file:'theme-valentine.html',cls:'season-valentines'},
 pride:{label:'Pride',file:'theme-pride.html',cls:'season-pride'},
 burns:{label:'Burns Night',file:'theme-burns.html',cls:'season-burns'},
 standrews:{label:'St Andrew’s',file:'theme-st-andrews.html',cls:'season-st-andrews'}
};
var all=['season-halloween','season-christmas','season-valentines','season-pride','season-burns','season-burns-night','season-st-andrews','season-st-andrew'];
var cache={};var selected=sessionStorage.getItem('dexters-theme-test-exact')||'halloween';
function esc(s){return String(s||'').replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]})}
function setup(){if(document.getElementById('dexThemeTestBar'))return;var bar=document.createElement('div');bar.id='dexThemeTestBar';bar.innerHTML='<strong>EXACT WEBSITE THEME:</strong>'+Object.keys(cfg).map(function(k){return '<button type="button" data-theme="'+k+'">'+esc(cfg[k].label)+'</button>'}).join('');bar.addEventListener('click',function(e){var b=e.target.closest('button[data-theme]');if(b)apply(b.dataset.theme)});document.body.appendChild(bar);var art=document.createElement('section');art.id='dexExactWebsiteArt';art.innerHTML='<span class="dex-art-label">EXACT WEBSITE ARTWORK</span><img id="dexExactWebsiteHero" alt=""><div id="dexExactWebsiteCards"></div>';var home=document.getElementById('homePage');if(home&&home.parentNode)home.parentNode.insertBefore(art,home);else document.body.insertBefore(art,document.body.firstChild);apply(selected)}
function setClass(c){all.forEach(function(x){document.body.classList.remove(x)});if(c)document.body.classList.add(c)}
function resolveSrc(src,file){if(!src)return'';if(/^data:image\//i.test(src)||/^https?:/i.test(src))return src;return RAW+src.replace(/^\.\//,'')}
async function loadTheme(name){if(cache[name])return cache[name];var c=cfg[name],r=await fetch(RAW+c.file,{cache:'no-store'});if(!r.ok)throw new Error('website theme source '+r.status);var text=await r.text();var doc=new DOMParser().parseFromString(text,'text/html');var hero=doc.querySelector('.hero img')||doc.querySelector('.stage>img')||doc.querySelector('main img')||doc.querySelector('body img');if(!hero)throw new Error('website hero image missing');var heroSrc=resolveSrc(hero.getAttribute('src'),c.file);var cardSrcs=Array.prototype.slice.call(doc.querySelectorAll('.cards img,.card img,.partnerBox img')).map(function(i){return resolveSrc(i.getAttribute('src'),c.file)}).filter(Boolean).slice(0,6);var result={hero:heroSrc,cards:cardSrcs,sourceFile:c.file,sourceCommit:SITE_COMMIT};cache[name]=result;return result}
async function apply(name){if(!cfg[name])name='halloween';selected=name;sessionStorage.setItem('dexters-theme-test-exact',name);setClass(cfg[name].cls);var bar=document.getElementById('dexThemeTestBar');if(bar)bar.querySelectorAll('button[data-theme]').forEach(function(b){b.classList.toggle('active',b.dataset.theme===name)});var art=document.getElementById('dexExactWebsiteArt'),hero=document.getElementById('dexExactWebsiteHero'),cards=document.getElementById('dexExactWebsiteCards');if(!art)return;art.className='show';art.dataset.loading='1';delete art.dataset.error;hero.removeAttribute('src');cards.innerHTML='';try{var d=await loadTheme(name);if(selected!==name)return;hero.src=d.hero;hero.alt='Dexter’s '+cfg[name].label+' website artwork';hero.setAttribute('data-website-source-file',d.sourceFile);hero.setAttribute('data-website-source-commit',d.sourceCommit);cards.innerHTML=d.cards.map(function(src){return '<img src="'+src+'" alt="" loading="lazy">'}).join('');await new Promise(function(ok,fail){if(hero.complete&&hero.naturalWidth){ok();return}hero.onload=ok;hero.onerror=fail});delete art.dataset.loading;art.setAttribute('data-verified-source',d.sourceFile+'@'+d.sourceCommit);document.documentElement.setAttribute('data-dexters-theme-mirror-ready','1')}catch(e){delete art.dataset.loading;art.dataset.error='1';art.setAttribute('data-source-error',String(e&&e.message||e));document.documentElement.setAttribute('data-dexters-theme-mirror-ready','1')}}
try{setup();new MutationObserver(function(){var wanted=cfg[selected]&&cfg[selected].cls;if(wanted&&!document.body.classList.contains(wanted))setTimeout(function(){setClass(wanted)},0)}).observe(document.body,{attributes:true,attributeFilter:['class']})}catch(e){document.documentElement.setAttribute('data-dexters-theme-mirror-ready','1')}
})();</script>`;

if(!html.includes('dextersWebsiteThemeMirrorExactTest'))html=html.replace('</head>',css+'</head>');
if(!html.includes('dextersWebsiteThemeMirrorExactBootstrapTest'))html=html.replace(/<body([^>]*)>/i,(m,a)=>'<body'+a+'>'+js);
if(!html.includes('dextersWebsiteThemeMirrorExactTest')||!html.includes('dextersWebsiteThemeMirrorExactBootstrapTest'))throw new Error('Exact website theme mirror test injection failed');
fs.writeFileSync(path,html);console.log('Exact website artwork mirror TEST applied from website commit 1ea2f226');
