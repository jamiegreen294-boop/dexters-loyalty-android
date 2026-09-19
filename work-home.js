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
 const grid=node('div','');grid.id='workQuickActions';grid.innerHTML='<button type="button" class="work-action" id="workRewards"><div class="wi">🎁</div><div class="wt">Your Rewards</div><div class="wd">Coffee, offers & treats</div></button><button type="button" class="work-action" id="workAgain"><div class="wi">⭐</div><div class="wt">Order Again</div><div class="wd">View your previous orders</div></button><button type="button" class="work-action" id="workSpin"><div class="wi">🎡</div><div class="wt">Spin to Win</div><div class="wd" id="workSpinNote">Play when activated</div></button><button type="button" class="work-action" id="workDexter"><div class="wi">💬</div><div class="wt">Ask Dexter</div><div class="wd">Chat with Dexter here</div></button>';
 const dexter=node('section','work-dexter-chat');dexter.id='workDexterChat';dexter.hidden=true;dexter.innerHTML='<div class="work-dexter-head"><button type="button" id="workDexterHome" class="work-dexter-home" aria-label="Back to Home">🏠 Home</button><div class="work-dexter-title-wrap"><div class="work-heading">Ask Dexter</div><div class="work-dexter-sub">Dexter’s AI · Loyalty App</div></div><button type="button" id="workDexterClose" class="work-dexter-close" aria-label="Close Ask Dexter">×</button></div><div id="workDexterMessages" class="work-dexter-messages" aria-live="polite"></div><div id="workDexterStatus" class="work-dexter-status" role="status"></div><form id="workDexterForm" class="work-dexter-form"><textarea id="workDexterInput" rows="2" maxlength="2000" placeholder="Message Dexter…" aria-label="Message Dexter"></textarea><button type="submit" id="workDexterSend">Send</button></form>';
 let dexterHistory=[];
 function dexterWelcome(){const d=new Date(),m=d.getMonth()+1,day=d.getDate();if(m===9||m===10)return 'Awright 👻 What d’ye need help wi’ in this haunted wee app?';if(m===11||m===12)return 'Awright 🎄 What can Dexter help ye with before Santa starts asking for loyalty points?';if(m===1&&day>=18&&day<=25)return 'Guid day tae ye. Ask away — the Bard’s no answering customer messages, so ye’ve got me.';if(m===2&&day<=14)return 'Awright, Romeo 💘 What can Dexter help ye with?';return 'Awright 👋 What can Dexter help ye with?'}
 function addDexterMessage(role,text){const box=$('workDexterMessages'),msg=node('div','work-dexter-msg '+role);msg.textContent=String(text||'');box.append(msg);box.scrollTop=box.scrollHeight}
 function openDexter(){dexter.hidden=false;if(dexter.dataset.opened!=='1'){dexter.dataset.opened='1';addDexterMessage('assistant',dexterWelcome())}syncWorkNav();setTimeout(()=>{dexter.scrollIntoView({behavior:'smooth',block:'center'});$('workDexterInput').focus()},0)}
 async function sendDexter(text){
  const s=session(),token=s?.access_token;
  if(!token){addDexterMessage('assistant','Ye need tae be signed in so I know this is really your loyalty app.');return}
  const prior=dexterHistory.slice(-8);
  addDexterMessage('user',text);$('workDexterStatus').textContent='Dexter is typing…';$('workDexterSend').disabled=true;$('workDexterInput').disabled=true;
  try{
   const r=await fetch('https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/loyalty-ask-dexter',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({message:text,history:prior})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(data?.error||'Dexter is unavailable just now.');
   const reply=String(data?.reply||'').trim();if(!reply)throw new Error('Dexter didnae manage a reply that time.');
   addDexterMessage('assistant',reply);dexterHistory=[...prior,{role:'user',content:text},{role:'assistant',content:reply}].slice(-8);
  }catch(e){addDexterMessage('assistant',String(e?.message||'Dexter is having a wee technical moment. Try again shortly.'))}
  finally{$('workDexterStatus').textContent='';$('workDexterSend').disabled=false;$('workDexterInput').disabled=false;$('workDexterInput').focus()}
 }
 offers.classList.add('work-deals');offers.querySelector('h2').textContent='Dexter’s Deals';offers.querySelector('h2').className='work-heading';
 const usual=node('section','work-usual','<h2 class="work-heading">Your Usual</h2><div class="work-row"><div class="work-grow" id="workUsualBody">Loading your orders…</div><a class="work-small" id="workUsualOrder" href="/collection-order-test.html">View menu</a></div>');
 const current=node('section','work-current','<h2 class="work-heading">Current Order</h2><div class="work-order" id="workCurrentBody">Loading your orders…</div>');
 // Keep reward rendering and redemption attached to the existing elements.
 const rewardsPage=$('qrPage'),personalRewards=$('myIndividualOffersCard');
 const accountPage=$('accountPage');
 if(rewardsPage&&personalRewards){rewardsPage.append(personalRewards);rewardsPage.classList.add('work-rewards');personalRewards.querySelector('h2').textContent='Your Personal Rewards'}
 home.prepend(top,hero,grid,dexter,offers,usual,current);home.classList.add('work-home');
 for(const heading of home.querySelectorAll('.card > h2')){if(heading.textContent.trim()==='💬 Message Dexter’s')heading.closest('.card').remove()}
 const menuLink=node('button','work-small','Browse the full menu');menuLink.type='button';menuLink.onclick=()=>nav('menuPage');home.append(menuLink);
 const staffLink=node('button','work-small','Staff / Admin');staffLink.type='button';staffLink.onclick=()=>nav('staffPage');top.append(staffLink);const staffNav=$('staffNav');function syncStaff(){staffLink.hidden=!staffNav||staffNav.classList.contains('hidden')}syncStaff();if(staffNav)new MutationObserver(syncStaff).observe(staffNav,{attributes:true,attributeFilter:['class']});
 const homeNav=node('nav','');homeNav.id='workHomeNav';homeNav.setAttribute('aria-label','Customer home navigation');homeNav.innerHTML='<button type="button" id="workNavHome" class="active" aria-current="page"><b>🏠</b>Home</button><a href="/collection-order-test.html"><b>🍔</b>Order</a><button type="button" id="workNavRewards"><b>🎁</b>Rewards</button><button type="button" id="workNavDexter"><b>💬</b>Dexter</button><button type="button" id="workNavAccount"><b>👤</b>Account</button>';document.body.append(homeNav);
 $('workNavHome').onclick=()=>{dexter.hidden=true;nav('homePage');syncWorkNav()};
 function syncWorkNav(){const rewardsOn=!!rewardsPage&&!rewardsPage.classList.contains('hidden'),accountOn=!!accountPage&&!accountPage.classList.contains('hidden'),dexterOn=!dexter.hidden&&!home.classList.contains('hidden')&&!rewardsOn&&!accountOn,homeOn=!dexterOn&&!rewardsOn&&!accountOn&&!home.classList.contains('hidden');for(const [id,selected]of [['workNavHome',homeOn],['workNavRewards',rewardsOn],['workNavDexter',dexterOn],['workNavAccount',accountOn]]){const button=$(id);button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')}}
 syncWorkNav();if(rewardsPage)new MutationObserver(syncWorkNav).observe(rewardsPage,{attributes:true,attributeFilter:['class']});if(accountPage)new MutationObserver(syncWorkNav).observe(accountPage,{attributes:true,attributeFilter:['class']});if(home)new MutationObserver(syncWorkNav).observe(home,{attributes:true,attributeFilter:['class']});
 $('workRewards').onclick=()=>nav('qrPage');$('workNavRewards').onclick=()=>nav('qrPage');$('workNavAccount').onclick=()=>nav('accountPage');$('workSpin').onclick=()=>nav('spinPage');$('workDexter').onclick=openDexter;$('workNavDexter').onclick=openDexter;const closeDexter=()=>{dexter.hidden=true;nav('homePage');syncWorkNav()};$('workDexterHome').onclick=closeDexter;$('workDexterClose').onclick=closeDexter;$('workDexterForm').addEventListener('submit',e=>{e.preventDefault();const input=$('workDexterInput'),text=input.value.trim();if(!text)return;input.value='';sendDexter(text)});
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
 if(document.documentElement.dataset.layoutFixture==='true'){render([])}else{refresh();setInterval(refresh,30000)}
}
function optimiseMotion(){
 document.body.classList.toggle('dexters-motion-paused',document.hidden);
 const fx=document.getElementById('seasonFx');if(!fx)return;
 Array.from(fx.children).slice(8).forEach(n=>n.remove());
 if(fx.dataset.dextersTrimmed!=='1'){
  fx.dataset.dextersTrimmed='1';
  let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;Array.from(fx.children).slice(8).forEach(n=>n.remove())})}).observe(fx,{childList:true});
 }
}
document.addEventListener('visibilitychange',optimiseMotion);
window.addEventListener('pagehide',()=>document.body.classList.add('dexters-motion-paused'));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{start();optimiseMotion()},{once:true});else{start();optimiseMotion()}
})();
