const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
// Keep the live home collection card and the collection order page on the same production API.
s=s.replaceAll('/functions/v1/collection-orders-test-api','/functions/v1/collection-orders-api');
if(s.includes('/functions/v1/collection-orders-test-api'))throw new Error('Live home page still references test collection API');
fs.writeFileSync(p,s);
console.log('Applied live app consistency fixes');
