const fs=require('fs');
const file='dist/index.html';
let s=fs.readFileSync(file,'utf8');
const before=s;
s=s.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>','<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
s=s.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>','<script defer src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>');
if(s===before) throw new Error('Startup script tags not found or already changed');
fs.writeFileSync(file,s);
console.log('Startup-unblock applied');
