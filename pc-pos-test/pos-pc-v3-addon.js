(()=>{
const TEST_QR='https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1/dexters-table-order-pc-test';
const TEST_SUNDAY_API=U+'/functions/v1/sunday-roast-pc-pos-api';
const SALES_KEY='dexters_pc_pos_sales_v3';
const CREDIT_TEST_KEY='dexters_pc_credit_payments_v3';
const $x=id=>document.getElementById(id);
const cashMoney=n=>'£'+Number(n||0).toFixed(2);
const readSales=()=>{try{return JSON.parse(localStorage.getItem(SALES_KEY)||'[]')}catch{return[]}};
const saveSales=a=>localStorage.setItem(SALES_KEY,JSON.stringify(a.slice(0,2000)));
const token=()=>S?.session?.access_token||'';
function topButton(id,text,before='staffBtn'){let b=$x(id);if(b)return b;const top=document.querySelector('.top');if(!top)return null;b=document.createElement('button');b.id=id;b.textContent=text;top.insertBefore(b,$x(before)||null);return b}
function modal(title,html,wide=false){const d=document.createElement('div');d.className='modal';d.innerHTML='<div class="box" style="'+(wide?'width:min(900px,96vw);':'')+'"><h2>'+title+'</h2><div class="pcBody">'+html+'</div><div class="actions"><button class="cancel pcClose">Close</button></div></div>';document.body.appendChild(d);d.querySelector('.pcClose').onclick=()=>d.remove();return d}
window.DextersPosModal=modal;
function cartTotal(){return Number(String($x('total')?.textContent||'0').replace(/[^0-9.]/g,''))||0}
function cartSnapshot(){return (S.cart||[]).map(x=>({name:x.name,qty:Number(x.qty)||1,unit:Number(x.unit)||0,mods:x.mods||x.modifiers||[]}))}
async function currentStaffSession(){
  // PIN login already stores the authenticated Supabase session in S.session.
  // Use that session directly: calling sb.auth.getSession() on this Windows POS
  // has caused "URL is not a constructor" in the installed browser shell.
  const active=S?.session||null;
  if(active?.access_token)return active;
  throw new Error('Please lock the POS and sign in again with your staff PIN.');
}
async function sendPaidOrderToLiveKds(method,tendered=0){
  if(!S?.cart?.length) throw new Error('Add items before sending to KDS.');
  const activeSession=await currentStaffSession();
  if(!activeSession?.access_token) throw new Error('Please sign in again.');
  const body={
    order_type:S.mode,
    customer_name:S.customer,
    customer_phone:S.phone,
    notes:S.note,
    discount:S.discount,
    payment_method:method==='card'?'card':'cash',
    amount_tendered:method==='cash'?Number(tendered||0):undefined,
    items:S.cart.map(l=>({
      name:l.name,
      category:l.category||'',
      qty:Number(l.qty)||1,
      unit:Number(l.unit)||0,
      modifiers:(l.mods||[]).map(m=>m.name+': '+(m.options||[]).map(o=>o.name).join(', '))
    }))
  };
  const r=await fetch(U+'/functions/v1/dexters-pos-test-api/orders',{
    method:'POST',
    headers:{apikey:K,Authorization:'Bearer '+activeSession.access_token,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||'Could not send order to live KDS.');
  try{
    window.dispatchEvent(new CustomEvent('dexters-pc-order-sent',{detail:{
      client_request_id:String(d?.order?.id||''),
      pos_order_id:d?.order?.id,
      kds_order_id:d?.order?.kds_order_id,
      kds_order_number:d?.order?.kds_order_number
    }}));
  }catch{}
  return d.order||d;
}
function clearAfterPaidSend(){
  try{
    if(typeof clearSale==='function'){clearSale();return}
  }catch{}
  try{
    S.cart=[];S.note='';S.customer='';S.phone='';S.discount=0;
    if(typeof renderCart==='function')renderCart();
  }catch{}
}
async function issueReceiptClaim(sale){
  try{
    if(!S?.session?.access_token)return "";
    const r=await fetch(U+'/functions/v1/pc-pos-receipt-claim',{
      method:'POST',
      headers:{apikey:K,Authorization:'Bearer '+S.session.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({receipt_id:String(sale.id||'').replace(/[^A-Za-z0-9:_-]/g,'').slice(0,128),order_value_pence:Math.round(Number(sale.total||0)*100)})
    });
    const d=await r.json().catch(()=>({}));
    return r.ok?String(d.claim_token||""):"";
  }catch{return ""}
}
function linePad(left,right,width=32){
  left=String(left||"");right=String(right||"");
  const room=Math.max(1,width-right.length);
  if(left.length>room)left=left.slice(0,room);
  return left+" ".repeat(Math.max(1,width-left.length-right.length))+right;
}
function receiptItems(sale){
  const out=[];
  for(const x of (sale.items||[])){
    const qty=Number(x.qty)||1,unit=Number(x.unit)||0;
    out.push(linePad(qty+" x "+String(x.name||"Item"),cashMoney(qty*unit)));
    for(const m of (x.mods||[])){
      const opts=(m.options||[]).map(o=>String(o.name||o)).filter(Boolean).join(", ");
      if(opts) out.push("  > "+String(m.name||"Option")+": "+opts);
    }
  }
  return out;
}
function buildStandardReceipt(sale){
  return [
    "            DEXTER'S",
    "      10A Dundasvale Court",
    "         Glasgow, G4 0JS",
    "        0141 473 5249",
    "     hello@dextersspot.co.uk",
    "--------------------------------",
    "Receipt "+String(sale.id||"").slice(-12),
    new Date(sale.created_at||Date.now()).toLocaleString("en-GB"),
    "--------------------------------",
    ...receiptItems(sale),
    "--------------------------------",
    linePad("TOTAL",cashMoney(sale.total||0)),
    "Payment: "+String(sale.method||"").toUpperCase(),
    sale.method==="cash"&&Number(sale.tendered||0)>0?linePad("Cash",cashMoney(sale.tendered)):"",
    sale.method==="cash"&&Number(sale.change||0)>=0?linePad("Change",cashMoney(sale.change)):"",
    "--------------------------------",
    "       Thank you for visiting",
    "            Dexter's",
    "",
    "        dextersspot.co.uk",
    "",
    ""
  ].filter(x=>x!==null&&x!==undefined).join("\n");
}
function buildLoyaltyReceipt(sale,customer,claim){
  return [
    "            DEXTER'S",
    "      10A Dundasvale Court",
    "         Glasgow, G4 0JS",
    "        0141 473 5249",
    "     hello@dextersspot.co.uk",
    "--------------------------------",
    "LOYALTY RECEIPT",
    customer?.full_name?("Customer: "+customer.full_name):"",
    customer?.loyalty_code?("Loyalty: "+customer.loyalty_code):"",
    new Date(sale.created_at||Date.now()).toLocaleString("en-GB"),
    "--------------------------------",
    ...receiptItems(sale),
    "--------------------------------",
    linePad("TOTAL",cashMoney(sale.total||0)),
    "Payment: "+String(sale.method||"").toUpperCase(),
    "--------------------------------",
    "        SCAN TO WIN",
    "Scan this receipt in the Dexter's",
    "Loyalty App to check your reward.",
    claim?("QR:"+claim):"Open the Loyalty App > Rewards",
    "",
    claim?claim:"",
    "--------------------------------",
    "  One scan per eligible receipt.",
    "  Rewards are redeemed in-app.",
    "",
    ""
  ].filter(Boolean).join("\n");
}
function launchHardwarePrint(text,opts={}){
  try{
    localStorage.setItem("dexters-pos-last-receipt",text);
    const payload=btoa(unescape(encodeURIComponent(text)));
    const q=new URLSearchParams({payload});
    if(opts.loyalty)q.set("loyalty","1");
    if(opts.claim)q.set("claim",opts.claim);
    if(opts.openDrawer)q.set("drawer","1");
    // Use a direct top-level protocol handoff. The installed Windows bridge
    // reliably opens from this path on the XEPOS till; hidden iframes can be blocked.
    window.location.href="dexterscitaq://print-pos?"+q.toString();
    return true;
  }catch(e){console.error("Hardware bridge launch failed",e);return false}
}
async function hardwarePrintSale(sale){
  try{
    const customer=window.DextersGetLoyaltyCustomer?.()||sale.loyalty_customer||null;
    const claim=customer?await issueReceiptClaim(sale):"";
    const txt=customer?buildLoyaltyReceipt(sale,customer,claim):buildStandardReceipt(sale);
    sale.receipt_type=customer?"loyalty":"standard";
    sale.receipt_claim_token=claim||"";
    return launchHardwarePrint(txt,{loyalty:!!customer,claim,openDrawer:String(sale.method||"").toLowerCase()==="cash"});
  }catch(e){console.error("Hardware bridge print failed",e);return false}
}
window.DextersHardwarePrintSale=hardwarePrintSale;
window.DextersHardwarePrintText=launchHardwarePrint;
window.DextersIssueReceiptClaim=issueReceiptClaim;

function recordSale(method,tendered=0,change=0,kind='sale',extra={}){const loyalty_customer=window.DextersGetLoyaltyCustomer?.()||null;const sale={id:'PC-'+Date.now()+'-'+Math.random().toString(16).slice(2),created_at:new Date().toISOString(),method,total:cartTotal(),tendered,change,kind,items:cartSnapshot(),mode:S.mode,tableNo:S.tableNo,loyalty_customer,...extra};const a=readSales();a.unshift(sale);saveSales(a);window.dispatchEvent(new CustomEvent('dexters-pc-test-sale-complete',{detail:sale}));return sale}
function ensurePayCss(){if(document.getElementById('pcPayCss'))return;const s=document.createElement('style');s.id='pcPayCss';s.textContent=`
.pcPayBox{width:min(780px,96vw)!important;max-height:94vh!important;overflow:auto}.pcPayLayout{display:grid;grid-template-columns:1fr 360px;gap:18px}.pcPaySummary{background:#0b192b;border:1px solid #31506f;border-radius:16px;padding:18px}.pcPayTotal{font-size:42px;font-weight:1000;color:#ffd43b;margin:8px 0 18px}.pcTender{font-size:34px;font-weight:1000;background:#07111f;border:2px solid #31506f;border-radius:14px;padding:14px;text-align:right}.pcChange{font-size:28px;font-weight:1000;margin-top:14px;padding:14px;border-radius:14px;background:#10213a}.pcChange.ok{color:#8ff0b3}.pcChange.bad{color:#ffadb8}.pcQuick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.pcQuick button,.pcKey,.pcPayConfirm,.pcPayCancel,.pcMethod{border:0;border-radius:12px;font-weight:1000;touch-action:manipulation}.pcQuick button{padding:13px;background:#203a5d;color:white}.pcKeys{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.pcKey{min-height:68px;font-size:28px;background:#162a45;color:white}.pcKey:active{transform:scale(.97)}.pcKey.action{background:#263c58}.pcPayActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.pcPayConfirm{padding:16px;background:#22c55e;color:#04210d;font-size:18px}.pcPayConfirm:disabled{opacity:.45}.pcPayCancel{padding:16px;background:#5a1420;color:white;font-size:18px}.pcMethodGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pcMethod{padding:28px 16px;font-size:26px}.pcMethod.cashM{background:#22c55e;color:#04210d}.pcMethod.cardM{background:#4d7cff;color:white}@media(max-width:720px){.pcPayLayout{grid-template-columns:1fr}.pcPayBox{width:98vw!important}.pcKey{min-height:58px}}
`;document.head.appendChild(s)}
function paymentMethodModal(title,total,onCash,onCard,useLiveSquare=false){ensurePayCss();const d=document.createElement('div');d.className='modal';d.innerHTML='<div class="box pcPayBox"><h2>'+title+'</h2><div class="pcPaySummary"><div style="color:#9eb0c5">AMOUNT TO PAY</div><div class="pcPayTotal">'+cashMoney(total)+'</div><div class="pcMethodGrid"><button class="pcMethod cashM">CASH</button><button class="pcMethod cardM">SQUARE</button></div><div class="pcPayActions"><button class="pcPayCancel">CANCEL</button></div></div></div>';document.body.appendChild(d);d.querySelector('.pcPayCancel').onclick=()=>d.remove();d.querySelector('.cashM').onclick=()=>{d.remove();cashKeypad(title,total,onCash)};d.querySelector('.cardM').onclick=()=>{d.remove();(useLiveSquare?squareCardConfirm:cardConfirm)(title,total,onCard)};return d}
function cashKeypad(title,total,onConfirm){ensurePayCss();let value='';const d=document.createElement('div');d.className='modal';d.innerHTML='<div class="box pcPayBox"><h2>'+title+' · CASH</h2><div class="pcPayLayout"><div class="pcPaySummary"><div style="color:#9eb0c5">TOTAL</div><div class="pcPayTotal">'+cashMoney(total)+'</div><div style="color:#9eb0c5">CASH RECEIVED</div><div class="pcTender">£0.00</div><div class="pcChange bad">Change due: £0.00</div><div class="pcQuick"><button data-q="exact">EXACT</button><button data-q="5">£5</button><button data-q="10">£10</button><button data-q="20">£20</button><button data-q="50">£50</button><button data-q="clear">CLEAR</button></div><div class="pcPayActions"><button class="pcPayCancel">CANCEL</button><button class="pcPayConfirm" disabled>COMPLETE PAYMENT</button></div></div><div class="pcKeys"><button class="pcKey" data-k="1">1</button><button class="pcKey" data-k="2">2</button><button class="pcKey" data-k="3">3</button><button class="pcKey" data-k="4">4</button><button class="pcKey" data-k="5">5</button><button class="pcKey" data-k="6">6</button><button class="pcKey" data-k="7">7</button><button class="pcKey" data-k="8">8</button><button class="pcKey" data-k="9">9</button><button class="pcKey action" data-k="back">⌫</button><button class="pcKey" data-k="0">0</button><button class="pcKey" data-k=".">.</button></div></div></div>';document.body.appendChild(d);const tenderEl=d.querySelector('.pcTender'),changeEl=d.querySelector('.pcChange'),confirmBtn=d.querySelector('.pcPayConfirm');
 const amount=()=>Number(value||0);function redraw(){const n=amount(),chg=Math.round((n-total)*100)/100;tenderEl.textContent=cashMoney(n);changeEl.textContent='Change due: '+cashMoney(Math.max(0,chg));changeEl.className='pcChange '+(n>=total?'ok':'bad');confirmBtn.disabled=n<total||n<=0}
 d.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(k==='back')value=value.slice(0,-1);else if(k==='.'&&!value.includes('.'))value=(value||'0')+'.';else if(k!=='.'||!value.includes('.')){if(value.includes('.')&&value.split('.')[1]?.length>=2)return;value+=k}redraw()});
 d.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const q=b.dataset.q;if(q==='exact')value=total.toFixed(2);else if(q==='clear')value='';else value=String(q);redraw()});
 d.querySelector('.pcPayCancel').onclick=()=>d.remove();confirmBtn.onclick=()=>{const tender=amount();if(tender<total)return;const change=Math.round((tender-total)*100)/100;d.remove();onConfirm(tender,change)};redraw();return d}
function cardConfirm(title,total,onConfirm){ensurePayCss();const d=document.createElement('div');d.className='modal';d.innerHTML='<div class="box pcPayBox"><h2>'+title+' · CARD</h2><div class="pcPaySummary"><div style="color:#9eb0c5">CARD AMOUNT</div><div class="pcPayTotal">'+cashMoney(total)+'</div><p style="color:#9eb0c5">PC TEST: this records an approved card payment without charging a real card.</p><div class="pcPayActions"><button class="pcPayCancel">CANCEL</button><button class="pcPayConfirm">APPROVE TEST PAYMENT</button></div></div></div>';document.body.appendChild(d);d.querySelector('.pcPayCancel').onclick=()=>d.remove();d.querySelector('.pcPayConfirm').onclick=()=>{d.remove();onConfirm()};return d}
async function squareCardConfirm(title,total,onConfirm){ensurePayCss();const d=document.createElement('div');d.className='modal';d.innerHTML='<div class="box pcPayBox"><h2>'+title+' · SQUARE</h2><div class="pcPaySummary"><div style="color:#9eb0c5">AMOUNT</div><div class="pcPayTotal">'+cashMoney(total)+'</div><p class="pcSquareWait" style="color:#9eb0c5">Sending payment to Foodhub terminal…</p><p><small>Square will open automatically on the Foodhub terminal. The sale completes only after Square approves it.</small></p></div></div>';document.body.appendChild(d);const state=d.querySelector('.pcSquareWait');try{if(typeof window.DextersPcSquarePay!=='function')throw Error('Square bridge is not loaded');state.textContent='Waiting for Foodhub / Square approval…';const result=await window.DextersPcSquarePay(total,title);d.remove();await onConfirm(result)}catch(e){state.textContent='Payment not completed: '+String(e?.message||e)}return d}
function cashPay(){const total=cartTotal();if(total<=0){modal('Payment','<p>Add items to the basket first.</p>');return}cashKeypad('Sale',total,async(tender,change)=>{const sale=recordSale('cash',tender,change);try{const sent=await sendPaidOrderToLiveKds('cash',tender);await hardwarePrintSale(sale);clearAfterPaidSend();const d=modal('Payment complete','<div class="pcPayTotal">CHANGE '+cashMoney(change)+'</div><p>Sent to live KDS'+(sent?.kds_order_number?' · KDS #'+sent.kds_order_number:'')+'. Receipt sent to POS-80.</p>');setTimeout(()=>{if(document.body.contains(d))d.remove()},3500)}catch(e){modal('KDS send failed','<p>'+String(e.message||e)+'</p><p>The basket has been kept so you can retry. The receipt was not printed.</p>')}})}
function cardPay(){const total=cartTotal();if(total<=0){modal('Payment','<p>Add items to the basket first.</p>');return}squareCardConfirm('Sale',total,async(result)=>{const sale=recordSale('card',total,0,'sale',{square_transaction_id:result?.transaction_id||''});try{const sent=await sendPaidOrderToLiveKds('card',total);await hardwarePrintSale(sale);clearAfterPaidSend();const d=modal('Payment complete','<div class="pcPayTotal">'+cashMoney(total)+'</div><p>Square approved on Foodhub terminal. Sent to live KDS'+(sent?.kds_order_number?' · KDS #'+sent.kds_order_number:'')+'. Receipt sent to POS-80.</p>');setTimeout(()=>{if(document.body.contains(d))d.remove()},2500)}catch(e){modal('KDS send failed','<p>'+String(e.message||e)+'</p><p>The payment was approved but the basket has been kept because KDS/printing failed.</p>')}})}
function choosePay(){const total=cartTotal();if(total<=0){modal('Payment','<p>Add items to the basket first.</p>');return}paymentMethodModal('Pay',total,async(tender,change)=>{const sale=recordSale('cash',tender,change);try{const sent=await sendPaidOrderToLiveKds('cash',tender);await hardwarePrintSale(sale);clearAfterPaidSend();const d=modal('Payment complete','<div class="pcPayTotal">CHANGE '+cashMoney(change)+'</div><p>Sent to live KDS'+(sent?.kds_order_number?' · KDS #'+sent.kds_order_number:'')+'. Receipt sent to POS-80 and cash drawer should open.</p>');setTimeout(()=>{if(document.body.contains(d))d.remove()},3500)}catch(e){modal('KDS send failed','<p>'+String(e.message||e)+'</p><p>The basket has been kept so you can retry. The receipt was not printed.</p>')}},async(result)=>{const sale=recordSale('card',total,0,'sale',{square_transaction_id:result?.transaction_id||''});try{const sent=await sendPaidOrderToLiveKds('card',total);await hardwarePrintSale(sale);clearAfterPaidSend();const d=modal('Payment complete','<div class="pcPayTotal">'+cashMoney(total)+'</div><p>Square approved on Foodhub terminal. Sent to live KDS'+(sent?.kds_order_number?' · KDS #'+sent.kds_order_number:'')+'. Receipt sent to POS-80.</p>');setTimeout(()=>{if(document.body.contains(d))d.remove()},2500)}catch(e){modal('KDS send failed','<p>'+String(e.message||e)+'</p><p>The payment was approved but the basket has been kept because KDS/printing failed.</p>')}},true)}
function installPay(){const pay=document.querySelector('.pay');if(!pay)return;$x('cashBtn')?.remove();$x('cardBtn')?.remove();let b=$x('payBtn');if(!b){b=document.createElement('button');b.id='payBtn';b.className='cash';b.textContent='PAY';b.style='grid-column:1/-1;min-height:64px;font-size:24px';pay.insertBefore(b,$x('sendBtn'))}b.type='button';b.onclick=e=>{e.preventDefault();e.stopPropagation();choosePay()}}
function salesView(){const rows=readSales();const html=rows.length?rows.slice(0,100).map(r=>'<div class="held"><b>'+new Date(r.created_at).toLocaleString()+'</b> · '+String(r.kind||'sale').toUpperCase()+' · '+String(r.method||'')+' · '+cashMoney(r.total||r.amount||0)+'</div>').join(''):'<p>No PC test sales yet.</p>';modal('Sales · PC TEST',html)}
function cashup(){const rows=readSales();let cash=0,card=0,credit=0;for(const r of rows){if(r.kind==='money_owed')credit+=Number(r.amount||0);if(r.method==='cash')cash+=Number(r.total||r.amount||0);if(r.method==='card')card+=Number(r.total||r.amount||0)}modal('Cash up · PC TEST','<div class="group"><div class="sumrow"><span>Cash</span><b>'+cashMoney(cash)+'</b></div><div class="sumrow"><span>Card</span><b>'+cashMoney(card)+'</b></div><div class="sumrow"><span>Money Owed payments</span><b>'+cashMoney(credit)+'</b></div><div class="sumrow grand"><span>Total</span><b>'+cashMoney(cash+card)+'</b></div></div><p style="color:#9eb0c5">PC test data only.</p>')}
async function creditSearch(q){const t=token();if(!t)throw Error('Sign in first.');const r=await fetch(U+'/rest/v1/rpc/credit_search_customers',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({p_query:q,p_limit:25})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error||'Search failed');return Array.isArray(d)?d:(d.customers||d.results||[])}
function recordCreditPayment(acct,name,balance,amount,method,tender=amount,change=0){const row={id:'CREDIT-'+Date.now(),created_at:new Date().toISOString(),kind:'money_owed',method,amount,total:amount,tendered:tender,change,account_id:acct,customer_name:name,balance_before_pence:balance,balance_after_pence:Math.max(0,balance-Math.round(amount*100)),mode:'TEST_ONLY_NO_LIVE_BALANCE_CHANGE'};try{const rows=readSales();rows.unshift(row);saveSales(rows)}catch(e){console.error('Could not save Money Owed sale history',e)}let c=[];try{c=JSON.parse(localStorage.getItem(CREDIT_TEST_KEY)||'[]')}catch{}try{c.unshift(row);localStorage.setItem(CREDIT_TEST_KEY,JSON.stringify(c.slice(0,250)))}catch(e){console.error('Could not save Money Owed test history',e)}const d=modal('Money Owed payment recorded','<div class="pcPayTotal">'+cashMoney(amount)+'</div><p><b>'+name+'</b></p><p>Remaining test balance: <b>'+cashMoney(row.balance_after_pence/100)+'</b></p>'+(change?'<div class="pcChange ok">Change due: '+cashMoney(change)+'</div>':'')+'<p style="color:#9eb0c5">PC TEST only — live Money Owed balance was not changed.</p>');setTimeout(()=>{if(document.body.contains(d))d.remove()},4000)}
function creditPayTest(acct,name,balance){try{const rawBalance=Number(balance);const max=Math.max(0,(Number.isFinite(rawBalance)?rawBalance:0)/100),label=String(name||'Customer');ensurePayCss();if(max<=0){modal('Money Owed · '+label,'<p>This customer has no outstanding balance to take.</p>');return null}const d=document.createElement('div');d.className='modal';d.innerHTML='<div class="box pcPayBox"><h2>Money Owed · '+label+'</h2><div class="pcPaySummary"><div style="color:#9eb0c5">CURRENT BALANCE</div><div class="pcPayTotal">'+cashMoney(max)+'</div><label>Amount customer is paying</label><input id="pcDebtAmount" class="field" inputmode="decimal" value="'+max.toFixed(2)+'"><div class="pcPayActions"><button type="button" class="pcPayCancel">CANCEL</button><button type="button" class="pcPayConfirm">CONTINUE</button></div><div class="pcDebtError bad"></div></div></div>';document.body.appendChild(d);d.querySelector('.pcPayCancel').onclick=e=>{e.preventDefault();d.remove()};d.querySelector('.pcPayConfirm').onclick=e=>{e.preventDefault();try{const field=d.querySelector('#pcDebtAmount'),amount=Number(String(field?.value||'').replace(',','.'));if(!Number.isFinite(amount)||amount<=0||amount>max){const er=d.querySelector('.pcDebtError');if(er)er.textContent='Enter an amount between £0.01 and '+cashMoney(max)+'.';field?.focus();return}const next=paymentMethodModal('Money Owed · '+label,amount,(tender,change)=>recordCreditPayment(acct,label,Number(balance)||0,amount,'cash',tender,change),()=>recordCreditPayment(acct,label,Number(balance)||0,amount,'card',amount,0));if(next)d.remove()}catch(err){const er=d.querySelector('.pcDebtError');if(er)er.textContent='Could not open payment: '+String(err?.message||err)}};return d}catch(err){console.error('Money Owed payment screen failed',err);modal('Money Owed payment error','<p>Could not open the payment screen. The POS is still running.</p><p class="bad">'+String(err?.message||err)+'</p>');return null}}
function moneyOwed(){const d=modal('Money Owed · Pay in Store','<input id="pcCreditQ" class="field" placeholder="Customer name, phone or email"><button id="pcCreditSearch" class="confirm" style="border:0;border-radius:10px;padding:10px 14px;font-weight:900">Search</button><div id="pcCreditResults" style="margin-top:10px"></div><p style="color:#9eb0c5">Payments are simulated in this PC test. Live balances remain unchanged until final approval.</p>',true);d.querySelector('#pcCreditSearch').onclick=async()=>{const out=d.querySelector('#pcCreditResults');out.textContent='Searching…';try{const rows=await creditSearch(d.querySelector('#pcCreditQ').value);out.innerHTML=rows.length?rows.map((x,i)=>{const name=x.customer_name||x.full_name||x.name||'Customer';const bp=Number(x.balance_pence||x.balance||0);return '<div class="held"><b>'+name+'</b><br>Balance: <b>'+cashMoney(bp/100)+'</b><br><button class="pcCreditPay" data-i="'+i+'">TAKE PAYMENT</button></div>'}).join(''):'No customers found.';out.querySelectorAll('.pcCreditPay').forEach(b=>b.onclick=e=>{e.preventDefault();try{const x=rows[Number(b.dataset.i)];if(!x)throw Error('Customer record is no longer available');creditPayTest(x.account_id||x.id||null,x.customer_name||x.full_name||x.name||'Customer',Number(x.balance_pence??x.balance??0))}catch(err){out.innerHTML='<p class="bad">Could not open payment: '+String(err?.message||err)+'</p>'}})}catch(e){out.textContent=e.message}}}
function qrCodes(){const labels={1:'Inside Table 1',2:'Inside Table 2',3:'Outside Table 1',4:'Outside Table 2',5:'Bar Chair 1',6:'Bar Chair 2',7:'Bar Chair 3'};const d=modal('Table QR Codes · PC TEST','<div id="pcQrs"></div>',true);const root=d.querySelector('#pcQrs');Object.entries(labels).forEach(([n,label])=>{const url=TEST_QR+'?table='+n;const wrap=document.createElement('div');wrap.className='held';wrap.innerHTML='<b>'+label+'</b><br><canvas width="150" height="150"></canvas><br><input class="field" readonly value="'+url+'">';root.appendChild(wrap);if(window.QRCode)QRCode.toCanvas(wrap.querySelector('canvas'),url,{width:150},()=>{})})}
async function sunday(){const d=modal('Sunday Roast · PC TEST','<div class="srGrid"><input id="sName" class="field" placeholder="Customer name"><input id="sPhone" class="field" placeholder="Phone"><input id="sDate" class="field" type="date"><input id="sSlot" class="field" placeholder="Collection time e.g. 13:30"><input id="sAdults" class="field" type="number" min="0" value="1" placeholder="Adult mixed"><input id="sKids" class="field" type="number" min="0" value="0" placeholder="Kids mixed"><select id="sPay" class="field"><option value="unpaid">Unpaid</option><option value="deposit_paid">Deposit / part paid</option><option value="paid_full">Paid in full</option></select><input id="sPaid" class="field" inputmode="decimal" value="0.00" placeholder="Amount paid"></div><button id="sCreate" class="confirm" style="border:0;border-radius:10px;padding:11px 14px;font-weight:900">Create test roast order</button><div id="sMsg"></div>');d.querySelector('#sCreate').onclick=async()=>{const b={action:'create',customer_name:d.querySelector('#sName').value,customer_phone:d.querySelector('#sPhone').value,collection_date:d.querySelector('#sDate').value,collection_slot:d.querySelector('#sSlot').value,meals:{mixed:Number(d.querySelector('#sAdults').value)||0,kids_mixed:Number(d.querySelector('#sKids').value)||0},payment_status:d.querySelector('#sPay').value,amount_paid_pence:Math.round((Number(d.querySelector('#sPaid').value)||0)*100)};const r=await fetch(TEST_SUNDAY_API,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify(b)});const x=await r.json();d.querySelector('#sMsg').textContent=r.ok?'Test roast order created.':(x.error||'Could not create order')}}
window.DextersLegacySundayCreate=sunday;
function sundayEditor(order={}){const editing=!!order.id,meals=order.meals||{};const d=modal((editing?'Edit':'New in-shop')+' Sunday Roast · PC TEST','<p style="color:#9eb0c5">Select a customer on the POS first to prefill their details, or enter them here. This creates test data only.</p><div class="srGrid"><input id="seName" class="field" placeholder="Customer name" value="'+String(order.customer_name||S.customer||'').replaceAll('"','&quot;')+'"><input id="sePhone" class="field" placeholder="Phone" value="'+String(order.customer_phone||S.phone||'').replaceAll('"','&quot;')+'"><input id="seLoyalty" class="field" placeholder="Loyalty code (links test booking)" value="'+String(order.loyalty_code||'').replaceAll('"','&quot;')+'"><input id="seDate" class="field" type="date" value="'+String(order.collection_date||'')+'"><input id="seSlot" class="field" placeholder="Collection time e.g. 13:30" value="'+String(order.collection_slot||'')+'"><input id="seAdults" class="field" type="number" min="0" value="'+Number(meals.mixed??1)+'" placeholder="Adult mixed"><input id="seKids" class="field" type="number" min="0" value="'+Number(meals.kids_mixed||0)+'" placeholder="Kids mixed"><select id="sePay" class="field"><option value="unpaid">Unpaid</option><option value="deposit_paid">Deposit / part paid</option><option value="paid_full">Paid in full</option></select><input id="sePaid" class="field" inputmode="decimal" value="'+(Number(order.paid_pence||0)/100).toFixed(2)+'" placeholder="Amount paid"><textarea id="seNotes" class="field" rows="3" placeholder="Notes">'+String(order.notes||'')+'</textarea></div><button id="seSave" class="confirm" style="width:100%;border:0;border-radius:10px;padding:14px;font-weight:1000">'+(editing?'SAVE CHANGES':'CREATE TEST ROAST ORDER')+'</button><div id="seMsg"></div>');d.querySelector('#sePay').value=order.payment_status||'unpaid';d.querySelector('#seSave').onclick=async()=>{const btn=d.querySelector('#seSave'),b={action:editing?'update':'create',id:order.id,customer_name:d.querySelector('#seName').value,customer_phone:d.querySelector('#sePhone').value,loyalty_code:d.querySelector('#seLoyalty').value,collection_date:d.querySelector('#seDate').value,collection_slot:d.querySelector('#seSlot').value,meals:{mixed:Number(d.querySelector('#seAdults').value)||0,kids_mixed:Number(d.querySelector('#seKids').value)||0},payment_status:d.querySelector('#sePay').value,paid_pence:Math.round((Number(d.querySelector('#sePaid').value)||0)*100),notes:d.querySelector('#seNotes').value};btn.disabled=true;try{const x=await callSundayEditor(b);d.querySelector('#seMsg').className='ok';d.querySelector('#seMsg').textContent=editing?'Changes saved.':'Test roast order created.';setTimeout(()=>{d.remove();window.DextersSundayOrders?.open?.()},500)}catch(e){d.querySelector('#seMsg').className='bad';d.querySelector('#seMsg').textContent=e.message;btn.disabled=false}}}
async function callSundayEditor(body){const r=await fetch(TEST_SUNDAY_API,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify(body)});const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(x.error||'Sunday Roast request failed');return x}
window.DextersSundayCreate=()=>sundayEditor();
window.DextersSundayEdit=sundayEditor;
function sundayOptionEditor(order={}){const editing=!!order.id,meals=[['chicken','Roast Chicken Dinner',1499],['beef','Roast Beef Dinner',1499],['mixed','Adult Mixed Roast Dinner',1499],['kids_chicken','Kids’ Roast Chicken Dinner',999],['kids_beef','Kids’ Roast Beef Dinner',999],['kids_mixed','Kids Mixed Roast Dinner',999]],extras=[['yorkshire','Extra Yorkshire Pudding',75],['gravy','Extra Gravy',100],['stuffing','Extra Stuffing',100],['roast_potatoes','Extra Roast Potatoes',150],['chicken','Extra Chicken',250],['beef','Extra Beef',350]],md=order.meals||{},ex=order.extras||{};const row=(prefix,a)=>a.map(x=>'<div class="held srChoice"><div><b>'+x[1]+'</b><br><small>£'+(x[2]/100).toFixed(2)+'</small></div><button type="button" class="srMinus" data-p="'+prefix+'" data-k="'+x[0]+'">−</button><input class="field srQty" data-p="'+prefix+'" data-k="'+x[0]+'" inputmode="numeric" value="'+Number((prefix==='meals'?md:ex)[x[0]]||0)+'"><button type="button" class="srPlus" data-p="'+prefix+'" data-k="'+x[0]+'">+</button></div>').join('');const d=modal((editing?'Edit':'New in-shop')+' Sunday Roast · PC TEST','<p style="color:#9eb0c5">This matches the Loyalty App dinner and extras choices. Test-only booking; no live loyalty order is created.</p><div class="srGrid"><input id="soName" class="field" placeholder="Customer name" value="'+String(order.customer_name||S.customer||'').replaceAll('"','&quot;')+'"><input id="soPhone" class="field" placeholder="Phone" value="'+String(order.customer_phone||S.phone||'').replaceAll('"','&quot;')+'"><input id="soLoyalty" class="field" placeholder="Loyalty code" value="'+String(order.loyalty_code||'').replaceAll('"','&quot;')+'"><input id="soDate" class="field" type="date" value="'+String(order.collection_date||'')+'"><input id="soSlot" class="field" placeholder="Collection time e.g. 13:30" value="'+String(order.collection_slot||'')+'"></div><h3>Dinners</h3><div class="srChoiceGrid">'+row('meals',meals)+'</div><h3>Extras</h3><div class="srChoiceGrid">'+row('extras',extras)+'</div><div class="srGrid"><select id="soPay" class="field"><option value="unpaid">Unpaid</option><option value="deposit_paid">Deposit / part paid</option><option value="paid_full">Paid in full</option></select><input id="soPaid" class="field" inputmode="decimal" value="'+(Number(order.paid_pence||0)/100).toFixed(2)+'" placeholder="Amount paid"><textarea id="soNotes" class="field" rows="3" placeholder="Notes">'+String(order.notes||'')+'</textarea></div><div class="group"><div class="sumrow"><span>Total</span><b id="soTotal">£0.00</b></div><div class="sumrow"><span>Paid</span><b id="soPaidShow">£0.00</b></div><div class="sumrow grand"><span>Balance due</span><span id="soBalance">£0.00</span></div></div><button id="soSave" class="confirm" style="width:100%;border:0;border-radius:10px;padding:14px;font-weight:1000">'+(editing?'SAVE CHANGES':'CREATE TEST ROAST ORDER')+'</button><div id="soMsg"></div>');d.querySelector('#soPay').value=order.payment_status||'unpaid';const calc=()=>{let total=0;d.querySelectorAll('.srQty').forEach(i=>{const a=(i.dataset.p==='meals'?meals:extras).find(x=>x[0]===i.dataset.k);total+=(Number(i.value)||0)*(a?.[2]||0)});const paid=Math.max(0,Number(d.querySelector('#soPaid').value)||0)*100;d.querySelector('#soTotal').textContent='£'+(total/100).toFixed(2);d.querySelector('#soPaidShow').textContent='£'+(Math.min(total,paid)/100).toFixed(2);d.querySelector('#soBalance').textContent='£'+(Math.max(0,total-paid)/100).toFixed(2)};d.querySelectorAll('.srQty').forEach(i=>i.oninput=calc);d.querySelectorAll('.srPlus,.srMinus').forEach(b=>b.onclick=()=>{const i=d.querySelector('.srQty[data-p="'+b.dataset.p+'"][data-k="'+b.dataset.k+'"]');i.value=Math.max(0,(Number(i.value)||0)+(b.classList.contains('srPlus')?1:-1));calc()});d.querySelector('#soPaid').oninput=calc;calc();d.querySelector('#soSave').onclick=async()=>{const btn=d.querySelector('#soSave'),m={},e={};d.querySelectorAll('.srQty').forEach(i=>(i.dataset.p==='meals'?m:e)[i.dataset.k]=Math.max(0,Number(i.value)||0));btn.disabled=true;try{await callSundayEditor({action:editing?'update':'create',id:order.id,customer_name:d.querySelector('#soName').value,customer_phone:d.querySelector('#soPhone').value,loyalty_code:d.querySelector('#soLoyalty').value,collection_date:d.querySelector('#soDate').value,collection_slot:d.querySelector('#soSlot').value,meals:m,extras:e,payment_status:d.querySelector('#soPay').value,paid_pence:Math.round((Number(d.querySelector('#soPaid').value)||0)*100),notes:d.querySelector('#soNotes').value});d.querySelector('#soMsg').className='ok';d.querySelector('#soMsg').textContent=editing?'Changes saved.':'Test roast order created.';setTimeout(()=>{d.remove();window.DextersSundayOrders?.open?.()},500)}catch(err){d.querySelector('#soMsg').className='bad';d.querySelector('#soMsg').textContent=err.message;btn.disabled=false}}}
const srCss=document.createElement('style');srCss.textContent='.srChoiceGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.srChoice{display:grid;grid-template-columns:1fr 42px 64px 42px;align-items:center;gap:6px}.srChoice .field{margin:0;text-align:center}.srChoice button{border:0;border-radius:9px;min-height:42px;background:#203a5d;color:#fff;font-size:22px;font-weight:1000}@media(max-width:720px){.srChoiceGrid{grid-template-columns:1fr}}';document.head.appendChild(srCss);window.DextersSundayCreate=()=>sundayOptionEditor();window.DextersSundayEdit=sundayOptionEditor;
function installTop(){const sales=topButton('pcSalesBtn','Sales');if(sales)sales.onclick=salesView;const cu=topButton('pcCashupBtn','Cash up');if(cu)cu.onclick=cashup;const mo=topButton('pcMoneyBtn','Money Owed');if(mo)mo.onclick=moneyOwed;const sr=topButton('pcSundayBtn','Sunday Roast');if(sr)sr.onclick=()=>{if(window.DextersSundayOrders?.open)return window.DextersSundayOrders.open();return sunday()}}
function forceTestRoutes(){const q=$x('qrCodesBtn');if(q)q.onclick=qrCodes}
function initV3(){ensurePayCss();installPay();installTop();forceTestRoutes();const tag=document.querySelector('.tag');if(tag)tag.textContent='DEXTER\'S POS · LIVE';const st=$x('status');if(st)st.textContent='LIVE POS · connected Dexter\'s system'}
window.addEventListener('dexters-pos-features-ready',()=>{installTop();forceTestRoutes()});window.addEventListener('load',initV3);if(document.readyState!=='loading')initV3();
if(!window.__dextersPcCoreToolbarCapture){
 window.__dextersPcCoreToolbarCapture=true;
 document.addEventListener('click',e=>{
  const b=e.target?.closest?.('#pcSalesBtn,#pcCashupBtn');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(b.id==='pcSalesBtn'){salesView();return}
  if(b.id==='pcCashupBtn'){cashup();return}
 },true);
}

})();
