const fs=require('fs');
for(const p of ['dist/pos.html','dist/pos-test.html']){
  if(!fs.existsSync(p))continue;
  let s=fs.readFileSync(p,'utf8');
  if(!s.includes('/pos-pc-scanner.js')) s=s.replace('</body>','<script src="/pos-pc-scanner.js"></script>\n</body>');
  s=s.replace('DEXTER\'S TERMINAL','PC TEST · DEXTER\'S TERMINAL');
  fs.writeFileSync(p,s);
}
fs.copyFileSync('web/pos-pc-scanner.js','dist/pos-pc-scanner.js');
