(()=>{
'use strict';
const $d=id=>document.getElementById(id);
const subtotal=()=> (S?.cart||[]).reduce((sum,line)=>sum+(Number(line.unit)||0)*(Number(line.qty)||1),0);
const money=n=>'£'+Number(n||0).toFixed(2);

function setDiscount(amount,label){
  const sub=subtotal();
  S.manualDiscount=Math.round(Math.max(0,Math.min(sub,Number(amount)||0))*100)/100;
  S.manualDiscountLabel=S.manualDiscount?String(label||'Manual discount'):'';
  S.discount=S.manualDiscount;
  if(typeof renderCart==='function')renderCart();
  const status=$d('status');if(status)status.textContent=S.manualDiscount?(S.manualDiscountLabel+' applied · -'+money(S.manualDiscount)):'Manual discount removed.';
}

function openDiscount(){
  const sub=subtotal();
  if(sub<=0){if(window.DextersPosModal)window.DextersPosModal('Discount','<p>Add items to the sale before applying a discount.</p>',false);return}
  const html='<div class="group"><div class="sumrow"><span>Current subtotal</span><b>'+money(sub)+'</b></div><div class="sumrow"><span>Current manual discount</span><b>'+money(S.manualDiscount||0)+'</b></div></div><h3>Dexter’s 10% discounts</h3><div class="opts"><button class="opt pcDiscountPreset" data-label="Pensioner discount">PENSIONER<br><small>10% OFF</small></button><button class="opt pcDiscountPreset" data-label="EMS / Carer discount">EMS / CARER<br><small>10% OFF</small></button><button class="opt pcDiscountPreset" data-label="Student discount">STUDENT<br><small>10% OFF</small></button></div><h3>Other percentage discount</h3><div class="opts"><button class="opt pcDiscountPercent" data-p="5">5%</button><button class="opt pcDiscountPercent" data-p="10">10%</button><button class="opt pcDiscountPercent" data-p="15">15%</button><button class="opt pcDiscountPercent" data-p="20">20%</button></div><h3>Custom discount</h3><select id="pcDiscountType" class="field"><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount (£)</option></select><input id="pcDiscountValue" class="field" inputmode="decimal" placeholder="Enter discount"><div class="actions"><button id="pcDiscountApply" class="confirm">APPLY DISCOUNT</button><button id="pcDiscountRemove" class="cancel">REMOVE DISCOUNT</button></div><div id="pcDiscountError" class="bad"></div>';
  const d=window.DextersPosModal?window.DextersPosModal('Add Discount',html,false):null;if(!d)return;
  d.querySelectorAll('.pcDiscountPercent').forEach(b=>b.onclick=()=>{const p=Number(b.dataset.p);setDiscount(sub*p/100,p+'% discount');d.remove()});
  d.querySelectorAll('.pcDiscountPreset').forEach(b=>b.onclick=()=>{setDiscount(sub*.10,b.dataset.label);d.remove()});
  d.querySelector('#pcDiscountApply').onclick=()=>{const type=d.querySelector('#pcDiscountType').value,value=Number(String(d.querySelector('#pcDiscountValue').value||'').replace(',','.'));if(!Number.isFinite(value)||value<=0){d.querySelector('#pcDiscountError').textContent='Enter a discount greater than zero.';return}if(type==='percent'&&value>100){d.querySelector('#pcDiscountError').textContent='Percentage cannot be more than 100%.';return}setDiscount(type==='percent'?sub*value/100:value,type==='percent'?(value+'% discount'):('£'+value.toFixed(2)+' discount'));d.remove()};
  d.querySelector('#pcDiscountRemove').onclick=()=>{setDiscount(0,'');d.remove()};
}

function install(){
  if($d('pcDiscountBtn'))return;
  const tools=document.querySelector('.carttools');if(!tools)return;
  const b=document.createElement('button');b.id='pcDiscountBtn';b.textContent='Discount';b.type='button';b.onclick=openDiscount;tools.appendChild(b);
}
window.DextersDiscounts={open:openDiscount,clear:()=>setDiscount(0,'')};
window.addEventListener('load',install);if(document.readyState!=='loading')install();
})();
