(()=>{
  const $=id=>document.getElementById(id);
  const CATEGORY_IMAGES={
    'Breakfast':'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=700&q=82',
    'Hot Rolls':'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=700&q=82',
    'Cold Rolls':'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=700&q=82',
    'Toasties':'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=700&q=82',
    'Paninis':'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=700&q=82',
    'Wraps':'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=700&q=82',
    'Baked Potatoes':'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=82',
    'Soups':'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=700&q=82',
    'Hot Meals':'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=82',
    'Street Subs':'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=700&q=82',
    'Chinese Style':'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=700&q=82',
    'Greek Style':'https://images.unsplash.com/photo-1544510808-91bcbee1df55?auto=format&fit=crop&w=700&q=82',
    'Rice Bowls':'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=82',
    'Smash Burgers':'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=82',
    'Chicken Burgers':'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=82',
    'Chicken Tenders':'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=700&q=82',
    'Inferno Chicken Tenders':'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=700&q=82',
    'Loaded Fries':'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=700&q=82',
    'Pizzas':'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=82',
    'Chippy Style':'https://images.unsplash.com/photo-1579208030886-b937da0925dc?auto=format&fit=crop&w=700&q=82',
    'Kids Menu':'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=82',
    'Kids Meals':'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=82',
    'Reaper Box':'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=700&q=82',
    'Beast Box':'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=700&q=82',
    'Waffles':'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=700&q=82',
    'Dirty Soda Bar':'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=82',
    'Cakes & Bakes':'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=82',
    'Milkshakes':'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=700&q=82',
    'Coffee':'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=82',
    'Sauces & Dips':'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=700&q=82',
    'Cans of Juice':'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=82',
    'Sides':'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=700&q=82',
    'Drinks':'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=82',
    'Desserts':'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=82',
    'Meal Deals':'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=82'
  };
  const FALLBACK_IMAGE='https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=82';
  const photo=name=>CATEGORY_IMAGES[name]||FALLBACK_IMAGE;
  let home=true,installed=false;
  const originalRenderItems=window.renderItems;
  const h=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function installCss(){
    if(document.getElementById('pcCategoryCss'))return;
    const s=document.createElement('style');s.id='pcCategoryCss';
    s.textContent=`
      .app,.main,.center,.cart{min-width:0;max-width:100%}.top{overflow:hidden!important;flex-wrap:nowrap!important;min-width:0}.top>*{flex:0 1 auto;min-width:0}.center{overflow-x:hidden!important}
      .main{grid-template-columns:minmax(0,1fr) minmax(340px,380px)!important}.cats{display:none!important}.center{padding:12px 14px!important;overflow:auto!important}.cart{width:100%!important;max-width:100%!important}
      .pcCategoryHeader{display:flex;align-items:center;gap:10px;margin:0 0 12px;min-height:48px}.pcCategoryHeader h2{margin:0;font-size:28px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pcBackBtn,.pcHomeBtn{border:1px solid #294663;border-radius:10px;padding:11px 15px;font-weight:1000;background:#142a44;color:#fff;min-height:44px}.pcHomeBtn{background:#ffd43b;color:#08101d;border-color:#ffd43b}
      .pcCatGrid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;align-content:start;width:100%}
      .pcCatCard{appearance:none;min-width:0;min-height:164px;border:1px solid #294663;color:#fff;border-radius:12px;padding:0;text-align:left;display:flex;flex-direction:column;overflow:hidden;background:#10233a;box-shadow:0 2px 7px #0005;cursor:pointer;touch-action:manipulation}
      .pcCatCard:hover{border-color:#ffd43b;transform:translateY(-1px)}.pcCatCard:active{transform:scale(.985)}
      .pcCatImage{height:108px;width:100%;overflow:hidden;background:#172b43;background-size:cover;border-bottom:1px solid #294663}.pcCatImage img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}
      .pcCatFooter{padding:10px 12px 11px;display:flex;align-items:flex-end;gap:8px;min-height:52px}.pcCatName{font-size:17px;font-weight:1000;line-height:1.05;flex:1}.pcCatCount{font-size:10px;color:#9fb2c8;white-space:nowrap}
      .pcItemsMode{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;width:100%}.pcItemsMode .item{min-width:0!important}
      .pcCustomersModal .box{width:min(1120px,96vw)!important;max-width:1120px!important}.pcCustomersModal #cr{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px!important;margin-top:12px;align-items:stretch}.pcCustomersModal #cr>p{grid-column:1/-1}
      .pcCustomerCard{appearance:none;margin:0!important;min-width:0;min-height:184px!important;background:#10233a!important;border:1px solid #294663!important;border-radius:12px!important;padding:15px!important;color:#fff!important;cursor:pointer;box-shadow:0 2px 7px #0004!important;transition:.15s;display:flex!important;flex-direction:column!important;gap:9px!important}
      .pcCustomerCard:hover{border-color:#ffd43b!important;transform:translateY(-1px)}.pcCustomerCardHead{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}.pcCustomerIdentity{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
      .pcCustomerAvatar{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#203a5d;color:#ffd43b;font-weight:1000;font-size:16px;flex:0 0 46px}.pcCustomerName{font-size:17px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pcCustomerType,.pcCustomerBadge{border-radius:999px;padding:4px 7px;background:#203a5d;color:#ffd43b;font-size:10px;font-weight:1000;white-space:nowrap}.pcCustomerBadge{align-self:flex-start}
      .pcCustomerMeta{font-size:12px;color:#a9bbcd;line-height:1.45}.pcCustomerMetrics{border-top:1px solid #294663;border-bottom:1px solid #294663;display:grid;grid-template-columns:1fr 1fr}.pcCustomerMetrics span{padding:8px 4px;text-align:center;min-width:0}.pcCustomerMetrics span+span{border-left:1px solid #294663}.pcCustomerMetrics b{display:block;color:#fff;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pcCustomerMetrics small{display:block;color:#8298ae;font-size:9px;text-transform:uppercase;margin-top:2px}.pcCustomerCard .co{margin-top:auto!important;width:100%;border:0!important;background:transparent!important;color:#ffd43b!important;text-align:left!important;padding:6px 0 0!important;font-weight:1000!important}
      .pcCustomerDetailModal .box{width:min(1040px,96vw)!important;max-width:1040px!important}.pcCustomerDetailModal .group,.pcCustomerDetailModal .held{border:1px solid #294663!important;background:#10233a!important;border-radius:10px!important}
      @media(max-width:1180px){.main{grid-template-columns:minmax(0,1fr) 300px!important}.pcCatGrid,.pcItemsMode{grid-template-columns:repeat(4,minmax(0,1fr))!important}}
      @media(max-width:760px){.main{grid-template-columns:minmax(0,1fr) 280px!important}.pcCatGrid,.pcItemsMode{grid-template-columns:repeat(4,minmax(0,1fr))!important}.pcCustomersModal #cr{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.pcCustomersModal #cr{grid-template-columns:1fr}.pcCatImage{height:95px}}@media(max-width:1180px){.main{grid-template-columns:minmax(0,1fr) minmax(300px,340px)!important}.pcCatGrid,.pcItemsMode{grid-template-columns:repeat(3,minmax(0,1fr))!important}}@media(max-width:900px){.main{grid-template-columns:minmax(0,1fr) minmax(280px,310px)!important}.pcCatGrid,.pcItemsMode{grid-template-columns:repeat(2,minmax(0,1fr))!important}.top button,.pcToolTab{min-height:46px!important}.pcCatCard{min-height:158px}.pcCatImage{height:102px}}
    `;document.head.appendChild(s);
  }

  function ensureHeader(){let x=$('pcCategoryHeader');if(x)return x;const center=document.querySelector('.center'),search=document.querySelector('.search');if(!center||!search)return null;x=document.createElement('div');x.id='pcCategoryHeader';x.className='pcCategoryHeader';x.innerHTML='<button id="pcBackBtn" class="pcBackBtn" style="display:none">← Categories</button><h2 id="pcCategoryTitle">Categories</h2><button id="pcHomeBtn" class="pcHomeBtn">Categories</button>';center.insertBefore(x,search);$('pcBackBtn').onclick=showHome;$('pcHomeBtn').onclick=showHome;return x}
  function showHome(){if(typeof S==='undefined'||!Array.isArray(S.cats)||!S.cats.length)return false;home=true;const search=$('search');if(search)search.value='';const items=$('items');if($('pcCategoryTitle'))$('pcCategoryTitle').textContent='Categories';if($('pcBackBtn'))$('pcBackBtn').style.display='none';if(!items)return false;items.className='grid pcCatGrid';items.innerHTML=S.cats.map((c,i)=>{const count=(c.items||[]).filter(v=>v.in_stock!==false).length;return '<button class="pcCatCard" data-pc-index="'+i+'"><div class="pcCatImage"><img src="'+h(photo(c.name))+'" alt="" referrerpolicy="no-referrer"></div><div class="pcCatFooter"><div class="pcCatName">'+h(c.name)+'</div><div class="pcCatCount">'+count+' item'+(count===1?'':'s')+'</div></div></button>'}).join('');items.querySelectorAll('[data-pc-index]').forEach(b=>b.onclick=()=>openCategory(S.cats[Number(b.dataset.pcIndex)]?.name));return true}
  function openCategory(name){if(!name)return;home=false;S.cat=name;const search=$('search');if(search)search.value='';if($('pcCategoryTitle'))$('pcCategoryTitle').textContent=name;if($('pcBackBtn'))$('pcBackBtn').style.display='inline-block';const items=$('items');if(items)items.className='grid pcItemsMode';if(typeof originalRenderItems==='function')originalRenderItems()}
  function searchChanged(){const q=($('search')?.value||'').trim();if(!q){home?showHome():openCategory(S.cat);return}home=false;if($('pcCategoryTitle'))$('pcCategoryTitle').textContent='Search results';if($('pcBackBtn'))$('pcBackBtn').style.display='inline-block';const items=$('items');if(items)items.className='grid pcItemsMode';if(typeof originalRenderItems==='function')originalRenderItems()}
  const initials=n=>String(n||'C').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'C';
  function customerFacts(card,btn,name){const raw=card.innerText.replace(btn?.innerText||'','').replace(name,'').trim().replace(/\n+/g,' '),parts=raw.split('·').map(x=>x.trim()).filter(Boolean),phone=parts[0]||'',lp=parts.find(x=>/^Loyalty\b/i.test(x))||'';return{phone,loyalty:lp.replace(/^Loyalty\s*/i,'').trim()||'—'}}
  function styleCustomerModal(modal){const title=modal.querySelector('.box h2')?.textContent?.trim()||'';if(title==='Customers / Loyalty'){modal.classList.add('pcCustomersModal');const out=modal.querySelector('#cr');if(!out)return;out.querySelectorAll(':scope > .held').forEach(card=>{if(card.dataset.passStyled==='1')return;const name=card.querySelector('b')?.textContent?.trim()||'Customer',btn=card.querySelector('.co'),facts=customerFacts(card,btn,name);card.dataset.passStyled='1';card.classList.add('pcCustomerCard');card.innerHTML='';const head=document.createElement('div');head.className='pcCustomerCardHead';head.innerHTML='<div class="pcCustomerIdentity"><div class="pcCustomerAvatar"></div><div class="pcCustomerName"></div></div><span class="pcCustomerType">CUSTOMER</span>';head.querySelector('.pcCustomerAvatar').textContent=initials(name);head.querySelector('.pcCustomerName').textContent=name;card.appendChild(head);if(facts.loyalty&&facts.loyalty!=='—'){const badge=document.createElement('div');badge.className='pcCustomerBadge';badge.textContent='LIVE LOYALTY';card.appendChild(badge)}const meta=document.createElement('div');meta.className='pcCustomerMeta';meta.textContent=facts.phone||'No phone number';card.appendChild(meta);const metrics=document.createElement('div');metrics.className='pcCustomerMetrics';metrics.innerHTML='<span><b></b><small>Loyalty code</small></span><span><b></b><small>Contact</small></span>';metrics.querySelectorAll('b')[0].textContent=facts.loyalty||'—';metrics.querySelectorAll('b')[1].textContent=facts.phone?'Phone':'—';card.appendChild(metrics);if(btn){btn.textContent='Open customer record →';card.appendChild(btn);card.tabIndex=0;card.setAttribute('role','button');card.onclick=e=>{if(e.target===btn||btn.contains(e.target))return;btn.click()};card.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target===card){e.preventDefault();btn.click()}}}})}else if(title.startsWith('Customer ·'))modal.classList.add('pcCustomerDetailModal')}
  function installCustomerObserver(){const scan=()=>document.querySelectorAll('.modal:not(.hide)').forEach(styleCustomerModal);new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,characterData:true});scan()}
  function install(){if(installed)return;installCss();const head=ensureHeader(),search=$('search');if(!head||!search)return;installed=true;const base=window.renderItems;window.renderItems=function(){const q=($('search')?.value||'').trim();if(home&&!q&&typeof S!=='undefined'&&Array.isArray(S.cats)&&S.cats.length){showHome();return}if(typeof base==='function')return base.apply(this,arguments)};search.oninput=searchChanged;window.pcShowCategories=showHome;installCustomerObserver();if(!showHome()){let n=0;const t=setInterval(()=>{n++;if(showHome()||n>120)clearInterval(t)},250)}}
  window.addEventListener('load',install);if(document.readyState!=='loading')install();
})();

(()=>{const st=document.createElement('style');st.textContent=".main{grid-template-columns:minmax(0,1fr) 300px!important}#items.pcCatGrid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}#items.pcItemsMode{grid-template-columns:repeat(4,minmax(0,1fr))!important}.pcCatCard{min-width:0!important}.center{overflow-x:hidden!important}@media(max-width:620px){.main{grid-template-columns:minmax(0,1fr) 260px!important}#items.pcCatGrid,#items.pcItemsMode{grid-template-columns:repeat(4,minmax(0,1fr))!important}}";document.head.appendChild(st)})();
