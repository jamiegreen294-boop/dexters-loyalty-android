// Local browser QA only. Root is the isolated offline scanner test.
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../dist');
http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const target=path.resolve(root,'.'+(url.pathname==='/'?'/Dexters_Combined_Work_Test.html':url.pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(target,(err,bytes)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',target.endsWith('.html')?'text/html; charset=utf-8':target.endsWith('.css')?'text/css':'text/javascript');res.end(bytes);});}).listen(4173,'0.0.0.0');
