const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
// The home collection card must check the same live API used by the order page.
s=s.replaceAll('/functions/v1/collection-orders-test-api','/functions/v1/collection-orders-api');
if(s.includes('/functions/v1/collection-orders-test-api'))throw new Error('Live home page still references test collection API');
// Management modules used obsolete navigation keys and stopped checking before
// a customer had time to sign in. Keep their existing server permission checks.
s=s.replace("b.dataset.page==='menu'", "['menu','menuPage'].includes(b.dataset.page)");
s=s.replace("b.dataset.page==='staff'", "['staff','staffPage'].includes(b.dataset.page)");
s=s.replace("setTimeout(init,700);let tries=0;const iv=setInterval(()=>{tries++;if(token()){clearInterval(iv);bootstrap();loadMenuAdmin();loadStaff()}else if(tries>20)clearInterval(iv)},1000);", "setTimeout(init,700);const authView=document.getElementById('appView');if(authView)new MutationObserver(()=>{if(!authView.classList.contains('hidden')&&token())init()}).observe(authView,{attributes:true,attributeFilter:['class']});");
s=s.replace("setTimeout(refresh,1400);setInterval", "const offersAuthView=document.getElementById('appView');if(offersAuthView)new MutationObserver(()=>{if(!offersAuthView.classList.contains('hidden'))refresh()}).observe(offersAuthView,{attributes:true,attributeFilter:['class']});setTimeout(refresh,1400);setInterval");
s=s.replace(/(<script id="dextersStaffStockLoader" src=")[^"]+("[^>]*>)/, '$1/staff-stock-control.js$2');
fs.copyFileSync('web/staff-stock-control.js','dist/staff-stock-control.js');
fs.writeFileSync(p,s);
console.log('Applied live app consistency fixes');
