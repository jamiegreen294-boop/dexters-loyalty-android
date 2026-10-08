(function(){'use strict';
const A=window.SeasonalApi,$=id=>document.getElementById(id),p=new URLSearchParams(location.search),event=p.get('event')==='newyear'?'newyear':'christmas';
const info=event==='christmas'?{title:"Dexter's Christmas Day Pre-Order",eye:'Christmas Day at Dexter’s',intro:'Build your Christmas dinner, choose a collection slot, then pay a deposit or settle in full.',prefix:'XM'}:{title:"Dexter's Hogmanay & New Year Pre-Order",eye:'Hogmanay at Dexter’s',intro:'Build your New Year feast, choose a collection slot, then pay a deposit or settle in full.',prefix:'NY'};
let settings=null,orders=[],busy=false,requestId=crypto.randomUUID(),extras={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'£'+(Number(n||0)/100).toFixed(2),find=(arr,key)=>(arr||[]).find(x=>String(x.key)===String(key));
function cfg(){return settings?.menu_config||{starters:[],mains:[],desserts:[],extras:[],deals:[]}}
function addNone(arr,label){return [{key:'none',name:label,price_pence:0},...(arr||[])]}
function opt(x){return '<option value="'+esc(x.key)+'">'+esc(x.name)+' · '+money(x.price_pence)+'</option>'}
function modes(){
 const d=cfg().deals||[],out=[{key:'single',name:'Build a meal / choose individual courses'}];
 if(event==='christmas'){for(const k of ['adult_three_course','kids_three_course','feast_two','feast_four']){const x=find(d,k);if(x)out.push({key:k,name:x.name+' · '+money(x.price_pence)})}}
 else{for(const k of ['steak_three_course','chicken_three_course','kids_three_course','feast_two','feast_four']){const x=find(d,k);if(x)out.push({key:k,name:x.name+' · '+money(x.price_pence)})}}
 return out;
}
function populate(){
 $('title').textContent=info.title;$('eyebrow').textContent=info.eye;$('intro').textContent=info.intro;
 $('mode').innerHTML=modes().map(x=>'<option value="'+x.key+'">'+esc(x.name)+'</option>').join('');
 $('starter').innerHTML=addNone(cfg().starters,'No starter').map(opt).join('');
 $('main').innerHTML=addNone(cfg().mains,'No main').map(opt).join('');
 $('dessert').innerHTML=addNone(cfg().desserts,'No dessert').map(opt).join('');
 extras={};$('extras').innerHTML=(cfg().extras||[]).map(x=>{extras[x.key]=0;return '<div class="extraRow"><div><strong>'+esc(x.name)+'</strong><br><small>'+money(x.price_pence)+'</small></div><div class="qty"><button type="button" data-extra="'+esc(x.key)+'" data-d="-1">−</button><output id="x-'+esc(x.key)+'">0</output><button type="button" data-extra="'+esc(x.key)+'" data-d="1">+</button></div></div>'}).join('');
 $('slot').innerHTML='<option value="">Choose collection time</option>'+(settings.slots||[]).map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('');
 $('eventDate').textContent='Collection: '+new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(String(settings.collection_date)+'T12:00:00Z'));
 $('deadline').textContent='Pre-order deadline: '+new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(new Date(settings.booking_deadline));
 document.querySelectorAll('[data-extra]').forEach(b=>b.onclick=()=>{const k=b.dataset.extra;extras[k]=Math.max(0,Math.min(20,(extras[k]||0)+Number(b.dataset.d)));$('x-'+k).textContent=extras[k];render()});
 applyMode();render();
}
function fixedMain(mode){
 if(event==='christmas'){if(mode==='adult_three_course')return 'turkey';if(mode==='kids_three_course')return 'kids'}
 else{if(mode==='steak_three_course')return 'steak_pie';if(mode==='chicken_three_course')return 'chicken_haggis_peppercorn';if(mode==='kids_three_course')return 'kids_new_year'}
 return null;
}
function applyMode(){
 const m=$('mode').value,feast=m==='feast_two'||m==='feast_four';$('courseFields').classList.toggle('hidden',feast);
 if(feast)return render();
 const fm=fixedMain(m);if(fm)$('main').value=fm;
 if(m!=='single'){if($('starter').value==='none'&&cfg().starters?.[0])$('starter').value=cfg().starters[0].key;if($('dessert').value==='none'&&cfg().desserts?.[0])$('dessert').value=cfg().desserts[0].key}
 render();
}
function calc(){
 const mode=$('mode').value,c=cfg(),deal=find(c.deals,mode);let total=0,deposit=0,lines=[];
 if(mode==='feast_two'||mode==='feast_four'){if(deal){total=Number(deal.price_pence||0);deposit=Number(deal.deposit_pence||1000);lines.push(deal.name)}}
 else if(mode!=='single'&&deal){total=Number(deal.price_pence||0);deposit=Number(deal.deposit_pence||500);lines.push(deal.name);const st=find(c.starters,$('starter').value),mn=find(c.mains,$('main').value),ds=find(c.desserts,$('dessert').value);if(st)lines.push(st.name);if(mn)lines.push(mn.name);if(ds)lines.push(ds.name)}
 else{const st=find(c.starters,$('starter').value),mn=find(c.mains,$('main').value),ds=find(c.desserts,$('dessert').value);for(const x of [st,mn,ds])if(x){total+=Number(x.price_pence||0);lines.push(x.name)}if(total>0)deposit=Math.min(total,Number(settings.deposit_per_meal_pence||500))}
 for(const [k,q] of Object.entries(extras)){if(!q)continue;const x=find(c.extras,k);if(x){total+=Number(x.price_pence||0)*Number(q);lines.push(q+' × '+x.name)}}
 return{total,deposit:Math.min(total,deposit),lines};
}
function validate(){
 const mode=$('mode').value,st=$('starter').value,mn=$('main').value,ds=$('dessert').value;
 if(mode==='single'&&st==='none'&&mn==='none'&&ds==='none')throw Error('Choose at least one course.');
 if(mode!=='single'&&mode!=='feast_two'&&mode!=='feast_four'){if(st==='none'||ds==='none')throw Error('Choose a starter and dessert for this 3-course deal.');const fm=fixedMain(mode);if(fm&&mn!==fm)throw Error('The main for this deal is fixed.')}
 if(!$('slot').value)throw Error('Choose a collection time.');if($('name').value.trim().length<2)throw Error('Enter your full name.');if(($('phone').value.match(/\d/g)||[]).length<7)throw Error('Enter a valid phone number.');
 const c=calc();if(c.total<=0)throw Error('Choose your pre-order.');return c;
}
function render(){
 if(!settings)return;const c=calc();$('total').textContent=money(c.total);$('deposit').textContent=money(c.deposit);$('summary').innerHTML=c.lines.length?c.lines.map(x=>'<div class="row"><span>'+esc(x)+'</span></div>').join(''):'<p class="muted">Choose your meal to get started.</p>';
}
function payload(){
 const mode=$('mode').value,meal={mode,starter:$('starter').value,main:$('main').value,dessert:$('dessert').value};
 return{request_id:requestId,customer_name:$('name').value.trim(),customer_phone:$('phone').value.trim(),collection_date:settings.collection_date,collection_slot:$('slot').value,meals:(mode==='feast_two'||mode==='feast_four')?[]:[meal],feast_boxes:mode==='feast_two'?{feast_two:1}:mode==='feast_four'?{feast_four:1}:{},extras,notes:'Loyalty app '+info.title};
}
function orderStatus(o){const paid=Number(o.paid_pence||0),bal=Number(o.balance_pence||0);return bal<=0?'Paid in full':paid>0?'Deposit / part payment paid':'Awaiting payment'}
function history(){
 $('history').innerHTML=orders.length?orders.map(o=>'<div class="historyItem"><strong>'+info.prefix+'-'+String(o.order_number).padStart(3,'0')+' · '+esc(String(o.status||'pending').toUpperCase())+'</strong><div>'+esc(o.collection_date)+' at '+esc(o.collection_slot)+'</div><div>Total '+money(o.total_pence)+' · Paid '+money(o.paid_pence)+' · Balance <strong>'+money(o.balance_pence)+'</strong></div><div class="payStatus">'+esc(orderStatus(o))+'</div></div>').join(''):'<p class="muted">Your '+esc(info.title.replace("Dexter's ",""))+' orders will appear here.</p>';
}
async function refresh(){
 try{const s=await A.status(event);settings=s.settings;if(!$('name').value&&s.customer?.full_name)$('name').value=s.customer.full_name;if(!$('phone').value&&s.customer?.phone)$('phone').value=s.customer.phone;
 const h=await A.myOrders(event);orders=h.orders||[];if(!$('mode').options.length)populate();history();const open=!!s.booking_open;$('closed').classList.toggle('hidden',open);$('closed').textContent=open?'':info.title+' is coming soon. Pre-orders are not open yet.';$('review').disabled=!open;render();
 }catch(e){$('message').textContent=e.message;$('review').disabled=true}
}
$('mode').onchange=applyMode;for(const id of ['starter','main','dessert'])$(id).onchange=render;
$('review').onclick=()=>{try{const c=validate();$('confirmError').textContent='';$('reviewBody').innerHTML='<p><strong>'+esc(settings.collection_date)+' at '+esc($('slot').value)+'</strong></p>'+c.lines.map(x=>'<div class="row"><span>'+esc(x)+'</span></div>').join('')+'<div class="row total"><span>Total</span><strong>'+money(c.total)+'</strong></div><div class="row"><span>Deposit</span><strong>'+money(c.deposit)+'</strong></div>';$('paymentChoice').options[0].textContent='Pay deposit now · '+money(c.deposit);$('paymentChoice').options[1].textContent='Pay in full now · '+money(c.total);$('confirmTitle').textContent='Confirm '+(event==='christmas'?'Christmas':'New Year')+' pre-order';$('confirm').showModal()}catch(e){$('message').textContent=e.message}};
$('cancel').onclick=()=>{if(!busy)$('confirm').close()};
$('place').onclick=async()=>{if(busy)return;busy=true;$('place').disabled=true;$('cancel').disabled=true;let created=null;try{validate();created=await A.create(event,payload());const kind=$('paymentChoice').value==='full'?'full':'deposit';const pay=await A.checkout(event,created.order.id,kind);if(!pay.checkout_url)throw Error('Could not start Square payment.');location.href=pay.checkout_url;return}catch(e){$('confirmError').textContent=e.message||'Could not start payment.';if(created?.order?.id)await A.cancelUnpaid(event,created.order.id).catch(()=>{});requestId=crypto.randomUUID();await refresh().catch(()=>{})}finally{busy=false;$('place').disabled=false;$('cancel').disabled=false}};
async function paymentReturn(){const id=String(p.get('square_order')||'');if(p.get('payment')!=='square_success'||!id)return;try{$('message').textContent='Payment received. Confirming securely with Square…';const v=await A.verify(event,id);if(v.verified){const o=v.order,txt=Number(o.balance_pence||0)<=0?'✅ Paid in full — your '+(event==='christmas'?'Christmas':'New Year')+' pre-order is confirmed.':'✅ Deposit paid — your pre-order is confirmed. Remaining balance '+money(o.balance_pence)+'.';$('message').textContent=txt;history()}else{$('message').textContent='Payment received. Waiting for Square confirmation…';setTimeout(paymentReturn,1800)}}catch(e){$('message').textContent=e.message}}
refresh().then(paymentReturn);setInterval(refresh,15000);
})();