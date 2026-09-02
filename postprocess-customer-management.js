const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
const loader='<script id="dextersCustomerManagementLoader" src="/customer-management-live.js"></script>';
if(!s.includes('dextersCustomerManagementLoader'))s=s.replace('</body></html>',loader+'</body></html>');
fs.copyFileSync('web/customer-management-live.js','dist/customer-management-live.js');
if(!s.includes('dextersCustomerManagementLoader'))throw new Error('Customer management loader was not injected');
fs.writeFileSync(p,s);
console.log('Customer A-Z and inactive cleanup integration injected');
