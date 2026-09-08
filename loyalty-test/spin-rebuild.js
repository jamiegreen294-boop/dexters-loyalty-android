(() => {
  'use strict';

  const cfg = window.DEXTERS_CONFIG;
  const SESSION_KEY = 'dexters.session.v3';
  const TEST_MODE = true; // no-deployment rebuild: use isolated shared-spin test records

  function getSession(){
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }

  function headers(){
    const token = getSession()?.access_token;
    return {
      'Content-Type':'application/json',
      apikey: cfg.supabasePublishableKey,
      ...(token ? {Authorization:`Bearer ${token}`} : {})
    };
  }

  async function rpc(name, body={}){
    const r = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`, {
      method:'POST', headers:headers(), body:JSON.stringify(body), cache:'no-store'
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = {message:text}; }
    if(!r.ok) throw new Error(data?.message || data?.error || `Spin request failed (${r.status})`);
    return data;
  }

  const names = TEST_MODE ? {
    status:'shared_spin_test_status',
    spin:'shared_spin_test_spin',
    reward:'shared_spin_test_my_reward'
  } : {
    status:'spin_wheel_my_status',
    spin:'spin_wheel_spin',
    reward:null
  };

  function firstRow(v){ return Array.isArray(v) ? (v[0] || {}) : (v || {}); }
  function el(id){ return document.getElementById(id); }

  function ensureRewardCard(){
    const rewards = el('rewardsView');
    if(!rewards || el('spinRewardCard')) return;
    const card = document.createElement('div');
    card.id = 'spinRewardCard';
    card.className = 'card';
    card.innerHTML = '<h2>Spin to Win reward</h2><div id="spinRewardContent" class="stack"><span class="muted">No active Spin to Win reward.</span></div>';
    rewards.prepend(card);
  }

  function showReward(reward){
    ensureRewardCard();
    const box = el('spinRewardContent');
    if(!box) return;
    if(!reward){
      box.innerHTML = '<span class="muted">No active Spin to Win reward.</span>';
      return;
    }
    const item = String(reward.item || reward.prize_name || 'Spin to Win reward');
    const spin = reward.spin_number ? `Spin ${reward.spin_number}` : 'Winning spin';
    box.innerHTML = `<div class="item"><div><b>${item.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</b><small>${spin} · App-only reward</small></div><span class="pill open">Added to your app</span></div><small class="muted">Use this through Dexter's app reward/order flow. No staff Spin QR is required.</small>`;
  }

  async function loadStatus(){
    const message = el('spinMessage');
    const btn = el('spinBtn');
    if(!message || !btn) return;
    try {
      const row = firstRow(await rpc(names.status));
      if(row.has_spun_today){
        btn.disabled = true;
        message.className = 'message';
        message.textContent = row.is_win ? `Today's spin won: ${row.prize_name}. It has been added to your app rewards.` : 'You have already used today\'s spin. Come back tomorrow.';
      } else {
        btn.disabled = false;
        message.className = 'message';
        message.textContent = 'One spin per day. Winning prizes are added to your app automatically.';
      }
      if(TEST_MODE){
        const rewardData = await rpc(names.reward);
        showReward(rewardData?.reward || null);
      }
    } catch(err){
      btn.disabled = true;
      message.className = 'message error';
      message.textContent = err.message || 'Spin to Win is unavailable.';
    }
  }

  async function doSpin(ev){
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const btn = el('spinBtn');
    const message = el('spinMessage');
    if(!btn || !message || btn.disabled) return;
    btn.disabled = true;
    message.className = 'message';
    message.textContent = 'Spinning…';
    try {
      const row = firstRow(await rpc(names.spin));
      if(row.is_win){
        message.className = 'message success';
        message.textContent = `You won ${row.prize_name}! It has been added to your Dexter's app rewards automatically.`;
      } else {
        message.className = 'message';
        message.textContent = 'Not a winner today. Your next spin is tomorrow.';
      }
      if(TEST_MODE){
        const rewardData = await rpc(names.reward);
        showReward(rewardData?.reward || null);
      }
    } catch(err){
      btn.disabled = false;
      message.className = 'message error';
      message.textContent = err.message || 'Could not complete your spin.';
    }
  }

  function bind(){
    ensureRewardCard();
    const btn = el('spinBtn');
    if(btn) btn.addEventListener('click', doSpin, true);

    document.querySelectorAll('[data-action="spin"], [data-nav="rewards"]').forEach(node => {
      node.addEventListener('click', () => setTimeout(loadStatus, 0));
    });

    window.addEventListener('storage', e => { if(e.key === SESSION_KEY) setTimeout(loadStatus, 0); });
    setTimeout(loadStatus, 350);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else bind();
})();
