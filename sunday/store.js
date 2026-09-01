// Isolated review store. No credentials, network calls, or live kitchen writes.
(function(){
const C=SundayRoast,key='dexters-sunday-isolated-preview-v1';
function initial(){return{config:{enabled:true,date:C.nextSunday(),slots:['12:00','12:15','12:30','12:45','13:00'],stock:{chicken:30,beef:20},override:'auto'},orders:[]}}
function read(){try{const s=JSON.parse(localStorage.getItem(key));if(s?.config&&Array.isArray(s.orders))return s}catch{}return initial()}
async function mutate(fn){if(!navigator.locks)throw Error('This preview needs an up-to-date browser to safely save sample orders.');return navigator.locks.request(key,()=>{const s=read(),result=fn(s);localStorage.setItem(key,JSON.stringify(s));window.dispatchEvent(new Event('sundaychange'));return result})}
window.SundayStore={read,mutate,reset:()=>mutate(s=>Object.assign(s,initial()))};
})();
