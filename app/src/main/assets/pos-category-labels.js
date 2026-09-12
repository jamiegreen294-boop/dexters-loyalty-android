(()=>{'use strict';
if(window.__dextersCategoryLabelsInstalled)return;
window.__dextersCategoryLabelsInstalled=true;
try{
  if(typeof renderCart!=='function')return;
  const baseRenderCart=renderCart;
  renderCart=function(){
    baseRenderCart();
    try{
      const cards=[...document.querySelectorAll('#lines .line')];
      cards.forEach((card,i)=>{
        const line=S?.cart?.[i];
        const cat=String(line?.category||'').trim();
        if(!cat)return;
        const label=document.createElement('div');
        label.className='mods';
        label.style.color='#ffd43b';
        label.style.fontWeight='1000';
        label.style.textTransform='uppercase';
        label.style.letterSpacing='.04em';
        label.style.marginBottom='4px';
        label.textContent=cat;
        card.insertBefore(label,card.firstChild);
      });
    }catch(e){}
  };
  renderCart();
}catch(e){}
})();
