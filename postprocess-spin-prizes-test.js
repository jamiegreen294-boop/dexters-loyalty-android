const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
if(s.includes('dextersSpinPrizeGuide')){console.log('Spin prize guide already present');process.exit(0)}
const addon=String.raw`<style id="dextersSpinPrizeGuideStyle">
#dxSpinPrizeGuide{margin-top:14px}
#dxSpinPrizeGuide .dx-spin-prize-list{display:grid;gap:9px;margin-top:10px}
#dxSpinPrizeGuide .dx-spin-prize{padding:11px 12px;border:1px solid #ffffff18;border-radius:13px;background:var(--navy2);font-weight:800}
#dxSpinPrizeGuide .dx-spin-prize small{display:block;margin-top:3px;font-weight:600;opacity:.78}
</style><script id="dextersSpinPrizeGuide">(function(){
'use strict';
function add(){
  var page=document.getElementById('spinPage');
  if(!page||document.getElementById('dxSpinPrizeGuide'))return;
  var card=document.createElement('div');
  card.className='card';
  card.id='dxSpinPrizeGuide';
  card.innerHTML='<h2>🎁 What you could win</h2><p class="muted">Spin each day for a chance to win one of these Dexter’s rewards:</p><div class="dx-spin-prize-list"><div class="dx-spin-prize">💷 £2 off<small>Any order over £10</small></div><div class="dx-spin-prize">☕🍰 Free coffee + cake</div><div class="dx-spin-prize">🥪 Free toastie</div><div class="dx-spin-prize">🍽️ Free meal<small>A randomly selected eligible meal up to £15</small></div></div><p class="tiny muted" style="margin-top:10px">Prizes are awarded automatically by the promotion system. Staff scan your Dexter’s loyalty QR to redeem a winning reward.</p>';
  page.appendChild(card);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else add();
setTimeout(add,500);setTimeout(add,1500);
new MutationObserver(function(){setTimeout(add,0)}).observe(document.body,{childList:true,subtree:true});
})();</script>`;
s=s.replace('</body>',addon+'</body>');
fs.writeFileSync(p,s);
console.log('Added customer Spin to Win prize guide');
