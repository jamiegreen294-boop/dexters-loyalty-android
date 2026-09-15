const fs=require('fs');
const src='tests/pc-pos-full-browser-test.cjs';
let s=fs.readFileSync(src,'utf8');
s=s.replace("S.session={access_token:'browser-test',user:{email:'tester@dexters.test'}};","S.staffRole='admin';S.session={access_token:'browser-test',refresh_token:'browser-refresh',user:{id:'browser-user',email:'tester@dexters.test'}};");
s=s.replace("console.log('PASS FEATURE STARTUP',start.features);\nconst ids=", "console.log('PASS FEATURE STARTUP',start.features);await page.waitForTimeout(1800);\nconst ids=");
if(!s.includes("S.staffRole='admin'"))throw new Error('Could not patch full browser test staff session');
if(!s.includes('await page.waitForTimeout(1800)'))throw new Error('Could not patch full browser test delayed controls wait');
fs.writeFileSync(src,s);
require('./pc-pos-full-browser-test.cjs');
