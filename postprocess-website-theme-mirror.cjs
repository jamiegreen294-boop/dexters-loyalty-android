const fs=require('fs');
const path='dist/index.html';
let html=fs.readFileSync(path,'utf8');

const css=`<style id="dextersWebsiteThemeMirrorTest">
/* Website-theme mirror TEST. Presentation only: no app features, routes, ids or event handlers are replaced. */
:root{--dex-theme-radius:18px;--dex-theme-border:rgba(255,255,255,.16);--dex-theme-shadow:0 12px 28px rgba(0,0,0,.28)}
body{transition:none!important;background-color:var(--navy,#0b0f14)}
#appView,#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage{background:transparent!important}
:is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage)>.card,
:is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{
  border:1px solid var(--dex-theme-border)!important;
  border-radius:var(--dex-theme-radius)!important;
  box-shadow:var(--dex-theme-shadow)!important;
  backdrop-filter:blur(2px);
}
.btn,.pill,.chip{border-radius:999px!important}

/* Website Halloween: #17111f with Dexter orange accent. */
body.season-halloween{--navy:#17111f;--navy2:#241629;--card:rgba(25,16,27,.90);--yellow:#ff7a1a;--orange:#ff7a1a;--dex-theme-border:rgba(255,122,26,.34)}
body.season-halloween:before{background:linear-gradient(180deg,#17111f,#100b16)!important}
body.season-halloween :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{background:linear-gradient(145deg,rgba(255,122,26,.055),rgba(23,17,31,.96))!important}
body.season-halloween .btn{background:#ffd43c!important;color:#091a26!important}
body.season-halloween #seasonBanner{border-color:rgba(255,122,26,.42)!important;background:linear-gradient(145deg,#241629,#17111f)!important}

/* Website Christmas: deep teal #03483f. */
body.season-christmas{--navy:#03483f;--navy2:#075b4e;--card:rgba(3,54,47,.92);--yellow:#ffd43c;--orange:#e8bf59;--dex-theme-border:rgba(255,212,60,.28)}
body.season-christmas:before{background:linear-gradient(180deg,#03483f,#022d28)!important}
body.season-christmas :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(3,72,63,.94))!important}
body.season-christmas .btn{background:#ffd43c!important;color:#07342e!important}

/* Website Valentine: burgundy #4a0718. */
body.season-valentines{--navy:#4a0718;--navy2:#6b1027;--card:rgba(74,7,24,.90);--yellow:#ffd6df;--orange:#f5a6ba;--dex-theme-border:rgba(255,214,223,.25)}
body.season-valentines:before{background:linear-gradient(180deg,#4a0718,#2c0410)!important}
body.season-valentines :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{background:linear-gradient(145deg,rgba(255,214,223,.07),rgba(74,7,24,.95))!important}
body.season-valentines .btn{background:#ffd6df!important;color:#4a0718!important}

/* Website Pride: dark blue #03243a, rainbow accent retained in a low-cost CSS strip. */
body.season-pride{--navy:#03243a;--navy2:#073a58;--card:rgba(3,36,58,.91);--yellow:#ffd43c;--orange:#ff7a1a;--dex-theme-border:rgba(255,255,255,.22)}
body.season-pride:before{background:linear-gradient(180deg,#03243a,#021827)!important}
body.season-pride #seasonBanner{border-top:5px solid transparent!important;border-image:linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#004dff,#750787) 1!important}
body.season-pride :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage,#staffPage) .card{background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(3,36,58,.95))!important}

/* Burns / St Andrew website themes share the Scottish deep-blue base and use their live website artwork as a lightweight banner image. */
body.season-burns,body.season-burns-night,body.season-st-andrews,body.season-st-andrew{--navy:#03243a;--navy2:#073a58;--card:rgba(3,36,58,.92);--yellow:#ffd45f;--orange:#ffd45f;--dex-theme-border:rgba(255,212,95,.28)}
body.season-burns #seasonBanner,body.season-burns-night #seasonBanner{background-image:linear-gradient(rgba(3,36,58,.05),rgba(3,36,58,.48)),url('https://dextersspot.co.uk/burns-theme.webp')!important;background-size:cover!important;background-position:center top!important;min-height:220px!important}
body.season-st-andrews #seasonBanner,body.season-st-andrew #seasonBanner{background-image:linear-gradient(rgba(3,36,58,.05),rgba(3,36,58,.48)),url('https://dextersspot.co.uk/st-andrews-theme.webp')!important;background-size:cover!important;background-position:center top!important;min-height:220px!important}

/* Mobile app navigation remains the app navigation; only visual treatment mirrors the website. */
#bottomNav{background:rgba(11,15,20,.96)!important;border-top:1px solid var(--dex-theme-border)!important;backdrop-filter:blur(14px)}
body.season-halloween #bottomNav{background:rgba(23,17,31,.97)!important}
body.season-christmas #bottomNav{background:rgba(3,72,63,.97)!important}
body.season-valentines #bottomNav{background:rgba(74,7,24,.97)!important}
body.season-pride #bottomNav,body.season-burns #bottomNav,body.season-burns-night #bottomNav,body.season-st-andrews #bottomNav,body.season-st-andrew #bottomNav{background:rgba(3,36,58,.97)!important}

/* Avoid theme transitions during startup: no normal-theme flash before seasonal class resolves. */
html:not([data-dexters-theme-mirror-ready="1"]) body{visibility:hidden}
html[data-dexters-theme-mirror-ready="1"] body{visibility:visible}
@media (prefers-reduced-motion:no-preference){html[data-dexters-theme-mirror-ready="1"] body{animation:dexThemeReveal .12s ease-out both}@keyframes dexThemeReveal{from{opacity:.985}to{opacity:1}}}
</style>`;

const js=`<script id="dextersWebsiteThemeMirrorBootstrapTest">(function(){
  function ready(){document.documentElement.setAttribute('data-dexters-theme-mirror-ready','1')}
  try{
    var body=document.body;
    if(!body){ready();return}
    /* Never choose a theme here. Existing app theme controls remain authoritative. */
    if(document.documentElement.dataset.dextersThemeReady==='1'){ready();return}
    var done=false;
    var mo=new MutationObserver(function(){if(done)return;if(document.documentElement.dataset.dextersThemeReady==='1'||/season-/.test(body.className)){done=true;mo.disconnect();ready()}});
    mo.observe(body,{attributes:true,attributeFilter:['class']});
    setTimeout(function(){if(!done){done=true;mo.disconnect();ready()}},700);
  }catch(e){ready()}
})();</script>`;

if(!html.includes('dextersWebsiteThemeMirrorTest')) html=html.replace('</head>',css+'</head>');
if(!html.includes('dextersWebsiteThemeMirrorBootstrapTest')) html=html.replace(/<body([^>]*)>/i,(m,a)=>'<body'+a+'>'+js);
if(!html.includes('dextersWebsiteThemeMirrorTest')||!html.includes('dextersWebsiteThemeMirrorBootstrapTest')) throw new Error('Website theme mirror test injection failed');
fs.writeFileSync(path,html);
console.log('Website theme mirror TEST layer applied');
