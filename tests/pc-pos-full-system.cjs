const http=require('http');
const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');

const root=path.resolve('_site');
const requested=process.env.POS_FULL_TEST_URL||'';
let server=null;
const hard=setTimeout(()=>{console.error('FULL SYSTEM TEST TIMEOUT');process.exit(124)},120000);

const MENU=[
 ['Breakfast','Full Scottish Breakfast','£8.50'],['Hot Rolls','Square Sausage Roll','£3.50'],['Cold Rolls','Chicken Mayo Roll','£4.50'],['Toasties','Cheese Toastie','£4.50'],['Paninis','Chicken Panini','£6.00'],['Wraps','Chicken Wrap','£6.50'],['Baked Potatoes','Cheese Baked Potato','£6.00'],['Soups','Lentil Soup','£4.00'],['Street Subs','Chicken Mayo Melt','£6.50'],['Chinese Style','Salt & Chilli Chicken','£9.50'],['Smash Burgers','Classic Smash Burger','£8.50'],['Dirty Soda Bar','Dirty Soda','£3.50']
].map((x,i)=>({name:x[0],items:[{id:'i'+i,name:x[1],description:'Browser test item',price:x[2],in_stock:true}]}));
const MODIFIERS=[
 {menu_item_id:'i1',group_id:'sauce',group_name:'Sauce',required:true,min_select:1,max_select:1,selection_type:'single',group_sort_order:1,option_id:'brown',option_name:'Brown Sauce',price_delta:0,option_sort_order:1},
 {menu_item_id:'i1',group_id:'sauce',group_name:'Sauce',required:true,min_select:1,max_select:1,selection_type:'single',group_sort_order:1,option_id:'tomato',option_name:'Tomato Sauce',price_delta:0,option_sort_order:2}
];
const CUSTOMER={id:'c1',full_name:'Browser Test Customer',customer_name:'Browser Test Customer',phone:'07000000000',email:'browser@example.test',loyalty_code:'TEST123'};
const ROAST={id:'r1',order_number:'SR-TEST',customer_name:'Browser Roast Test',customer_phone:'07000000000',collection_date:'2026-09-20',collection_slot:'13:30',meals:{mixed:1},extras:{},total_pence:1499,paid_pence:0,balance_pence:1499,status:'booked',payment_status:'unpaid'};
const QR_ORDER={id:'qr1',table_number:1,source:'qr',status:'new',total:8.5,items:[{name:'Full Scottish Breakfast',qty:1,unit:8.5}]};
const STAFF_ORDER={id:'st1',table_number:2,source:'staff',status:'accepted',total:6.5,items:[{name:'Chicken Wrap',qty:1,unit:6.5}]};
const COLLECTION={id:'o1',order_number:'C-TEST',status:'pending',customer_name:'Collection Test',customer_phone:'07000000000',collection_time:'12:30',items:[{name:'Chicken Wrap',qty:1,modifiers:['No onion']}],order_notes:'Safe browser test'};

function mime(p){if(p.endsWith('.js'))return'application/javascript';if(p.endsWith('.html'))return'text/html';if(p.endsWith('.json'))return'application/json';if(/\.jpe?g$/i.test(p))return'image/jpeg';return'application/octet-stream'}
async function localUrl(){
 server=http.createServer((req,res)=>{try{let rel=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/, '');if(!rel||rel.endsWith('/'))rel+='index.html';const f=path.resolve(root,rel);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('not found')}res.writeHead(200,{'content-type':mime(f),'cache-control':'no-store'});fs.createReadStream(f).pipe(res)}catch(e){res.writeHead(500);res.end(String(e))}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 return `http://127.0.0.1:${server.address().port}/`;
}
function body(req){try{return JSON.parse(req.postData()||'{}')}catch{return{}}}
function generic(){return{ok:true,orders:[],items:[],customers:[],transactions:[],events:[],calls:[],threads:[],messages:[],suppliers:[],promotions:[],recipes:[],rows:[],entries:[],audits:[],accounts:[],reminders:[],rejection_reasons:['Out of stock','Kitchen closed'],enabled:true,state:{},capacity:{},summary:{},purchase_orders:[]}}
async function installMocks(context){
 await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:'window.QRCode={toCanvas:function(c,u,o,cb){if(cb)cb(null)}};'}));
 await context.route('https://bpnkouymdvcogeaqjmxl.supabase.co/**',async r=>{
  const req=r.request(),u=new URL(req.url()),p=u.pathname,b=body(req),a=b.action||'';let x;
  if(p==='/auth/v1/user')x={id:'browser-user',email:'tester@dexters.test'};
  else if(p.includes('/auth/v1/token'))x={access_token:'browser-test',refresh_token:'browser-refresh',user:{id:'browser-user',email:'tester@dexters.test'}};
  else if(p.includes('loyalty_menu_public'))x=MENU;
  else if(p.includes('loyalty_modifier_public'))x=MODIFIERS;
  else if(p.includes('credit_search_customers'))x=[{id:'credit1',account_id:'credit1',customer_name:CUSTOMER.full_name,full_name:CUSTOMER.full_name,phone:CUSTOMER.phone,email:CUSTOMER.email,balance_pence:2350}];
  else if(p.includes('/rest/v1/profiles'))x=[{role:'manager',full_name:'Browser Test Manager'}];
  else if(p.includes('uber-table-service-pc-test-api')){
   if(p.endsWith('/staff/state'))x={orders:[QR_ORDER,STAFF_ORDER],bill_requests:[{id:'bill1',table_number:1}]};
   else x={ok:true,order:{id:'kds1'},orders:[QR_ORDER,STAFF_ORDER],bill_requests:[]};
  }
  else if(p.includes('collection-orders-test-api'))x=a==='kds_orders'?{orders:[COLLECTION],rejection_reasons:['Out of stock','Kitchen closed']}:a==='status'?{enabled:true}:{ok:true,enabled:b.enabled!==false,orders:[COLLECTION],rejection_reasons:['Out of stock','Kitchen closed']};
  else if(p.includes('sunday-roast-pc-pos'))x=a==='outstanding'?{orders:[]}:a==='list'?{orders:[ROAST]}:a==='customer_search'?{customers:[CUSTOMER]}:{ok:true,order:{...ROAST,...b,id:b.id||'r2'},orders:[]};
  else if(p.includes('pc-pos-xepos-test-api')){
   if(a==='customer_search')x={customers:[CUSTOMER]};
   else if(a==='customer_detail')x={profile:CUSTOMER,credit:{balance_pence:2350},collection_orders:[],sunday_orders:[ROAST],notes:[{note_type:'allergy',note:'TEST ALLERGY WARNING',critical:true}],calls:[],whatsapp:[]};
   else if(a==='inventory_state')x={items:[{id:'ing1',name:'Chicken Breast',unit:'kg',on_hand:2,reorder_level:3,target_level:10,cost_per_unit_pence:500,expiry_date:'2026-09-18',supplier:{id:'s1',name:'Test Supplier'}}],suppliers:[{id:'s1',name:'Test Supplier'}],purchase_orders:[]};
   else if(a==='promotions_list')x={promotions:[]};
   else if(a==='audit_list')x={events:[]};
   else x=generic();
  }
  else if(p.includes('pc-pos-credit-statements-test'))x=a==='search'?{accounts:[{id:'credit1',customer_name:CUSTOMER.full_name,phone:CUSTOMER.phone,email:CUSTOMER.email,balance_pence:2350,credit_limit_pence:5000,payment_reference:'TESTREF',status:'active'}]}:{account:{id:'credit1',customer_name:CUSTOMER.full_name,phone:CUSTOMER.phone,email:CUSTOMER.email,balance_pence:2350,credit_limit_pence:5000,payment_reference:'TESTREF',status:'active'},transactions:[]};
  else if(p.includes('pc-pos-credit-reminders'))x=a==='history'?{reminders:[]}:a==='preview'?{message:'Safe test reminder preview'}:{sent:true};
  else if(p.includes('pc-pos-inventory-auto-test'))x=a==='recipe_list'?{recipes:[]}:{ok:true,ingredients:[]};
  else if(p.startsWith('/rest/v1/'))x=[];
  else x=generic();
  await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)});
 });
}
function fail(msg,extra){throw new Error(msg+(extra?' :: '+JSON.stringify(extra):''))}
async function closeAll(page){await page.evaluate(()=>{document.querySelectorAll('.modal').forEach(m=>{if(m.id==='authGate')return;if(m.id==='simpleModal'||m.id==='modifierModal')m.classList.add('hide');else m.remove()})})}
async function clickId(page,id){const ok=await page.evaluate(id=>{const e=document.getElementById(id);if(!e)return false;e.click();return true},id);if(!ok)fail('Missing button '+id)}
async function waitDialog(page,contains){await page.waitForFunction(t=>[...document.querySelectorAll('.modal')].some(m=>m.id!=='authGate'&&!m.classList.contains('hide')&&(!t||m.innerText.includes(t))),contains||'',{timeout:5000})}
async function openDialogButton(page,id,text){await closeAll(page);await clickId(page,id);await waitDialog(page,text);await closeAll(page)}
async function checkLayout(page,w,h){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(80);const s=await page.evaluate(()=>{const c=document.querySelector('.cart')?.getBoundingClientRect(),m=document.querySelector('.center')?.getBoundingClientRect();return{inner:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,cart:c&&{left:c.left,right:c.right,width:c.width},center:m&&{left:m.left,right:m.right,width:m.width}}});if(s.scroll>s.inner+3||s.body>s.inner+3||!s.cart||s.cart.right>s.inner+3||s.cart.left<0||!s.center||s.center.width<200)fail('Layout is cut off',s);console.log('PASS LAYOUT',w+'x'+h)}

(async()=>{
 const url=requested||await localUrl();
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:768}});
 await installMocks(context);
 const page=await context.newPage();
 const errors=[],failed=[];
 page.on('pageerror',e=>{errors.push(String(e.stack||e.message||e));console.error('PAGEERROR',String(e.message||e))});
 page.on('requestfailed',r=>{failed.push(r.url());console.error('REQUESTFAILED',r.url())});
 page.on('dialog',d=>d.dismiss().catch(()=>{}));
 page.setDefaultTimeout(7000);
 console.log('FULL SYSTEM URL',url);
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>window.DextersPinLogin&&document.getElementById('pcSetupCode'),null,{timeout:8000});
 await page.evaluate(async()=>{S.session={access_token:'browser-test',refresh_token:'browser-refresh',user:{id:'browser-user',email:'tester@dexters.test'}};S.staffRole='manager';document.getElementById('authGate').classList.add('hide');await DextersPinLogin.loadFeatures();await applySession(S.session)});
 await page.waitForFunction(()=>window.__dextersFeatureLoadComplete===true&&Array.isArray(S.cats)&&S.cats.length>=8&&document.querySelectorAll('.pcCatCard').length>=8,null,{timeout:20000});
 await page.waitForTimeout(1800);

 const start=await page.evaluate(()=>({features:document.querySelectorAll('script[data-dexters-feature]').length,expected:DextersPinLogin.FEATURE_SCRIPTS.length,status:document.getElementById('status')?.textContent||'',sections:[...document.querySelectorAll('.pcToolTab')].map(x=>x.textContent.trim()),role:S.staffRole}));
 if(start.features!==start.expected||start.expected<20||!start.status.includes('Dexter’s POS'))fail('Authenticated startup failed',start);
 for(const n of ['Orders','Customers','Sales','Stock','Manage'])if(!start.sections.some(x=>x.startsWith(n)))fail('Missing toolbar section '+n,start.sections);
 console.log('PASS AUTHENTICATED STARTUP',start.features);

 const required=['payBtn','pcCollectionOrdersBtn','pcCollectionToggleBtn','pcHeldOrdersBtn','pcTableOrdersBtn','pcSundayBtn','pcPhoneOrdersBtn','pcTablePlanBtn','pcTimedBtn','pcTableToolsBtn','pcWhatsAppBtn','pcCustomersBtn','pcStatementsBtn','pcReceiptCentreBtn','pcRefundBtn','pcAuditBtn','pcTxnSearchBtn','pcReportsBtn','pcPromoBtn','pcInventoryBtn','pcStockBtn','pcRecipesBtn','pcPurchasingBtn','pcExpiryBtn','pcOfflineQueueBtn','pcDrawerBtn','pcManagerPinBtn','pcDisplayBtn','pcCapacityBtn','pcCloseDayBtn','pcSecurityBtn','pcLockBtn','pcMoneyBtn','pcSalesBtn','pcCashupBtn','retrieveHeldBtn','reloadBtn','clearBtn','noteBtn','customerBtn','holdBtn','openTablesTopBtn','openTablesBtn','qrOrdersBtn','qrCodesBtn','sendBtn','updateBtn','fullBtn','staffBtn'];
 const missing=await page.evaluate(ids=>ids.filter(id=>!document.getElementById(id)),required);if(missing.length)fail('Controls missing',missing);
 console.log('PASS CONTROL INVENTORY',required.length);

 const imageState=await page.evaluate(async()=>{const cards=[...document.querySelectorAll('.pcCatCard')],wraps=[...document.querySelectorAll('.pcCatImage')],spriteImgs=[...document.querySelectorAll('.pcCatImage img')].filter(x=>String(x.getAttribute('src')||'').includes('pc-category-sprite.jpg')),img=await new Promise(resolve=>{const i=new Image();i.onload=()=>resolve({ok:true,w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>resolve({ok:false,w:0,h:0});i.src=new URL('pc-category-sprite.jpg',location.href)+'?full='+Date.now()});return{cards:cards.length,wraps:wraps.length,spriteImgs:spriteImgs.length,img}});if(imageState.cards<8||imageState.wraps!==imageState.cards||imageState.spriteImgs!==imageState.cards||!imageState.img.ok)fail('Category photos failed',imageState);console.log('PASS CATEGORY PHOTOS',imageState.cards);
 await checkLayout(page,1366,768);await checkLayout(page,1024,768);await page.setViewportSize({width:1366,height:768});

 await closeAll(page);await page.locator('.pcCatCard').filter({hasText:'Breakfast'}).click();await page.locator('.item[data-item="i0"]').click();await page.waitForFunction(()=>document.querySelectorAll('#lines .line').length===1);if((await page.locator('#total').textContent())!=='£8.50')fail('Basket total wrong',await page.locator('#total').textContent());console.log('PASS MENU + BASKET');

 await clickId(page,'holdBtn');await page.waitForSelector('.heldRestore');await page.evaluate(()=>document.querySelector('.heldRestore')?.click());await page.waitForFunction(()=>document.querySelectorAll('#lines .line').length===1);await openDialogButton(page,'pcHeldOrdersBtn','No held orders.');console.log('PASS HOLD + RESTORE + HELD ORDERS BUTTON');

 await openDialogButton(page,'noteBtn','Order note');await openDialogButton(page,'customerBtn','Customer details');
 await clickId(page,'reloadBtn');await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('Menu loaded'),null,{timeout:5000});await clickId(page,'updateBtn');await page.waitForFunction(()=>document.getElementById('status')?.textContent.toLowerCase().includes('update'),null,{timeout:3000});console.log('PASS CORE ORDER TOOL BUTTONS');

 await closeAll(page);await clickId(page,'payBtn');await page.waitForSelector('.cashM');await page.evaluate(()=>document.querySelector('.cashM')?.click());await page.waitForSelector('[data-q="exact"]');await page.evaluate(()=>document.querySelector('[data-q="exact"]')?.click());await page.evaluate(()=>document.querySelector('.pcPayConfirm')?.click());await page.waitForTimeout(200);let sales=await page.evaluate(()=>JSON.parse(localStorage.getItem('dexters_pc_pos_sales_v3')||'[]'));if(!sales.some(x=>x.method==='cash'))fail('Cash payment not recorded',sales.slice(0,3));console.log('PASS CASH PAYMENT');

 await page.evaluate(()=>window.pcShowCategories?.());await page.locator('.pcCatCard').filter({hasText:'Hot Rolls'}).click();await page.locator('.item[data-item="i1"]').click();await page.waitForSelector('#modifierModal:not(.hide)');await page.locator('#modifierModal [data-o="brown"]').click();await page.locator('#modAdd').click();await clickId(page,'payBtn');await page.waitForSelector('.cardM');await page.evaluate(()=>document.querySelector('.cardM')?.click());await page.waitForSelector('.pcPayConfirm');await page.evaluate(()=>document.querySelector('.pcPayConfirm')?.click());await page.waitForTimeout(200);sales=await page.evaluate(()=>JSON.parse(localStorage.getItem('dexters_pc_pos_sales_v3')||'[]'));if(!sales.some(x=>x.method==='card'))fail('Card payment not recorded',sales.slice(0,3));console.log('PASS REQUIRED MODIFIER + CARD PAYMENT');

 await page.evaluate(()=>window.pcShowCategories?.());await page.locator('.pcCatCard').filter({hasText:'Breakfast'}).click();await page.locator('.item[data-item="i0"]').click();await clickId(page,'sendBtn');await page.waitForFunction(()=>document.getElementById('status')?.textContent.toLowerCase().includes('sent to kitchen'));console.log('PASS SAFE KDS SEND LINK');

 await closeAll(page);await clickId(page,'pcCustomersBtn');await page.waitForSelector('.pcCustomerCard');if(!(await page.locator('.pcCustomerCard').first().innerText()).includes('Browser Test Customer'))fail('Customer cards did not load');await page.locator('.pcCustomerOpen').first().click();await page.waitForFunction(()=>[...document.querySelectorAll('.modal:not(.hide)')].some(m=>m.innerText.includes('TEST ALLERGY WARNING')));console.log('PASS CUSTOMER CARDS + CUSTOMER 360 + ALLERGY WARNING');

 await closeAll(page);await clickId(page,'pcMoneyBtn');await page.waitForSelector('#pcCreditQ');await page.locator('#pcCreditQ').fill('Browser');await page.locator('#pcCreditSearch').click();await page.waitForSelector('.pcCreditPay');await page.locator('.pcCreditPay').click();await page.locator('#pcDebtAmount').fill('5.00');await page.evaluate(()=>document.querySelector('.pcPayConfirm')?.click());await page.waitForSelector('.cardM');await page.evaluate(()=>document.querySelector('.cardM')?.click());await page.waitForSelector('.pcPayConfirm');await page.evaluate(()=>document.querySelector('.pcPayConfirm')?.click());await page.waitForTimeout(150);const debt=await page.evaluate(()=>JSON.parse(localStorage.getItem('dexters_pc_credit_payments_v3')||'[]'));if(!debt.length||debt[0].mode!=='TEST_ONLY_NO_LIVE_BALANCE_CHANGE')fail('Money Owed test payment unsafe or missing',debt);console.log('PASS MONEY OWED SAFE PAYMENT');

 await closeAll(page);await clickId(page,'pcSundayBtn');await page.waitForSelector('#srLiveModal:not(.srHide)');await page.waitForSelector('#srCustomerQuery');await page.locator('#srCustomerQuery').fill('Browser');await page.locator('#srCustomerGo').click();await page.waitForSelector('.srCustomerPick');await page.locator('.srCustomerPick').first().click();const roastText=await page.locator('#srLiveModal').innerText();for(const t of ['Roast Chicken Dinner','Roast Beef Dinner','Adult Mixed Roast Dinner',"Kids' Roast Chicken Dinner","Kids' Roast Beef Dinner",'Kids Mixed Roast Dinner','Extra Yorkshire Pudding','Extra Gravy','Extra Stuffing','Extra Roast Potatoes','Extra Chicken','Extra Beef'])if(!roastText.includes(t))fail('Sunday Roast option missing '+t);await page.locator('[data-sr-plus="meals:mixed"]').click();await page.locator('[data-sr-plus="extras:gravy"]').click();if((await page.locator('#srTotal').textContent())!=='£15.99')fail('Sunday Roast total wrong',await page.locator('#srTotal').textContent());console.log('PASS SUNDAY ROAST FULL OPTIONS + EXTRAS');

 await closeAll(page);await clickId(page,'pcCollectionOrdersBtn');await waitDialog(page,'C-TEST');await page.locator('.collectionOpen').first().click();await page.waitForSelector('.collectionAccept');for(const sel of ['.collectionAccept','.collectionAmend','.collectionReject'])if(!(await page.locator(sel).count()))fail('Collection order action missing '+sel);console.log('PASS COLLECTION INBOX + ACCEPT/AMEND/REJECT CONTROLS');

 await closeAll(page);await clickId(page,'qrOrdersBtn');await waitDialog(page,'QR · Inside Table 1');await closeAll(page);await clickId(page,'openTablesTopBtn');await waitDialog(page,'Inside Table 2');await closeAll(page);await clickId(page,'openTablesBtn');await waitDialog(page,'Inside Table 2');console.log('PASS QR + OPEN TABLE LINKS');

 await closeAll(page);await clickId(page,'qrCodesBtn');await waitDialog(page,'Inside Table 1');await page.waitForFunction(()=>[...document.querySelectorAll('.modal:not(.hide)')].some(m=>m.innerText.includes('Bar Chair 3')));console.log('PASS TABLE QR CODES');

 const modalButtons=[
  ['pcPhoneOrdersBtn',null],['pcTablePlanBtn',null],['pcTimedBtn',null],['pcTableToolsBtn',null],['pcWhatsAppBtn',null],['pcStatementsBtn','Money Owed'],['pcReceiptCentreBtn',null],['pcRefundBtn',null],['pcAuditBtn',null],['pcTxnSearchBtn',null],['pcReportsBtn',null],['pcPromoBtn',null],['pcInventoryBtn',null],['pcStockBtn',null],['pcRecipesBtn','Ingredient Recipes'],['pcPurchasingBtn','Supplier Purchase Orders'],['pcExpiryBtn','Expiry'],['pcOfflineQueueBtn',null],['pcCapacityBtn',null],['pcCloseDayBtn',null],['pcSecurityBtn','Staff Security'],['pcSalesBtn',null],['pcCashupBtn',null],['pcManagerPinBtn',null],['pcTableOrdersBtn','Table Orders']
 ];
 for(const [id,text] of modalButtons){await openDialogButton(page,id,text)}
 console.log('PASS MAJOR MODULE BUTTONS',modalButtons.length);

 const handlers=await page.evaluate(ids=>ids.filter(id=>{const e=document.getElementById(id);return !e||typeof e.onclick!=='function'}),['pcCollectionToggleBtn','pcDrawerBtn','pcDisplayBtn','pcLockBtn','clearBtn','fullBtn','staffBtn']);if(handlers.length)fail('Direct-action buttons are not linked',handlers);console.log('PASS DIRECT-ACTION BUTTON LINKS');

 await clickId(page,'pcCollectionToggleBtn');await clickId(page,'pcDrawerBtn');await clickId(page,'clearBtn');await clickId(page,'fullBtn');
 await page.evaluate(()=>{const table=document.querySelector('[data-mode="Table"]'),counter=document.querySelector('[data-mode="Counter"]');table?.click();if(S.mode!=='Table')throw Error('Table mode failed');counter?.click();if(S.mode!=='Counter')throw Error('Counter mode failed')});console.log('PASS MODE + CONFIRMATION BUTTONS');

 if(errors.length)fail('Browser page errors',errors);
 const coreFailed=failed.filter(x=>/pos-pc-|pc-category-sprite|pc-pos-test/i.test(x));if(coreFailed.length)fail('Core POS request failures',coreFailed);
 console.log('PASS FULL PC POS SYSTEM',JSON.stringify({url,features:start.features,controls:required.length,moduleButtons:modalButtons.length,pageErrors:errors.length,requestFailures:failed.length}));
 await browser.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}clearTimeout(hard);
})().catch(async e=>{console.error(e);try{if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r))}}catch{}clearTimeout(hard);process.exit(1)});