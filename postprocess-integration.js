const fs=require('fs');
const csp="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'none'";
for(const file of ['index.html','collection-order-test.html']){
 let s=fs.readFileSync('dist/'+file,'utf8');
 s=s.replace(/<link[^>]+rel="manifest"[^>]*>/g,'').replace(/<script[^>]+src="\/?persistent-notifications.js"[^>]*><\/script>/g,'');
 s=s.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'"><meta name="robots" content="noindex,nofollow"><script src="/integration-guard.js"></script>');
 s=s.replace(/<body([^>]*)>/,'<body$1><aside class="integration-note"><strong>READ-ONLY INTEGRATION TEST</strong><br>Real sign-in and account viewing. Orders, prizes, account edits and staff changes are blocked.<br><a href="/">Test home</a> · <a href="/collection-order-test.html">Test collection menu</a></aside>');
 s=s.replace('</head>','<link rel="stylesheet" href="/integration-layout.css"></head>');
 if(file==='index.html'){
 s=s.replace(/<script src="https:\/\/cdn.jsdelivr.net\/gh\/[^\"]+\/web\/app.js"><\/script>/,'<script src="/integration-app.js"></script>');
 s=s.replace('<div id="homePage" class="page">','<div id="homePage" class="page"><div id="integrationActions"><button class="btn secondary" data-integration-page="qrPage">🎁 Your Rewards</button><button class="btn secondary" onclick="document.getElementById(\'integrationHistory\').scrollIntoView({block:\'center\'})">⭐ Order history</button><button id="integrationSpin" class="btn secondary" data-integration-page="spinPage">🎡 Spin to Win</button><a class="btn secondary" href="https://wa.me/441414735249" target="_blank" rel="noopener noreferrer">💬 Ask Dexter</a></div><div id="integrationHistory" class="card"><h2>Your previous orders</h2><p class="muted">View your saved choices below. Automatic reordering is not enabled in this integration test.</p><button id="integrationHistoryRefresh" class="btn secondary">Refresh my orders</button><div id="integrationHistoryBody"></div></div>');
 s=s.replace('data-page="qrPage">▦<br>My QR','data-page="qrPage">🎁<br>Rewards');
 s=s.replace('data-page="menuPage">🍽️<br>Menu','data-page="menuPage">🍽️<br>Order');
 s=s.replace('<button id="staffNav"','<a href="https://wa.me/441414735249" target="_blank" rel="noopener noreferrer">💬<br>Dexter</a><button id="staffNav"');
 s=s.replace('</aside>','<br><label>Preview theme <select id="integrationTheme"><option value="normal">Standard / off</option><option value="halloween">Halloween</option><option value="christmas">Christmas</option><option value="valentines">Valentine’s</option></select></label><br>Theme selector affects this test page only.</aside>');
 s=s.replace('id="signupBtn"','disabled title="Account creation is disabled in this read-only preview" id="signupBtn"');
 s=s.replace('</body>','<script src="/integration-layout.js"></script></body>');
 }
 fs.writeFileSync('dist/'+file,s);
}
for(const [src,dst] of [['guard.js','guard.js'],['app.js','app.js'],['layout.js','layout.js'],['layout.css','layout.css']])fs.copyFileSync('integration/'+src,'dist/integration-'+dst);
// No installable worker or staff/KDS shortcut can escape the preview guard.
for(const file of fs.readdirSync('dist'))if(file.endsWith('.html')&&!['index.html','collection-order-test.html'].includes(file)||['sw.js','manifest.json','persistent-notifications.js'].includes(file))fs.rmSync('dist/'+file);
console.log('Built guarded integration test; live app source remains intact.');
