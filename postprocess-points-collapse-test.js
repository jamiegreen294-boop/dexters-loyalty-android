const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
if(s.includes('dextersPointsCollapseTest')){console.log('points collapse test already present');process.exit(0)}
const addon=String.raw`<style id="dextersPointsCollapseTestStyle">
#dxRewardsRedeemCard .dx-pr-cat-head{cursor:pointer;user-select:none}
#dxRewardsRedeemCard .dx-pr-cat-head::after{content:'▾';font-size:16px;color:var(--yellow);margin-left:4px;transition:transform .18s ease;line-height:1}
#dxRewardsRedeemCard .dx-pr-cat.dx-pr-cat-open>.dx-pr-cat-head::after{transform:rotate(180deg)}
#dxRewardsRedeemCard .dx-pr-cat:not(.dx-pr-cat-open)>.dx-pr-reward{display:none!important}
#dxRewardsRedeemCard .dx-pr-cat-head:focus-visible{outline:2px solid var(--yellow);outline-offset:-2px}
</style><script id="dextersPointsCollapseTest">(function(){
'use strict';
function enhance(){
  var card=document.getElementById('dxRewardsRedeemCard');
  if(!card)return;
  card.querySelectorAll('.dx-pr-cat-head').forEach(function(head){
    if(head.dataset.dxCollapseReady==='1')return;
    head.dataset.dxCollapseReady='1';
    head.setAttribute('role','button');
    head.setAttribute('tabindex','0');
    head.setAttribute('aria-expanded','false');
  });
}
function toggle(head){
  if(!head)return;
  var cat=head.closest('.dx-pr-cat');
  if(!cat)return;
  var open=cat.classList.toggle('dx-pr-cat-open');
  head.setAttribute('aria-expanded',open?'true':'false');
}
document.addEventListener('click',function(e){
  var head=e.target.closest&&e.target.closest('#dxRewardsRedeemCard .dx-pr-cat-head');
  if(!head)return;
  e.preventDefault();
  toggle(head);
});
document.addEventListener('keydown',function(e){
  var head=e.target.closest&&e.target.closest('#dxRewardsRedeemCard .dx-pr-cat-head');
  if(!head||(e.key!=='Enter'&&e.key!==' '))return;
  e.preventDefault();
  toggle(head);
});
function boot(){
  enhance();
  setTimeout(enhance,300);
  setTimeout(enhance,900);
  new MutationObserver(function(){setTimeout(enhance,0)}).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;
if(!s.includes('</body>'))throw new Error('No closing body tag');
s=s.replace('</body>',addon+'</body>');
if(!s.includes('dextersPointsCollapseTest')||!s.includes('dx-pr-cat-open'))throw new Error('Points collapse injection validation failed');
fs.writeFileSync(p,s);
console.log('Added collapsible customer points reward categories for test build');
