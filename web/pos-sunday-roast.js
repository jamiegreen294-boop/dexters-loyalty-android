(()=>{'use strict';
function openSundayRoastTab(){location.href='./pos-sunday-roast-tab.html'}
function install(){
 let b=document.getElementById('pcSundayBtn');
 if(!b){
   b=document.createElement('button');
   b.id='pcSundayBtn';
   b.textContent='Sunday Roast';
   const top=document.querySelector('.top');
   const staff=document.getElementById('staffBtn');
   if(top)top.insertBefore(b,staff||null);
 }
 b.onclick=e=>{e.preventDefault();openSundayRoastTab()};
 window.DextersSundayOrders={open:openSundayRoastTab};
 window.DextersSundayCreate=openSundayRoastTab;
 window.DextersSundayEdit=openSundayRoastTab;
}
window.addEventListener('load',install);
if(document.readyState!=='loading')install();
})();