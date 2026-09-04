const fs=require('fs');
const path=require('path');

function fail(msg){throw new Error('[white-label] '+msg)}
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'))}

const configPath=process.argv[2];
const sourceDir=process.argv[3]||'dist';
const outputDir=process.argv[4]||'dist-white-label';
if(!configPath) fail('Usage: node build-white-label.js <business-config.json> [source-dist] [output-dir]');

const cfg=readJson(configPath);
if(!cfg.id||!cfg.name) fail('Business config must include id and name');
if(!fs.existsSync(sourceDir)) fail('Source dist does not exist. Run the normal app build first.');

fs.rmSync(outputDir,{recursive:true,force:true});
fs.cpSync(sourceDir,outputDir,{recursive:true});

const indexPath=path.join(outputDir,'index.html');
if(!fs.existsSync(indexPath)) fail('Source build has no index.html');

let html=fs.readFileSync(indexPath,'utf8');
const safeConfig=JSON.stringify(cfg).replace(/</g,'\\u003c');
const headInjection=[
  '<script>window.WHITE_LABEL_BUSINESS='+safeConfig+';</script>',
  '<script src="/white-label/tenant-context.js"></script>',
  '<script src="/white-label/runtime-branding.js"></script>'
].join('');

html=html.replace('</head>',headInjection+'</head>');
html=html.replace(/<title>[^<]*<\/title>/i,'<title>'+String(cfg.name).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+'</title>');
fs.writeFileSync(indexPath,html);

const whiteLabelSource=path.join('web','white-label');
const whiteLabelOut=path.join(outputDir,'white-label');
fs.mkdirSync(whiteLabelOut,{recursive:true});
for(const f of ['runtime-branding.js','tenant-context.js']){
  fs.copyFileSync(path.join(whiteLabelSource,f),path.join(whiteLabelOut,f));
}

const manifestPath=path.join(outputDir,'manifest.json');
if(fs.existsSync(manifestPath)){
  const manifest=readJson(manifestPath);
  manifest.name=cfg.name;
  manifest.short_name=cfg.shortName||cfg.name;
  manifest.theme_color=cfg.primaryColor||manifest.theme_color||'#111111';
  manifest.background_color=cfg.backgroundColor||manifest.background_color||'#ffffff';
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
}

fs.writeFileSync(path.join(outputDir,'business-config.json'),JSON.stringify(cfg,null,2));
console.log('[white-label] Built',cfg.name,'into',outputDir);
