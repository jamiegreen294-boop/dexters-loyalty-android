const fs=require('fs');
fs.mkdirSync('dist/sunday',{recursive:true});
for(const file of ['core.js','api.js','customer.js','admin.js','style.css','epson-kds-test.js'])fs.copyFileSync('sunday/'+file,'dist/sunday/'+file);
// Use the same artwork and palette layer as the collection screen.
const collection=fs.readFileSync('dist/collection-order-test.html','utf8');
const theme=collection.match(/<style id="collectionSeasonStyles">([\s\S]*?)<\/style>/);
if(!theme)throw Error('Collection theme layer missing');
fs.writeFileSync('dist/sunday/theme.css',theme[1]);fs.copyFileSync('collection-theme.js','dist/sunday/theme.js');
for(const [source,target]of [['customer.html','sunday-roast-test.html'],['admin.html','sunday-admin-test.html']])fs.copyFileSync('sunday/'+source,'dist/'+target);
// The Sunday KDS test uses the real isolated Sunday test API and the same authenticated KDS session.
fs.copyFileSync('web/kds-order-test.html','dist/sunday-kds-test.html');
// In test only, replace the browser print handler with the existing Epson printer queue.
for(const target of ['dist/kds-order-test.html','dist/sunday-kds-test.html']){
  let kds=fs.readFileSync(target,'utf8');
  kds=kds.replace('</body>','<script src="/sunday/epson-kds-test.js"></script></body>');
  fs.writeFileSync(target,kds);
}
// A single additive link; preserve the approved four-card grid and navigation.
let home=fs.readFileSync('dist/index.html','utf8');
const injection=`<script>document.addEventListener('DOMContentLoaded',()=>{const home=document.getElementById('homePage');if(home&&!document.getElementById('sundayRoastEntry')){const a=document.createElement('a');a.id='sundayRoastEntry';a.className='card';a.href='/sunday-roast-test.html';a.style.cssText='display:block;color:inherit;text-decoration:none;margin:18px 0';a.innerHTML='<span style="font-size:12px;font-weight:800;color:var(--yellow)">SUNDAY COLLECTION · TEST PREVIEW</span><h2 style="margin:8px 0">🍽️ Sunday Roast Pre-Order</h2><p style="margin:0">Chicken, beef & all the trimmings. View Sunday →</p>';const anchor=home.querySelector('.work-deals');if(anchor)anchor.after(a);else home.append(a)}const staff=document.getElementById('staffPage');if(staff){const card=document.createElement('div');card.className='card';card.innerHTML='<h2>Sunday Pre-Orders — test</h2><a href="/sunday-admin-test.html">Open Sunday admin & prep →</a> · <a href="/kds-order-test.html">Open KDS test →</a>';staff.append(card)}});</script>`;
home=home.replace('</body>',injection+'</body>');fs.writeFileSync('dist/index.html',home);
