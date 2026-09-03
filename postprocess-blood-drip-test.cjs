const fs=require('fs');
const p='dist/website-test.html';
if(!fs.existsSync(p)) process.exit(0);
let s=fs.readFileSync(p,'utf8');
const css=`<style id="blood-drip-curtain-css">
.blood-drip-curtain{display:none}
.season-halloween .blood-drip-curtain{display:block;position:fixed;inset:0 0 auto 0;height:210px;z-index:9999;pointer-events:none;overflow:visible;filter:drop-shadow(0 8px 10px #000b)}
.blood-drip-curtain svg{display:block;width:100%;height:210px;overflow:visible}
.blood-drip-curtain .blood-main{fill:url(#bloodFill);stroke:#2b0007;stroke-width:1.5;filter:url(#bloodShadow)}
.blood-drip-curtain .blood-edge{fill:none;stroke:#b41426;stroke-opacity:.32;stroke-width:2}
.blood-drip-curtain .drip{transform-box:fill-box;transform-origin:50% 0;animation:dripPulse var(--t,8s) ease-in-out infinite alternate}
.blood-drip-curtain .falling-drop{animation:dropFall var(--f,7s) cubic-bezier(.45,.05,.65,.95) infinite;opacity:0}
.blood-drip-curtain .highlight{fill:#d83a47;opacity:.16;filter:blur(1px)}
@keyframes dripPulse{0%{transform:scaleY(.88)}45%{transform:scaleY(.96)}100%{transform:scaleY(1.08)}}
@keyframes dropFall{0%,57%{transform:translateY(0) scale(.75);opacity:0}60%{opacity:.85}72%{transform:translateY(26px) scale(.95);opacity:.9}100%{transform:translateY(105px) scale(.55);opacity:0}}
@media(max-width:820px){.season-halloween .blood-drip-curtain{height:180px}.blood-drip-curtain svg{height:180px}}
@media(prefers-reduced-motion:reduce){.blood-drip-curtain .drip,.blood-drip-curtain .falling-drop{animation:none!important}}
</style>`;
const html=`<div class="blood-drip-curtain" aria-hidden="true"><svg viewBox="0 0 1200 210" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bloodFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9f1020"/><stop offset="0.42" stop-color="#7c0715"/><stop offset="0.78" stop-color="#56000c"/><stop offset="1" stop-color="#350006"/></linearGradient><filter id="bloodShadow" x="-5%" y="-10%" width="110%" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur"/><feOffset dy="3" result="off"/><feColorMatrix in="off" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .7 0" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path class="blood-main" d="M0 0H1200V31 C1160 30 1132 48 1094 40 C1054 31 1024 55 988 47 C943 36 920 66 878 55 C835 43 802 73 758 60 C719 48 690 79 647 63 C604 47 573 82 530 66 C489 51 455 85 414 68 C371 51 338 82 300 66 C257 48 226 77 184 61 C142 45 106 71 70 55 C44 44 22 50 0 58 Z M82 49 C89 72 87 100 92 128 C95 145 107 151 111 128 C116 101 108 74 114 52 Z M236 58 C242 86 237 116 245 152 C249 171 262 175 267 150 C272 118 264 86 271 60 Z M389 65 C396 87 392 105 401 132 C405 146 415 149 421 131 C428 106 417 87 424 66 Z M528 64 C536 94 530 130 541 169 C546 188 561 191 568 164 C574 129 563 95 571 65 Z M705 59 C713 82 707 108 716 138 C720 153 732 158 738 136 C744 107 734 82 741 59 Z M862 54 C870 83 865 120 875 158 C880 177 893 180 900 156 C906 120 894 83 902 53 Z M1034 45 C1041 68 1037 92 1046 120 C1051 136 1061 139 1067 118 C1073 92 1062 69 1070 45 Z"/><path class="blood-edge" d="M0 57 C36 48 47 44 70 55 C106 71 142 45 184 61 C226 77 257 48 300 66 C338 82 371 51 414 68 C455 85 489 51 530 66 C573 82 604 47 647 63 C690 79 719 48 758 60 C802 73 835 43 878 55 C920 66 943 36 988 47 C1024 55 1054 31 1094 40 C1132 48 1160 30 1200 31"/><ellipse class="highlight" cx="247" cy="72" rx="8" ry="22"/><ellipse class="highlight" cx="546" cy="83" rx="9" ry="29"/><ellipse class="highlight" cx="879" cy="72" rx="8" ry="24"/><g class="drip" style="--t:7.6s"><ellipse cx="111" cy="130" rx="9" ry="15" fill="#470008"/></g><g class="drip" style="--t:9.2s"><ellipse cx="263" cy="151" rx="10" ry="18" fill="#510009"/></g><g class="drip" style="--t:8.4s"><ellipse cx="562" cy="166" rx="11" ry="20" fill="#4b0008"/></g><g class="drip" style="--t:10.1s"><ellipse cx="895" cy="157" rx="10" ry="18" fill="#4c0008"/></g><circle class="falling-drop" style="--f:6.8s;animation-delay:-2.1s" cx="263" cy="166" r="7" fill="#700011"/><circle class="falling-drop" style="--f:8.5s;animation-delay:-4.7s" cx="562" cy="183" r="8" fill="#6d0010"/><circle class="falling-drop" style="--f:7.7s;animation-delay:-1.4s" cx="895" cy="174" r="7" fill="#710011"/></svg></div>`;
s=s.replace(/<style id="blood-drip-curtain-css">[\s\S]*?<\/style>/,'');
s=s.replace(/<div class="blood-drip-curtain"[\s\S]*?<\/div>/,'');
s=s.replace('</head>',css+'</head>');
s=s.replace('<body>','<body>'+html);
fs.writeFileSync(p,s);
console.log('Replaced top blood effect with organic pooled blood and gravity drips');
