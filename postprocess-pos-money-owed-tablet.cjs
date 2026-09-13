const fs=require('fs');
const tag='<script src="https://cdn.jsdelivr.net/gh/jamiegreen294-boop/dexters-loyalty-android@test-money-owed-pos/web/pos-money-owed.js?v=20260913"></script>';
for(const path of ['dist/pos-test.html','dist/pos.html']){
  if(!fs.existsSync(path)) continue;
  let html=fs.readFileSync(path,'utf8');
  if(!html.includes('pos-money-owed.js')){
    html=html.replace('</body>',tag+'\n</body>');
    fs.writeFileSync(path,html);
  }
}
console.log('Money Owed loaded into Uber tablet POS');
