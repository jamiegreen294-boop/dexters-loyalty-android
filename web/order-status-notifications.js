(function(){
  const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
  const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
  const KEY='dexters-order-status-seen-v1';
  let busy=false,last=0;
  function authToken(){try{const x=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');return x?.access_token||x?.currentSession?.access_token||x?.session?.access_token||''}catch{return''}}
  function seen(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return{}}}
  function save(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}
  function notify(title,body,tag){try{if(!('Notification'in window)||Notification.permission!=='granted')return;if('serviceWorker'in navigator){navigator.serviceWorker.ready.then(r=>r.showNotification(title,{body,tag,renotify:true})).catch(()=>{})}else new Notification(title,{body})}catch{}}
  function msg(status){
    return {
      accepted:['Order accepted','Dexter’s has accepted your order.'],
      preparing:['Your order is cooking','Your Dexter’s order is being prepared now.'],
      ready:['Your order is ready','Your Dexter’s collection order is ready to collect.'],
      rejected:['Order update','Your Dexter’s order needs attention. Open the app for details.'],
      amendment_requested:['Please amend your order','Dexter’s needs you to update part of your order before it can continue.']
    }[status]||null;
  }
  async function poll(){
    if(busy)return;const now=Date.now();if(now-last<12000)return;last=now;
    const token=authToken();if(!token)return;busy=true;
    try{
      const r=await fetch(U+'/rest/v1/collection_orders?select=id,order_number,status,created_at&order=created_at.desc&limit=8',{
        headers:{apikey:K,Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'
      });
      if(!r.ok)return;
      const rows=await r.json();if(!Array.isArray(rows))return;
      const s=seen();
      for(const o of rows){
        const id=String(o.id),st=String(o.status||'');
        if(!s[id]){s[id]=st;continue}
        if(s[id]!==st){
          const m=msg(st);
          if(m)notify(m[0],m[1]+' Order #'+o.order_number,'dexters-order-'+id+'-'+st);
          s[id]=st;
        }
      }
      save(s);
    }catch{}finally{busy=false}
  }
  setTimeout(poll,1500);
  setInterval(poll,15000);
  window.addEventListener('focus',poll);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});
})();