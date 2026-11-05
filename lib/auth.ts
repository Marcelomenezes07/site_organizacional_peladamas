import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sealData, unsealData } from 'iron-session';

const derive=promisify(scrypt);
const cookieName='peladamas_session';
const ttl=12*60*60;
type Session={admin?:boolean;expires?:number};
export function authConfigured(){return Boolean(process.env.ADMIN_PASSWORD_HASH && (process.env.ADMIN_SESSION_SECRET?.length??0)>=32);}
export async function validCredentials(username:unknown,password:unknown){
  if(!authConfigured()||typeof username!=='string'||typeof password!=='string'||password.length>200)return false;
  const [salt,hex]=process.env.ADMIN_PASSWORD_HASH!.split(':');
  if(!salt||!hex)return false;
  const expected=Buffer.from(hex,'hex');
  const actual=await derive(password,salt,64) as Buffer;
  return expected.length===actual.length&&timingSafeEqual(expected,actual)&&username==='admin';
}
export async function authenticated(cookie:string|undefined){
  if(!authConfigured())return false;
  const token=cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!token)return false;
  try{
    const session=await unsealData<Session>(token,{password:process.env.ADMIN_SESSION_SECRET!,ttl});
    return session.admin===true&&typeof session.expires==='number'&&session.expires>Date.now();
  }catch{return false;}
}
export async function sessionCookie(logout=false){
  const token=logout?'':await sealData({admin:true,expires:Date.now()+ttl*1000},{password:process.env.ADMIN_SESSION_SECRET!,ttl});
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${logout?0:ttl}${process.env.VERCEL?'; Secure':''}`;
}
