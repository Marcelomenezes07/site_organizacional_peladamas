import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {readDocument,createDocument,ConflictError} from './storage.js';
export const passwordPath=(number:number)=>`segredos/pelada_${number}.json`;
// Kept outside CSV and public snapshots: only the authenticated administrator can retrieve it.
export async function getOrCreatePeladaPassword(number:number):Promise<string>{
  const path=passwordPath(number);
  const existing=await readDocument(path);
  if(existing)return JSON.parse(existing.content).password;
  const password=randomBytes(9).toString('base64url');
  try{await createDocument(path,JSON.stringify({password}));return password;}
  catch(e){if(!(e instanceof ConflictError))throw e;const winner=await readDocument(path);if(!winner)throw e;return JSON.parse(winner.content).password;}
}
export async function validPeladaPassword(number:number,value:unknown):Promise<boolean>{
  if(typeof value!=='string'||value.length>100)return false;
  const doc=await readDocument(passwordPath(number));if(!doc)return false;
  const expected=JSON.parse(doc.content).password;
  const hash=(s:string)=>createHash('sha256').update(s).digest();
  return timingSafeEqual(hash(value.trim()),hash(expected));
}
