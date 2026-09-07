const fs=require('fs');
const file='dist/index.html';
let s=fs.readFileSync(file,'utf8');

// Remote libraries must never hold the parser open.
s=s.replace(/<script\s+(?:defer\s+|async\s+)?src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>/,
  '<script async src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
s=s.replace(/<script\s+(?:defer\s+|async\s+)?src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/qrcodejs\/1\.0\.0\/qrcode\.min\.js"><\/script>/,
  '<script async src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>');

// Local script files load after parsing, in document order.
s=s.replace(/<script\b([^>]*?)\s+src="(\/[^"]+)"([^>]*)><\/script>/gi,(m,a,src,b)=>{
  if(/\b(?:async|defer)\b/i.test(a+' '+b)) return m;
  return '<script defer'+a+' src="'+src+'"'+b+'></script>';
});

// Inline feature IIFEs are registered during parsing but execute just after
// DOMContentLoaded, so MutationObservers/timers cannot starve the parser.
s=s.replace(/<script\b((?![^>]*\bsrc=)[^>]*)>([\s\S]*?)<\/script>/gi,(m,attrs,body)=>{
  if(!body.trim()) return m;
  if(/type\s*=\s*["'](?:application\/ld\+json|text\/template|text\/plain)/i.test(attrs)) return m;
  if(body.includes('__dextersStartupDeferred__')) return m;
  const wrapped="/*__dextersStartupDeferred__*/window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{\n"+body+"\n},0),{once:true});";
  return '<script'+attrs+'>'+wrapped+'</script>';
});

fs.writeFileSync(file,s);
console.log('Startup-unblock applied: parser-safe script scheduling');
