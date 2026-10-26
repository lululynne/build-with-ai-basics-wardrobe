import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/store.mjs';
import {initialState} from '../src/domain.mjs';

async function directory(t) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'wardrobe-store-test-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  return dir;
}

test('transactions serialize concurrent writes and snapshots do not mutate saved state', async t=>{
  const dir=await directory(t);
  const store=await new Store(dir).init();
  const operations=Array.from({length:12},(_,n)=>store.transaction(async state=>{
    await Promise.resolve();
    state.receipts[`save-${n}`]={result:{position:Object.keys(state.receipts).length}};
  }));
  await Promise.all(operations);
  const saved=store.read();
  assert.equal(Object.keys(saved.receipts).length,12);
  assert.deepEqual(Object.values(saved.receipts).map(r=>r.result.position),Array.from({length:12},(_,n)=>n));
  saved.receipts.unsaved={result:{}};
  const reopened=await new Store(dir).init();
  assert.deepEqual(reopened.read(),store.read());
  assert.equal(reopened.read().receipts.unsaved,undefined);
  assert.equal((await fs.stat(path.join(dir,'wardrobe.json'))).mode & 0o777,0o600);
});

test('failed atomic replacement keeps last good memory and disk, and later save recovers', async t=>{
  const dir=await directory(t);
  let failRename=false;
  const io={...fs,rename:async(...args)=>{
    if(failRename) throw Object.assign(new Error('simulated disk failure'),{code:'ENOSPC'});
    return fs.rename(...args);
  }};
  const store=await new Store(dir,{io}).init();
  await store.transaction(s=>{s.receipts.saved={result:{version:1}};});
  const before=store.read();const raw=await fs.readFile(store.file,'utf8');
  failRename=true;
  await assert.rejects(store.transaction(s=>{s.receipts.failed={result:{version:2}};}),{code:'ENOSPC'});
  assert.deepEqual(store.read(),before);
  assert.equal(await fs.readFile(store.file,'utf8'),raw);
  assert.deepEqual((await fs.readdir(dir)).sort(),['images','wardrobe.json']);
  failRename=false;
  await store.transaction(s=>{s.receipts.recovered={result:{version:3}};});
  assert.equal(store.read().receipts.recovered.result.version,3);
  assert.equal(store.read().receipts.failed,undefined);
});

test('damaged existing JSON and invalid schemas stop startup without resetting original bytes',async t=>{
  const dir=await directory(t);
  const file=path.join(dir,'wardrobe.json');
  for(const broken of ['{"schemaVersion":1,',JSON.stringify({...initialState(),garments:null})]) {
    await fs.writeFile(file,broken);
    await assert.rejects(new Store(dir).init(),/has not been reset/);
    assert.equal(await fs.readFile(file,'utf8'),broken);
  }
});

test('in-flight generation is marked failed after restart, with no automatic provider retry',async t=>{
  const dir=await directory(t);
  const store=await new Store(dir).init();
  await store.transaction(s=>{
    const sourceImageId=randomUUID();const generatedImageId=randomUUID();const createdAt=new Date().toISOString();
    s.images[sourceImageId]={id:sourceImageId,filename:`${sourceImageId}.jpg`,kind:'source',mimeType:'image/jpeg',createdAt};
    s.images[generatedImageId]={id:generatedImageId,filename:`${generatedImageId}.jpg`,kind:'generated',mimeType:'image/jpeg',createdAt};
    s.generationJobs.push(
      {id:randomUUID(),requestId:'pending-request',sourceImageId,generatedImageId:null,status:'pending',createdAt},
      {id:randomUUID(),requestId:'running-request',sourceImageId,generatedImageId:null,status:'running',createdAt},
      {id:randomUUID(),requestId:'complete-request',sourceImageId,generatedImageId,status:'complete',createdAt}
    );
  });
  const reopened=await new Store(dir).init();
  assert.deepEqual(reopened.read().generationJobs.map(j=>j.status),['failed','failed','complete']);
  assert.match(reopened.read().generationJobs[0].error,/explicitly retry/);
  assert.deepEqual(JSON.parse(await fs.readFile(reopened.file,'utf8')),reopened.read());
});
