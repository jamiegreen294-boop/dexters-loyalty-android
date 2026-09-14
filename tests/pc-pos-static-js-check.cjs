const fs=require('fs');
const html=fs.readFileSync('_site/index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((m,i)=>({i,tag:m[0].slice(0,m[0].indexOf('>')+1),code:m[1]}))
  .filter(x=>!(/\bsrc\s*=/.test(x.tag))&&x.code.trim());
let bad=0;
for(const s of scripts){
  try{new Function(s.code);console.log('PASS inline script',s.i,'bytes',s.code.length)}
  catch(e){bad++;console.error('FAIL inline script',s.i,e.message);console.error(s.code.slice(0,1200))}
}
const files=fs.readdirSync('_site').filter(f=>f.endsWith('.js'));
for(const f of files){
  const code=fs.readFileSync('_site/'+f,'utf8');
  try{new Function(code);console.log('PASS JS file',f,'bytes',code.length)}
  catch(e){bad++;console.error('FAIL JS file',f,e.message)}
}
if(bad)process.exit(1);
console.log('PASS PC POS JavaScript syntax check');
