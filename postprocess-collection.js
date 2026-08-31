const fs=require('fs');
const p='dist/collection-order-test.html';
let s=fs.readFileSync(p,'utf8');
const css=`<style id="dextersOrderReviewStyle">#stockCard{display:none!important}#orderReviewCard{background:#0d1829;border:1px solid #324866;border-radius:15px;padding:14px;margin:14px 0}#orderReviewCard h3{margin:0 0 10px}.review-empty{color:#aab4c3;font-size:13px}.review-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #ffffff18}.review-row:last-child{border-bottom:0}.review-name{font-weight:900}.review-meta{font-size:12px;color:#aab4c3;margin-top:3px}.review-right{text-align:right}.review-line-total{font-weight:900;color:#ffd43b;margin-bottom:5px}.review-remove{border:0;border-radius:9px;padding:7px 9px;background:#4a2028;color:#ffd5d5;font-weight:900}.review-total{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:2px solid #324866;margin-top:10px;padding-top:12px;font-size:20px;font-weight:900}.review-total span:last-child{color:#ffd43b}.review-title-row{display:flex;justify-content:space-between;gap:10px;align-items:center}.review-count{font-size:12px;color:#aab4c3;font-weight:800}</style>`;
const html=`<div id="orderReviewCard"><div class="review-title-row"><h3>Your order</h3><span id="orderReviewCount" class="review-count">0 items</span></div><div id="orderReviewList"><div class="review-empty">Your order is empty. Add items from the menu above.</div></div><div class="review-total"><span>Total</span><span id="orderReviewTotal">£0.00</span></div></div>`;
if(!s.includes('dextersOrderReviewStyle'))s=s.replace('</head>',css+'</head>');
if(!s.includes('id="orderReviewCard"'))s=s.replace('<label>Collection time</label>',html+'<label>Collection time</label>');
// The live modifier script owns the basket/review. Do not inject the legacy cart review timer,
// because it overwrites customised items every two seconds.
s=s.replace(/<script id="dextersOrderReviewScript">[\s\S]*?<\/script>/,'');
if(!s.includes('collection-modifiers-live.js'))s=s.replace('</body>','<script src="/collection-modifiers-live.js"></script></body>');
if(!s.includes('orderReviewCard')||!s.includes('collection-modifiers-live.js'))throw new Error('Collection review/modifier injection failed');
fs.writeFileSync(p,s);
console.log('Added live collection review/modifiers and hid legacy stock control');
