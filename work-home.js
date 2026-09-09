(function(){
'use strict';
function start(){
 const $=id=>document.getElementById(id),home=$('homePage');
 if(!home||home.classList.contains('work-home'))return;
 const coffee=$('stamps')?.closest('.card'),greet=$('greeting')?.closest('.card'),offers=$('offers')?.closest('.card'),collection=$('collectionOrderLiveCard');
 if(!coffee||!greet||!offers||!collection)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const node=(tag,cls,html)=>{const e=document.createElement(tag);e.className=cls;if(html)e.innerHTML=html;return e};
 const nav=page=>{const b=document.querySelector('#bottomNav [data-page="'+page+'"]');if(b&&!b.classList.contains('hidden'))b.click()};

 document.body.classList.add('season-pride-master-test');

 const top=node('div','master-top','<div class="master-status" id="workCollectionState" role="status">Checking collection…</div><div class="master-tools"><button class="master-icon-btn" type="button" aria-label="Notifications">♢</button><button class="master-icon-btn" type="button" id="masterAccountTop" aria-label="Account">○</button></div>');
 const brand=node('div','master-brand','<strong>DEXTER’S</strong><span>LOYALTY</span><i></i>');
 const scene=node('section','master-scene','<div class="master-scene-copy"><b>Same great food.</b><small>A brighter tomorrow.</small></div><div class="master-welcome">ALL GOOD PEOPLE<br>WELCOME HERE<br>♡</div>');
 const hero=node('section','master-hero','<h1>Proud<br><span>Together</span></h1><p>GREAT FOOD BRINGS PEOPLE TOGETHER</p><a class="master-order" href="/collection-order-test.html">GOOD FOOD, BRIGHTER DAYS →</a><div class="master-food"><div class="master-burger"><i class="b1"></i><i class="l"></i><i class="c"></i><i class="p"></i><i class="b2"></i></div><div class="master-fries"></div></div><div class="master-wave"></div>');

 const loyalty=node('section','master-loyalty','<h2>Your Loyalty</h2><div class="sub">GOOD FOOD GOES FURTHER</div>');
 const loyaltyRow=node('div','master-loyalty-row');
 const stampWrap=node('div','');
 const count=node('div','master-count');
 const stampText=$('stampText'); count.append(stampText);
 const originalMessage=$('stampMessage'); if(originalMessage)originalMessage.hidden=true;
 stampWrap.append($('stamps'),count);
 const points=node('div','master-points','<span id="masterPointsValue">750</span><small>points</small>');
 loyaltyRow.append(stampWrap,points); loyalty.append(loyaltyRow);
 const rewardCard=$('rewardCard'); if(rewardCard)loyalty.append(rewardCard);
 const progress=coffee.querySelector('.progress'); if(progress)loyalty.append(progress);
 const collectionCard=collection; loyalty.append(collectionCard);

 const grid=node('div','');grid.id='workQuickActions';
 grid.innerHTML='<button type="button" class="work-action" id="workSpin"><div class="wi">🎡</div><div><div class="wt">Spin to Win</div><div class="wd" id="workSpinNote">PRIZES, TREATS<br>AND MORE</div></div></button><button type="button" class="work-action" id="workRewards"><div class="wi">🎁</div><div><div class="wt">Your Rewards</div><div class="wd">EXCLUSIVE FOOD,<br>TREATS & OFFERS</div></div></button><button type="button" class="work-action" id="workAgain"><div class="wi">🛍️</div><div><div class="wt">Order Again</div><div class="wd">YOUR FAVOURITES<br>IN A TAP</div></div></button><a class="work-action master-ask" href="https://wa.me/441414735249" target="_blank" rel="noopener noreferrer"><div class="wi">•••</div><div><div class="wt">Ask Dexter</div><div class="wd">FOOD, OFFERS,<br>LOCAL INFO & MORE</div></div></a>';

 const banner=node('section','master-bottom-banner','<h3>A more inclusive tomorrow tastes better</h3><small>PEOPLE · FOOD · COMMUNITY · ALWAYS</small>');

 offers.classList.add('work-deals');
 const usual=node('section','work-usual','<h2 class="work-heading">Your Usual</h2><div class="work-row"><div class="work-grow" id="workUsualBody">Loading your orders…</div><a class="work-small" id="workUsualOrder" href="/collection-order-test.html">View menu</a></div>');
 const current=node('section','work-current','<h2 class="work-heading">Current Order</h2><div class="work-order" id="workCurrentBody">Loading your orders…</div>');

 const rewardsPage=$('qrPage'),personalRewards=$('myIndividualOffersCard'),accountPage=$('accountPage');
 if(rewardsPage&&personalRewards){rewardsPage.append(personalRewards);rewardsPage.classList.add('work-rewards');if(personalRewards.querySelector('h2'))personalRewards.querySelector('h2').textContent='Your Personal Rewards'}

 home.prepend(top,brand,scene,hero,loyalty,grid,banner,offers,usual,current);
 home.classList.add('work-home');
 greet.hidden=true;coffee.hidden=true;
 for(const heading of home.querySelectorAll('.card > h2')){if(heading.textContent.trim()==='💬 Message Dexter’s')heading.closest('.card').hidden=true}

 const staffLink=node('button','master-icon-btn','⚙');staffLink.type='button';staffLink.setAttribute('aria-label','Staff / Admin');staffLink.onclick=()=>nav('staffPage');top.querySelector('.master-tools').append(staffLink);
 const staffNav=$('staffNav');function syncStaff(){staffLink.hidden=!staffNav||staffNav.classList.contains('hidden')}syncStaff();if(staffNav)new MutationObserver(syncStaff).observe(staffNav,{attributes:true,attributeFilter:['class']});
 $('masterAccountTop').onclick=()=>nav('accountPage');

 const homeNav=node('nav','');homeNav.id='workHomeNav';homeNav.setAttribute('aria-label','Customer home navigation');homeNav.innerHTML='<button type="button" id="workNavHome" class="active" aria-current="page"><b>⌂</b>Home</button><a href="/collection-order-test.html"><b>☰</b>Order</a><button type="button" id="workNavRewards"><b>☆</b>Rewards</button><a href="/collection-order-test.html#map"><b>⌖</b>Map</a><button type="button" id="workNavAccount"><b>•••</b>More</button>';document.body.append(homeNav);
 $('workNavHome').onclick=()=>nav('homePage');
 function syncWorkNav(){const rewardsOn=!!rewardsPage&&!rewardsPage.classList.contains('hidden'),accountOn=!!accountPage&&!accountPage.classList.contains('hidden'),homeOn=!rewardsOn&&!accountOn&&!home.classList.contains('hidden');for(const [id,selected]of [['workNavHome',homeOn],['workNavRewards',rewardsOn],['workNavAccount',accountOn]]){const button=$(id);button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')}}
 syncWorkNav();if(rewardsPage)new MutationObserver(syncWorkNav).observe(rewardsPage,{attributes:true,attributeFilter:['class']});if(accountPage)new MutationObserver(syncWorkNav).observe(accountPage,{attributes:true,attributeFilter:['class']});if(home)new MutationObserver(syncWorkNav).observe(home,{attributes:true,attributeFilter:['class']});
 $('workRewards').onclick=()=>nav('qrPage');$('workNavRewards').onclick=()=>nav('qrPage');$('workNavAccount').onclick=()=>nav('accountPage');$('workSpin').onclick=()=>nav('spinPage');

 const spinNav=document.querySelector('#bottomNav [data-page="spinPage"]');
 function syncSpin(){const on=!!spinNav&&!spinNav.classList.contains('hidden');$('workSpin').disabled=!on;$('workSpinNote').innerHTML=on?'PRIZES, TREATS<br>AND MORE':'PROMOTION<br>CURRENTLY OFF'}
 syncSpin();if(spinNav)new MutationObserver(syncSpin).observe(spinNav,{attributes:true,attributeFilter:['class']});

 function syncCollection(){const state=$('collectionLiveState');if(!state)return;$('workCollectionState').textContent=state.textContent.includes('OPEN')?'● Collection open':state.textContent.includes('CLOSED')?'● Collection closed':state.textContent}
 syncCollection();if($('collectionLiveState'))new MutationObserver(syncCollection).observe($('collectionLiveState'),{childList:true,characterData:true,subtree:true});

 function syncPoints(){
   const candidates=['pointsBalance','customerPoints','pointsValue','loyaltyPoints'];
   let value='';
   for(const id of candidates){const el=$(id);if(el){const m=(el.textContent||'').match(/\d[\d,]*/);if(m){value=m[0];break}}}
   if(value)$('masterPointsValue').textContent=value;
 }
 syncPoints();new MutationObserver(syncPoints).observe(document.body,{childList:true,subtree:true,characterData:true});

 const dialog=node('dialog','work-history','<h2>Your previous orders</h2><div id="workHistoryBody"></div><button type="button" id="workCloseHistory">Close</button>');dialog.id='workHistory';home.append(dialog);
 $('workAgain').onclick=()=>{dialog.showModal();refresh()};$('workCloseHistory').onclick=()=>dialog.close();

 let orders=[],request=0,busy=false,owner='',lastRefresh=0;
 function session(){try{const j=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');return j?.currentSession||j?.session||j}catch{return null}}
 function active(){return !$('appView').classList.contains('hidden')&&!home.classList.contains('hidden')&&!document.hidden}
 function statusLabel(s){return ({pending:'Waiting for acceptance',accepted:'Accepted',preparing:'Cooking',ready:'Ready for collection',collected:'Collected',rejected:'Rejected'})[s]||s}
 function render(data){
  orders=data;
  const counts=new Map();for(const o of data.filter(o=>o.status!=='rejected'))for(const i of o.items||[]){const key=JSON.stringify([i.id,i.name,i.modifiers,i.removed]);const v=counts.get(key)||{item:i,count:0,orderId:o.id,itemIndex:o.items.indexOf(i)};v.count+=Number(i.qty)||1;counts.set(key,v)}
  const usual=[...counts.values()].sort((a,b)=>b.count-a.count)[0];
  $('workUsualBody').innerHTML=usual?'<strong>'+esc(usual.item.name)+'</strong><div class="work-desc">Your most ordered item in recent orders.</div>':'<strong>No usual yet</strong>';
  $('workUsualOrder').href=usual?'/collection-order-test.html?reorder='+encodeURIComponent(usual.orderId)+'&usual='+usual.itemIndex:'/collection-order-test.html';
  const o=data.find(o=>['pending','accepted','preparing','ready'].includes(o.status));
  $('workCurrentBody').innerHTML=o?'<strong>Order #'+esc(o.order_number)+'</strong><div class="work-desc">'+esc(statusLabel(o.status))+' · '+esc(o.collection_time)+'</div>':'<strong>No current order</strong>';
  $('workHistoryBody').innerHTML=data.length?data.map(o=>'<div class="work-row"><div><strong>Order #'+esc(o.order_number)+'</strong><div class="work-desc">'+esc(statusLabel(o.status))+'</div><p>'+ (o.items||[]).map(i=>esc(i.qty)+' × '+esc(i.name)).join('<br>')+'</p><a class="work-small" href="/collection-order-test.html?reorder='+encodeURIComponent(o.id)+'">Review this order again</a></div></div>').join(''):'No previous orders yet.';
 }
 function clear(){request++;owner='';busy=false;orders=[];lastRefresh=0;render([]);if(dialog.open)dialog.close()}
 async function refresh(){
  if(document.documentElement.dataset.layoutFixture==='true')return;
  if(!active())return;
  const s=session(),uid=s?.user?.id||'';if(!s?.access_token||!uid){clear();return}
  if(owner!==uid){clear();owner=uid}
  if(busy||Date.now()-lastRefresh<10000)return;busy=true;const version=++request;
  try{const r=await fetch('https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/collection-orders-api',{method:'POST',headers:{apikey:'sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'my_orders'})});const d=await r.json();if(version!==request||session()?.user?.id!==uid)return;if(!r.ok)throw Error('Orders unavailable');render(Array.isArray(d.orders)?d.orders:[]);lastRefresh=Date.now()}
  catch(e){if(version===request)$('workHistoryBody').textContent='Could not load your orders. Close and try again.'}
  finally{if(version===request)busy=false}
 }
 const observeView=()=>{if($('appView').classList.contains('hidden'))clear();else refresh()};new MutationObserver(observeView).observe($('appView'),{attributes:true,attributeFilter:['class']});new MutationObserver(observeView).observe(home,{attributes:true,attributeFilter:['class']});
 window.addEventListener('storage',e=>{if(e.key==='sb-bpnkouymdvcogeaqjmxl-auth-token'){clear();refresh()}});document.addEventListener('visibilitychange',refresh);
 if(document.documentElement.dataset.layoutFixture==='true'){render([])}else{refresh();setInterval(refresh,30000)}
}
function optimiseMotion(){
 document.body.classList.toggle('dexters-motion-paused',document.hidden);
 const fx=document.getElementById('seasonFx');if(!fx)return;
 Array.from(fx.children).slice(6).forEach(n=>n.remove());
}
document.addEventListener('visibilitychange',optimiseMotion);
window.addEventListener('pagehide',()=>document.body.classList.add('dexters-motion-paused'));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{start();optimiseMotion()},{once:true});else{start();optimiseMotion()}
})();