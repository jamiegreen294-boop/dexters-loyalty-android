(function(){
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 document.querySelectorAll('[data-integration-page]').forEach(b=>b.onclick=()=>document.querySelector('#bottomNav [data-page="'+b.dataset.integrationPage+'"]').click());
 const spin=$('integrationSpin'),spinNav=document.querySelector('#bottomNav [data-page="spinPage"]');
 function syncSpin(){spin.hidden=spinNav.classList.contains('hidden')};new MutationObserver(syncSpin).observe(spinNav,{attributes:true,attributeFilter:['class']});syncSpin();
 $('integrationTheme').onchange=e=>{const mode=e.target.value;document.body.classList.remove('season-halloween','season-christmas','season-valentines');if(mode!=='normal')document.body.classList.add('season-'+mode);$('seasonBanner').textContent=mode==='normal'?'':mode[0].toUpperCase()+mode.slice(1)+' layout test';$('seasonFx').replaceChildren()};
 let owner='';
 async function history(){let session;try{session=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null')}catch(e){}const token=session?.access_token,uid=session?.user?.id||'';if(!token){owner='';$('integrationHistoryBody').textContent='Sign in to view your own saved orders.';return}
 owner=uid;try{const r=await fetch('https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/collection-orders-api',{method:'POST',headers:{apikey:'sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'my_orders'})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not load orders');if(owner!==uid)return;const orders=(data.orders||[]).filter(o=>o.status!=='rejected');$('integrationHistoryBody').innerHTML=orders.length?orders.map(o=>'<div class="history-row"><strong>Order #'+esc(o.order_number)+'</strong><div>'+((o.items||[]).map(i=>esc(i.qty)+' × '+esc(i.name)).join('<br>'))+'</div><a class="btn secondary" href="/collection-order-test.html">Choose items in current menu</a></div>').join(''):'No previous orders yet.';
 }catch(e){$('integrationHistoryBody').textContent=e.message}}
 $('integrationHistoryRefresh').onclick=history;
 const app=$('appView');new MutationObserver(()=>{if(app.classList.contains('hidden')){owner='';$('integrationHistoryBody').textContent='Sign in to view your own saved orders.'}else history()}).observe(app,{attributes:true,attributeFilter:['class']});
 history();
})();
