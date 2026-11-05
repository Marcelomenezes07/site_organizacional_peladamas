import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleRequest } from '../lib/http.js';
export default async function handler(req:VercelRequest,res:VercelResponse){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(Number(req.headers['content-length']||0)>4096)return res.status(413).json({error:'Dados muito grandes.'});
  const reply=await handleRequest('/api/auth',req.method||'GET',req.body,req.headers);
  if(reply.cookie)res.setHeader('Set-Cookie',reply.cookie);
  return res.status(reply.status).json(reply.value);
}
