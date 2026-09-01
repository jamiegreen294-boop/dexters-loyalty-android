const fs=require('fs'),path=require('path');
const p=path.join(__dirname,'dist','index.html');
let s=fs.readFileSync(p,'utf8');
const addon=`<style id="dextersWorkLayoutTest">
:root{--work-bg:var(--navy);--work-card:var(--card);--work-ink:var(--white);--work-muted:var(--muted);--work-accent:var(--yellow);--work-soft:var(--navy2)}
body:has(#homePage:not(.hidden)){background:radial-gradient(ellipse at 50% 0,var(--navy2),var(--navy) 75%)!important;color:var(--work-ink)!important}
body:has(#homePage:not(.hidden)) .wrap{max-width:430px!important;padding:18px 16px 100px!important}
body:has(#homePage:not(.hidden)) #homePage{display:block!important;color:var(--work-ink)!important}
body:has(#homePage:not(.hidden)) #homePage>.card{margin:14px 0!important;display:block!important;background:linear-gradient(145deg,#ffffff07,#ffffff00),var(--work-card)!important;color:var(--work-ink)!important;border:1px solid #ffffff1f!important;border-radius:18px!important;box-shadow:0 14px 34px #0004!important;padding:16px!important}
body:has(#homePage:not(.hidden)) #homePage>.card:first-child{background:transparent!important;border:0!important;box-shadow:none!important;padding:4px 0!important}
body:has(#homePage:not(.hidden)) #homePage h1,body:has(#homePage:not(.hidden)) #homePage h2,body:has(#homePage:not(.hidden)) #homePage h3{color:var(--work-ink)!important}
body:has(#homePage:not(.hidden)) #homePage .muted{color:var(--work-muted)!important}
body:has(#homePage:not(.hidden)) #homePage .btn{background:linear-gradient(90deg,var(--yellow),var(--orange))!important;color:#111!important;border-radius:16px!important}
body:has(#homePage:not(.hidden)) #collectionOrderLiveCard{border-radius:22px!important;padding:20px!important;box-shadow:0 14px 34px #0004!important}
#workQuickActions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
.work-action{border:1px solid #ffffff1f;text-align:left;background:linear-gradient(145deg,#ffffff07,#ffffff00),var(--work-card);color:var(--work-ink);border-radius:18px;padding:16px;box-shadow:0 14px 34px #0004;font:inherit;cursor:pointer;text-decoration:none}
.work-action .wi{font-size:24px}.work-action .wt{font-weight:900;margin-top:7px}.work-action .wd{font-size:12px;color:var(--work-muted);margin-top:4px}.work-badge{display:inline-block;background:#334b70;color:#fff;font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;margin-top:7px}
body.season-halloween{--work-bg:#0e0b13;--work-card:#201726;--work-ink:#fff0df;--work-muted:#cebad4;--work-accent:#ff9634}
body.season-christmas{--work-bg:#071d17;--work-card:#10382d;--work-ink:#fff5da;--work-muted:#c5d9c9;--work-accent:#f1c968}
body.season-valentines{--work-bg:#fff1f4;--work-card:#fffafa;--work-ink:#62172e;--work-muted:#985469;--work-accent:#b51d50}
body.season-halloween #homePage,body.season-christmas #homePage,body.season-valentines #homePage{display:block!important;grid-template-columns:none!important;gap:0!important}
body.season-halloween #homePage>.card,body.season-christmas #homePage>.card,body.season-valentines #homePage>.card{grid-column:auto!important;margin:14px 0!important;border-radius:18px!important}
body.season-halloween #homePage>.card:first-child,body.season-christmas #homePage>.card:first-child,body.season-valentines #homePage>.card:first-child{grid-column:auto!important}
body:has(#homePage:not(.hidden)) #seasonBanner{max-width:430px!important;width:100%!important;margin:0 auto 14px!important}
@media(max-width:460px){body:has(#homePage:not(.hidden)) .wrap{padding-left:16px!important;padding-right:16px!important}}
</style>
<script id="dextersWorkLayoutActions">(function(){function nav(page){const b=document.querySelector('#bottomNav [data-page="'+page+'"]');if(b)b.click()}function add(){const home=document.getElementById('homePage');if(!home||document.getElementById('workQuickActions'))return;const grid=document.createElement('div');grid.id='workQuickActions';grid.innerHTML='<button class="work-action" id="workRewards"><div class="wi">🎁</div><div class="wt">Your Rewards</div><div class="wd">Coffee, offers & treats</div></button><button class="work-action" id="workAgain"><div class="wi">⭐</div><div class="wt">Order Again</div><div class="wd">Your usual in a tap</div></button><button class="work-action" id="workSpin"><div class="wi">🎡</div><div class="wt">Spin to Win</div><div class="wd">Play when activated</div><span class="work-badge">LIVE FEATURE</span></button><a class="work-action" href="https://wa.me/441414735249" target="_blank" rel="noopener"><div class="wi">💬</div><div class="wt">Ask Dexter</div><div class="wd">Chat with us on WhatsApp</div></a>';const first=home.children[1]||home.firstChild;home.insertBefore(grid,first?first.nextSibling:null);document.getElementById('workRewards').onclick=()=>nav('qrPage');document.getElementById('workSpin').onclick=()=>nav('spinPage');document.getElementById('workAgain').onclick=()=>{location.href='/collection-order-test.html'};syncSpin()}function syncSpin(){const b=document.getElementById('workSpin'),navb=document.querySelector('#bottomNav [data-page="spinPage"]');if(!b||!navb)return;b.style.display=navb.classList.contains('hidden')?'none':''}add();setTimeout(add,300);setTimeout(()=>{add();syncSpin()},1200);new MutationObserver(()=>{add();syncSpin()}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true})})();</script>`;
if(!s.includes('dextersWorkLayoutTest'))s=s.replace('</head>',addon+'</head>');
fs.writeFileSync(p,s);
console.log('Locked Work home layout with app-matched normal colours, seasonal palette and quick actions applied');
