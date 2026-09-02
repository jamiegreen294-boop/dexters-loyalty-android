const fs=require('fs'),assert=require('node:assert/strict');const {JSDOM,VirtualConsole}=require(process.env.DEXTERS_QA_MODULES+'/jsdom');
const fixture='<html><head></head><body><span id="roleBadge">admin</span><div id="appView"><section id="homePage"><div class="work-top">Dexter’s</div></section><section id="qrPage"></section><section id="staffPage"><section class="card hidden" id="customerOffersManagerCard"><h2>Customer Offers</h2><input id="coCustomerSearch"><div id="coCustomers">Original controls</div></section><input id="staffCode"><button id="addStampBtn">Add stamp</button><button id="redeemBtn">Redeem coffee</button><button id="redeemSpinBtn">Redeem prize</button><div id="dxPendingRedemptions">Manual points rewards</div></section></div></body></html>';
async function run(){
 let checks=0,requests=[],confirms=[],answers=[],news={active:true,message:'Coffee morning on 23 September'},customers=[{id:'old',full_name:'Alice Test',last_active:'2020-01-01',stamps:2,points:180},{id:'recent',full_name:'Bob Test',last_active:new Date().toISOString(),stamps:3,points:22},{id:'unknown',full_name:'Unknown Test',last_active:null,points:0}];
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));const dom=new JSDOM(fixture,{url:'https://test.invalid',runScripts:'outside-only',virtualConsole:vc});const w=dom.window,$=id=>w.document.getElementById(id);
 w.localStorage.setItem('sb-bpnkouymdvcogeaqjmxl-auth-token',JSON.stringify({access_token:'fake-test-only'}));w.setInterval=()=>0;w.setTimeout=()=>0;w.alert=()=>{};w.confirm=msg=>{confirms.push(msg);return answers.shift()??false};
 w.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);requests.push({url,b});if(url.includes('customer-offers-admin')){if(b.action==='customers')return {ok:true,json:async()=>({customers})};if(b.action==='delete_customer'){customers=customers.filter(c=>c.id!==b.customer_id);return {ok:true,json:async()=>({ok:true})};}throw Error('Unexpected test customer action');}if(url.includes('app-news-api')){if(b.action==='save')news={active:true,message:b.message};if(b.action==='unpublish')news.active=false;return {ok:true,json:async()=>news};}throw Error('Unexpected URL '+url);};
 const tick=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate);};
 for(const file of ['web/customer-management-live.js','web/news-banner-live.js'])w.eval(fs.readFileSync(file,'utf8'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await tick();
 assert($('dxCustomerManage'));assert($('dxNewsAdminCard'));assert($('dxNewsBanner').textContent.includes('23 September'));checks++;
 assert.equal(w.document.querySelectorAll('#dxNewsBanner').length,1);assert.equal(w.document.querySelectorAll('#dxCustomerManage').length,1);checks++;
 $('dxInactiveCheck').click();assert.equal($('dxInactiveList').querySelectorAll('button').length,1,'Only verified inactive customer eligible');checks++;
 const del=()=> $('dxInactiveList').querySelector('button');answers=[false];del().click();await tick();assert(!requests.some(r=>r.b.action==='delete_customer'));checks++;
 answers=[true,false];del().click();await tick();assert(!requests.some(r=>r.b.action==='delete_customer'));checks++;
 answers=[true,true];del().click();await tick();const calls=requests.filter(r=>r.b.action==='delete_customer');assert.equal(calls.length,1);assert.equal(calls[0].b.customer_id,'old');assert.equal(calls[0].b.min_inactive_days,365);assert.equal(calls[0].b.confirm,true);assert(!$('dxCustomerAZ').textContent.includes('Alice Test'));checks++;
 assert(confirms.some(m=>m.includes('\n\n')&&m.includes('180')),'Readable confirmation with balances');checks++;
 $('dxNewsInput').value='New test alert';$('dxNewsSave').click();await tick();assert.equal(news.message,'New test alert');assert($('dxNewsBanner').textContent.includes('New test alert'));checks++;
 $('dxNewsHide').click();await tick();assert(!$('dxNewsBanner').classList.contains('show'));checks++;
 for(const id of ['staffCode','addStampBtn','redeemBtn','redeemSpinBtn','dxPendingRedemptions'])assert($(id));checks++;
 $('roleBadge').textContent='staff';await tick();assert(!$('dxCustomerManage'));assert(!$('dxNewsAdminCard').classList.contains('hidden'));checks++;
 $('roleBadge').textContent='customer';await tick();assert($('dxNewsAdminCard').classList.contains('hidden'));checks++;
 assert(requests.length<20,'No runaway render/request loop');assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));checks++;
 dom.window.close();console.log('PASS '+checks+' integrated customer deletion, confirmations, news, role and manual-backup UI checks. All requests mocked.');
}
run().catch(e=>{console.error(e);process.exitCode=1});
