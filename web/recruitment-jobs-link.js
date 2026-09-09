/* DEXTERS_RECRUITMENT_JOBS_FLOW_V3 */
(function(){
 if(window.__dextersJobsLinkReady)return;window.__dextersJobsLinkReady=true;
 const JOBS='https://jamiegreen294-boop.github.io/dexters-recruitment-test/jobs.html';
 function add(){
   document.getElementById('dextersJobsCard')?.remove();
   const info=document.getElementById('dextersCustomerInfo');
   const links=info?.querySelector('.card p[style*="display:flex"]');
   if(!links||document.getElementById('dextersJobsInfoLink'))return;
   const link=document.createElement('a');
   link.id='dextersJobsInfoLink';link.href=JOBS;
   link.textContent="Jobs at Dexter's";
   links.appendChild(link);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
 setTimeout(add,400);setTimeout(add,1400);
 new MutationObserver(()=>setTimeout(add,0)).observe(document.body,{childList:true,subtree:true});
})();
