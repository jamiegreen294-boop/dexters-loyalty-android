const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
// Safety restore: remove the experimental customer-management loaders so the
// original, proven Customer Offers UI remains fully available in production.
s=s.replace(/<script id="dextersCustomerManagementLoader"[^>]*><\/script>/g,'');
s=s.replace(/<script id="dextersCustomerManagementVisibilityFix"[^>]*><\/script>/g,'');
fs.writeFileSync(p,s);
console.log('Restored original Customer Offers controls; A-Z enhancement disabled pending retest');
