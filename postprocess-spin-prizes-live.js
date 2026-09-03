const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
if(s.includes('dextersSpinPrizeGuide')){console.log('Spin prize guide already present');process.exit(0)}
const addon=String.raw`<style id="dextersSpinPrizeGuideStyle">
#dxSpinPrizeGuide{margin-top:14px}
#dxSpinPrizeGuide .dx-spin-prize-list{display:grid;gap:9px;margin-top:10px}
#dxSpinPrizeGuide .dx-spin-prize{padding:11px 12px;border:1px solid #ffffff18;border-radius:13px;background:var(--navy2);font-weight:800}
#dxSpinPrizeGuide .dx-spin-prize small{display:block;margin-top:3px;font-weight:600;opacity:.78}
.dx-spin-logo-wrap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:27%;max-width:92px;aspect-ratio:1/1;border-radius:50%;display:grid;place-items:center;background:#0b0f14;border:4px solid var(--yellow);box-shadow:0 4px 14px #0009;z-index:8;pointer-events:none;overflow:hidden}
.dx-spin-logo-wrap img{width:86%;height:86%;object-fit:contain;display:block}
</style><script id="dextersSpinPrizeGuide">(function(){
'use strict';
var LOGO='https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/dexters-logo';
function moveCateringHome(){
  var spin=document.getElementById('spinPage'),home=document.getElementById('homePage');
  if(!spin||!home)return;
  Array.from(spin.children||[]).forEach(function(el){
    if(el.id==='dxSpinPrizeGuide')return;
    var text=String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(text.includes('catering')&&text.includes('event')) home.appendChild(el);
  });
}
function addLogo(){
  var page=document.getElementById('spinPage');
  if(!page||page.querySelector('.dx-spin-logo-wrap'))return;
  var candidates=Array.from(page.querySelectorAll('canvas,svg,.wheel,.spin-wheel,[class*="wheel"],[id*="wheel"]'));
  var wheel=candidates.find(function(el){var r=el.getBoundingClientRect();return r.width>160&&r.height>160&&Math.abs(r.width-r.height)<90})||candidates[0];
  if(!wheel)return;
  var host=wheel.parentElement||wheel;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  var badge=document.createElement('div');
  badge.className='dx-spin-logo-wrap';
  badge.innerHTML='<img src="'+LOGO+'" alt="Dexter’s logo">';
  host.appendChild(badge);
}
function add(){
  var page=document.getElementById('spinPage');
  if(!page)return;
  moveCateringHome();
  addLogo();
  if(document.getElementById('dxSpinPrizeGuide'))return;
  var card=document.createElement('div');
  card.className='card';
  card.id='dxSpinPrizeGuide';
  card.innerHTML='<h2>🎁 What you could win</h2><p class="muted">Spin each day for a chance to win one of these Dexter’s rewards:</p><div class="dx-spin-prize-list"><div class="dx-spin-prize">💷 £2 off<small>Any order over £10</small></div><div class="dx-spin-prize">☕🍰 Free coffee + cake</div><div class="dx-spin-prize">🥪 Free toastie</div><div class="dx-spin-prize">🍽️ Free meal<small>A randomly selected eligible meal under £15</small></div></div><p class="tiny muted" style="margin-top:10px">Prizes are awarded automatically by the promotion system. Staff scan your Dexter’s loyalty QR to redeem a winning reward.</p>';
  page.appendChild(card);
}
function boot(){add();setTimeout(add,300);setTimeout(add,900);setTimeout(add,1800);new MutationObserver(function(){setTimeout(add,0)}).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;
s=s.replace('</body>',addon+'</body>');
fs.writeFileSync(p,s);
console.log('Added live Spin to Win prize guide, centre logo and catering layout guard');
