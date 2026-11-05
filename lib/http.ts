import {handlePublicPelada} from './public-pelada.js';
import type { IncomingHttpHeaders } from 'node:http';
import { authenticated, authConfigured, sessionCookie, validCredentials } from './auth.js';
import { handleApi } from './service.js';

const attempts=new Map<string,{count:number;until:number}>();
type Reply={status:number;value:Record<string,unknown>;cookie?:string};
export async function handleRequest(path:string,method:string,body:unknown,headers:IncomingHttpHeaders):Promise<Reply>{
  const url=new URL(path,'http://localhost');path=url.pathname;
  if(!['/api/auth','/api/data','/api/pelada'].includes(path))return {status:404,value:{error:'Não encontrado.'}};
  if(!['GET','POST'].includes(method))return {status:405,value:{error:'Método não permitido.'}};
  // A custom header cannot be sent by a cross-origin form. No CORS preflight is allowed.
  if(method==='POST'&&(headers['x-peladamas-request']!=='1'||!headers['content-type']?.includes('application/json')))return {status:403,value:{error:'Solicitação não permitida.'}};
  if(path==='/api/pelada')return handlePublicPelada(method,Number(url.searchParams.get('number')),body,(body as {action?:string})?.action==='publishTeams'?await authenticated(headers.cookie):false);
  if(path==='/api/auth'){
    if(method==='GET')return {status:200,value:{authenticated:await authenticated(headers.cookie)}};
    const data=body as {action?:unknown;username?:unknown;password?:unknown}|null;
    if(data?.action==='logout')return {status:200,value:{ok:true},cookie:await sessionCookie(true)};
    if(data?.action!=='login')return {status:400,value:{error:'Solicitação inválida.'}};
    if(!authConfigured())return {status:503,value:{error:'O login ainda não está configurado.'}};
    const ip=String(headers['x-forwarded-for']||'local').split(',')[0].trim();
    const now=Date.now();
    for(const [key,value] of attempts)if(value.until<=now)attempts.delete(key);
    const entry=attempts.get(ip)??{count:0,until:now+15*60*1000};
    if(entry.count>=10)return {status:429,value:{error:'Muitas tentativas. Aguarde 15 minutos e tente novamente.'}};
    entry.count++;attempts.set(ip,entry);
    if(attempts.size>10000)attempts.delete(attempts.keys().next().value!);
    if(!await validCredentials(data.username,data.password))return {status:401,value:{error:'Usuário ou senha incorretos.'}};
    attempts.delete(ip);
    return {status:200,value:{ok:true},cookie:await sessionCookie()};
  }
  if(!await authenticated(headers.cookie))return {status:401,value:{error:'Entre como administrador para continuar.'}};
  return handleApi(method,body);
}
