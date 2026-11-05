import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const blob=vi.hoisted(()=>({get:vi.fn(),put:vi.fn(),del:vi.fn(),list:vi.fn()}));
vi.mock('@vercel/blob',()=>blob);
const path='peladas/pelada_20.csv';
const strong='"stored-version"';
const largeCsv='id;nome;estrelas\n'+Array.from({length:20},(_,i)=>`${i};Jogador com nome completo e apelidos de teste de compressao ${i};3\n`).join('');
beforeEach(()=>{
  vi.resetModules();vi.clearAllMocks();vi.stubEnv('VERCEL','1');vi.stubEnv('BLOB_READ_WRITE_TOKEN','test-token');
  // Compression changes the delivery validator to weak, which If-Match rejects.
  blob.get.mockImplementation(async(_path,options)=>({
    stream:new Response(largeCsv).body,
    blob:{etag:new Headers(options.headers).get('accept-encoding')==='identity'?strong:'W/'+strong}
  }));
  const conditional=async(_path:unknown,_content:unknown,options:{ifMatch:string})=>{
    if(options.ifMatch!==strong)throw new Error('412 precondition failed');
  };
  blob.put.mockImplementation(conditional);
  blob.del.mockImplementation(async(p,options)=>conditional(p,null,options));
});
afterEach(()=>vi.unstubAllEnvs());
it('reads a large CSV with its strong storage version so publishing teams can commit',async()=>{
  const store=await import('../lib/storage');const doc=await store.readDocument(path);
  expect(doc?.content).toBe(largeCsv);expect(doc?.etag).toBe(strong);
  await expect(store.updateDocument(path,'CSV with saved teams',doc!.etag)).resolves.toBeUndefined();
  expect(blob.get).toHaveBeenCalledWith(path,expect.objectContaining({access:'private',useCache:false,headers:{'Accept-Encoding':'identity'}}));
});
it('can conditionally delete a large CSV without weakening concurrency protection',async()=>{
  const store=await import('../lib/storage');const doc=await store.readDocument(path);
  await expect(store.deleteDocument(path,doc!.etag)).resolves.toBeUndefined();
  await expect(store.updateDocument(path,'stale write','"older-version"')).rejects.toBeInstanceOf(store.ConflictError);
  await expect(store.deleteDocument(path,'"older-version"')).rejects.toBeInstanceOf(store.ConflictError);
});
