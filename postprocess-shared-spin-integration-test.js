const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
const js=fs.readFileSync('web/shared-spin-integration-test.js','utf8');
if(s.includes('id="sharedSpinIntegrationTest"'))throw new Error('Shared Spin test integration already injected');
s=s.replace('</head>','<script id="sharedSpinIntegrationTest">'+js.replace(/<\/script/gi,'<\\/script')+'</script></head>');
if(!s.includes('shared_spin_test_spin')||!s.includes('shared_spin_test_qr_action'))throw new Error('Shared Spin test router injection failed');
fs.writeFileSync(p,s);
console.log('Injected test-only shared Spin routing before app startup');
