const fs=require('fs');
const p='dist/website-test.html';
if(!fs.existsSync(p)) process.exit(0);
let s=fs.readFileSync(p,'utf8');
if(s.includes('blood-drip-curtain')) process.exit(0);
const css=`<style id="blood-drip-curtain-css">
.blood-drip-curtain{display:none}
.season-halloween .blood-drip-curtain{display:block;position:fixed;left:0;right:0;top:0;height:155px;z-index:9999;pointer-events:none;overflow:hidden;filter:drop-shadow(0 7px 9px #000a)}
.blood-drip-curtain .blood-sheet{position:absolute;left:0;right:0;top:0;height:34px;background:linear-gradient(180deg,#9e0019 0%,#760012 52%,#3c0008 100%);box-shadow:inset 0 -8px 10px #2b0007aa,0 4px 8px #000a}
.blood-drip-curtain .blood-sheet:after{content:'';position:absolute;left:0;right:0;bottom:-12px;height:25px;background:radial-gradient(ellipse at 4% 0,#760012 0 15px,transparent 16px),radial-gradient(ellipse at 11% 0,#8d0017 0 21px,transparent 22px),radial-gradient(ellipse at 19% 0,#5c000e 0 13px,transparent 14px),radial-gradient(ellipse at 29% 0,#970018 0 24px,transparent 25px),radial-gradient(ellipse at 42% 0,#6b0011 0 18px,transparent 19px),radial-gradient(ellipse at 55% 0,#8f0017 0 23px,transparent 24px),radial-gradient(ellipse at 68% 0,#63000f 0 15px,transparent 16px),radial-gradient(ellipse at 78% 0,#990019 0 25px,transparent 26px),radial-gradient(ellipse at 91% 0,#6f0012 0 18px,transparent 19px)}
.blood-drop{position:absolute;top:20px;width:12px;border-radius:0 0 55% 55%;background:linear-gradient(90deg,#4b000b,#980018 48%,#5d000e);transform-origin:top center;animation:bloodGrow var(--speed,5s) ease-in-out infinite alternate;box-shadow:inset 2px 0 3px #c5002022,0 2px 5px #0009}
.blood-drop:after{content:'';position:absolute;left:50%;bottom:-8px;width:18px;height:18px;transform:translateX(-50%);border-radius:50%;background:#790013;box-shadow:inset 2px 2px 3px #b8001d55}
.d1{left:5%;height:86px;--speed:4.7s}.d2{left:13%;height:50px;width:9px;--speed:6.2s;animation-delay:-2s}.d3{left:22%;height:118px;width:14px;--speed:5.4s;animation-delay:-1s}.d4{left:31%;height:68px;--speed:4.3s;animation-delay:-3.4s}.d5{left:44%;height:132px;width:13px;--speed:6.8s;animation-delay:-4s}.d6{left:56%;height:74px;width:10px;--speed:5.1s;animation-delay:-2.6s}.d7{left:66%;height:105px;width:15px;--speed:4.9s;animation-delay:-1.6s}.d8{left:76%;height:58px;width:9px;--speed:6.5s;animation-delay:-4.7s}.d9{left:87%;height:126px;width:13px;--speed:5.7s;animation-delay:-3.1s}.d10{left:95%;height:82px;width:11px;--speed:4.6s;animation-delay:-2.1s}
@keyframes bloodGrow{0%{transform:scaleY(.48)}40%{transform:scaleY(.7)}100%{transform:scaleY(1)}}
@media(max-width:820px){.season-halloween .blood-drip-curtain{height:135px}.d3,.d5,.d7,.d9{transform-origin:top center}.blood-drop{opacity:.96}}
@media(prefers-reduced-motion:reduce){.blood-drop{animation:none!important}}
</style>`;
const html=`<div class="blood-drip-curtain" aria-hidden="true"><div class="blood-sheet"></div><i class="blood-drop d1"></i><i class="blood-drop d2"></i><i class="blood-drop d3"></i><i class="blood-drop d4"></i><i class="blood-drop d5"></i><i class="blood-drop d6"></i><i class="blood-drop d7"></i><i class="blood-drop d8"></i><i class="blood-drop d9"></i><i class="blood-drop d10"></i></div>`;
s=s.replace('</head>',css+'</head>');
s=s.replace('<body>', '<body>'+html);
fs.writeFileSync(p,s);
console.log('Added animated blood drip curtain to Halloween website test');
