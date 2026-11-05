import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {it,expect,vi} from 'vitest';
it('lista JSON e remove CSV e JSON fisicamente no armazenamento local, respeitando ETag',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'peladamas-storage-'));
  const cwd=vi.spyOn(process,'cwd').mockReturnValue(dir);
  vi.stubEnv('VERCEL','');vi.stubEnv('BLOB_READ_WRITE_TOKEN','');vi.resetModules();
  try{
    const store=await import('../lib/storage');
    await store.createDocument('peladas/pelada_1.csv','csv');
    await store.createDocument('partidas/pelada_1_abc.json','{}');
    expect(await store.listDocuments('partidas/')).toEqual(['partidas/pelada_1_abc.json']);
    await expect(store.deleteDocument('peladas/pelada_1.csv','wrong')).rejects.toBeInstanceOf(store.ConflictError);
    expect(await store.readDocument('peladas/pelada_1.csv')).not.toBeNull();
    const doc=await store.readDocument('peladas/pelada_1.csv');
    await store.deleteDocument('peladas/pelada_1.csv',doc!.etag);
    await store.deleteDocument('partidas/pelada_1_abc.json');
    expect(await store.listDocuments('peladas/')).toEqual([]);
    expect(await store.listDocuments('partidas/')).toEqual([]);
  }finally{cwd.mockRestore();vi.unstubAllEnvs();await rm(dir,{recursive:true,force:true});}
});
