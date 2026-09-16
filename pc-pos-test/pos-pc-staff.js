(()=>{
'use strict';
const API=U+'/functions/v1/pc-pos-pin-auth';
const ADMIN_API=U+'/functions/v1/admin-manage-staff';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function json(url,body,auth=true){const h={apikey:K,'Content-Type':'application/json'};if(auth&&S?.session?.access_token)h.Authorization='Bearer '+S.session.access_token;const r=await fetch(url,{method:'POST',headers:h,body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d}
function shell(title,html){if(window.DextersPosModal)return window.DextersPosModal(title,html,false);if(typeof modal==='function')return modal(title,html,false);return null}
async function setPin(user){const pin=prompt('Enter a new 4–6 digit PIN for '+user.full_name);if(!pin)return;if(!/^\d{4,6}$/.test(pin)){alert('PIN must be 4–6 digits.');return}await json(API,{action:'set_pin',user_id:user.id,pin});alert('PIN saved for '+user.full_name)}
async function open(){
 const role=String(S.staffRole||'staff').toLowerCase(),canManage=['admin','manager'].includes(role),isAdmin=role==='admin';
 const d=shell('Staff','<div class="group"><b>'+esc(S.staffName||'Staff')+'</b><br><span style="color:#9eb0c5">'+esc(role)+'</span></div><div class="actions"><button id="staffLock">LOCK POS</button><button id="staffSignOut">SIGN OUT DEVICE</button></div>'+(canManage?'<div class="group"><b>Staff members</b><div id="staffList" style="margin-top:10px">Loading…</div></div>':'')+(isAdmin?'<div class="group"><b>Add staff member</b><input id="sfName" placeholder="Full name"><input id="sfEmail" type="email" placeholder="Email"><input id="sfPhone" placeholder="Phone"><input id="sfPassword" type="password" placeholder="Temporary password (8+ characters)"><select id="sfRole"><option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option></select><input id="sfPin" inputmode="numeric" maxlength="6" placeholder="4–6 digit PIN"><button id="sfAdd" class="confirm">ADD STAFF</button><div id="sfMsg"></div></div>':''));
 if(!d)return;
 d.querySelector('#staffLock').onclick=()=>window.DextersPosLock?.lock();
 d.querySelector('#staffSignOut').onclick=()=>{if(confirm('Sign this device out completely?')){localStorage.removeItem('dexters-pos-session');localStorage.removeItem('dexters_pc_device_secret_v1');location.reload()}};
 if(!canManage)return;
 const list=d.querySelector('#staffList');
 try{const x=await json(API,{action:'staff_list'});const users=x.users||[];list.innerHTML=users.length?users.map(u=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #26364a"><span><b>'+esc(u.full_name)+'</b><br><small>'+esc(u.role)+'</small></span><button data-pin="'+esc(u.id)+'">SET PIN</button></div>').join(''):'No staff found';list.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>setPin(users.find(u=>String(u.id)===b.dataset.pin)))}catch(e){list.textContent=e.message}
 if(!isAdmin)return;
 d.querySelector('#sfAdd').onclick=async()=>{const msg=d.querySelector('#sfMsg'),pin=d.querySelector('#sfPin').value.trim();if(!/^\d{4,6}$/.test(pin)){msg.textContent='PIN must be 4–6 digits.';return}msg.textContent='Adding…';try{const created=await json(ADMIN_API,{action:'create',full_name:d.querySelector('#sfName').value.trim(),email:d.querySelector('#sfEmail').value.trim(),phone:d.querySelector('#sfPhone').value.trim(),password:d.querySelector('#sfPassword').value,role:d.querySelector('#sfRole').value});const id=created.user?.id||created.id;if(!id)throw new Error('Staff account created but no user ID returned');await json(API,{action:'set_pin',user_id:id,pin});msg.textContent='Staff member added. They can now tap their name and enter their PIN.';setTimeout(open,700)}catch(e){msg.textContent=e.message}};
}
function install(){const b=document.getElementById('staffBtn');if(!b)return;b.textContent=S.staffName||S.staffEmail?.split('@')[0]||'Staff';b.onclick=open;b.title='Staff and PIN management'}
window.DextersPosStaff={open};window.addEventListener('load',()=>setTimeout(install,1100));window.addEventListener('dexters-pos-features-ready',()=>setTimeout(install,300));if(document.readyState!=='loading')setTimeout(install,1100);
})();
