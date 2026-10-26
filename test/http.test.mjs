import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createApp} from '../server.mjs';

const jpeg=await fs.readFile(new URL('../public/samples/blue-shirt-catalog.jpg',import.meta.url));
const source=await fs.readFile(new URL('../public/samples/blue-shirt-source.jpg',import.meta.url));
const generated={bytes:jpeg,mimeType:'image/jpeg',model:'synthetic-test',promptVersion:'synthetic-v1'};

async function fixture(t,options={}) {
  const dataDirectory=await fs.mkdtemp(path.join(os.tmpdir(),'wardrobe-http-test-'));
  let app;
  async function start(extra={}) {
    app=await createApp({dataDirectory,generator:async()=>generated,...options,...extra});
    await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
    return app;
  }
  await start();
  async function stop() {await app.waitForJobs();await new Promise((resolve,reject)=>app.server.close(e=>e?reject(e):resolve()));}
  t.after(async()=>{await stop();await fs.rm(dataDirectory,{recursive:true,force:true});});
  const api={
    get app(){return app;},
    get base(){return `http://127.0.0.1:${app.server.address().port}`;},
    async request(route,body,headers={}) {
      const response=await fetch(api.base+route,body===undefined ? {headers} : {method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
      const value=await response.json();return {response,value};
    },
    async upload(bytes=source,mimeType='image/jpeg') {return api.request('/api/uploads',{mimeType,data:bytes.toString('base64')});},
    async restart(extra={}) {await stop();await start(extra);},
    async raw(route,headers={}) {
      return new Promise((resolve,reject)=>{
        const req=http.request({hostname:'127.0.0.1',port:app.server.address().port,path:route,method:'GET',headers},res=>{
          const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString()}));
        });req.on('error',reject);req.end();
      });
    }
  };
  return api;
}

async function confirmedGarment(api) {
  const upload=await api.upload();assert.equal(upload.response.status,201);
  const sourceImageId=upload.value.image.id;
  const generation=await api.request('/api/generations',{sourceImageId,requestId:'generation-success'});
  assert.equal(generation.response.status,202);
  await api.app.waitForJobs();
  const job=(await api.request(`/api/generations/${generation.value.job.id}`)).value.job;
  assert.equal(job.status,'complete');
  const command={type:'garment.confirm',requestId:'confirm-success',jobId:job.id,name:'公共示例蓝 T 恤',garmentType:'上衣',categories:['示例'],tags:['公开素材'],notes:'Synthetic integration test, not personal clothing'};
  const confirmation=await api.request('/api/actions',command);
  assert.equal(confirmation.response.status,200);
  return {command,job,sourceImageId,confirmation};
}

test('real HTTP upload, generation, confirmation and both image bytes survive restart',async t=>{
  let generations=0;
  const api=await fixture(t,{generator:async()=>{generations++;return generated;}});
  const {command,job,sourceImageId,confirmation}=await confirmedGarment(api);
  const repeatedGeneration=await api.request('/api/generations',{sourceImageId,requestId:'generation-success'});
  assert.equal(repeatedGeneration.value.job.id,job.id);
  assert.equal(generations,1);
  const repeatedConfirm=await api.request('/api/actions',command);
  assert.equal(repeatedConfirm.value.state.garments.length,1);
  assert.equal(repeatedConfirm.value.result.garmentId,confirmation.value.result.garmentId);
  await api.restart();
  const state=(await api.request('/api/state')).value;
  assert.equal(state.garments.length,1);
  assert.equal(state.garments[0].name,'公共示例蓝 T 恤');
  assert.equal(state.receipts,undefined);
  const originalResponse=await fetch(`${api.base}/media/${sourceImageId}`);
  assert.equal(originalResponse.headers.get('content-type'),'image/jpeg');
  assert.deepEqual(Buffer.from(await originalResponse.arrayBuffer()),source);
  const illustrationResponse=await fetch(`${api.base}/media/${job.generatedImageId}`);
  assert.deepEqual(Buffer.from(await illustrationResponse.arrayBuffer()),jpeg);
});

test('provider failure preserves existing wardrobe and does not expose raw error or run automatic retry',async t=>{
  const api=await fixture(t);
  await confirmedGarment(api);
  const before=(await api.request('/api/state')).value.garments;
  let calls=0;
  await api.restart({generator:async()=>{calls++;throw new Error('synthetic-secret-marker');}});
  const upload=await api.upload();
  const start=await api.request('/api/generations',{sourceImageId:upload.value.image.id,requestId:'generation-failure'});
  await api.app.waitForJobs();
  const failed=(await api.request(`/api/generations/${start.value.job.id}`)).value.job;
  assert.equal(failed.status,'failed');assert.equal(calls,1);
  assert.doesNotMatch(JSON.stringify(failed),/synthetic-secret-marker/);
  assert.deepEqual((await api.request('/api/state')).value.garments,before);
  const premature=await api.request('/api/actions',{type:'garment.confirm',requestId:'confirm-failure',jobId:failed.id,name:'Should not exist',garmentType:'上衣'});
  assert.equal(premature.response.status,400);
  assert.deepEqual((await api.request('/api/state')).value.garments,before);
});

test('invalid, mismatched, oversized and malformed uploads return recoverable errors without stored images',async t=>{
  const api=await fixture(t);
  for(const [bytes,mime,status] of [[Buffer.from('not an image'),'image/jpeg',415],[source,'image/png',415],[source,'image/heic',415],[Buffer.alloc(8*1024*1024+1),'image/jpeg',413]]) {
    const result=await api.upload(bytes,mime);assert.equal(result.response.status,status);
  }
  const malformed=await fetch(`${api.base}/api/uploads`,{method:'POST',headers:{'content-type':'application/json'},body:'{bad-json'});
  assert.equal(malformed.status,400);
  const invalidEncoding=await api.request('/api/uploads',{mimeType:'image/jpeg',data:'!not-base64!'});
  assert.equal(invalidEncoding.response.status,400);
  assert.deepEqual((await api.request('/api/state')).value.images,{});
});

test('private paths, traversal, malicious Host and cross-origin requests are rejected',async t=>{
  const api=await fixture(t);
  for(const route of ['/.env','/.local/spike/generation-receipt.json','/data/wardrobe.json','/server.mjs','/art/../../.env','/art/%2e%2e/%2e%2e/.env','/media/%2e%2e%2f.env','/art/%2e%2e%5c.env']) {
    const result=await api.raw(route);assert.equal(result.status,404,route);assert.doesNotMatch(result.body,/GEMINI_API_KEY/);
  }
  assert.equal((await api.raw('/api/state',{Host:'attacker.example'})).status,403);
  assert.equal((await api.request('/api/state',undefined,{Origin:'https://attacker.example'})).response.status,403);
  assert.equal((await api.request('/api/state',undefined,{'Sec-Fetch-Site':'cross-site'})).response.status,403);
  const sameOrigin=await api.request('/api/state',undefined,{Origin:api.base});
  assert.equal(sameOrigin.response.status,200);
});

test('external top-level app navigation works without exposing cross-site private reads or writes',async t=>{
  const api=await fixture(t);
  const headers={'Sec-Fetch-Site':'cross-site','Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document',Origin:'https://example.org'};
  const entry=await api.raw('/',headers);
  assert.equal(entry.status,200);
  assert.match(entry.body,/<!doctype html>/i);
  assert.doesNotMatch(entry.body,/GEMINI_API_KEY/);
  for(const route of ['/api/state','/media/00000000-0000-0000-0000-000000000000','/index.html']) {
    assert.equal((await api.raw(route,headers)).status,403,route);
  }
  assert.equal((await api.raw('/',{...headers,'Sec-Fetch-Dest':'iframe'})).status,403);
  assert.equal((await api.raw('/',{...headers,Host:'attacker.example'})).status,403);
  assert.equal((await api.request('/api/actions',{type:'review.start',requestId:'cross-site-denied'},headers)).response.status,403);
  assert.equal((await api.raw('/api/state')).status,200);
});

test('prototype-property request IDs are rejected before actions or generation can mutate state',async t=>{
  const api=await fixture(t);
  const upload=await api.upload();
  const before=(await api.request('/api/state')).value;
  for(const requestId of ['__proto__','constructor','prototype']) {
    const generation=await api.request('/api/generations',{sourceImageId:upload.value.image.id,requestId});
    assert.equal(generation.response.status,400,requestId);
    const action=await api.request('/api/actions',{type:'garment.confirm',requestId,jobId:'not-created',name:'Never saved',garmentType:'上衣'});
    assert.equal(action.response.status,400,requestId);
  }
  assert.deepEqual((await api.request('/api/state')).value,before);
});
