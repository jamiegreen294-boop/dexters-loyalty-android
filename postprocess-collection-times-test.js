const fs=require('fs');
const p='dist/collection-order-test.html';
let s=fs.readFileSync(p,'utf8');
function slots(startH,startM,endH,endM){const out=[];let m=startH*60+startM,end=endH*60+endM;for(;m<=end;m+=15){const h=String(Math.floor(m/60)).padStart(2,'0'),mm=String(m%60).padStart(2,'0');out.push(`<option>${h}:${mm}</option>`)}return out.join('')}
const options='<option>ASAP</option>'+slots(7,15,13,45)+slots(17,15,20,15);
s=s.replace(/<select id="collectionTime" class="input">[\s\S]*?<\/select>/,'<select id="collectionTime" class="input">'+options+'</select>');
fs.writeFileSync(p,s);
console.log('Applied test collection slots: ASAP, 07:15-13:45, 17:15-20:15');