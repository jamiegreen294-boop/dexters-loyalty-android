(function(){
  const U='https://bpnkouymdvcogeaqjmxl.supabase.co';
  const K='sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa';
  const KEY='dexters-order-status-seen-v1';
  const PROMPT_KEY='dexters-order-notification-prompt-v1';
  const ICON='https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/dexters-logo';
  let busy=false,last=0;

  function authToken(){
    try{
      const x=JSON.parse(localStorage.getItem('sb-bpnkouymdvcogeaqjmxl-auth-token')||'null');
      return x?.access_token||x?.currentSession?.access_token||x?.session?.access_token||'';
    }catch{return''}
  }

  function seen(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return{}}}
  function save(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}

  function notify(title,body,tag){
    try{
      if(!('Notification'in window)||Notification.permission!=='granted')return;
      const options={body,tag,renotify:true,icon:ICON,badge:ICON};
      if('serviceWorker'in navigator){
        navigator.serviceWorker.ready.then(r=>r.showNotification(title,options)).catch(()=>{});
      }else{
        new Notification(title,options);
      }
    }catch{}
  }

  function msg(status){
    return {
      accepted:['Order accepted','Dexter’s has accepted your order.'],
      preparing:['Your order is cooking','Your Dexter’s order is being prepared now.'],
      cooking:['Your order is cooking','Your Dexter’s order is being prepared now.'],
      ready:['Your order is ready','Your Dexter’s collection order is ready to collect.'],
      collected:['Order collected','Thanks for collecting your Dexter’s order. See you again soon!'],
      rejected:['Order update','Your Dexter’s order needs attention. Open the app for details.'],
      amendment_requested:['Please amend your order','Dexter’s needs you to update part of your order before it can continue.']
    }[status]||null;
  }

  function closePrompt(){
    const el=document.getElementById('dextersNotificationPrompt');
    if(el)el.remove();
  }

  async function requestNotifications(){
    if(!('Notification'in window))return closePrompt();
    try{
      const p=await Notification.requestPermission();
      if(p==='granted'){
        try{localStorage.setItem(PROMPT_KEY,'enabled')}catch{}
        closePrompt();
        if(window.dextersEnablePush)await window.dextersEnablePush();notify('Dexter’s notifications enabled','You’ll now get order updates for accepted, cooking, ready and collected.','dexters-notifications-enabled');
      }else if(p==='denied'){
        try{localStorage.setItem(PROMPT_KEY,'denied')}catch{}
        closePrompt();
      }
    }catch{}
  }

  function showPrompt(){
    if(window.dextersEnsurePushPrompt)window.dextersEnsurePushPrompt();
  }

  async function poll(){
    if(busy)return;
    const now=Date.now();
    if(now-last<12000)return;
    last=now;
    const token=authToken();
    if(!token)return;
    busy=true;
    try{
      const r=await fetch(U+'/rest/v1/collection_orders?select=id,order_number,status,created_at&order=created_at.desc&limit=8',{
        headers:{apikey:K,Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'
      });
      if(!r.ok)return;
      const rows=await r.json();
      if(!Array.isArray(rows))return;
      const s=seen();
      for(const o of rows){
        const id=String(o.id),st=String(o.status||'').toLowerCase();
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

  setTimeout(()=>{showPrompt();poll()},1500);
  setInterval(poll,15000);
  window.addEventListener('focus',()=>{showPrompt();poll()});
  window.addEventListener('dexters:startup-complete',showPrompt);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){showPrompt();poll()}});
})();