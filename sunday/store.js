// Isolated review store. No credentials, network calls, or live kitchen writes.
(function(){
const C=SundayRoast,key='dexters-sunday-isolated-preview-v1';
const defaultSlots=['12:00','12:15','12:30','12:45','13:00','13:15','13:30','13:45','14:00','14:15','14:30','14:45'];
const oldDefaultSlots=['12:00','12:15','12:30','12:45','13:00'];
function initial(){return{config:{enabled:true,date:C.nextSunday(),slots:defaultSlots.slice(),stock:{chicken:30,beef:20,kids_chicken:20,kids_beef:15},override:'auto'},orders:[]}}
function normalize(s){const base=initial();s.config.stock={...base.config.stock,...(s.config.stock||{})};for(const k of Object.keys(C.meals))if(!Number.isInteger(s.config.stock[k]))s.config.stock[k]=base.config.stock[k];if(!Array.isArray(s.config.slots)||JSON.stringify(s.config.slots)===JSON.stringify(oldDefaultSlots))s.config.slots=defaultSlots.slice();return s}
function read(){try{const s=JSON.parse(localStorage.getItem(key));if(s?.config&&Array.isArray(s.orders))return normalize(s)}catch{}return initial()}
async function mutate(fn){if(!navigator.locks)throw Error('This preview needs an up-to-date browser to safely save sample orders.');return navigator.locks.request(key,()=>{const s=read(),result=fn(s);localStorage.setItem(key,JSON.stringify(s));window.dispatchEvent(new Event('sundaychange'));return result})}
window.SundayStore={read,mutate,reset:()=>mutate(s=>Object.assign(s,initial()))};
})();
