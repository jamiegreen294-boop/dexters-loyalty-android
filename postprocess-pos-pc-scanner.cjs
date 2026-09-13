const fs=require('fs');
for(const p of ['dist/pos.html','dist/pos-test.html']){
  if(!fs.existsSync(p))continue;
  let s=fs.readFileSync(p,'utf8');
  if(!s.includes('/pos-pc-scanner.js')) s=s.replace('</body>','<script src="/pos-pc-scanner.js"></script>\n</body>');
  if(!s.includes('/pos-pc-loyalty-test.js')) s=s.replace('</body>','<script src="/pos-pc-loyalty-test.js"></script>\n</body>');
  if(!s.includes('pc-test-safety')) s=s.replace('</body>',`<script id="pc-test-safety">window.addEventListener('load',()=>{const b=document.getElementById('sendBtn');if(b){b.disabled=true;b.textContent='KDS TEST DISABLED';b.title='PC test safety: live KDS sending is blocked until an isolated test KDS route is connected';b.style.opacity='.55'};});</script>\n</body>`);
  s=s.replace('DEXTER\'S TERMINAL','PC TEST · DEXTER\'S TERMINAL');
  fs.writeFileSync(p,s);
}
fs.copyFileSync('web/pos-pc-scanner.js','dist/pos-pc-scanner.js');
fs.copyFileSync('web/pos-pc-loyalty-test.js','dist/pos-pc-loyalty-test.js');
