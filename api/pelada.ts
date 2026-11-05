import type {VercelRequest,VercelResponse} from '@vercel/node';
import {handleRequest} from '../lib/http.js';
export default async function handler(req:VercelRequest,res:VercelResponse){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(Number(req.headers['content-length']||0)>90000)return res.status(413).json({error:'Dados muito grandes.'});
  const number=typeof req.query.number==='string'?req.query.number:'';
  const reply=await handleRequest('/api/pelada?number='+encodeURIComponent(number),req.method||'GET',req.body,req.headers);
  return res.status(reply.status).json(reply.value);
}
