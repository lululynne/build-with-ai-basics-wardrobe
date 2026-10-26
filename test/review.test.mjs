import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {applyAction,initialState,viewState,validateState,reviewStatus,dateAfter,localDate} from '../src/domain.mjs';
import {Store} from '../src/store.mjs';

const enabledAt=new Date(2026,9,1,12);
const dueAt=new Date(2026,9,8,12);
const finishedAt=new Date(2026,9,10,18);
function act(state,type,fields={},at=dueAt) {return applyAction(state,{type,requestId:randomUUID(),...fields},at);}
function fixture() {
  const state=initialState();const sourceImageId=randomUUID();const generatedImageId=randomUUID();
  for(const [id,kind] of [[sourceImageId,'source'],[generatedImageId,'generated']]) state.images[id]={id,filename:`${id}.jpg`,kind,mimeType:'image/jpeg',createdAt:enabledAt.toISOString()};
  const garments=['top','skirt','jeans','coat','old'].map((name,index)=>({id:randomUUID(),name,type:'garment',sourceImageId,generatedImageId,categories:[],tags:[],notes:'',status:name==='old'?'archived':'active',enteredAt:new Date(2026,8,index+1,12).toISOString(),archivedAt:name==='old'?enabledAt.toISOString():null}));
  state.garments.push(...garments.toReversed());
  const byName=Object.fromEntries(garments.map(g=>[g.name,g.id]));
  for(const [name,members] of [['top-skirt',[byName.top,byName.skirt]],['top-jeans',[byName.top,byName.jeans]],['coat-jeans',[byName.coat,byName.jeans]]]) act(state,'set.save',{name,garmentIds:members},enabledAt);
  return {state,...byName};
}
function enableAndStart(state) {
  act(state,'review.settings',{enabled:true,intervalDays:7},enabledAt);
  return act(state,'review.start',{},dueAt).sessionId;
}
async function directory(t) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'wardrobe-review-test-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;
}

test('review interval accepts only whole numbers 7–365, with boolean enabled and no partial settings save',()=>{
  for(const intervalDays of [7,365]) {
    const state=initialState();act(state,'review.settings',{enabled:true,intervalDays},enabledAt);
    assert.equal(state.reviewSettings.intervalDays,intervalDays);
    assert.equal(state.reviewSettings.anchorDate,'2026-10-01');
  }
  const state=initialState();assert.equal(state.reviewSettings.enabled,false);assert.equal(state.reviewSettings.anchorDate,null);
  const before=structuredClone(state);
  for(const intervalDays of [6,366,7.5,'7',true,false,null,undefined,NaN,Infinity]) {
    assert.throws(()=>act(state,'review.settings',{enabled:true,intervalDays}),e=>e.status===400);
    assert.deepEqual(state,before);
  }
  for(const enabled of ['true',1,null,undefined]) {
    assert.throws(()=>act(state,'review.settings',{enabled,intervalDays:7}),e=>e.status===400);
    assert.deepEqual(state,before);
  }
});

test('first enable anchors once; editing or disabling/re-enabling retains anchor without resetting unfinished review',()=>{
  const {state}=fixture();
  act(state,'review.settings',{enabled:false,intervalDays:7},enabledAt);
  assert.equal(state.reviewSettings.anchorDate,null);
  act(state,'review.settings',{enabled:true,intervalDays:7},enabledAt);
  act(state,'review.settings',{enabled:true,intervalDays:30},dueAt);
  assert.equal(state.reviewSettings.anchorDate,'2026-10-01');
  act(state,'review.settings',{enabled:false,intervalDays:7},dueAt);
  assert.equal(reviewStatus(state,dueAt).due,false);
  act(state,'review.settings',{enabled:true,intervalDays:7},dueAt);
  const sessionId=act(state,'review.start',{},dueAt).sessionId;
  act(state,'review.settings',{enabled:false,intervalDays:365},finishedAt);
  assert.equal(state.reviewSession.id,sessionId);
  act(state,'review.settings',{enabled:true,intervalDays:365},finishedAt);
  assert.equal(state.reviewSettings.anchorDate,'2026-10-01');
  assert.equal(reviewStatus(state,finishedAt).due,true);
  assert.equal(act(state,'review.start',{},finishedAt).sessionId,sessionId);
});

test('due dates follow local calendar days across leap dates and a daylight-saving transition',()=>{
  assert.equal(dateAfter('2028-02-28',1),'2028-02-29');
  assert.equal(dateAfter('2028-02-28',2),'2028-03-01');
  assert.equal(dateAfter('2027-02-28',1),'2027-03-01');
  const previousTZ=process.env.TZ;process.env.TZ='America/New_York';
  try {
    const state=initialState();const anchor=new Date('2026-03-02T00:00:00-05:00');
    act(state,'review.settings',{enabled:true,intervalDays:7},anchor);
    const before=new Date('2026-03-08T23:59:59-04:00');const due=new Date('2026-03-09T00:00:00-04:00');
    assert.equal(localDate(before),'2026-03-08');
    assert.equal(reviewStatus(state,before).due,false);
    assert.equal(reviewStatus(state,due).due,true);
    assert.equal((due-anchor)/3600000,167);
    assert.equal(reviewStatus(state,due).dueDate,'2026-03-09');
  } finally {if(previousTZ===undefined)delete process.env.TZ;else process.env.TZ=previousTZ;}
});

test('review snapshots active singles once in entry order, excludes archives and later additions, and resumes same session',()=>{
  const {state,top,skirt,jeans,coat,old}=fixture();const sessionId=enableAndStart(state);
  assert.deepEqual(state.reviewSession.snapshotIds,[top,skirt,jeans,coat]);
  assert.equal(state.reviewSession.snapshotIds.includes(old),false);
  assert.equal(state.reviewSession.snapshotIds.length,4);
  const added={...structuredClone(state.garments.find(g=>g.id===top)),id:randomUUID(),name:'new arrival',enteredAt:dueAt.toISOString()};
  state.garments.push(added);
  assert.equal(act(state,'review.start',{},finishedAt).sessionId,sessionId);
  assert.equal(state.reviewSession.snapshotIds.includes(added.id),false);
  assert.equal(validateState(state),state);
});

test('disabled or not-yet-due review cannot start; an unfinished round does not move its anchor',()=>{
  const {state}=fixture();assert.throws(()=>act(state,'review.start'),e=>e.status===409);
  act(state,'review.settings',{enabled:true,intervalDays:7},enabledAt);
  assert.throws(()=>act(state,'review.start',{},new Date(2026,9,7,23,59)),e=>e.status===409);
  const sessionId=act(state,'review.start',{},dueAt).sessionId;
  act(state,'review.decide',{sessionId,garmentId:state.reviewSession.remainingIds[0],decision:'keep'},dueAt);
  assert.equal(state.reviewSettings.anchorDate,'2026-10-01');
  assert.equal(state.reviewSession.completedDate,null);
  assert.equal(reviewStatus(state,finishedAt).due,true);
});

test('same-request and stale repeated decisions cannot advance two cards or change a prior decision',()=>{
  const {state,top,skirt}=fixture();const sessionId=enableAndStart(state);
  const command={type:'review.decide',requestId:'one-card-request',sessionId,garmentId:top,decision:'keep'};
  const result=applyAction(state,command,dueAt);
  assert.deepEqual(applyAction(state,command,finishedAt),result);
  const stale=act(state,'review.decide',{sessionId,garmentId:top,decision:'keep'},finishedAt);
  assert.equal(stale.alreadyDecided,true);
  assert.equal(state.reviewSession.remainingIds[0],skirt);
  assert.equal(state.reviewSession.decisions.length,1);
  const before=structuredClone(state);
  assert.throws(()=>act(state,'review.decide',{sessionId,garmentId:top,decision:'archive'}),e=>e.status===409);
  assert.throws(()=>act(state,'review.decide',{sessionId:'stale-session',garmentId:skirt,decision:'keep'}),e=>e.status===409);
  assert.deepEqual(state,before);
});

test('finishing the last single anchors the next cycle to actual completion date',()=>{
  const {state}=fixture();const sessionId=enableAndStart(state);
  while(state.reviewSession.remainingIds.length) act(state,'review.decide',{sessionId,garmentId:state.reviewSession.remainingIds[0],decision:'keep'},finishedAt);
  assert.equal(state.reviewSession.completedDate,'2026-10-10');
  assert.equal(state.reviewSettings.anchorDate,'2026-10-10');
  assert.deepEqual(reviewStatus(state,finishedAt),{today:'2026-10-10',dueDate:'2026-10-17',due:false});
  assert.equal(reviewStatus(state,new Date(2026,9,17,0)).due,true);
  assert.equal(validateState(state),state);
});

test('archiving a shared garment moves containing sets together, keeps other clothes and preserves image/history/counts',()=>{
  const {state,top,skirt,jeans,coat}=fixture();const [firstSet,secondSet,unaffectedSet]=state.sets.map(s=>s.id);
  act(state,'wear.record',{setIds:[firstSet,secondSet]},enabledAt);
  const beforeHistory=structuredClone(state.wearEvents);const beforeImages=structuredClone(state.images);const beforeCounts=viewState(state).counts;
  const sessionId=enableAndStart(state);
  act(state,'review.decide',{sessionId,garmentId:top,decision:'archive'},dueAt);
  assert.equal(state.garments.find(g=>g.id===top).status,'archived');
  for(const id of [firstSet,secondSet]) assert.equal(state.sets.find(s=>s.id===id).status,'archived');
  assert.equal(state.sets.find(s=>s.id===unaffectedSet).status,'active');
  for(const id of [skirt,jeans,coat]) assert.equal(state.garments.find(g=>g.id===id).status,'active');
  assert.deepEqual(state.wearEvents,beforeHistory);assert.deepEqual(state.images,beforeImages);assert.deepEqual(viewState(state).counts,beforeCounts);
  assert.deepEqual(state.reviewSession.remainingIds,[skirt,jeans,coat]);
  assert.equal(validateState(state),state);
});

test('direct archival removes a pending review card and completes an emptied round without duplicating decisions',()=>{
  const {state}=fixture();const sessionId=enableAndStart(state);
  const members=[...state.reviewSession.remainingIds];
  for(const garmentId of members) act(state,'garment.archive',{garmentId},finishedAt);
  assert.equal(state.reviewSession.id,sessionId);
  assert.equal(state.reviewSession.remainingIds.length,0);
  assert.equal(state.reviewSession.decisions.length,members.length);
  assert.equal(state.reviewSession.completedDate,'2026-10-10');
  assert.equal(state.reviewSettings.anchorDate,'2026-10-10');
  const repeated=act(state,'garment.archive',{garmentId:members[0]},finishedAt);
  assert.equal(repeated.alreadyArchived,true);assert.equal(state.reviewSession.decisions.length,members.length);
  assert.equal(validateState(state),state);
});

test('a due round with no active singles completes empty and resets its anchor',()=>{
  const state=initialState();act(state,'review.settings',{enabled:true,intervalDays:7},enabledAt);
  const result=act(state,'review.start',{},dueAt);
  assert.equal(result.empty,true);assert.deepEqual(state.reviewSession.snapshotIds,[]);
  assert.equal(state.reviewSession.completedDate,'2026-10-08');assert.equal(state.reviewSettings.anchorDate,'2026-10-08');
  assert.equal(reviewStatus(state,dueAt).due,false);assert.equal(validateState(state),state);
});

test('saved progress survives reopening; a failed write cannot partially archive garment, linked sets or queue',async t=>{
  const dir=await directory(t);let failRename=false;
  const io={...fs,rename:async(...args)=>{if(failRename)throw Object.assign(new Error('synthetic full disk'),{code:'ENOSPC'});return fs.rename(...args);}};
  const store=await new Store(dir,{io}).init();const {state,top,skirt}=fixture();const sessionId=enableAndStart(state);
  act(state,'review.decide',{sessionId,garmentId:top,decision:'keep'},dueAt);
  await store.transaction(target=>Object.assign(target,state));
  const reopened=await new Store(dir).init();assert.deepEqual(reopened.read().reviewSession,state.reviewSession);
  const before=store.read();const beforeBytes=await fs.readFile(store.file,'utf8');
  failRename=true;
  await assert.rejects(store.transaction(s=>act(s,'review.decide',{sessionId,garmentId:skirt,decision:'archive'},finishedAt)),{code:'ENOSPC'});
  assert.deepEqual(store.read(),before);assert.equal(await fs.readFile(store.file,'utf8'),beforeBytes);
  failRename=false;
  await store.transaction(s=>act(s,'review.decide',{sessionId,garmentId:skirt,decision:'archive'},finishedAt));
  assert.equal(store.read().garments.find(g=>g.id===skirt).status,'archived');
  assert.equal(store.read().reviewSession.remainingIds.length,2);
});

test('saved review schema rejects impossible dates, duplicate cards, lost decisions and invalid completion',()=>{
  const {state,top}=fixture();enableAndStart(state);assert.equal(validateState(state),state);
  for(const corrupt of [
    s=>{s.reviewSettings.anchorDate='2026-02-30';},
    s=>{s.reviewSession.snapshotIds.push(top);},
    s=>{s.reviewSession.remainingIds.push(top);},
    s=>{s.reviewSession.remainingIds.shift();},
    s=>{s.reviewSession.completedDate='2026-10-08';},
    s=>{s.reviewSession.startedDate='not-a-date';},
    s=>{s.reviewSession.decisions.push({garmentId:top,decision:'skip',decidedDate:'2026-10-08'});}
  ]) {
    const broken=structuredClone(state);corrupt(broken);
    assert.throws(()=>validateState(broken),e=>e.status===500);
  }
});
