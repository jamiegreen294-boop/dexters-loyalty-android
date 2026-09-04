(function(){
'use strict';
function start(){
 const $=id=>document.getElementById(id),home=$('homePage');
 if(!home||home.classList.contains('work-home'))return;
 const coffee=$('stamps')?.closest('.card'),greet=$('greeting')?.closest('.card'),offers=$('offers')?.closest('.card'),collection=$('collectionOrderLiveCard');
 if(!coffee||!greet||!offers||!collection)return; // Existing home stays usable if markup ever changes.
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const node=(tag,cls,html)=>{const e=document.createElement(tag);e.className=cls;if(html)e.innerHTML=html;return e};
 const nav=page=>{const b=document.querySelector('#bottomNav [data-page="'+page+'"]');if(b&&!b.classList.contains('hidden'))b.click()};
 const top=node('div','work-top','<div class="work-brand">DEXTER’S</div><div class="work-pill" id="workCollectionState" role="status">Checking collection…</div>');
 const hero=node('div','work-hero');hero.id='workCoffeeHero';
 const hello=node('div','work-hello','Welcome back, ');const greeting=$('greeting');greeting.className='';hello.append(greeting);hello.append($('roleBadge'));
 const title=node('h1','');title.id='workCoffeeHeadline';
 const count=node('div','work-count');count.append($('stampText'));count.append(' coffees collected');
 const originalMessage=$('stampMessage');originalMessage.hidden=true;
 hero.append(hello,title,coffee.querySelector('.progress'),count,$('stamps'),originalMessage,$('rewardCard'),collection);
 greet.remove();coffee.remove();
 const grid=node('div','');grid.id='workQuickActions';grid.innerHTML='<button type="button" class="work-action" id="workRewards"><div class="wi">🎁</div><div class="wt">Your Rewards</div><div class="wd">Coffee, offers & treats</div></button><button type="button" class="work-action" id="workAgain"><div class="wi">⭐</div><div class="wt">Order Again</div><div class="wd">View your previous orders</div></button><button type="button" class="work-action" id="workSpin"><div class="wi">🎡</div><div class="wt">Spin to Win</div><div class="wd" id="workSpinNote">Play when activated</div></button><a class="work-action" href="https://wa.me/441414735249" target="_blank" rel="noopener noreferrer"><div class="wi">💬</div><div class="wt">Ask Dexter</div><div class="wd">Chat with us on WhatsApp</div></a>';
 offers.classList.add('work-deals');offers.querySelector('h2').textContent='Dexter’s Deals';offers.querySelector('h2').className='work-heading';
 const usual=node('section','work-usual','<h2 class="work-heading">Your Usual</h2><div class="work-row"><div class="work-grow" id="workUsualBody">Loading your orders…</div><a class="work-small" id="workUsualOrder" href="/collection-order-test.html">View menu</a></div>');
 const current=node('section','work-current','<h2 class="work-heading">Current Order</h2><div class="work-order" id="workCurrentBody">Loading your orders…</div>');
 // Keep reward rendering and redemption attached to the existing elements.
 const rewardsPage=$('qrPage'),personalRewards=$('myIndividualOffersCard');
 if(rewardsPage&&personalRewards){rewardsPage.append(personalRewards);rewardsPage.classList.add('work-rewards');personalRewards.querySelector('h2').textContent='Your Personal Rewards'}
 home.prepend(top,hero,grid,offers,usual,current);home.classList.add('work-home');
 // The quick action and bottom navigation already provide WhatsApp access.
 for(const heading of home.querySelectorAll('.card > h2')){if(heading.textContent.trim()==='💬 Message Dexter’s')heading.closest('.card').remove()}
 const menuLink=node('button','work-small','Browse the full menu');menuLink.type='button';menuLink.onclick=()=>nav('menuPage');home.append(menuLink);
 const staffLink=node('button','work-small','Staff / Admin');staffLink.type='button';staffLink.onclick=()=>nav('staffPage');top.append(staffLink);const staffNav=$('staffNav');function syncStaff(){staffLink.hidden=!staffNav||staffNav.classList.contains('hidden')}syncStaff();if(staffNav)new MutationObserver(syncStaff).observe(staffNav,{attributes:true,attributeFilter:['class']});
 const homeNav=node('nav','');homeNav.id='workHomeNav';homeNav.setAttribute('aria-label','Customer home navigation');homeNav.innerHTML='<button type="button" id="workNavHome" class="active" aria-current="page"><b>🏠</b>Home</button><a href="/collection-order-test.html"><b>🍔</b>Order</a><button type="button" id="workNavRewards"><b>🎁</b>Rewards</button><a href="https://wa.me/441414735249" target="_blank" rel="noopener noreferrer"><b>💬</b>Dexter</a><button type="button" id="workNavAccount"><b>👤</b>Account</button>';document.body.append(homeNav);
 $('workNavHome').onclick=()=>nav('homePage');
 const accountPage=$('accountPage');
 function syncWorkNav(){const rewardsOn=!!rewardsPage&&!rewardsPage.classList.contains('hidden'),accountOn=!!accountPage&&!accountPage.classList.contains('hidden'),homeOn=!rewardsOn&&!accountOn&&!home.classList.contains('hidden');for(const [id,selected]of [['workNavHome',homeOn],['workNavRewards',rewardsOn],['workNavAccount',accountOn]]){const button=$(id);button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')}}
 syncWorkNav();if(rewardsPage)new MutationObserver(syncWorkNav).observe(rewardsPage,{attributes:true,attributeFilter:['class']});if(accountPage)new MutationObserver(syncWorkNav).observe(accountPage,{attributes:true,attributeFilter:['class']});if(home)new MutationObserver(syncWorkNav).observe(home,{attributes:true,attributeFilter:['class']});
 $('workRewards').onclick=()=>nav('qrPage');$('workNavRewards').onclick=()=>nav('qrPage');$('workNavAccount').onclick=()=>nav('accountPage');$('workSpin').onclick=()=>nav('spinPage');
 const spinNav=document.querySelector('#bottomNav [data-page="spinPage"]');
 function syncSpin(){const on=!!spinNav&&!spinNav.classList.contains('hidden');$('workSpin').disabled=!on;$('workSpinNote').textContent=on?'Play your daily spin':'Promotion currently off'}
 syncSpin();if(spinNav)new MutationObserver(syncSpin).observe(spinNav,{attributes:true,attributeFilter:['class']});
 function syncCoffee(){const n=Number(($('stampText').textContent.match(/\d+/)||['0'])[0]);title.textContent=n>=9?'Your FREE COFFEE is ready':(9-n)+' more '+(9-n===1?'coffee':'coffees')+' = FREE COFFEE'}
 syncCoffee();new MutationObserver(syncCoffee).observe($('stampText'),{childList:true,characterData:true,subtree:true});
 function syncCollection(){const state=$('collectionLiveState');$('workCollectionState').textContent=state.textContent.includes('OPEN')?'Collection OPEN':state.textContent.includes('CLOSED')?'Collection CLOSED':state.textContent}
 syncCollection();new MutationObserver(syncCollection).observe($('collectionLiveState'),{childList:true,characterData:true,subtree:true});
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
  $('workUsualBody').innerHTML=usual?'<strong>'+esc(usual.item.name)+'</strong><div class="work-desc">Your most ordered item in recent orders · Check current options in the menu.</div>':'<strong>No usual yet</strong><div class="work-desc">Your favourites will appear as you place orders.</div>';
  $('workUsualOrder').href=usual?'/collection-order-test.html?reorder='+encodeURIComponent(usual.orderId)+'&usual='+usual.itemIndex:'/collection-order-test.html';$('workUsualOrder').textContent=usual?'Review usual':'View menu';
  const o=data.find(o=>['pending','accepted','preparing','ready'].includes(o.status));
  $('workCurrentBody').innerHTML=o?'<strong>Order #'+esc(o.order_number)+'</strong><div class="work-desc">'+esc(statusLabel(o.status))+' · '+esc(o.collection_time)+'</div><div class="work-steps" aria-label="'+esc(statusLabel(o.status))+'">'+[1,2,3].map(i=>'<span class="work-step '+(i<=({pending:0,accepted:1,preparing:2,ready:3}[o.status])?'on':'')+'"></span>').join('')+'</div><a class="work-small" style="margin-top:12px" href="/collection-order-test.html#orders">View order</a>':'<strong>No current order</strong><div class="work-desc">Your next collection order will appear here.</div>';
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
  catch(e){if(version===request){$('workUsualBody').textContent='Your usual is unavailable just now.';$('workCurrentBody').textContent='Order updates are unavailable. Open ordering to check.';$('workHistoryBody').textContent='Could not load your orders. Close and try again.'}}
  finally{if(version===request)busy=false}
 }
 const observeView=()=>{if($('appView').classList.contains('hidden'))clear();else refresh()};new MutationObserver(observeView).observe($('appView'),{attributes:true,attributeFilter:['class']});new MutationObserver(observeView).observe(home,{attributes:true,attributeFilter:['class']});
 window.addEventListener('storage',e=>{if(e.key==='sb-bpnkouymdvcogeaqjmxl-auth-token'){clear();refresh()}});document.addEventListener('visibilitychange',refresh);
 if(document.documentElement.dataset.layoutFixture==='true'){render([])}else{refresh();setInterval(refresh,15000)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
