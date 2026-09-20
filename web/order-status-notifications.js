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
        notify('Dexter’s notifications enabled','You’ll now get order updates for accepted, cooking, ready and collected.','dexters-notifications-enabled');
      }else if(p==='denied'){
        try{localStorage.setItem(PROMPT_KEY,'denied')}catch{}
        closePrompt();
      }
    }catch{}
  }

  function showPrompt(){
    if(!authToken()||!('Notification'in window)||Notification.permission!=='default')return;
    if(document.getElementById('dextersNotificationPrompt'))return;
    try{
      if(localStorage.getItem(PROMPT_KEY)==='later')return;
    }catch{}

    const wrap=document.createElement('div');
    wrap.id='dextersNotificationPrompt';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-label','Enable order notifications');
    wrap.style.cssText='position:fixed;left:14px;right:14px;bottom:86px;z-index:99998;max-width:480px;margin:auto;background:#132038;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:16px;box-shadow:0 14px 38px rgba(0,0,0,.38);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    wrap.innerHTML='<div style="display:flex;gap:12px;align-items:flex-start"><img src="'+ICON+'" alt="" style="width:46px;height:46px;object-fit:contain;border-radius:10px;background:#fff"><div style="flex:1"><div style="font-weight:900;font-size:17px;margin-bottom:5px">Enable Dexter’s order updates</div><div style="font-size:13px;line-height:1.4;color:#c4cfdf">Get a phone notification when your order is accepted, cooking, ready and collected.</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px"><button id="dextersNotifyLater" type="button" style="border:0;border-radius:12px;padding:12px;font-weight:800;background:#223454;color:#fff">Not now</button><button id="dextersNotifyEnable" type="button" style="border:0;border-radius:12px;padding:12px;font-weight:900;background:linear-gradient(90deg,#ffd43b,#ff8a00);color:#111">Enable notifications</button></div>';
    document.body.appendChild(wrap);
    document.getElementById('dextersNotifyEnable').onclick=requestNotifications;
    document.getElementById('dextersNotifyLater').onclick=()=>{
      try{localStorage.setItem(PROMPT_KEY,'later')}catch{}
      closePrompt();
    };
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