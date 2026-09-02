const fs=require('node:fs'),zlib=require('node:zlib'),vm=require('node:vm'),assert=require('node:assert/strict');
const {patch,productionUrl}=require('../postprocess-auth-return.cjs');
async function run(){
 const original=fs.readFileSync('web/app.js','utf8');
 const source=zlib.gunzipSync(Buffer.from(original.match(/const b='([^']+)'/)[1],'base64')).toString('utf8');
 const updated=patch(source),signup=updated.match(/async function signup\(\)\{[^\n]+/)[0];
 let requests=[],messages=[],loads=0,response={data:{session:null},error:null};
 const fields={fullName:{value:'Test Customer'},phone:{value:''},signupEmail:{value:'qa@example.invalid'},signupPassword:{value:'test-only-password'}};
 const context=vm.createContext({$:id=>fields[id],db:{auth:{signUp:async data=>{requests.push(data);return response;}}},status:m=>messages.push(m),loadSession:async()=>{loads++;},location:{origin:'http://localhost:4173'}});
 vm.runInContext(signup,context);await vm.runInContext('signup()',context);
 assert.equal(requests[0].options.emailRedirectTo,productionUrl);
 assert.equal(requests[0].options.data.full_name,'Test Customer');
 assert(!requests[0].options.emailRedirectTo.includes('localhost'));
 assert(messages[0].includes('verification link'));assert.equal(loads,0);
 response={data:{session:{user:{id:'fixture'}}},error:null};await vm.runInContext('signup()',context);assert.equal(loads,1);
 response={data:{},error:{message:'Email service unavailable'}};await vm.runInContext('signup()',context);assert.equal(messages.at(-1),'Email service unavailable');
 fields.signupPassword.value='x';const count=requests.length;await vm.runInContext('signup()',context);assert.equal(requests.length,count);
 const built=fs.readFileSync('dist/app-auth.js','utf8');assert.equal(zlib.gunzipSync(Buffer.from(built.match(/const b='([^']+)'/)[1],'base64')).toString('utf8'),updated);
 const html=fs.readFileSync('dist/index.html','utf8');assert.equal(html.split('src="/app-auth.js"').length-1,1);
 assert(!/dexters-loyalty-android@[a-f0-9]+\/web\/app\.js/.test(html));
 console.log('PASS 11 verification-email return and signup regression checks. Email sending is mocked.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
