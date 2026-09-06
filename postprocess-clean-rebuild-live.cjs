const fs=require('fs');
const path=require('path');
const src=path.join('web','clean-rebuild');
const dist='dist';
for(const f of ['index.html','config.js','app.js','styles.css','manifest.webmanifest','sw.js','customer-rebuild.js','theme-rebuild.js']){
  fs.copyFileSync(path.join(src,f),path.join(dist,f));
}
console.log('Installed clean loyalty customer shell; existing non-customer routes preserved');
