(function(){
'use strict';
function removeDuplicateHomeDeals(){
  const home=document.getElementById('homePage');
  if(!home)return;
  const oldIds=['dextersDealsLiveCard','dextersDealsCustomerOffer','dextersDealVisibleFix'];
  oldIds.forEach(id=>{const el=document.getElementById(id);if(el&&home.contains(el))el.remove()});
  [...home.querySelectorAll('.card,.offer')].forEach(card=>{
    if(card.id==='dextersDealsCustomerReward'||card.closest('#rewardsPage,#rewards,#yourRewards,#rewardsList,#rewardList,#rewardCards,#rewardsContainer'))return;
    const h=card.querySelector('h1,h2,h3,h4');
    const text=(h&&h.textContent||'').replace(/\s+/g,' ').trim();
    if(/^🔥?\s*Dexter['’]?s Deals$/i.test(text)||/^Dexter['’]?s Deals$/i.test(text)) card.remove();
  });
}
removeDuplicateHomeDeals();
setTimeout(removeDuplicateHomeDeals,300);
setTimeout(removeDuplicateHomeDeals,1200);
new MutationObserver(()=>setTimeout(removeDuplicateHomeDeals,0)).observe(document.body,{childList:true,subtree:true});
})();
