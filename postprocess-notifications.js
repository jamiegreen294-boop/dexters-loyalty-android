const fs=require('fs');
for(const p of ['dist/index.html','dist/collection-order-test.html']){
  if(!fs.existsSync(p))continue;
  let s=fs.readFileSync(p,'utf8');
  if(!s.includes('persistent-notifications.js'))s=s.replace('</body>','<script src="/persistent-notifications.js"></script></body>');
  fs.writeFileSync(p,s);
}
console.log('Added persistent notification support');
