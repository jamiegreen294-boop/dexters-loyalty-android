const fs=require('fs'),path=require('path');
const p=path.join(__dirname,'dist','index.html');
let s=fs.readFileSync(p,'utf8');
const css=`<style id="dextersWorkLayoutTest">
/* TEST BRANCH ONLY: approved Work-era customer visual shell. Functional DOM/scripts remain current main. */
body:has(#homePage:not(.hidden)){background:#f7f7f5!important;color:#151515!important}
body:has(#homePage:not(.hidden)) .wrap{max-width:430px!important;padding:18px 16px 100px!important}
body:has(#homePage:not(.hidden)) #homePage{color:#151515!important}
body:has(#homePage:not(.hidden)) #homePage>.card{background:#fff!important;color:#151515!important;border:0!important;border-radius:18px!important;box-shadow:0 6px 18px rgba(0,0,0,.05)!important}
body:has(#homePage:not(.hidden)) #homePage h1,body:has(#homePage:not(.hidden)) #homePage h2,body:has(#homePage:not(.hidden)) #homePage h3{color:#151515!important}
body:has(#homePage:not(.hidden)) #homePage .btn{background:#111!important;color:#fff!important;border-radius:16px!important}
body:has(#homePage:not(.hidden)) #collectionOrderLiveCard{order:-20;border-radius:22px!important;padding:20px!important;box-shadow:0 8px 24px rgba(0,0,0,.06)!important}
body:has(#homePage:not(.hidden)) #collectionOrderLiveCard h2{font-size:26px!important;line-height:1.05!important;margin-bottom:8px!important}
body:has(#homePage:not(.hidden)) #collectionOrderLiveCard p{color:#6f6f6f!important}
body:has(#homePage:not(.hidden)) #seasonBanner{max-width:430px!important}
@media(max-width:460px){body:has(#homePage:not(.hidden)) .wrap{padding-left:16px!important;padding-right:16px!important}}
</style>`;
if(!s.includes('dextersWorkLayoutTest'))s=s.replace('</head>',css+'</head>');
fs.writeFileSync(p,s);
console.log('Work-layout test shell applied; current app logic preserved');
