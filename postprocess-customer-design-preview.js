const fs=require('fs');
const p='dist/index.html';
if(!fs.existsSync(p)) throw new Error('dist/index.html missing');
let s=fs.readFileSync(p,'utf8');
const addon=`<style id="dextersCustomerPreviewStyle">
body.dexters-customer-preview{--white:#151515;--muted:#6f6f6f;--card:#fff;--yellow:#111;--orange:#111;--navy:#f7f7f5;--navy2:#f7f7f5;background:#f7f7f5;color:#151515}
body.dexters-customer-preview .wrap{max-width:430px;padding:18px 16px 96px;background:#f7f7f5;min-height:100vh}
body.dexters-customer-preview .logo{display:none}
body.dexters-customer-preview #customerPreviewHeader{display:flex;align-items:center;justify-content:space-between;margin:2px 0 14px}
#customerPreviewHeader{display:none}
body.dexters-customer-preview #customerPreviewHeader .brand{font-weight:900;font-size:28px;letter-spacing:-1px}
body.dexters-customer-preview #customerPreviewHeader .pill{background:#e8f4ec;color:#146b3a;padding:7px 10px;border-radius:999px;font-size:12px;font-weight:800}
body.dexters-customer-preview #homePage>.card,body.dexters-customer-preview #qrPage>.card,body.dexters-customer-preview #spinPage>.card,body.dexters-customer-preview #menuPage>.card,body.dexters-customer-preview #accountPage>.card{background:#fff;border:0;border-radius:20px;box-shadow:0 6px 18px rgba(0,0,0,.05);color:#151515;margin:12px 0;padding:17px}
body.dexters-customer-preview #homePage>.card:first-child{padding:16px 18px;margin-top:4px}
body.dexters-customer-preview #homePage>.card:nth-child(2){border-radius:22px;padding:20px;box-shadow:0 8px 24px rgba(0,0,0,.06)}
body.dexters-customer-preview #homePage>.card:nth-child(2) h2{font-size:23px;letter-spacing:-.4px;margin-bottom:8px}
body.dexters-customer-preview .big{font-size:28px;letter-spacing:-.7px}
body.dexters-customer-preview .muted{color:#6f6f6f}
body.dexters-customer-preview .stamps{gap:8px;margin:14px 0}
body.dexters-customer-preview .stamp{background:#efefec;border-color:#d3d3cf;color:#151515}
body.dexters-customer-preview .stamp.on{background:#111;border-color:#111;color:#fff}
body.dexters-customer-preview .progress{height:12px;background:#ecece8}
body.dexters-customer-preview .bar{background:#111}
body.dexters-customer-preview .reward{border:0;background:#fff}
body.dexters-customer-preview .offer,body.dexters-customer-preview .co-box{background:#f5f5f2;border:0;border-radius:16px;color:#151515}
body.dexters-customer-preview .btn{border-radius:16px;min-height:48px;font-weight:900}
body.dexters-customer-preview .primary{background:#111;color:#fff}
body.dexters-customer-preview .secondary{background:#efefec;color:#151515}
body.dexters-customer-preview .danger{background:#f3dede;color:#8b2222}
body.dexters-customer-preview .input{background:#f4f4f1;border:1px solid #deded9;color:#151515}
body.dexters-customer-preview .tabs{background:#efefec}
body.dexters-customer-preview .tab{color:#666}
body.dexters-customer-preview .tab.active{background:#fff;color:#111}
body.dexters-customer-preview #collectionOrderLiveCard{background:#111!important;color:#fff!important;border-radius:20px!important}
body.dexters-customer-preview #collectionOrderLiveCard p{color:#d6d6d6}
body.dexters-customer-preview #collectionOrderLiveCard .btn{background:#fff;color:#111}
body.dexters-customer-preview #bottomNav{background:rgba(255,255,255,.95);border-top:1px solid #e8e8e5;backdrop-filter:blur(10px)}
body.dexters-customer-preview #bottomNav button{color:#777;padding:9px 3px}
body.dexters-customer-preview #bottomNav button.active{color:#111;font-weight:900}
body.dexters-customer-preview #qr{border:1px solid #ecece8}
body.dexters-customer-preview .code,body.dexters-customer-preview .menu-price{color:#111}
body.dexters-customer-preview .menu-chip{background:#fff;border:1px solid #deded9;color:#333}
body.dexters-customer-preview .menu-chip.active{background:#111;color:#fff;border-color:#111}
body.dexters-customer-preview .menu-note{background:#f4f4f1;color:#666}
body.dexters-customer-preview .menu-item{border-bottom:1px solid #ecece8}
body.dexters-customer-preview .spin-wheel{border-color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.10);background:conic-gradient(#111 0 45deg,#efefec 45deg 90deg,#777 90deg 135deg,#efefec 135deg 180deg,#111 180deg 225deg,#efefec 225deg 270deg,#777 270deg 315deg,#efefec 315deg)}
body.dexters-customer-preview .spin-wheel-center{background:#fff;color:#111}
@media(max-width:360px){body.dexters-customer-preview .wrap{padding-left:12px;padding-right:12px}body.dexters-customer-preview .stamp{font-size:22px}}
</style><script id="dextersCustomerPreviewScript">(function(){var body=document.body,app=document.getElementById('appView'),wrap=document.querySelector('.wrap');if(!body||!wrap)return;var head=document.getElementById('customerPreviewHeader');if(!head){head=document.createElement('div');head.id='customerPreviewHeader';head.innerHTML='<div class="brand">DEXTER&#39;S</div><div class="pill" id="customerPreviewPill">Collection</div>';wrap.insertBefore(head,wrap.firstChild)}function activePage(){var pages=document.querySelectorAll('#appView .page');for(var i=0;i<pages.length;i++){if(!pages[i].classList.contains('hidden'))return pages[i].id}return''}function syncPill(){var p=document.getElementById('customerPreviewPill'),st=document.getElementById('collectionLiveState');if(!p)return;var t=((st&&st.textContent)||'').toUpperCase();if(t.indexOf('OPEN')>-1){p.textContent='Collection OPEN';p.style.background='#e8f4ec';p.style.color='#146b3a'}else if(t.indexOf('CLOSED')>-1){p.textContent='Collection CLOSED';p.style.background='#f7e4e4';p.style.color='#8b2c2c'}else{p.textContent='Collection';p.style.background='#efefec';p.style.color='#555'}}function apply(){var signed=app&&!app.classList.contains('hidden'),page=activePage(),customer=signed&&page&&page!=='staffPage';body.classList.toggle('dexters-customer-preview',!!customer);head.style.display=customer?'flex':'none';syncPill()}document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-page]');if(b){setTimeout(apply,30);setTimeout(apply,300)}});new MutationObserver(function(){apply()}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});setInterval(syncPill,1500);setTimeout(apply,100);setTimeout(apply,700)})();</script>`;
if(!s.includes('dextersCustomerPreviewScript')) s=s.replace('</body>',addon+'</body>');
if(!s.includes('dextersCustomerPreviewScript')) throw new Error('Customer preview injection failed');
fs.writeFileSync(p,s);
console.log('Applied isolated customer design preview');
