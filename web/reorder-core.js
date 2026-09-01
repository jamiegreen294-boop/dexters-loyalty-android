/* Pure order reconstruction shared by the collection screen and offline tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DexterReorder=api})(typeof window==='object'?window:this,function(){
'use strict';
const money=v=>{const m=String(v??'').replace(',','.').match(/£?\s*(\d+(?:\.\d{1,2})?)/);return m?Number(m[1]):NaN};
const same=(a,b)=>String(a)===String(b);
function itemFor(id,categories){for(const c of categories||[])for(const i of c.items||[])if(same(i.id,id))return {...i,category_id:c.id,category_name:c.name};return null}
function namesToIds(text,options){
 // Match complete names, including commas inside option names. Ambiguity requires review.
 const solutions=[];let attempts=0;
 function walk(rest,chosen){if(++attempts>512||solutions.length>1)return;if(!rest){solutions.push(chosen);return}for(const o of options){if(chosen.includes(o.id))continue;if(rest===o.name)walk('',chosen.concat(o.id));else if(rest.startsWith(o.name+', '))walk(rest.slice(o.name.length+2),chosen.concat(o.id))}}
 walk(text,[]);return attempts<=512&&solutions.length===1?solutions[0]:null;
}
function validate(line,categories,groups){
 const item=itemFor(line.id,categories),issues=[];
 if(!item||item.active===false||item.in_stock===false)return {line,issues:['This item is unavailable. Remove it before ordering.'],changed:false};
 const gs=groups.get(String(item.id))||[],mods=[],labels=[];let extra=0;
 if(!Number.isFinite(money(item.price)))issues.push('The current price is unavailable.');
 for(const selection of line.modifiers||[])if(!gs.some(g=>same(g.id,selection.group_id)))issues.push('A previous option group is no longer available.');
 for(const g of gs){const selected=(line.modifiers||[]).find(m=>same(m.group_id,g.id));const ids=[...new Set((selected?.option_ids||[]).map(String))];const opts=g.options.filter(o=>ids.includes(String(o.id)));const min=Math.max(g.required?1:0,g.min||0),max=g.type==='single'?1:(g.max??Infinity);if(opts.length!==ids.length||opts.length<min||opts.length>max)issues.push('Check '+g.name+'.');if(opts.length){mods.push({group_id:g.id,option_ids:opts.map(o=>o.id)});labels.push(g.name+': '+opts.map(o=>o.name).join(', '));extra+=opts.reduce((n,o)=>n+Number(o.price||0),0)}}
 const next={...line,id:item.id,name:item.name,category_id:item.category_id,category_name:item.category_name,price:item.price,qty:1,modifiers:mods,modifierLabels:labels,modifierTotal:Math.round(extra*100)/100};
 return {line:next,issues,changed:money(line.price)!==money(next.price)||Number(line.modifierTotal||0)!==next.modifierTotal};
}
function restore(items,categories,groups){
 if(!Array.isArray(items)||!items.length)throw Error('This order has no items to restore.');
 const count=items.reduce((n,i)=>n+Number(i.qty??1),0);if(!Number.isInteger(count)||count<1||count>40||items.some(i=>!Number.isInteger(Number(i.qty??1))||Number(i.qty??1)<1||Number(i.qty??1)>20))throw Error('This order is too large to restore automatically. Please choose items from the menu.');
 const lines=[];
 for(const saved of items){const item=itemFor(saved.id,categories),gs=groups.get(String(saved.id))||[],modifiers=[],problems=[];
  for(const label of saved.modifiers||[]){if(typeof label!=='string'){problems.push('Check your previous choices.');continue}const matches=gs.filter(g=>label.startsWith(g.name+': '));if(matches.length!==1){problems.push('Previous choice needs checking: '+label);continue}const g=matches[0],ids=namesToIds(label.slice(g.name.length+2),g.options);if(!ids||modifiers.some(m=>same(m.group_id,g.id))){problems.push('Previous choice needs checking: '+label);continue}modifiers.push({group_id:g.id,option_ids:ids})}
  for(const removed of saved.removed||[]){const matches=gs.filter(g=>/^remove ingredients$/i.test(g.name)).flatMap(g=>g.options.filter(o=>o.name.toLowerCase()===('No '+removed).toLowerCase()).map(o=>({g,o})));if(matches.length===1){const {g,o}=matches[0];let m=modifiers.find(m=>same(m.group_id,g.id));if(!m){m={group_id:g.id,option_ids:[]};modifiers.push(m)}if(!m.option_ids.includes(o.id))m.option_ids.push(o.id)}else problems.push('Check previous ingredient removal: '+removed)}
  const old={id:saved.id,name:item?.name||saved.base_name||saved.name||'Unavailable item',category_id:item?.category_id||saved.category_id,category_name:item?.category_name||saved.category_name,price:saved.price,qty:1,modifiers,modifierLabels:[],modifierTotal:Number(saved.modifier_total||0)};
  const checked=validate(old,categories,groups),line={...checked.line,reorderIssue:[...problems,...checked.issues].join(' '),reorderNote:checked.changed?'Price updated to the current menu price.':''};
  for(let n=0;n<Number(saved.qty??1);n++)lines.push(JSON.parse(JSON.stringify(line)));
 }
 return lines;
}
return {restore,validate,itemFor,namesToIds};
});
