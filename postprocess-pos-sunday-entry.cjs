const fs=require('fs');
const source='dist/pos-sunday-test.html';
const target='dist/pos.html';
if(!fs.existsSync(source)) throw new Error('Sunday Roast POS wrapper was not built');
const html=fs.readFileSync(source,'utf8');
if(!html.includes('id="srLaunch"')||!html.includes('New order')||!html.includes('Edit order')) throw new Error('Sunday Roast POS wrapper validation failed');
fs.copyFileSync(source,target);
console.log('Sunday Roast manual entry/edit enabled on live POS entry');
