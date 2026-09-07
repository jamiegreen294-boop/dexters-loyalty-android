const fs=require('fs');
const file='dist/index.html';
let s=fs.readFileSync(file,'utf8');
const before=s;
// These two remote libraries are enhancements, not allowed to hold the whole app's parser open.
s=s.replace(/<script\s+(?:defer\s+)?src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>/,
  '<script async src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
s=s.replace(/<script\s+(?:defer\s+)?src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/qrcodejs\/1\.0\.0\/qrcode\.min\.js"><\/script>/,
  '<script async src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>');
if(s===before) throw new Error('Startup script tags not found or already changed');
fs.writeFileSync(file,s);
console.log('Startup-unblock applied: remote libraries are non-blocking');
