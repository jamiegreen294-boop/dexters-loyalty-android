const fs=require('fs');
const p='dist/app.html';
if(!fs.existsSync(p)) throw new Error('dist/app.html missing');
let s=fs.readFileSync(p,'utf8');
const bad="if(p&&/only staff/admin accounts can perform these actions/i.test(p.textContent||''))p.textContent='Scan the customer QR to add loyalty activity. Rewards and app-only claims are handled automatically by the Dexter’s app.'";
const good="if(p&&String(p.textContent||'').toLowerCase().includes('only staff/admin accounts can perform these actions'))p.textContent='Scan the customer QR to add loyalty activity. Rewards and app-only claims are handled automatically by the Dexter’s app.'";
if(!s.includes(bad)){
  if(s.includes('/only staff/admin accounts can perform these actions/i')) throw new Error('Broken staff regex found in unexpected form');
  console.log('Broken staff regex already absent');
}else{
  s=s.replace(bad,good);
}
if(s.includes('/only staff/admin accounts can perform these actions/i')) throw new Error('Broken staff regex still present');
fs.writeFileSync(p,s);
console.log('Removed invalid staff loyalty regular expression from live app');
