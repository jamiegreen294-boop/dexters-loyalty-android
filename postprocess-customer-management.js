const fs=require('fs');
const p='dist/index.html';let s=fs.readFileSync(p,'utf8');
for(const id of ['dextersCustomerManagementLoader','dextersCustomerManagementVisibilityFix','dextersNewsBannerLoader','dxCombinedCustomerNewsScript'])s=s.replace(new RegExp('<script id="'+id+'"[^>]*>[\\s\\S]*?<\\/script>','g'),'');
s=s.replace(/<style id="dxCombinedCustomerNewsStyle">[\s\S]*?<\/style>/g,'');
const loader='<script id="dextersCustomerManagementLoader" src="/customer-management-live.js"></script><script id="dextersNewsBannerLoader" src="/news-banner-live.js"></script>';
if(!s.includes('</body>'))throw new Error('Missing app body');
s=s.replace('</body>',loader+'</body>');
for(const file of ['customer-management-live.js','news-banner-live.js'])fs.copyFileSync('web/'+file,'dist/'+file);
fs.writeFileSync(p,s);console.log('Combined customer management, deletion and news modules included once');
