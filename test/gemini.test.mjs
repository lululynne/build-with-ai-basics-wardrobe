import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateImage,MODEL,PROMPT_VERSION} from '../src/gemini.mjs';

const jpeg=await readFile(new URL('../public/samples/blue-shirt-catalog.jpg',import.meta.url));
const source={mimeType:'image/jpeg',bytes:jpeg};
const imagePart={inlineData:{mimeType:'image/jpeg',data:jpeg.toString('base64')}};

test('provider parser ignores thought image and accepts actual final JPEG without requiring text',async()=>{
  let calls=0;
  const output=await generateImage(source,{apiKey:'synthetic-local-test-key',fetcher:async(url,options)=>{
    calls++;
    assert.match(url,new RegExp(`${MODEL}:generateContent$`));
    const body=JSON.parse(options.body);
    assert.equal(options.headers['x-goog-api-key'],'synthetic-local-test-key');
    assert.equal(body.contents[0].parts[1].inlineData.mimeType,'image/jpeg');
    assert.equal(body.generationConfig.imageConfig.imageSize,'1K');
    return Response.json({candidates:[{content:{parts:[{thought:true,inlineData:{mimeType:'image/png',data:'ignored'}},imagePart]}}]});
  }});
  assert.equal(calls,1);
  assert.equal(output.mimeType,'image/jpeg');
  assert.deepEqual(output.bytes,jpeg);
  assert.equal(output.promptVersion,PROMPT_VERSION);
});

test('snake-case final image is supported; thought-only and no-image results fail safely',async()=>{
  const output=await generateImage(source,{apiKey:'synthetic-local-test-key',fetcher:async()=>Response.json({candidates:[{content:{parts:[{inline_data:{mime_type:'image/jpeg',data:jpeg.toString('base64')}}]}}]})});
  assert.deepEqual(output.bytes,jpeg);
  for(const parts of [[{...imagePart,thought:true}],[{text:'raw provider explanation synthetic-secret-marker'}]]) {
    await assert.rejects(generateImage(source,{apiKey:'synthetic-local-test-key',fetcher:async()=>Response.json({candidates:[{content:{parts}}]})}),e=>{
      assert.equal(e.status,502);
      assert.match(e.message,/No usable illustration/);
      assert.doesNotMatch(e.message,/synthetic-secret-marker/);
      return true;
    });
  }
});

test('quota, invalid JSON and network errors are recoverable and never automatically retried or leaked',async()=>{
  for(const makeResponse of [()=>new Response('synthetic-secret-marker',{status:429}),()=>new Response('not-json',{status:200}),()=>{throw new Error('synthetic-secret-marker');}]) {
    let calls=0;
    await assert.rejects(generateImage(source,{apiKey:'synthetic-local-test-key',fetcher:async()=>{calls++;return makeResponse();}}),e=>{
      assert.equal(e.status,502);
      assert.doesNotMatch(e.message,/synthetic-secret-marker|synthetic-local-test-key/);
      return true;
    });
    assert.equal(calls,1);
  }
});
