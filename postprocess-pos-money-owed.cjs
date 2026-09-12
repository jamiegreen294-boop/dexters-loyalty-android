const fs=require('fs');
const path='dist/pos-sunday-test.html';
if(!fs.existsSync(path))throw new Error('Missing '+path);
let html=fs.readFileSync(path,'utf8');
const tag='<script src="/pos-money-owed.js?v=20260913"></script>';
if(!html.includes('/pos-money-owed.js')){
  if(!html.includes('</body>'))throw new Error('Could not find </body> in POS wrapper');
  html=html.replace('</body>',tag+'\n</body>');
  fs.writeFileSync(path,html);
}
if(!html.includes('/pos-money-owed.js'))throw new Error('Money Owed script was not injected');
console.log('Money Owed POS panel injected');
