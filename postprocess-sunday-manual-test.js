const fs=require('fs'),path=require('path');
const dist=path.join(__dirname,'dist'),src=path.join(__dirname,'sunday'),out=path.join(dist,'sunday');
fs.mkdirSync(out,{recursive:true});
for(const f of ['staff-manual-test.html','staff-manual-test.js']){
  fs.copyFileSync(path.join(src,f),path.join(out,f));
}
for(const f of ['staff-manual-test.html','staff-manual-test.js']){
  if(!fs.existsSync(path.join(out,f)))throw new Error('Missing manual Sunday staff test file: '+f);
}
console.log('Manual Sunday Roast staff test copied. No live Staff/Admin injection performed.');