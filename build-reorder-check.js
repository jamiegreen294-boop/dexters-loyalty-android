const fs=require('fs');let html=fs.readFileSync('dist/collection-order-test.html','utf8');
html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
html=html.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'none'">`);
const setup=`
const U='/offline-fixture',K='sample-only',fixtureSession={user:{id:'offline-sample'},access_token:'not-a-real-token'};
const sb={auth:{getSession:async()=>({data:{session:fixtureSession}}),onAuthStateChange:()=>{}}};
let cart={},categories=[{id:'soups',name:'Soups',items:[{id:'soup',name:'Chicken Noodle Soup',price:'£4.00',in_stock:true}]},{id:'chinese',name:'Chinese',items:[{id:'chicken',name:'Salt & Chilli Chicken',price:'£8.00',in_stock:true}]}];
const fixtureRows=[{menu_item_id:'soup',group_id:'roll',group_name:'Choose your roll',required:true,min_select:1,max_select:1,selection_type:'single',option_id:'soft',option_name:'Soft roll',price_delta:0},{menu_item_id:'soup',group_id:'roll',group_name:'Choose your roll',required:true,min_select:1,max_select:1,selection_type:'single',option_id:'crispy',option_name:'Crispy roll',price_delta:.5},{menu_item_id:'chicken',group_id:'side',group_name:'Choose your side',required:true,min_select:1,max_select:1,selection_type:'single',option_id:'chips',option_name:'Chips',price_delta:0},{menu_item_id:'chicken',group_id:'side',group_name:'Choose your side',required:true,min_select:1,max_select:1,selection_type:'single',option_id:'rice',option_name:'Boiled rice',price_delta:0}];
sessionStorage.removeItem('dexters-collection-basket-v3:offline-sample');
const scenario=new URLSearchParams(location.search).get('scenario')||'saved';if(scenario==='stock')categories[1].items[0].in_stock=false;
const fixtureItems=[{id:'soup',price:'£3.50',qty:1,modifiers:scenario==='missing'?[]:['Choose your roll: Crispy roll']},{id:'chicken',price:'£8.00',qty:1,modifiers:['Choose your side: Chips']}];
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderMenu(){}async function loadMenu(){}function loadOrders(){}
async function api(body){if(body.action!=='my_orders')throw Error('Unsupported fixture action');return {orders:[{id:'sample-order',items:fixtureItems}]}}
window.fetch=async(url,options)=>{if(String(url).includes('loyalty_modifier_public'))return {ok:true,json:async()=>String(url).includes('offset=0')?fixtureRows:[]};if(String(url).includes('loyalty_menu_public'))return {ok:true,json:async()=>categories};if(String(url).includes('collection-orders-api')){const body=JSON.parse(options.body);document.getElementById('fixtureResult').textContent='Demo request validated: '+body.items.length+' items. Nothing sent to the kitchen.';return {ok:true,json:async()=>({order:{order_number:'DEMO'}})}}throw Error('Network disabled for this fixture')};
document.getElementById('customerName').value='Sample customer';document.getElementById('customerPhone').value='01410000000';document.getElementById('placeBtn').disabled=false;document.getElementById('availability').textContent='OFFLINE TEST — sample menu';
const message=document.getElementById('msg');new MutationObserver(()=>{if(message.textContent.includes('sent to the kitchen'))message.textContent='Demo order checked successfully. No kitchen order was sent.'}).observe(message,{childList:true,subtree:true});
`;
html=html.replace('<body>',`<body><div class="wrap"><div class="card"><h1>Order Again — offline test</h1><p>Sample customers and prices only. No sign-in, live data or kitchen connection.</p><p><a href="?reorder=sample-order&scenario=saved">Saved choices</a> · <a href="?reorder=sample-order&scenario=missing">Missing roll</a> · <a href="?reorder=sample-order&scenario=stock">Out of stock</a></p><p id="fixtureResult" role="status"></p></div></div>`);
html=html.replace('</body>','<script>'+setup+'</script><script src="/reorder-core.js"></script><script src="/collection-modifiers-live.js"></script></body>');
fs.writeFileSync('dist/reorder-check.html',html);
