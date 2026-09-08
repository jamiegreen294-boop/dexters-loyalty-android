const fs=require('fs');const p='dist/index.html';let s=fs.readFileSync(p,'utf8');
const css=fs.readFileSync('work-home.css','utf8'),js=fs.readFileSync('work-home.js','utf8');
if(s.includes('dextersWorkLayoutTest'))throw Error('Layout was already injected');
// build-web already adds this exact layout. Reuse it instead of running a
// second copy of the same observers, timers and event handlers.
if(s.includes('id="dextersWorkLayoutStable"')&&s.includes('id="dextersWorkLayoutStableActions"')){
  s=s.replace('id="dextersWorkLayoutStable"','id="dextersWorkLayoutTest"')
    .replace('id="dextersWorkLayoutStableActions"','id="dextersWorkLayoutActions"');
}else{
  s=s.replace('</head>','<style id="dextersWorkLayoutTest">'+css+'</style><script id="dextersWorkLayoutActions">'+js+'</script></head>');
}
fs.writeFileSync(p,s);console.log('Applied one reference home arrangement with existing app data and theme colours');
