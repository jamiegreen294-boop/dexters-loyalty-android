const fs=require('fs');
const path=require('path');
const file=path.join(__dirname,'dist','index.html');
let html=fs.readFileSync(file,'utf8');
if(html.includes('dextersWebsiteThemeTest')){console.log('website theme test already present');process.exit(0)}
const css=`<style id="dextersWebsiteThemeTestStyle">
#dextersWebsiteThemeTestBar{position:fixed;left:8px;right:8px;top:8px;z-index:100000;background:rgba(3,16,29,.94);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:8px 10px;display:flex;gap:8px;align-items:center;box-shadow:0 8px 26px #0008;backdrop-filter:blur(12px)}
#dextersWebsiteThemeTestBar label{font:800 11px/1 system-ui;color:#ffd45f;letter-spacing:.06em;white-space:nowrap}
#dextersWebsiteThemeSelect{min-width:0;flex:1;border:1px solid rgba(255,255,255,.25);border-radius:10px;background:#0b2033;color:#fff;padding:8px;font:700 13px system-ui}
#dextersWebsiteThemeBadge{font:800 10px/1 system-ui;color:#fff;background:#9d2430;padding:6px 8px;border-radius:999px;white-space:nowrap}
body[data-website-theme-test] .wrap{padding-top:58px!important}
#dextersWebsiteThemeVisual{display:none;overflow:hidden;border-radius:18px;margin:10px 0 14px;border:1px solid rgba(255,255,255,.18);box-shadow:0 15px 38px #0006;background:#071421}
#dextersWebsiteThemeVisual iframe{display:block;width:100%;height:260px;border:0;pointer-events:none;background:#071421}
body.season-burns{--navy:#041725;--navy2:#102f45;--card:#102b3c;--yellow:#e8bf58;--orange:#c99436}
body.season-st-andrews{--navy:#03243a;--navy2:#0a4261;--card:#0b3049;--yellow:#e6c05a;--orange:#c79d37}
body.season-pride{--navy:#11172b;--navy2:#332558;--card:#1b2441;--yellow:#ffe36b;--orange:#ff8d61}
body.season-burns #dextersWebsiteThemeVisual,body.season-st-andrews #dextersWebsiteThemeVisual,body.season-pride #dextersWebsiteThemeVisual,body.season-halloween #dextersWebsiteThemeVisual,body.season-christmas #dextersWebsiteThemeVisual,body.season-valentines #dextersWebsiteThemeVisual{display:block}
body.season-burns :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage) .card{border-color:#e8bf5840;background:linear-gradient(145deg,#17384a,#0c2230)!important}
body.season-st-andrews :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage) .card{border-color:#6ea8c940;background:linear-gradient(145deg,#0f3c58,#092b40)!important}
body.season-pride :is(#homePage,#qrPage,#spinPage,#menuPage,#accountPage) .card{border-color:#ffffff33;background:linear-gradient(145deg,#2f2855,#171d36)!important}
</style>`;
const js=`<script id="dextersWebsiteThemeTest">(function(){
const THEMES=['default','valentine','burns','pride','halloween','st-andrews','christmas'];
const CLASSES=['season-valentines','season-burns','season-pride','season-halloween','season-st-andrews','season-christmas'];
function calendarTheme(){const d=new Date(),m=d.getMonth()+1,day=d.getDate();if(m===1&&day>=10&&day<=25)return'burns';if((m===1&&(day<=9||day>=26))||(m===2&&day<=15))return'valentine';if(m===6)return'pride';if(m===9||m===10)return'halloween';if(m===11&&day>=24&&day<=30)return'st-andrews';if(m===11||m===12)return'christmas';return'default'}
function chosen(){const q=new URLSearchParams(location.search).get('loyaltyTheme');return THEMES.includes(q)?q:calendarTheme()}
function siteUrl(t){return 'https://dextersspot.co.uk/theme-clean.html?name='+encodeURIComponent(t==='valentine'?'valentine':t)}
function ensureBar(theme){let bar=document.getElementById('dextersWebsiteThemeTestBar');if(!bar){bar=document.createElement('div');bar.id='dextersWebsiteThemeTestBar';bar.innerHTML='<label>TEST THEME</label><select id="dextersWebsiteThemeSelect"></select><span id="dextersWebsiteThemeBadge">TEST ONLY</span>';document.body.appendChild(bar);const s=bar.querySelector('select');THEMES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t==='st-andrews'?"St Andrew’s":t.charAt(0).toUpperCase()+t.slice(1);s.appendChild(o)});s.onchange=function(){const u=new URL(location.href);u.searchParams.set('loyaltyTheme',this.value);location.href=u.toString()}}bar.querySelector('select').value=theme}
function ensureVisual(theme){let home=document.getElementById('homePage');if(!home)return;let v=document.getElementById('dextersWebsiteThemeVisual');if(!v){v=document.createElement('div');v.id='dextersWebsiteThemeVisual';const first=home.firstElementChild;home.insertBefore(v,first||null)}if(theme==='default'){v.innerHTML='';return}const url=siteUrl(theme);if(v.dataset.url!==url){v.dataset.url=url;v.innerHTML='<iframe title="Website theme reference" src="'+url+'" loading="eager" tabindex="-1" aria-hidden="true"></iframe>'}}
function apply(){const theme=chosen();CLASSES.forEach(c=>document.body.classList.remove(c));const map={valentine:'season-valentines',burns:'season-burns',pride:'season-pride',halloween:'season-halloween','st-andrews':'season-st-andrews',christmas:'season-christmas'};if(map[theme])document.body.classList.add(map[theme]);document.body.dataset.websiteThemeTest=theme;document.documentElement.dataset.websiteThemeTest=theme;ensureBar(theme);ensureVisual(theme)}
apply();setTimeout(apply,250);setTimeout(apply,1000);new MutationObserver(()=>setTimeout(apply,0)).observe(document.body,{childList:true,subtree:true});
})();</script>`;
html=html.replace('</head>',css+'</head>').replace('</body></html>',js+'</body></html>');
fs.writeFileSync(file,html);
console.log('Injected test-only website theme sync into loyalty app');