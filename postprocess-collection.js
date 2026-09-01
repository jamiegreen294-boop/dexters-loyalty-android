const fs=require('fs');
const p='dist/collection-order-test.html';
let s=fs.readFileSync(p,'utf8');
if(!s.includes('id="collectionBackHome"')){
 const heading="<h1>Dexter's Collection Ordering</h1>";
 if(!s.includes(heading))throw Error('Collection heading not found');
 s=s.replace(heading,'<a id="collectionBackHome" href="/" style="display:inline-flex;align-items:center;min-height:44px;padding:0 14px;margin-bottom:12px;border-radius:12px;background:#243a5e;color:#fff;text-decoration:none;font-weight:800">← Home</a>'+heading);
}

const css=`<style id="dextersOrderReviewStyle">#stockCard{display:none!important}#orderReviewCard{background:#0d1829;border:1px solid #324866;border-radius:15px;padding:14px;margin:14px 0}#orderReviewCard h3{margin:0 0 10px}.review-empty{color:#aab4c3;font-size:13px}.review-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #ffffff18}.review-row:last-child{border-bottom:0}.review-name{font-weight:900}.review-meta{font-size:12px;color:#aab4c3;margin-top:3px}.review-right{text-align:right}.review-line-total{font-weight:900;color:#ffd43b;margin-bottom:5px}.review-remove{border:0;border-radius:9px;padding:7px 9px;background:#4a2028;color:#ffd5d5;font-weight:900}.review-total{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:2px solid #324866;margin-top:10px;padding-top:12px;font-size:20px;font-weight:900}.review-total span:last-child{color:#ffd43b}.review-title-row{display:flex;justify-content:space-between;gap:10px;align-items:center}.review-count{font-size:12px;color:#aab4c3;font-weight:800}</style>`;
const html=`<div id="orderReviewCard"><div class="review-title-row"><h3>Your order</h3><span id="orderReviewCount" class="review-count">0 items</span></div><div id="orderReviewList"><div class="review-empty">Your order is empty. Add items from the menu above.</div></div><div class="review-total"><span>Total</span><span id="orderReviewTotal">£0.00</span></div></div>`;
const keepOpen=`<script id="dextersKeepCollectionMenuOpen">(function(){const open=new Set();const keyOf=cat=>{const span=cat&&cat.querySelector(':scope>.menu-head>span:first-child');return span?span.textContent.replace(/\\s*\\(\\d+\\)\\s*$/,'').trim():''};function restore(){const menu=document.getElementById('menu');if(!menu)return;menu.querySelectorAll('.menu-cat').forEach(cat=>{const k=keyOf(cat);if(k&&open.has(k))cat.classList.add('open')})}document.addEventListener('click',e=>{const h=e.target.closest&&e.target.closest('#menu .menu-head');if(!h)return;setTimeout(()=>{const cat=h.parentElement,k=keyOf(cat);if(!k)return;cat.classList.contains('open')?open.add(k):open.delete(k)},0)},true);function attach(){const menu=document.getElementById('menu');if(!menu||menu.dataset.keepOpenReady==='1')return;menu.dataset.keepOpenReady='1';new MutationObserver(()=>setTimeout(restore,0)).observe(menu,{childList:true});restore()}attach();setTimeout(attach,300);setTimeout(attach,1200);})();</script>`;
if(!s.includes('dextersOrderReviewStyle'))s=s.replace('</head>',css+'</head>');
if(!s.includes('id="orderReviewCard"'))s=s.replace('<label>Collection time</label>',html+'<label>Collection time</label>');
// The live modifier script owns the basket/review. Do not inject the legacy cart review timer,
// because it overwrites customised items every two seconds.
s=s.replace(/<script id="dextersOrderReviewScript">[\s\S]*?<\/script>/,'');
fs.copyFileSync('web/reorder-core.js','dist/reorder-core.js');
if(!s.includes('reorder-core.js'))s=s.replace('</body>','<script src="/reorder-core.js"></script></body>');
if(!s.includes('collection-modifiers-live.js'))s=s.replace('</body>','<script src="/collection-modifiers-live.js"></script></body>');
if(!s.includes('dextersKeepCollectionMenuOpen'))s=s.replace('</body>',keepOpen+'</body>');
if(!s.includes('orderReviewCard')||!s.includes('collection-modifiers-live.js')||!s.includes('dextersKeepCollectionMenuOpen'))throw new Error('Collection review/modifier/menu-state injection failed');
s=s.replace('<script src="/reorder-core.js"></script>','');
s=s.replace('<script src="/collection-modifiers-live.js"></script>','<script src="/reorder-core.js"></script><script src="/collection-modifiers-live.js"></script>');
fs.writeFileSync(p,s);
console.log('Added live collection review/modifiers, kept menu sections open, and hid legacy stock control');

require("./postprocess-collection-theme.js");
