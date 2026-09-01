(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SundayRoast=factory()})(this,function(){
'use strict';
const meals={
 chicken:{name:'Roast Chicken Dinner',price:1095,group:'adult'},
 beef:{name:'Roast Beef Dinner',price:1295,group:'adult'},
 kids_chicken:{name:"Kids' Roast Chicken Dinner",price:695,group:'kids'},
 kids_beef:{name:"Kids' Roast Beef Dinner",price:795,group:'kids'}
};
const extras={yorkshire:{name:'Extra Yorkshire Pudding',price:75},gravy:{name:'Extra Gravy',price:100},stuffing:{name:'Extra Stuffing',price:100},potatoes:{name:'Extra Roast Potatoes',price:150},chicken:{name:'Extra Chicken',price:250},beef:{name:'Extra Beef',price:350}};
const included=['Crispy roast potatoes','Creamy mashed potatoes','Mashed turnip','Carrots','Garden peas','Broccoli','Yorkshire pudding','Sage & onion stuffing','Rich gravy'];
const money=p=>'£'+(p/100).toFixed(2);
function london(now=new Date()){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);const x=Object.fromEntries(p.map(v=>[v.type,v.value]));return `${x.year}-${x.month}-${x.day}T${x.hour}:${x.minute}`}
function validSunday(date){const d=new Date(date+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(d)&&d.toISOString().slice(0,10)===date&&d.getUTCDay()===0}
function cutoff(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-2);return d.toISOString().slice(0,10)+'T20:00'}
function nextSunday(now=new Date()){const date=london(now).slice(0,10),d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+((7-d.getUTCDay())%7||7));return d.toISOString().slice(0,10)}
function validateConfig(c){if(!validSunday(c.date))throw Error('Choose a Sunday collection date.');if(!['auto','open','closed'].includes(c.override))throw Error('Invalid ordering mode.');for(const k of Object.keys(meals))if(!Number.isInteger(c.stock[k])||c.stock[k]<0||c.stock[k]>10000)throw Error('Availability must be a whole number from 0 to 10,000.');if(!Array.isArray(c.slots)||c.slots.length>96||c.slots.some(s=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))||new Set(c.slots).size!==c.slots.length)throw Error('Enter unique collection times as HH:MM.');return c}
function open(c,now=new Date()){if(!c.enabled||c.override==='closed'||!validSunday(c.date)||london(now).slice(0,10)>c.date)return false;return c.override==='open'||london(now)<cutoff(c.date)}
function empty(){return{meals:Object.fromEntries(Object.keys(meals).map(k=>[k,0])),extras:Object.fromEntries(Object.keys(extras).map(k=>[k,0])),slot:'',name:'',phone:''}}
function lines(d){const out=[];for(const [kind,catalog]of Object.entries({meals,extras})){for(const [key,item]of Object.entries(catalog)){const qty=d[kind]?.[key]||0;if(!Number.isInteger(qty)||qty<0||qty>50)throw Error('Quantities must be whole numbers between 0 and 50.');if(qty)out.push({id:`sunday-${kind}-${key}`,name:item.name,qty,price:item.price,kind,key})}}return out}
function total(d){return lines(d).reduce((n,i)=>n+i.qty*i.price,0)}
function validate(c,d,now=new Date()){validateConfig(c);if(!open(c,now))throw Error('Pre-orders closed for this Sunday');const items=lines(d);if(!items.some(i=>i.kind==='meals'))throw Error('Choose at least one dinner.');for(const k of Object.keys(meals))if((d.meals[k]||0)>c.stock[k])throw Error(meals[k].name+' is sold out or has insufficient availability.');if(!c.slots.includes(d.slot)||`${c.date}T${d.slot}`<=london(now))throw Error('Choose an available Sunday collection time.');if(!d.name?.trim()||d.name.length>120)throw Error('Enter your name.');if(!/^[+()\d\s-]{7,40}$/.test(d.phone||'')||(d.phone.match(/\d/g)||[]).length<7)throw Error('Enter a valid phone number.');return items}
function create(state,d,requestId,now=new Date()){
 const existing=state.orders.find(o=>o.request_id===requestId);if(existing)return existing;
 if(!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw Error('Invalid request identifier.');
 const items=validate(state.config,d,now),n=state.orders.length+1;
 const order={id:'sunday-'+requestId,request_id:requestId,order_number:'SR-'+String(n).padStart(3,'0'),customer_name:d.name.trim(),customer_phone:d.phone,collection_date:state.config.date,collection_slot:d.slot,collection_time:state.config.date+' '+d.slot+' (UK)',order_notes:'SUNDAY ROAST PRE-ORDER',items:items.map(i=>({...i,unit_price_pence:i.price,price:money(i.price)})),total_pence:total(d),status:'pending',created_at:now.toISOString(),released:false};
 for(const k of Object.keys(meals))state.config.stock[k]-=d.meals[k]||0;state.orders.push(order);return order;
}
function transition(state,id,action,reason){const o=state.orders.find(x=>x.id===id);if(!o)throw Error('Order not found.');const allowed={accept:['pending'],reject:['pending'],preparing:['accepted'],ready:['accepted','preparing'],collected:['ready']};if(!allowed[action]?.includes(o.status))throw Error('Order status has changed. Refresh and try again.');if(action==='reject'&&!reason?.trim())throw Error('Choose a rejection reason.');o.status={accept:'accepted',reject:'rejected',preparing:'preparing',ready:'ready',collected:'collected'}[action];if(action==='reject'){o.rejection_reason=reason;if(!o.released&&state.config.date===o.collection_date){for(const i of o.items.filter(i=>i.kind==='meals'))state.config.stock[i.key]+=i.qty;o.released=true}}return o}
function prep(orders,date){const mealTotals=Object.fromEntries(Object.keys(meals).map(k=>[k,0])),sums={dinners:0,...mealTotals,extras:Object.fromEntries(Object.keys(extras).map(k=>[k,0])),slots:{}};for(const o of orders.filter(o=>o.collection_date===date&&o.status!=='rejected')){const slot=sums.slots[o.collection_slot]||=Object.fromEntries(Object.keys(meals).map(k=>[k,0]));for(const i of o.items){if(i.kind==='meals'){sums.dinners+=i.qty;sums[i.key]+=i.qty;slot[i.key]+=i.qty}else sums.extras[i.key]+=i.qty}}return sums}
return{meals,extras,included,money,london,validSunday,cutoff,nextSunday,validateConfig,open,empty,lines,total,validate,create,transition,prep};
});
