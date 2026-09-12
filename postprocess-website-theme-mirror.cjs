const fs=require('fs');
const path='dist/index.html';
let html=fs.readFileSync(path,'utf8');

const css=`<style id="dextersWebsiteThemeMirrorTest">
:root{--dex-theme-radius:18px;--dex-theme-border:rgba(255,255,255,.16);--dex-theme-shadow:0 12px 28px rgba(0,0,0,.28)}
body{transition:none!important;background-color:var(--navy,#0b0f14)}
#appView,#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage{background:transparent!important}
:is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage)>.card,:is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{border:1px solid var(--dex-theme-border)!important;border-radius:var(--dex-theme-radius)!important;box-shadow:var(--dex-theme-shadow)!important;backdrop-filter:blur(2px)}
.btn,.pill,.chip{border-radius:999px!important}

/* Keep the loyalty app artwork. Only restyle around it to match the public website. */
body.season-halloween{--navy:#17111f;--navy2:#241629;--card:rgba(25,16,27,.90);--yellow:#ff7a1a;--orange:#ff7a1a;--dex-theme-border:rgba(255,122,26,.34)}
body.season-halloween :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{background:linear-gradient(145deg,rgba(255,122,26,.055),rgba(23,17,31,.96))!important}
body.season-halloween .btn{background:#ffd43c!important;color:#091a26!important}
body.season-halloween #seasonBanner{border-color:rgba(255,122,26,.42)!important}

body.season-christmas{--navy:#03483f;--navy2:#075b4e;--card:rgba(3,54,47,.92);--yellow:#ffd43c;--orange:#e8bf59;--dex-theme-border:rgba(255,212,60,.28)}
body.season-christmas :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(3,72,63,.94))!important}
body.season-christmas .btn{background:#ffd43c!important;color:#07342e!important}

body.season-valentines{--navy:#4a0718;--navy2:#6b1027;--card:rgba(74,7,24,.90);--yellow:#ffd6df;--orange:#f5a6ba;--dex-theme-border:rgba(255,214,223,.25)}
body.season-valentines :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{background:linear-gradient(145deg,rgba(255,214,223,.07),rgba(74,7,24,.95))!important}
body.season-valentines .btn{background:#ffd6df!important;color:#4a0718!important}

body.season-pride{--navy:#03243a;--navy2:#073a58;--card:rgba(3,36,58,.91);--yellow:#ffd43c;--orange:#ff7a1a;--dex-theme-border:rgba(255,255,255,.22)}
body.season-pride #seasonBanner{border-top:6px solid transparent!important;border-image:linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#004dff,#750787) 1!important;background:linear-gradient(145deg,rgba(3,36,58,.92),rgba(3,36,58,.98))!important}
body.season-pride #seasonBanner:after{content:'🏳️‍🌈  PRIDE AT DEXTER’S  🏳️‍🌈';display:block;text-align:center;font-weight:900;font-size:20px;letter-spacing:.02em;padding:28px 10px;background:linear-gradient(90deg,#e40303 0 16.6%,#ff8c00 16.6% 33.2%,#ffed00 33.2% 49.8%,#008026 49.8% 66.4%,#004dff 66.4% 83%,#750787 83%);-webkit-background-clip:text;background-clip:text;color:transparent}
body.season-pride :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(3,36,58,.95))!important}

body.season-burns,body.season-burns-night,body.season-st-andrews,body.season-st-andrew{--navy:#03243a;--navy2:#073a58;--card:rgba(3,36,58,.92);--yellow:#ffd45f;--orange:#ffd45f;--dex-theme-border:rgba(255,212,95,.28)}
body.season-burns #seasonBanner,body.season-burns-night #seasonBanner{background-image:linear-gradient(rgba(3,36,58,.12),rgba(3,36,58,.42)),url('https://dextersspot.co.uk/burns-theme.webp')!important;background-size:cover!important;background-position:center top!important;min-height:250px!important}
body.season-st-andrews #seasonBanner,body.season-st-andrew #seasonBanner{background-image:linear-gradient(rgba(3,36,58,.12),rgba(3,36,58,.42)),url('https://dextersspot.co.uk/st-andrews-theme.webp')!important;background-size:cover!important;background-position:center top!important;min-height:250px!important}

#bottomNav{background:rgba(11,15,20,.96)!important;border-top:1px solid var(--dex-theme-border)!important;backdrop-filter:blur(14px)}
body.season-halloween #bottomNav{background:rgba(23,17,31,.97)!important}body.season-christmas #bottomNav{background:rgba(3,72,63,.97)!important}body.season-valentines #bottomNav{background:rgba(74,7,24,.97)!important}body.season-pride #bottomNav,body.season-burns #bottomNav,body.season-burns-night #bottomNav,body.season-st-andrews #bottomNav,body.season-st-andrew #bottomNav{background:rgba(3,36,58,.97)!important}

/* Test-only theme chooser. Never included on live unless this branch is explicitly promoted. */
#dexThemeTestBar{position:fixed;left:8px;right:8px;top:8px;z-index:2147483646;background:rgba(0,0,0,.92);color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:14px;padding:8px;display:flex;align-items:center;gap:7px;overflow-x:auto;box-shadow:0 6px 22px rgba(0,0,0,.45);font:700 12px/1.1 Arial,sans-serif;scrollbar-width:none}
#dexThemeTestBar::-webkit-scrollbar{display:none}#dexThemeTestBar strong{flex:0 0 auto;color:#ffd43c;margin:0 3px}#dexThemeTestBar button{flex:0 0 auto;border:0;border-radius:999px;padding:8px 11px;background:#242424;color:#fff;font-weight:800}#dexThemeTestBar button.active{background:#ffd43c;color:#111}body{padding-top:52px!important}
</style>`;

const js=`<script id="dextersWebsiteThemeMirrorBootstrapTest">(function(){
var themes={normal:[],halloween:['season-halloween'],christmas:['season-christmas'],valentine:['season-valentines'],pride:['season-pride'],burns:['season-burns'],standrews:['season-st-andrews']};
var all=['season-halloween','season-christmas','season-valentines','season-pride','season-burns','season-burns-night','season-st-andrews','season-st-andrew'];
var labels={normal:'Normal',halloween:'Halloween',christmas:'Christmas',valentine:'Valentine’s',pride:'Pride',burns:'Burns Night',standrews:'St Andrew’s'};
var forced=sessionStorage.getItem('dexters-theme-test')||'halloween';
function apply(name){forced=name in themes?name:'halloween';sessionStorage.setItem('dexters-theme-test',forced);all.forEach(function(c){document.body.classList.remove(c)});themes[forced].forEach(function(c){document.body.classList.add(c)});document.documentElement.setAttribute('data-dexters-theme-mirror-ready','1');var bar=document.getElementById('dexThemeTestBar');if(bar)bar.querySelectorAll('button[data-theme]').forEach(function(b){b.classList.toggle('active',b.dataset.theme===forced)})}
function build(){if(document.getElementById('dexThemeTestBar'))return;var bar=document.createElement('div');bar.id='dexThemeTestBar';bar.innerHTML='<strong>TEST THEME:</strong>'+Object.keys(labels).map(function(k){return '<button type="button" data-theme="'+k+'">'+labels[k]+'</button>'}).join('');bar.addEventListener('click',function(e){var b=e.target.closest('button[data-theme]');if(b)apply(b.dataset.theme)});document.body.appendChild(bar);apply(forced)}
try{build();new MutationObserver(function(){var wanted=themes[forced]||[];var hasOther=all.some(function(c){return document.body.classList.contains(c)&&wanted.indexOf(c)<0});var missing=wanted.some(function(c){return !document.body.classList.contains(c)});if(hasOther||missing)setTimeout(function(){apply(forced)},0)}).observe(document.body,{attributes:true,attributeFilter:['class']});setTimeout(function(){apply(forced)},250);setTimeout(function(){apply(forced)},1000)}catch(e){document.documentElement.setAttribute('data-dexters-theme-mirror-ready','1')}
})();</script>`;

if(!html.includes('dextersWebsiteThemeMirrorTest'))html=html.replace('</head>',css+'</head>');
if(!html.includes('dextersWebsiteThemeMirrorBootstrapTest'))html=html.replace(/<body([^>]*)>/i,(m,a)=>'<body'+a+'>'+js);
if(!html.includes('dextersWebsiteThemeMirrorTest')||!html.includes('dextersWebsiteThemeMirrorBootstrapTest'))throw new Error('Website theme mirror test injection failed');
fs.writeFileSync(path,html);console.log('Website theme mirror TEST layer with manual switcher applied');
