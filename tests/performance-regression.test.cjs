const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('dist/index.html','utf8');

assert.equal((html.match(/id="dextersWorkLayoutActions"/g)||[]).length,1,'work layout must run once');
assert.equal((html.match(/id="dextersWorkLayoutStableActions"/g)||[]).length,0,'stable work layout duplicate must be removed');
assert.equal((html.match(/id="dextersWorkLayoutTest"/g)||[]).length,1,'work layout CSS must remain');
assert(html.includes('function refreshVisible()'),'points refresh must be visibility-gated');
assert(html.includes('setInterval(refreshVisible,15000)'),'points redemption refresh must be throttled');
assert(html.includes("recoveryAppView.classList.contains('hidden')"),'live-order refresh must pause outside the signed-in app');
assert(html.includes('seasonGhost')&&html.includes('seasonBat')&&html.includes('seasonFloat'),'seasonal theme and animations must remain unchanged');

console.log('Performance regression checks passed without changing the seasonal theme');
