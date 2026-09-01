const fs=require('fs'),path=require('path');
const p=path.join(__dirname,'dist','index.html');
let s=fs.readFileSync(p,'utf8');
const addon=`<style id="dextersWorkLayoutTest">
body{--work-bg:var(--navy);--work-card:var(--card);--work-ink:var(--white);--work-muted:var(--muted);--work-accent:var(--yellow);--work-soft:var(--navy2)}

body:has(#appView:not(.hidden) #homePage:not(.hidden)) .wrap{max-width:430px!important;padding:18px 16px 100px!important}
body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage{display:block!important;color:var(--work-ink)!important}
body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage>.card{margin:14px 0!important;display:block!important;background:linear-gradient(145deg,#ffffff07,#ffffff00),var(--work-card)!important;color:var(--work-ink)!important;border:1px solid #ffffff1f!important;border-radius:18px!important;box-shadow:0 14px 34px #0004!important;padding:16px!important}
body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage>.card:first-child{background:transparent!important;border:0!important;box-shadow:none!important;padding:4px 0!important}
body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage h1,body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage h2,body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage h3{color:var(--work-ink)!important}
body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage .muted{color:var(--work-muted)!important}
body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage .btn{background:linear-gradient(90deg,var(--yellow),var(--orange))!important;color:#111!important;border-radius:16px!important}
body:has(#appView:not(.hidden) #homePage:not(.hidden)) #collectionOrderLiveCard{border-radius:22px!important;padding:20px!important;box-shadow:0 14px 34px #0004!important}
#workQuickActions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
.work-action{border:1px solid #ffffff1f;text-align:left;background:linear-gradient(145deg,#ffffff07,#ffffff00),var(--work-card);color:var(--work-ink);border-radius:18px;padding:16px;box-shadow:0 14px 34px #0004;font:inherit;cursor:pointer;text-decoration:none}
.work-action .wi{font-size:24px}.work-action .wt{font-weight:900;margin-top:7px}.work-action .wd{font-size:12px;color:var(--work-muted);margin-top:4px}.work-badge{display:inline-block;background:#334b70;color:#fff;font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;margin-top:7px}
body:has(#appView:not(.hidden) #homePage:not(.hidden)) #seasonBanner{max-width:430px!important;width:calc(100% - 32px)!important;margin:0 auto 14px!important}
@media(max-width:460px){body:has(#appView:not(.hidden) #homePage:not(.hidden)) .wrap{padding-left:16px!important;padding-right:16px!important}}

body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage .stamps{grid-template-columns:repeat(9,minmax(0,1fr));gap:5px}
body:has(#appView:not(.hidden) #homePage:not(.hidden)) #homePage .stamp{min-width:0;font-size:clamp(13px,4vw,22px)}
.work-action{min-width:0;min-height:116px}.work-action:focus-visible{outline:3px solid var(--yellow);outline-offset:3px}.work-action:disabled{cursor:not-allowed;opacity:.65}.work-action[hidden]{display:none!important}
#workQuickActions{grid-column:1/-1}
@media(prefers-reduced-motion:reduce){.work-action{transition:none}}
</style>
<script id="dextersWorkLayoutActions">(function(){
function initialise(){
 const home=document.getElementById('homePage');if(!home||document.getElementById('workQuickActions'))return;
 function nav(page){const button=document.querySelector('#bottomNav [data-page="'+page+'"]');if(button&&!button.classList.contains('hidden'))button.click()}
 const grid=document.createElement('div');grid.id='workQuickActions';grid.innerHTML='<button type="button" class="work-action" id="workRewards"><div class="wi">🎁</div><div class="wt">Your Rewards</div><div class="wd">Your coffee card & rewards</div></button><button type="button" class="work-action" id="workAgain"><div class="wi">⭐</div><div class="wt">Order Again</div><div class="wd">View orders & build your next</div></button><button type="button" class="work-action" id="workSpin"><div class="wi">🎡</div><div class="wt">Spin to Win</div><div class="wd" id="workSpinNote">Play when activated</div></button><a class="work-action" id="workDexter" href="https://wa.me/441414735249" target="_blank" rel="noopener noreferrer"><div class="wi">💬</div><div class="wt">Ask Dexter</div><div class="wd">Chat with us on WhatsApp</div></a>';
 const coffee=home.querySelector('#stamps')?.closest('.card');if(coffee)coffee.after(grid);else home.appendChild(grid);
 document.getElementById('workRewards').onclick=()=>nav('qrPage');
 const spin=document.getElementById('workSpin'),spinNav=document.querySelector('#bottomNav [data-page="spinPage"]'),note=document.getElementById('workSpinNote');
 spin.onclick=()=>nav('spinPage');
 document.getElementById('workAgain').onclick=()=>{location.href='/collection-order-test.html'};
 function syncSpin(){const enabled=!!spinNav&&!spinNav.classList.contains('hidden');spin.disabled=!enabled;const text=enabled?'Play your daily spin':'Promotion currently off';if(note.textContent!==text)note.textContent=text}
 syncSpin();if(spinNav)new MutationObserver(syncSpin).observe(spinNav,{attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialise,{once:true});else initialise();
})();</script>`;
if(!s.includes('dextersWorkLayoutTest'))s=s.replace('</head>',addon+'</head>');
fs.writeFileSync(p,s);
console.log('Locked Work home layout with app-matched normal colours, seasonal palette and quick actions applied');
