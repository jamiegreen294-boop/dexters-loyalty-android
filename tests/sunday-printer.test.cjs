const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const P=require('../sunday/epson-printer.js');
const order={id:'test',order_number:12,customer_name:'A & B <Guest>',customer_phone:'TEST',collection_date:'2026-09-06',collection_slot:'12:30',status:'accepted',items:[{qty:2,name:'Kids Beef'},{qty:1,name:'Extra Gravy'}],notes:'No <onion> & sauce',total_pence:2098};
// Parse with Python's standard XML parser; adapt its result to the browser DOM interface.
class Parser{
  parseFromString(text){
    let data;
    try{data=JSON.parse(execFileSync('python3',['-c',"import sys,json,xml.etree.ElementTree as E; r=E.fromstring(sys.stdin.read()); print(json.dumps([dict(tag=n.tag,attrs=n.attrib) for n in r.iter()]))"],{input:text,stdio:['pipe','pipe','ignore']}));}
    catch{return{getElementsByTagName:()=>[{}]};}
    return{getElementsByTagName:()=>[],getElementsByTagNameNS:(ns,name)=>data.filter(n=>n.tag==='{'+ns+'}'+name).map(n=>({getAttribute:k=>n.attrs[k]??null}))};
  }
}
const reply=success=>'<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><response xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print" success="'+success+'" code="EPTR_COVER_OPEN"/></s:Body></s:Envelope>';
test('customer ticket preserves quantities, extras, collection and total',()=>{
 const text=P.ticket(order);for(const value of ['SR-012','2 x Kids Beef','1 x Extra Gravy','12:30','2026-09-06','GBP 20.98','No <onion> & sauce'])assert.ok(text.includes(value));
 assert.ok(!text.includes('TEST TICKET'));
 const body=P.envelope(text);assert.ok(body.includes('A &amp; B &lt;Guest&gt;'));
 const doc=new Parser().parseFromString(body);assert.equal(doc.getElementsByTagName('parsererror').length,0);
});
test('sample cannot be confused with a real order',()=>assert.match(P.ticket(order,{sample:true}),/TEST TICKET - NOT A REAL ORDER[\s\S]*TEST ONLY - DO NOT PREPARE/));
test('invalid items and target addresses fail before dispatch',()=>{
 assert.throws(()=>P.ticket({...order,items:[{qty:0,name:'Dinner'}]}),/invalid/);
 for(const ip of ['example.com','256.1.1.1','192.168.0.10/path','192.168.0.10:443'])assert.throws(()=>P.endpoint(ip));
 assert.match(P.endpoint('192.168.0.10'),/^https:\/\/192\.168\.0\.10\/cgi-bin\/epos\/service.cgi/);
});
test('requires an explicit successful Epson XML response',()=>{
 assert.equal(P.acknowledgement(reply('true'),Parser),true);
 for(const text of [reply('false'),'<html>OK</html>','invalid XML','<response success="true"/>'])assert.throws(()=>P.acknowledgement(text,Parser));
});
test('one request, correct printer body, and no automatic retry',async()=>{
 let requests=[];const send=P.createSender(async(url,opts)=>{requests.push({url,opts});return{ok:true,text:async()=>reply('true')};},Parser);
 assert.equal(await send('192.168.0.10',P.ticket(order)),true);assert.equal(requests.length,1);
 assert.equal(requests[0].opts.credentials,'omit');assert.match(requests[0].opts.body,/<cut type="feed"\/>/);
});
test('concurrent prints are blocked and lock is released',async()=>{
 let release,calls=0;const send=P.createSender(async()=>{calls++;await new Promise(r=>release=r);return{ok:true,text:async()=>reply('true')};},Parser);
 const first=send('192.168.0.10','sample');await assert.rejects(send('192.168.0.10','sample'),/already being sent/);release();await first;assert.equal(calls,1);
 const second=send('192.168.0.10','sample');release();await second;assert.equal(calls,2);
});
test('HTTP and connection failures never report success or retry',async()=>{
 for(const fetcher of [async()=>({ok:false,status:503,text:async()=>''}),async()=>{throw Error('network')},async()=>({ok:true,text:async()=>'<html>OK</html>'})]){
  let calls=0;const send=P.createSender((...args)=>{calls++;return fetcher(...args);},Parser);
  await assert.rejects(send('192.168.0.10','sample'),/Check the paper/);assert.equal(calls,1);
 }
});
