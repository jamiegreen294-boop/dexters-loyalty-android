/* DEXTERS_RECRUITMENT_JOBS_FLOW_V2 */
(function(){
 if(window.__dextersJobsLinkReady)return;window.__dextersJobsLinkReady=true;
 const JOBS='https://jamiegreen294-boop.github.io/dexters-recruitment-test/jobs.html';
 function add(){
   const home=document.getElementById('homePage');
   if(!home||document.getElementById('dextersJobsCard'))return;
   const card=document.createElement('div');
   card.id='dextersJobsCard';card.className='card';
   card.innerHTML='<h2>💼 Jobs at Dexter\'s</h2><p>See current vacancies or send us a general application even when there are no jobs advertised.</p><button type="button" class="btn primary" id="dextersJobsOpen">VIEW JOBS & APPLY</button><p class="tiny muted" style="margin-top:8px">Applications open in the Dexter\'s recruitment portal and are kept separate from your loyalty account.</p>';
   const btn=card.querySelector('#dextersJobsOpen');
   btn.onclick=()=>{window.location.href=JOBS};
   home.appendChild(card);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
 setTimeout(add,400);setTimeout(add,1400);
 new MutationObserver(()=>setTimeout(add,0)).observe(document.body,{childList:true,subtree:true});
})();