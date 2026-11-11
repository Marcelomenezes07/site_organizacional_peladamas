import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readDocument,createDocument,updateDocument,deleteDocument,listDocuments,ConflictError} from '../lib/storage.js';
assert.equal(process.env.STORAGE_PROVIDER,'neon');
const prefix=`checks/${randomUUID()}/`, path=prefix+'document.json';
try{
  assert.equal(await readDocument(path),null);
  await createDocument(path,'{"value":1}');
  await assert.rejects(()=>createDocument(path,'duplicate'),ConflictError);
  const old=(await readDocument(path))!;
  const outcomes=await Promise.allSettled([updateDocument(path,'a',old.etag),updateDocument(path,'b',old.etag)]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(outcomes.filter(x=>x.status==='rejected'&&x.reason instanceof ConflictError).length,1);
  await assert.rejects(()=>deleteDocument(path,old.etag),ConflictError);
  assert.deepEqual(await listDocuments(prefix),[path]);
  const fresh=(await readDocument(path))!;
  assert.notEqual(fresh.etag,old.etag);
  await deleteDocument(path,fresh.etag);
  assert.equal(await readDocument(path),null);
  console.log('Neon integration passed: create, read, list, concurrent update, stale delete, delete.');
}finally{await deleteDocument(path);}
