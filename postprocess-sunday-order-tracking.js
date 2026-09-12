const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
if(!s.includes('/sunday-order-tracking.js'))s=s.replace('</body></html>','<script id="dextersSundayOrderTrackingLoader" src="/sunday-order-tracking.js"></script></body></html>');
if(!s.includes('/sunday-order-tracking.js'))throw new Error('Sunday order tracking injection failed');
fs.writeFileSync(p,s);
