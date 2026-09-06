(() => {
 const $=id=>document.getElementById(id);
 const histKey='dextersHubRecentV2', accKey='dextersAccountsTestLedgerV1', sundayKey='dextersSundayHubSummaryV1';
 function arr(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
 function refresh(){
   $('installedMode').textContent=(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)?'YES':'NO';
   $('onlineState').textContent=navigator.onLine?'YES':'NO';
   $('accountsCount').textContent=arr(accKey).length;
   $('historyCount').textContent=arr(histKey).length;
   try{
     const s=JSON.parse(localStorage.getItem(sundayKey)||'null');
     $('sundayCache').textContent=s&&s.date?String(s.dinners||0)+' DINNERS':'NONE';
   }catch{$('sundayCache').textContent='NONE'}
 }
 $('refreshHub').onclick=()=>location.href='/hub-test.html';
 $('clearHistory').onclick=()=>{if(confirm('Clear Hub recent activity on this tablet?')){localStorage.removeItem(histKey);localStorage.removeItem('dextersHubLastApp');localStorage.removeItem('dextersHubLastOpen');$('actionMsg').textContent='Hub recent activity cleared.';refresh()}};
 $('clearSunday').onclick=()=>{if(confirm('Clear the cached Sunday Roast summary from this tablet?')){localStorage.removeItem(sundayKey);$('actionMsg').textContent='Sunday summary cache cleared.';refresh()}};
 $('clearAccounts').onclick=()=>{if(confirm('Clear all Accounts & Receipts TEST ledger entries from this tablet?')){localStorage.removeItem(accKey);$('actionMsg').textContent='Accounts test ledger cleared.';refresh()}};
 window.addEventListener('online',refresh);window.addEventListener('offline',refresh);refresh();
})();