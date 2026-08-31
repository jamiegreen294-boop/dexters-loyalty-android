const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
// The home collection card must check the same live API used by the order page.
s=s.replaceAll('/functions/v1/collection-orders-test-api','/functions/v1/collection-orders-api');
if(s.includes('/functions/v1/collection-orders-test-api'))throw new Error('Live home page still references test collection API');
fs.writeFileSync(p,s);
console.log('Applied live app consistency fixes');
