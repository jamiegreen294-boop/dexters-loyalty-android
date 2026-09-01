const fs=require('fs');
const app=fs.readFileSync('dist/index.html','utf8');
let css='';
// Reuse the authoritative palette, artwork and card treatments only.
for(const id of ['dextersIllustratedThemesV3','dextersHauntedLayoutV4','dextersFestiveLayoutsV5']){
 const style=app.match(new RegExp('<style id="'+id+'">([\\s\\S]*?)</style>'));
 if(!style)throw Error('Missing existing theme '+id);
 for(const rule of style[1].replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  const selector=rule[1].trim();
  if(/^body(?:\.season-[a-z]+|:not\([^)]*\))*$/.test(selector))css+=selector+'{'+rule[2]+'}\n';
  else if(selector.includes(':is(#')&&selector.endsWith(' .card'))css+=selector.replace(/:is\([^)]*\)/,'#collectionPage')+'{'+rule[2]+'}\n';
 }
}
css+=`body{min-height:100vh}body .wrap{max-width:700px}#collectionPage .btn,#collectionPage .qbtn:not(.minus){background:linear-gradient(110deg,var(--yellow),var(--orange));color:#181018}#collectionPage .menu-head,#collectionPage .input,#collectionPage .menu-cat,#collectionPage .status,#collectionPage .qbtn.minus,#collectionBackHome{background:var(--card)!important;color:#fff}#collectionPage .item-price,#collectionPage .menu-head span:last-child{color:var(--yellow)}#collectionPage .card{border-width:1px;border-style:solid}#collectionPage .menu-cat,#collectionPage .input{border-color:color-mix(in srgb,var(--yellow) 28%,transparent)}`;
let page=fs.readFileSync('dist/collection-order-test.html','utf8');
page=page.replace('<div class="wrap">','<div class="wrap" id="collectionPage">');
page=page.replace('</head>','<style id="collectionSeasonStyles">'+css+'</style></head>');
page=page.replace('</body>','<script>'+fs.readFileSync('collection-theme.js','utf8')+'</script></body>');
fs.writeFileSync('dist/collection-order-test.html',page);
