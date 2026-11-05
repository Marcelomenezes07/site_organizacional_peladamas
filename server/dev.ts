import { createServer } from 'node:http';
import { handleRequest } from '../lib/http.js';
const server=createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  try{
    let text='';for await(const chunk of req){text+=String(chunk);if(text.length>90000){res.writeHead(413);res.end(JSON.stringify({error:'Dados grandes demais.'}));return;}}
    const result=await handleRequest(req.url?.split('?')[0]||'/',req.method||'GET',text?JSON.parse(text):null,req.headers);
    if(result.cookie)res.setHeader('Set-Cookie',result.cookie);
    res.writeHead(result.status);res.end(JSON.stringify(result.value));
  }catch(e){res.writeHead(400);res.end(JSON.stringify({error:'Requisição inválida.'}));}
});
server.listen(8787,'127.0.0.1',()=>console.log('API local em http://127.0.0.1:8787'));
