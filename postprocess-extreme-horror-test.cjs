const fs=require('fs');
const p='dist/website-test.html';
if(!fs.existsSync(p)) process.exit(0);
let s=fs.readFileSync(p,'utf8');
if(s.includes('EXTREME HORROR SLASHER TEST')) process.exit(0);
const css=`<style id="extremeHorrorSlasher">/* EXTREME HORROR SLASHER TEST */
body.season-halloween{background:#020001!important;color:#fff;overflow-x:hidden;background-image:radial-gradient(circle at 50% -10%,#7a0017 0,#220007 24%,#050001 52%,#000 100%)!important;font-family:Georgia,'Times New Roman',serif!important}
body.season-halloween:before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background:repeating-linear-gradient(110deg,transparent 0 22px,#ffffff05 23px 24px,transparent 25px 50px),linear-gradient(90deg,#0008,transparent 30%,transparent 70%,#000a);mix-blend-mode:screen;opacity:.55}
.season-halloween .top{background:#020001f4!important;border-bottom:1px solid #9b001c!important;box-shadow:0 8px 28px #000}
.season-halloween .hero{min-height:760px!important;display:flex;align-items:center;background:radial-gradient(circle at 72% 30%,#a9001b44,transparent 18%),linear-gradient(180deg,#02000144,#000 95%)!important;isolation:isolate}
.season-halloween .hero:before{content:'';position:absolute;inset:-10%;z-index:-2;background:linear-gradient(90deg,#000 0 54%,transparent 70%),radial-gradient(ellipse at 83% 38%,#efe9df1a 0 6%,transparent 7%),radial-gradient(ellipse at 83% 43%,#050001 0 3%,transparent 3.5%),radial-gradient(ellipse at 88% 43%,#050001 0 3%,transparent 3.5%),radial-gradient(ellipse at 85.5% 50%,#efe9df18 0 9%,transparent 9.5%);filter:contrast(1.35)}
.season-halloween .hero:after{content:'DON’T LOOK BEHIND YOU';position:absolute;right:4%;bottom:9%;font:900 clamp(16px,2vw,28px)/1 system-ui;letter-spacing:.26em;color:#8d0018;transform:rotate(-4deg);text-shadow:0 0 20px #ff002244}
.season-halloween h1{font-family:Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif!important;text-transform:uppercase;letter-spacing:.01em!important;text-shadow:3px 3px 0 #4b000b,0 0 28px #b80020,0 0 70px #5d000f!important;filter:drop-shadow(0 14px 18px #000)}
.season-halloween h1:after{content:'EXTREME HORROR SLASHER TEST';display:block!important;margin-top:18px!important;font:900 13px/1.2 system-ui!important;letter-spacing:.32em!important;color:#d8c5bd!important}
.season-halloween .eyebrow{color:#d6c6bd!important;text-shadow:0 0 12px #a6001b}
.season-halloween .lead{color:#e0d7d4!important;max-width:690px}
.season-halloween .card{position:relative;overflow:hidden;border:1px solid #6e0014!important;border-radius:2px 28px 2px 18px!important;background:linear-gradient(145deg,#1c0207 0,#070001 64%,#020001 100%)!important;box-shadow:0 20px 55px #000,inset 0 0 35px #5f001155!important}
.season-halloween .card:before{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(165deg,transparent 0 29px,#ffffff07 30px 31px,transparent 32px 57px);opacity:.5}
.season-halloween .card h2,.season-halloween .card h3{position:relative;color:#fff;text-shadow:0 0 12px #8d0018}
.season-halloween .btn{background:linear-gradient(180deg,#d7ccc5,#94847b 48%,#740014 49%,#410009)!important;color:#0b0002!important;border:1px solid #e3d4cd!important;border-radius:3px!important;box-shadow:0 6px 0 #2e0007,0 0 24px #8f001b77!important;text-transform:uppercase;letter-spacing:.08em}
.season-halloween .btn.alt{color:#fff!important;background:linear-gradient(#1c0308,#080002)!important;border-color:#6e0014!important}
.season-halloween .btn:hover{transform:translateY(-1px) rotate(-.3deg);filter:brightness(1.15)}
.season-halloween .legal a{background:#070001!important;border-color:#570010!important;border-radius:1px 16px 1px 10px!important;box-shadow:inset 0 0 20px #4a000d33}
.season-halloween .section:nth-of-type(even){background:linear-gradient(180deg,transparent,#24000633,transparent)}
.horror-stage{display:none}.season-halloween .horror-stage{display:block;position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.horror-stalker{position:absolute;right:4%;top:14%;width:210px;height:470px;opacity:.72;filter:blur(.2px) drop-shadow(0 0 28px #000);animation:stalkerPulse 5.2s ease-in-out infinite}
.horror-stalker:before{content:'';position:absolute;left:48px;top:0;width:112px;height:132px;border-radius:48% 48% 45% 45%;background:radial-gradient(circle at 34% 38%,#050001 0 8px,transparent 9px),radial-gradient(circle at 68% 38%,#050001 0 8px,transparent 9px),radial-gradient(ellipse at 50% 72%,#070001 0 34px,transparent 35px),linear-gradient(#cfc7c1,#887b75);box-shadow:inset 0 0 26px #000b,0 0 25px #c4002233;transform:rotate(3deg)}
.horror-stalker:after{content:'';position:absolute;left:15px;top:115px;width:180px;height:360px;clip-path:polygon(29% 0,70% 0,86% 26%,100% 100%,0 100%,14% 26%);background:linear-gradient(#070101,#000)}
.creepy-smile{position:absolute;left:6%;bottom:10%;width:210px;height:120px;opacity:.17;transform:rotate(-8deg)}
.creepy-smile:before{content:'';position:absolute;inset:0;border-bottom:17px solid #fff;border-radius:0 0 50% 50%;filter:drop-shadow(0 0 16px #fff)}
.eye-pair{position:absolute;width:92px;height:30px;opacity:.25;animation:blink 7s infinite}.eye-pair:before,.eye-pair:after{content:'';position:absolute;top:5px;width:23px;height:13px;border-radius:50%;background:#ddd;box-shadow:0 0 10px #fff}.eye-pair:before{left:10px}.eye-pair:after{right:10px}.eye1{left:9%;top:23%}.eye2{right:27%;top:68%;animation-delay:-3.5s}.eye3{left:42%;top:82%;animation-delay:-1.8s}
.slash{position:absolute;height:2px;width:280px;background:linear-gradient(90deg,transparent,#ddd,#750014,transparent);opacity:.22;transform:rotate(-18deg);box-shadow:0 0 8px #fff}.slash1{top:36%;left:-30px}.slash2{top:61%;right:-50px;transform:rotate(17deg)}
.noise{position:fixed;inset:0;z-index:8;pointer-events:none;opacity:.055;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.95' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.9'/%3E%3C/svg%3E")}
.season-halloween .blood{height:24px!important;background:linear-gradient(90deg,#6c0012 0 9%,transparent 9% 14%,#930018 14% 27%,transparent 27% 38%,#670010 38% 52%,transparent 52% 62%,#8e0018 62% 80%,transparent 80%)!important;filter:drop-shadow(0 10px 8px #000)}
.season-halloween .blood:after{height:96px!important;width:10px!important;box-shadow:190px 10px 0 #59000f,430px -2px 0 #8a0017,750px 24px 0 #660011,980px -6px 0 #840016!important}
.season-halloween .fog{opacity:.24!important;height:250px!important;background:#d6d6d622!important;filter:blur(55px)!important}
@keyframes stalkerPulse{0%,100%{transform:translateY(0) scale(1);opacity:.58}50%{transform:translateY(7px) scale(1.015);opacity:.82}}
@keyframes blink{0%,44%,48%,100%{transform:scaleY(1)}45%,47%{transform:scaleY(.05)}}
@media(max-width:820px){.season-halloween .hero{min-height:760px!important}.horror-stalker{right:-78px;top:23%;transform:scale(.76);opacity:.44}.season-halloween .hero:after{font-size:13px;right:2%;bottom:5%;letter-spacing:.16em}.creepy-smile{width:150px;bottom:4%;opacity:.12}}
@media(prefers-reduced-motion:reduce){.horror-stalker,.eye-pair{animation:none!important}}
</style>`;
s=s.replace('</head>',css+'</head>');
const stage=`<div class="horror-stage" aria-hidden="true"><div class="horror-stalker"></div><div class="creepy-smile"></div><div class="eye-pair eye1"></div><div class="eye-pair eye2"></div><div class="eye-pair eye3"></div><div class="slash slash1"></div><div class="slash slash2"></div></div><div class="noise" aria-hidden="true"></div>`;
s=s.replace('<main>',stage+'<main>');
s=s.replace('Big food.<br>Proper flavour.','COME HUNGRY.<br>LEAVE BEFORE DARK.');
s=s.replace('Collection ordering, Sunday Roast pre-orders, catering, rewards and customer information in one professional Dexter’s website.','Dexter’s after dark: an original extreme slasher-horror Halloween experience. The scares are fictional. The food, ordering and customer information are very real.');
fs.writeFileSync(p,s);
console.log('Applied original extreme horror slasher test theme');
