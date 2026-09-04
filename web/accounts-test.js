(() => {
  const $=id=>document.getElementById(id);
  const STORAGE='dextersAccountsTestLedgerV1';
  let mode='expense';
  let ledger=JSON.parse(localStorage.getItem(STORAGE)||'[]');

  const money=v=>{const n=parseFloat(String(v||'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.round(n*100)/100:0};
  const fmt=n=>'£'+Number(n||0).toFixed(2);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function setMode(next){
    mode=next;
    document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===next));
    $('expenseForm').hidden=next!=='expense';
    $('eodForm').hidden=next!=='eod';
    $('captureTitle').textContent=next==='expense'?'Scan receipt or invoice':'Scan XEPOS End-of-Day printout';
  }
  document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

  function extract(text){
    const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const joined=lines.join(' ');
    const date=joined.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
    const dateUk=date?date[1].padStart(2,'0')+'/'+date[2].padStart(2,'0')+'/'+((date[3].length===2?'20':'')+date[3]):'';
    const nums=[...joined.matchAll(/(?:£\s*)?(\d+[.,]\d{2})\b/g)].map(m=>money(m[1])).filter(n=>n>=0);
    const vatMatch=joined.match(/(?:VAT|TAX)(?:\s*\d{1,2}\s*%?)?[^0-9£]{0,18}£?\s*(\d+[.,]\d{2})/i);
    const totalMatch=joined.match(/(?:TOTAL|AMOUNT DUE|BALANCE)[^0-9£]{0,16}£?\s*(\d+[.,]\d{2})/i);
    const total=totalMatch?money(totalMatch[1]):(nums.length?Math.max(...nums):0);
    const vat=vatMatch?money(vatMatch[1]):0;
    const supplier=lines.find(l=>/[A-Za-z]{3}/.test(l)&&!/receipt|invoice|tax|vat/i.test(l))||'';

    if(mode==='expense'){
      $('supplier').value=supplier;
      $('date').value=dateUk;
      $('total').value=total||'';
      $('vat').value=vat||'';
      let refValue='';
      const refPatterns=[
        /(?:receipt\s*(?:no|number|#)?|invoice\s*(?:no|number|#)?|reference|ref\.?|order\s*(?:no|number|#)?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
        /(?:receipt|invoice|order)\s+(?:no\.?|number)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{2,})/i
      ];
      for(const re of refPatterns){
        const m=joined.match(re);
        if(m && !/^(date|time|total|vat|tax)$/i.test(m[1])){refValue=m[1];break;}
      }
      $('reference').value=refValue;
    }else{
      $('eodDate').value=dateUk;
      const find=(labels)=>{const re=new RegExp('(?:'+labels+')[^0-9£]{0,18}£?\\s*(\\d+[.,]\\d{2})','i');const m=joined.match(re);return m?money(m[1]):''};
      $('grossSales').value=find('gross sales|total sales|gross total');
      $('cardSales').value=find('card sales|card total|cards');
      $('cashSales').value=find('cash sales|cash total|cash');
      $('refunds').value=find('refunds?|returns?');
      $('eodVat').value=find('vat|tax');
    }
  }

  async function readImage(file){
    if(!file)return;
    $('preview').src=URL.createObjectURL(file); $('preview').hidden=false;
    $('ocrStatus').textContent='Reading image on this tablet…'; $('progress').hidden=false; $('bar').style.width='4%';
    try{
      if(!window.Tesseract) throw new Error('OCR library unavailable');
      const result=await Tesseract.recognize(file,'eng',{logger:m=>{
        if(m.status==='recognizing text'){
          const p=Math.max(4,Math.round((m.progress||0)*100));
          $('bar').style.width=p+'%';
          $('ocrStatus').textContent='Reading text… '+p+'%';
        } else if(m.status) $('ocrStatus').textContent=m.status;
      }});
      const text=result?.data?.text||'';
      $('rawText').value=text;
      extract(text);
      $('bar').style.width='100%'; $('ocrStatus').textContent='Scan complete — review the fields below before saving.';
    }catch(err){
      $('ocrStatus').textContent='Could not read this image automatically. You can type or paste the details manually.';
    }
  }

  $('cameraInput')?.addEventListener('change',e=>readImage(e.target.files?.[0]));
  $('uploadInput')?.addEventListener('change',e=>readImage(e.target.files?.[0]));

  $('rawText').addEventListener('change',()=>extract($('rawText').value));

  function save(item){
    ledger.unshift({...item,id:Date.now()+'-'+Math.random().toString(16).slice(2)});
    localStorage.setItem(STORAGE,JSON.stringify(ledger)); render();
  }

  $('saveExpense').onclick=()=>{
    save({type:'expense',supplier:$('supplier').value||'Unknown supplier',date:$('date').value,total:money($('total').value),vat:money($('vat').value),category:$('category').value,reference:$('reference').value,notes:$('notes').value,raw:$('rawText').value});
    ['supplier','date','total','vat','reference','notes','rawText'].forEach(id=>$(id).value=''); $('preview').hidden=true; $('ocrStatus').textContent='Expense saved to test ledger.';
  };
  $('saveEod').onclick=()=>{
    save({type:'eod',date:$('eodDate').value,gross:money($('grossSales').value),card:money($('cardSales').value),cash:money($('cashSales').value),refunds:money($('refunds').value),vat:money($('eodVat').value),raw:$('rawText').value});
    ['eodDate','grossSales','cardSales','cashSales','refunds','eodVat','rawText'].forEach(id=>$(id).value=''); $('preview').hidden=true; $('ocrStatus').textContent='EOD report saved to test ledger.';
  };

  $('clearAll').onclick=()=>{if(confirm('Clear all Accounts & Receipts test data from this tablet?')){ledger=[];localStorage.removeItem(STORAGE);render()}};

  function render(){
    const expenses=ledger.filter(x=>x.type==='expense'), eods=ledger.filter(x=>x.type==='eod');
    const spend=expenses.reduce((a,x)=>a+money(x.total),0), vat=expenses.reduce((a,x)=>a+money(x.vat),0);
    $('summary').innerHTML='<div><small>Saved expenses</small><b>'+expenses.length+'</b></div><div><small>Total spend</small><b>'+fmt(spend)+'</b></div><div><small>VAT captured</small><b>'+fmt(vat)+'</b></div>';
    $('ledger').innerHTML=ledger.length?ledger.map(x=>x.type==='expense'
      ?'<div class="entry"><div><strong>'+esc(x.supplier)+'</strong><br><small>'+esc(x.date||'No date')+' · '+esc(x.category||'Other')+(x.reference?' · '+esc(x.reference):'')+'</small></div><div><strong>'+fmt(x.total)+'</strong><br><small>VAT '+fmt(x.vat)+'</small></div><button data-id="'+x.id+'">Delete</button></div>'
      :'<div class="entry"><div><strong>XEPOS End-of-Day</strong><br><small>'+esc(x.date||'No date')+' · Card '+fmt(x.card)+' · Cash '+fmt(x.cash)+'</small></div><div><strong>'+fmt(x.gross)+'</strong><br><small>Refunds '+fmt(x.refunds)+'</small></div><button data-id="'+x.id+'">Delete</button></div>'
    ).join(''):'<p class="muted">No test entries saved yet.</p>';
    document.querySelectorAll('.entry button').forEach(b=>b.onclick=()=>{ledger=ledger.filter(x=>x.id!==b.dataset.id);localStorage.setItem(STORAGE,JSON.stringify(ledger));render()});
  }
  render();
})();