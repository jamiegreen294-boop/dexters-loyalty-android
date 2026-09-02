const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const productionUrl='https://app.dextersspot.co.uk/';
function patch(source){
 const before="db.auth.signUp({email,password,options:{data:{full_name:name,phone}}})";
 assert.equal(source.split(before).length-1,1,'Expected one signup call');
 return source.replace(before,"db.auth.signUp({email,password,options:{emailRedirectTo:"+JSON.stringify(productionUrl)+",data:{full_name:name,phone}}})")
  .replace("Account created. Check your email if Supabase asks you to confirm it.","Check your email and tap the verification link. It will return you to Dexter’s Loyalty. You can then sign in with your email and password.");
}
function build(){
 const original=fs.readFileSync('web/app.js','utf8'),match=original.match(/const b='([^']+)'/);
 assert(match,'Expected retained application payload');
 const source=zlib.gunzipSync(Buffer.from(match[1],'base64')).toString('utf8');
 const encoded=zlib.gzipSync(Buffer.from(patch(source))).toString('base64');
 // Retain the app's asynchronous loading behaviour and all other source unchanged.
 fs.writeFileSync('dist/app-auth.js',original.replace(match[1],encoded));
 let html=fs.readFileSync('dist/index.html','utf8');
 const base=/<script src="https:\/\/cdn\.jsdelivr\.net\/gh\/jamiegreen294-boop\/dexters-loyalty-android@[a-f0-9]+\/web\/app\.js"><\/script>/g;
 assert.equal((html.match(base)||[]).length,1,'Expected one original app loader');
 html=html.replace(base,'<script src="/app-auth.js"></script>');
 fs.writeFileSync('dist/index.html',html);
 console.log('Verification email return points to the stable Dexter’s app URL.');
}
module.exports={patch,productionUrl};if(require.main===module)build();
