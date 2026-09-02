const fs=require('fs');
fs.mkdirSync('dist/sunday',{recursive:true});
const collection=fs.readFileSync('dist/collection-order-test.html','utf8');
const theme=collection.match(/<style id="collectionSeasonStyles">([\s\S]*?)<\/style>/);
if(!theme)throw Error('Collection theme layer missing');
fs.writeFileSync('dist/sunday/theme.css',theme[1]);
fs.copyFileSync('collection-theme.js','dist/sunday/theme.js');
console.log('Built Sunday Roast live theme from approved collection theme layer');
