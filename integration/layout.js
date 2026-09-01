(function(){
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 document.querySelectorAll('[data-integration-page]').forEach(b=>b.onclick=()=>document.querySelector('#bottomNav [data-page="'+b.dataset.integrationPage+'"]')?.click());
 const spin=$('integrationSpin'),spinNav=document.querySelector('#bottomNav [data-page="spinPage"]');
 function syncSpin(){if(spin&&spinNav)spin.hidden=spinNav.classList.contains('hidden')};if(spinNav)new MutationObserver(syncSpin).observe(spinNav,{attributes:true,attributeFilter:['class']});syncSpin();
 const theme=$('integrationTheme');if(theme)theme.onchange=e=>{const mode=e.target.value;document.body.classList.remove('season-halloween','season-christmas','season-valentines');if(mode!=='normal')document.body.classList.add('season-'+mode);if($('seasonBanner'))$('seasonBanner').textContent=mode==='normal'?'':mode[0].toUpperCase()+mode.slice(1)+' layout test';if($('seasonFx'))$('seasonFx').replaceChildren()};
 let owner='';
 function itemLines(items){return(items||[]).map(i=>{const mods=(i.modifiers||[]).map(m=>'<div class="tiny muted">↳ '+esc(m)+'</div>').join('');return '<div><strong>'+esc(i.qty||1)+' × '+esc(i.base_name||i.name||'Item')+'</strong>'+mods+'</div>'}).join('')}
 function orderKey(o){return JSON.stringify((o.items||[]).map(i=>[i.id||i.base_name||i.name,Number(i.qty||1),(i.modifiers||[]).slice().sort()]).sort())}
 function renderHistory(orders){const box=$('integrationHistoryBody');if(!box)return;if(!orders.length){box.innerHTML='<p class="muted">No previous orders yet. Once you order through the app, your recent choices will appear here.</p>';return}
  const counts=new Map();orders.forEach(o=>{const k=orderKey(o);counts.set(k,(counts.get(k)||0)+1)});let usual=orders[0],best=0;orders.forEach(o=>{const n=counts.get(orderKey(o))||0;if(n>best){best=n;usual=o}});
  const usualHtml='<div class="history-row usual-row"><div class="row between"><strong>⭐ Your Usual</strong><span class="pill live">'+best+' order'+(best===1?'':'s')+'</span></div>'+itemLines(usual.items)+'<div class="tiny muted">Review the current menu before sending — unavailable items or changed choices still need checking.</div><a class="btn primary" href="/collection-order-test.html">ORDER YOUR USUAL</a></div>';
  const recent=orders.slice(0,8).map(o=>'<div class="history-row"><strong>Order #'+esc(o.order_number)+'</strong><div class="tiny muted">'+esc(o.collection_time||'Collection')+' · '+esc((o.status||'').toUpperCase())+'</div>'+itemLines(o.items)+'<a class="btn secondary" href="/collection-order-test.html">ORDER AGAIN</a></div>').join('');
  box.innerHTML=usualHtml+'<h3>Recent orders</h3>'+recent;
 }
 async function history(){let session;try{session=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null')}catch(e){}const token=session?.access_token,uid=session?.user?.id||'';if(!token){owner='';if($('integrationHistoryBody'))$('integrationHistoryBody').textContent='Sign in to view your own saved orders.';return}
  owner=uid;try{const r=await fetch('https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/collection-orders-api',{method:'POST',headers:{apikey:'sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'my_orders'})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not load orders');if(owner!==uid)return;const orders=(data.orders||[]).filter(o=>o.status!=='rejected');renderHistory(orders)}catch(e){if($('integrationHistoryBody'))$('integrationHistoryBody').textContent=e.message}}
 if($('integrationHistoryRefresh'))$('integrationHistoryRefresh').onclick=history;
 const app=$('appView');if(app)new MutationObserver(()=>{if(app.classList.contains('hidden')){owner='';if($('integrationHistoryBody'))$('integrationHistoryBody').textContent='Sign in to view your own saved orders.'}else history()}).observe(app,{attributes:true,attributeFilter:['class']});
 history();
})();
