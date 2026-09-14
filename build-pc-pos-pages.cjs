const fs=require('fs');
const path=require('path');
const out='_site';
if(!fs.existsSync('dist/pos.html')) throw new Error('dist/pos.html missing - run npm run build first');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
let html=fs.readFileSync('dist/pos.html','utf8');
for(const f of ['pos-pc-v3-addon.js','pos-pc-scanner.js','pos-pc-loyalty-test.js','pos-pc-category-home.js']){
  if(!fs.existsSync('dist/'+f)) throw new Error('Missing '+f);
  fs.copyFileSync('dist/'+f,path.join(out,f));
  html=html.replaceAll('src="/'+f+'"','src="./'+f+'"');
}
html=html.replace('<title>Dexter\'s POS + Table Service</title>','<title>Dexter\'s POS · GitHub Pages Test</title>');
html=html.replace('PC TEST · TABLE SERVICE','PC TEST · GITHUB PAGES');
html=html.replace('</head>','<meta name="robots" content="noindex,nofollow">\n</head>');
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'pos.html'),html);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({build:'pc-pos-github-pages',generatedAt:new Date().toISOString(),branch:'dexters-pos-pc-test-v3'},null,2));
const check=fs.readFileSync(path.join(out,'index.html'),'utf8');
for(const required of ['pos-pc-v3-addon.js','pos-pc-scanner.js','pos-pc-loyalty-test.js','pos-pc-category-home.js','dexters-table-order-pc-test','uber-table-service-pc-test-api']){
  if(!check.includes(required)) throw new Error('GitHub Pages PC POS missing '+required);
}
if(check.includes('src="/pos-pc-')) throw new Error('Root-relative PC POS asset path leaked into GitHub Pages build');
console.log('PASS GitHub Pages PC POS build: category cards, scanner, loyalty and safe table routes present');
