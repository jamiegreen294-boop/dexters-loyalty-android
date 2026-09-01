const fs=require('fs');
fs.mkdirSync('dist/sunday',{recursive:true});
for(const file of ['core.js','store.js','customer.js','admin.js','style.css'])fs.copyFileSync('sunday/'+file,'dist/sunday/'+file);
// Use the same artwork and palette layer as the collection screen.
const collection=fs.readFileSync('dist/collection-order-test.html','utf8');
const theme=collection.match(/<style id="collectionSeasonStyles">([\s\S]*?)<\/style>/);
if(!theme)throw Error('Collection theme layer missing');
fs.writeFileSync('dist/sunday/theme.css',theme[1]);fs.copyFileSync('collection-theme.js','dist/sunday/theme.js');
for(const [source,target]of [['customer.html','sunday-roast-test.html'],['admin.html','sunday-admin-test.html']])fs.copyFileSync('sunday/'+source,'dist/'+target);
// Reuse the existing KDS page and actions; replace only its data adapter for review.
let kds=fs.readFileSync('web/kds-order-test.html','utf8');
kds=kds.replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase\/supabase-js@2"><\/script>/,'');
kds=kds.replace('<script>','<script src="/sunday/core.js"></script><script src="/sunday/store.js"></script><script>'+fs.readFileSync('sunday/kds-adapter.js','utf8')+'</script><script>');
kds=kds.replace('<body>','<body><aside style="padding:20px;background:#243454">ISOLATED SUNDAY TEST · Same KDS renderer, sample data only. <a style="color:#ffd43b" href="/sunday-roast-test.html">Customer</a> · <a style="color:#ffd43b" href="/sunday-admin-test.html">Admin & prep</a></aside>');
kds=kds.replace('</head>','<meta http-equiv="Content-Security-Policy" content="connect-src \'none\';"></head>');
// Existing renderer interpolates plain text. Encode preview user fields at the adapter boundary.
kds=kds.replace('const arr=d.orders||[];',`const safe=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const arr=(d.orders||[]).map(o=>({...o,customer_name:safe(o.customer_name),customer_phone:safe(o.customer_phone),order_notes:safe(o.order_notes)}));`);
fs.writeFileSync('dist/sunday-kds-test.html',kds);
// A single additive link; preserve the approved four-card grid and navigation.
let home=fs.readFileSync('dist/index.html','utf8');
const injection=`<script>document.addEventListener('DOMContentLoaded',()=>{const home=document.getElementById('homePage');if(home&&!document.getElementById('sundayRoastEntry')){const a=document.createElement('a');a.id='sundayRoastEntry';a.className='card';a.href='/sunday-roast-test.html';a.style.cssText='display:block;color:inherit;text-decoration:none;margin:18px 0';a.innerHTML='<span style="font-size:12px;font-weight:800;color:var(--yellow)">SUNDAY COLLECTION · TEST PREVIEW</span><h2 style="margin:8px 0">🍽️ Sunday Roast Pre-Order</h2><p style="margin:0">Chicken, beef & all the trimmings. View Sunday →</p>';const anchor=home.querySelector('.work-deals');if(anchor)anchor.after(a);else home.append(a)}const staff=document.getElementById('staffPage');if(staff){const card=document.createElement('div');card.className='card';card.innerHTML='<h2>Sunday Pre-Orders — test</h2><a href="/sunday-admin-test.html">Open isolated admin & prep preview →</a>';staff.append(card)}});</script>`;
home=home.replace('</body>',injection+'</body>');fs.writeFileSync('dist/index.html',home);
