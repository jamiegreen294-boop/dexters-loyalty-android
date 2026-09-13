const fs=require('fs');
for(const p of ['dist/pos.html','dist/pos-test.html']){
  if(!fs.existsSync(p))continue;
  let s=fs.readFileSync(p,'utf8');
  if(!s.includes('/pos-pc-scanner.js')) s=s.replace('</body>','<script src="/pos-pc-scanner.js"></script>\n</body>');
  if(!s.includes('/pos-pc-loyalty-test.js')) s=s.replace('</body>','<script src="/pos-pc-loyalty-test.js"></script>\n</body>');
  if(!s.includes('pc-test-money-owed-layout')) s=s.replace('</body>',`<script id="pc-test-money-owed-layout">(function(){
    function alignMoneyOwed(){
      const top=document.querySelector('.top'),btn=document.getElementById('creditLaunch');
      if(!top||!btn)return;
      if(btn.parentElement!==top){
        const staff=document.getElementById('staffBtn');
        top.insertBefore(btn,staff||top.querySelector('.spacer')?.nextSibling||null);
      }
      btn.textContent='Money Owed';
      btn.style.position='static';btn.style.top='auto';btn.style.right='auto';btn.style.bottom='auto';
      btn.style.zIndex='auto';btn.style.boxShadow='none';btn.style.margin='0';
      btn.style.border='0';btn.style.borderRadius='12px';btn.style.padding='10px 12px';
      btn.style.fontWeight='900';btn.style.background='#162a45';btn.style.color='#fff';
    }
    window.addEventListener('load',()=>{alignMoneyOwed();setTimeout(alignMoneyOwed,150);setTimeout(alignMoneyOwed,600)});
    new MutationObserver(alignMoneyOwed).observe(document.documentElement,{childList:true,subtree:true});
  })();</script>\n</body>`);
  if(!s.includes('pc-test-safety')) s=s.replace('</body>',`<script id="pc-test-safety">window.addEventListener('load',()=>{const b=document.getElementById('sendBtn');if(b){b.disabled=true;b.textContent='KDS TEST DISABLED';b.title='PC test safety: live KDS sending is blocked until an isolated test KDS route is connected';b.style.opacity='.55'};});</script>\n</body>`);
  s=s.replace('DEXTER\'S TERMINAL','PC TEST · DEXTER\'S TERMINAL');
  fs.writeFileSync(p,s);
}
fs.copyFileSync('web/pos-pc-scanner.js','dist/pos-pc-scanner.js');
fs.copyFileSync('web/pos-pc-loyalty-test.js','dist/pos-pc-loyalty-test.js');
