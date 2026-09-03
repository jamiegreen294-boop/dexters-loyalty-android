const fs=require('fs');
const p='dist/website-test.html';
if(!fs.existsSync(p)) process.exit(0);
let s=fs.readFileSync(p,'utf8');

// Remove experimental horror-only layers injected by earlier test postprocessors.
s=s.replace(/<style id="extremeHorrorSlasher">[\s\S]*?<\/style>/g,'');
s=s.replace(/<style id="blood-drip-curtain-css">[\s\S]*?<\/style>/g,'');
s=s.replace(/<div class="blood-drip-curtain"[\s\S]*?<\/div>/g,'');
s=s.replace(/<div class="horror-stage"[\s\S]*?<\/div>/g,'');
s=s.replace(/<div class="vignette"[^>]*><\/div>/g,'');
s=s.replace(/<div class="noise"[^>]*><\/div>/g,'');
s=s.replace(/<script id="blood-drip-curtain-js">[\s\S]*?<\/script>/g,'');

// Force the website preview to stay on the normal Dexter's theme while this redesign is tested.
const normalCss=`<style id="normalWebsiteThemeTest">
body{background:linear-gradient(#151e2b,#080c12)!important;color:#fff!important;font-family:system-ui,-apple-system,Segoe UI,sans-serif!important}
body.season-halloween,body.season-christmas,body.season-valentines{--bg:#0b0f14!important;--panel:#151e2b!important;--ink:#fff!important;--muted:#b9c4d0!important;--gold:#ffd36d!important;--accent:#ff8a00!important;background:linear-gradient(#151e2b,#080c12)!important;font-family:system-ui,-apple-system,Segoe UI,sans-serif!important}
.season-halloween .top,.season-christmas .top,.season-valentines .top{background:#080c12eb!important;border-bottom:1px solid #ffffff20!important;box-shadow:none!important}
.season-halloween .hero,.season-christmas .hero,.season-valentines .hero{min-height:auto!important;background:none!important;padding:74px 0 46px!important}
.season-halloween h1,.season-christmas h1,.season-valentines h1{text-shadow:none!important;filter:none!important;font-family:system-ui,-apple-system,Segoe UI,sans-serif!important;text-transform:none!important;letter-spacing:-.055em!important}
.season-halloween h1:after,.season-christmas h1:after,.season-valentines h1:after{display:none!important;content:none!important}
.season-halloween .card,.season-christmas .card,.season-valentines .card{background:linear-gradient(145deg,#ffffff08,#ffffff01),#151e2b!important;border:1px solid #ffffff20!important;border-radius:22px!important;box-shadow:none!important}
.season-halloween .btn,.season-christmas .btn,.season-valentines .btn{background:linear-gradient(90deg,#ffd36d,#ff8a00)!important;color:#111!important;border:0!important;border-radius:14px!important;box-shadow:none!important;text-transform:none!important;letter-spacing:normal!important}
.season-halloween .btn.alt,.season-christmas .btn.alt,.season-valentines .btn.alt{background:#223148!important;color:#fff!important;border:1px solid #ffffff20!important}
.season-halloween .legal a,.season-christmas .legal a,.season-valentines .legal a{background:#101824!important;border:1px solid #ffffff20!important;border-radius:14px!important}
.season-halloween .blood,.season-halloween .ghost,.season-halloween .fog{display:none!important}
@media(max-width:820px){.season-halloween .hero,.season-christmas .hero,.season-valentines .hero{min-height:auto!important;padding-top:44px!important}}
</style>`;
s=s.replace('</head>',normalCss+'</head>');
s=s.replace('</body>',`<script id="force-normal-website-theme">document.body.classList.remove('season-halloween','season-christmas','season-valentines');</script></body>`);
fs.writeFileSync(p,s);
console.log('Forced normal non-horror theme for website test');
