(() => {
  'use strict';
  const cfg=window.DEXTERS_CONFIG;
  const SESSION_KEY='dexters.session.v3';
  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
  function headers(){const t=session()?.access_token;return {'Content-Type':'application/json',apikey:cfg.supabasePublishableKey,...(t?{Authorization:`Bearer ${t}`}:{})}}
  function automaticTheme(){const d=new Date(),m=d.getMonth()+1,day=d.getDate();if(m===9||m===10)return'halloween';if(m===11||m===12)return'christmas';if(m===1||(m===2&&day<=15))return'valentine';return'standard'}
  function apply(theme){const allowed=['standard','halloween','christmas','valentine'];const t=allowed.includes(theme)?theme:automaticTheme();document.documentElement.dataset.theme=t;const b=document.getElementById('themeBadge');if(b)b.textContent=t[0].toUpperCase()+t.slice(1)}
  async function refresh(){try{const r=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/app_theme_mode`,{method:'POST',headers:headers(),body:'{}',cache:'no-store'});const raw=await r.text();let mode='auto';try{mode=JSON.parse(raw)}catch{mode=raw.replace(/^"|"$/g,'')}apply(mode==='auto'?automaticTheme():String(mode||'').toLowerCase())}catch{apply(automaticTheme())}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();
