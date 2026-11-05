import { get, list, put, del } from '@vercel/blob';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type Document = { content: string; etag: string };
export class ConflictError extends Error { constructor(){super('Esse registro mudou desde que você abriu. Recarregue os dados e tente de novo.');} }
const useBlob = Boolean(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN);
const baseDir=join(process.cwd(),'.local-data');
function ensureConfiguration(){
  if(process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID){
    throw new Error('Configure um armazenamento Vercel Blob privado vinculado ao projeto.');
  }
}
function localKey(path:string){if(!/^[a-z0-9_/-]+\.(?:csv|json)$/.test(path)||path.includes('..'))throw new Error('Caminho inválido.');return join(baseDir,path);}
function hash(text:string){return createHash('sha256').update(text).digest('hex');}
async function localRead(path:string):Promise<Document|null>{
  try{const content=await readFile(localKey(path),'utf8');return {content,etag:hash(content)};}
  catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
}
export async function readDocument(path:string):Promise<Document|null>{
  if(!useBlob)return localRead(path);
  ensureConfiguration();
  const doc=await get(path,{access:'private',useCache:false});
  if(!doc || !doc.stream)return null;
  const content=await new Response(doc.stream).text();
  return {content,etag:doc.blob.etag};
}
export async function listDocuments(prefix:string):Promise<string[]>{
  if(!useBlob){
    try {const names=await readdir(join(baseDir,prefix));return names.filter(n=>/\.(csv|json)$/.test(n)).map(n=>prefix+n);}
    catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
  }
  ensureConfiguration();
  let cursor:string|undefined;const paths:string[]=[];
  do{
    const batch=await list({prefix,limit:1000,...(cursor?{cursor}:{})});
    paths.push(...batch.blobs.map(b=>b.pathname));
    cursor=batch.hasMore?batch.cursor:undefined;
  }while(cursor);
  return paths;
}
export async function createDocument(path:string,content:string):Promise<void>{
  if(!useBlob){
    const file=localKey(path);await mkdir(dirname(file),{recursive:true});
    try{await writeFile(file,content,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')throw new ConflictError();throw e;}
    return;
  }
  ensureConfiguration();
  try {await put(path,content,{access:'private',addRandomSuffix:false,contentType:path.endsWith('.json')?'application/json':'text/csv; charset=utf-8'});}
  catch(e){if(/already exists|conflict|precondition|409/i.test(String(e)))throw new ConflictError();throw e;}
}
const locks=new Map<string,Promise<void>>();
export async function updateDocument(path:string,content:string,expectedEtag:string):Promise<void>{
  if(useBlob)return updateUnlocked(path,content,expectedEtag);
  const previous=locks.get(path)??Promise.resolve();
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const queued=previous.then(()=>gate);locks.set(path,queued);await previous;
  try{await updateUnlocked(path,content,expectedEtag);}finally{release();if(locks.get(path)===queued)locks.delete(path);}
}
async function updateUnlocked(path:string,content:string,expectedEtag:string):Promise<void>{
  if(!useBlob){
    const current=await localRead(path);
    if(!current || current.etag!==expectedEtag)throw new ConflictError();
    const file=localKey(path);await mkdir(dirname(file),{recursive:true});
    const tmp=file+'.'+randomUUID()+'.tmp';
    await writeFile(tmp,content);await rename(tmp,file);return;
  }
  ensureConfiguration();
  try{
    await put(path,content,{access:'private',allowOverwrite:true,addRandomSuffix:false,ifMatch:expectedEtag,contentType:path.endsWith('.json')?'application/json':'text/csv; charset=utf-8'});
  }catch(e){if(/precondition|conflict|412|409|ifmatch/i.test(String(e)))throw new ConflictError();throw e;}
}
export async function localStorageStatus():Promise<boolean>{
  if(useBlob)return true;
  try{await stat(baseDir);return true;}catch{return false;}
}

export async function deleteDocument(path:string,expectedEtag?:string):Promise<void>{
  if(useBlob){
    ensureConfiguration();
    try{await del(path,expectedEtag?{ifMatch:expectedEtag}:{});}
    catch(e){if(/precondition|conflict|412|409|ifmatch/i.test(String(e)))throw new ConflictError();throw e;}
    return;
  }
  const previous=locks.get(path)??Promise.resolve();
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const queued=previous.then(()=>gate);locks.set(path,queued);await previous;
  try{
    const current=await localRead(path);if(!current)return;
    if(expectedEtag&&current.etag!==expectedEtag)throw new ConflictError();
    await unlink(localKey(path));
  }finally{release();if(locks.get(path)===queued)locks.delete(path);}
}
