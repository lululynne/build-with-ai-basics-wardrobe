import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {applyAction,initialState,viewState,findExactSet,validateState} from '../src/domain.mjs';

const firstWear=new Date(2026,9,27,9,0);
const laterWear=new Date(2026,9,27,16,0);
function fixture() {
  const state=initialState();
  const sourceImageId=randomUUID();const generatedImageId=randomUUID();
  for(const [id,kind] of [[sourceImageId,'source'],[generatedImageId,'generated']]) state.images[id]={id,filename:`${id}.jpg`,kind,mimeType:'image/jpeg',createdAt:firstWear.toISOString()};
  const garments=['top','skirt','jeans'].map((name,index)=>({id:randomUUID(),name,type:index===0?'上衣':'下装',sourceImageId,generatedImageId,categories:[],tags:[],notes:'',status:'active',enteredAt:new Date(firstWear.getTime()+index*1000).toISOString(),archivedAt:null}));
  state.garments.push(...garments);
  return {state,top:garments[0].id,skirt:garments[1].id,jeans:garments[2].id};
}
function act(state,type,fields={},at=firstWear) {return applyAction(state,{type,requestId:randomUUID(),...fields},at);}
function save(state,members,name='Synthetic set') {return act(state,'set.save',{garmentIds:members,name}).setId;}

test('exact sets reuse combinations independent of order, while partial overlaps remain different',()=>{
  const {state,top,skirt,jeans}=fixture();
  const setId=save(state,[top,skirt]);
  const repeated=act(state,'set.save',{garmentIds:[skirt,top,top],name:'Same membership'});
  assert.deepEqual(repeated,{setId,reused:true});assert.equal(state.sets.length,1);
  assert.equal(findExactSet(state,[top,skirt]).id,setId);
  assert.equal(findExactSet(state,[top]),undefined);
  assert.equal(findExactSet(state,[top,jeans]),undefined);
  assert.equal(findExactSet(state,[top,skirt,jeans]),undefined);
  assert.equal(validateState(state),state);
});

test('unknown combination requires explicit decision; declining records singles and saving attributes a set',()=>{
  const {state,top,skirt,jeans}=fixture();
  const before=structuredClone(state);
  assert.throws(()=>act(state,'wear.record',{garmentIds:[top,skirt]}),e=>e.status===409);
  assert.deepEqual(state,before);
  act(state,'wear.record',{garmentIds:[top,skirt],saveAsSet:false});
  assert.equal(state.sets.length,0);
  let counts=viewState(state).counts;
  assert.deepEqual(counts.garments[top],{total:1,individual:1,set:0});
  assert.deepEqual(counts.garments[skirt],{total:1,individual:1,set:0});
  const result=act(state,'wear.record',{garmentIds:[top,jeans],saveAsSet:true,setName:'Afternoon set'},laterWear);
  assert.ok(result.setId);assert.equal(state.sets.length,1);
  counts=viewState(state).counts;
  assert.deepEqual(counts.garments[top],{total:2,individual:1,set:1});
  assert.deepEqual(counts.garments[jeans],{total:1,individual:0,set:1});
  assert.equal(counts.sets[result.setId],1);
});

test('single-card selection of an existing exact set follows its set attribution',()=>{
  const {state,top,skirt}=fixture();const setId=save(state,[top,skirt]);
  act(state,'wear.record',{garmentIds:[skirt,top],saveAsSet:false});
  const event=state.wearEvents[0];
  assert.deepEqual(event.setIds,[setId]);
  assert.deepEqual(new Set(event.setGarments[setId]),new Set([top,skirt]));
  assert.deepEqual(viewState(state).counts.garments[top],{total:1,individual:0,set:1});
});

test('same deliberate save is idempotent; a separate same-day outfit counts again',()=>{
  const {state,top,skirt,jeans}=fixture();
  const firstSet=save(state,[top,skirt]);const secondSet=save(state,[top,jeans]);
  const command={type:'wear.record',requestId:'same-save-request',setIds:[firstSet]};
  const initial=applyAction(state,command,firstWear);
  assert.deepEqual(applyAction(state,command,laterWear),initial);
  assert.equal(state.wearEvents.length,1);
  act(state,'wear.record',{setIds:[secondSet]},laterWear);
  assert.equal(state.wearEvents.length,2);
  assert.deepEqual(viewState(state).counts.garments[top],{total:2,individual:0,set:2});
  assert.equal(viewState(state).counts.sets[firstSet],1);
  assert.equal(viewState(state).counts.sets[secondSet],1);
  assert.throws(()=>applyAction(state,{...command,setIds:[secondSet]},laterWear),e=>e.status===409);
  assert.equal(state.wearEvents.length,2);
});

test('overlapping set references in one outfit count physical garments once and preserve source attribution',()=>{
  const {state,top,skirt,jeans}=fixture();
  const firstSet=save(state,[top,skirt]);const secondSet=save(state,[top,jeans]);
  act(state,'wear.record',{setIds:[firstSet,secondSet,firstSet],garmentIds:[top,top]});
  const event=state.wearEvents[0];
  assert.equal(event.garmentIds.length,3);assert.equal(event.setIds.length,2);
  const counts=viewState(state).counts;
  for(const gid of [top,skirt,jeans]) assert.deepEqual(counts.garments[gid],{total:1,individual:0,set:1});
  assert.equal(counts.sets[firstSet],1);assert.equal(counts.sets[secondSet],1);
  assert.equal(validateState(state),state);
});

test('wear membership is an immutable historical snapshot independent of later set membership/status',()=>{
  const {state,top,skirt,jeans}=fixture();const setId=save(state,[top,skirt]);
  act(state,'wear.record',{setIds:[setId]});
  const history=structuredClone(state.wearEvents);
  state.sets[0].garmentIds=[top,jeans];state.sets[0].status='archived';
  state.garments.find(g=>g.id===skirt).status='archived';
  const counts=viewState(state).counts;
  assert.deepEqual(state.wearEvents,history);
  assert.deepEqual(counts.garments[skirt],{total:1,individual:0,set:1});
  assert.deepEqual(counts.garments[jeans],{total:0,individual:0,set:0});
  assert.equal(counts.sets[setId],1);
});

test('removing an erroneous wear recomputes counts and replay of removed save never recreates it',()=>{
  const {state,top,skirt}=fixture();const setId=save(state,[top,skirt]);
  const command={type:'wear.record',requestId:'correctable-save',setIds:[setId]};
  const event=applyAction(state,command,firstWear);
  const removal={type:'wear.remove',requestId:'correction-command',eventId:event.eventId};
  const removed=applyAction(state,removal,laterWear);
  assert.deepEqual(applyAction(state,removal,laterWear),removed);
  assert.equal(state.wearEvents.length,0);
  assert.deepEqual(viewState(state).counts.garments[top],{total:0,individual:0,set:0});
  assert.equal(viewState(state).counts.sets[setId],0);
  assert.deepEqual(applyAction(state,command,laterWear),event);
  assert.equal(state.wearEvents.length,0);
  act(state,'wear.record',{setIds:[setId]},laterWear);
  assert.equal(state.wearEvents.length,1);
});

test('archived garments and sets reject new wear, set binding and garment edits',()=>{
  const {state,top,skirt,jeans}=fixture();const setId=save(state,[top,skirt]);
  state.garments.find(g=>g.id===skirt).status='archived';
  const before=structuredClone(state);
  for(const [type,fields] of [['wear.record',{garmentIds:[skirt]}],['wear.record',{setIds:[setId]}],['set.save',{garmentIds:[skirt,jeans],name:'Unavailable'}],['garment.update',{garmentId:skirt,name:'Unavailable'}]]) {
    assert.throws(()=>act(state,type,fields),e=>e.status===409);
    assert.deepEqual(state,before);
  }
});

test('personal labels remain separate from type and invalid labels cannot partially edit a garment',()=>{
  const {state,top}=fixture();const garment=state.garments[0];
  act(state,'garment.update',{garmentId:top,name:'White top',garmentType:'上衣',categories:['露营','露营','游泳'],tags:['购于十月','想转卖'],notes:'Personal free text'});
  assert.equal(garment.type,'上衣');assert.deepEqual(garment.categories,['露营','游泳']);
  assert.deepEqual(garment.tags,['购于十月','想转卖']);assert.equal(garment.notes,'Personal free text');
  const before=structuredClone(state);
  for(const categories of ['category string',[null],[''],Array(31).fill('Too many')]) {
    assert.throws(()=>act(state,'garment.update',{garmentId:top,name:'Must not partially save',categories}),e=>e.status===400);
    assert.deepEqual(state,before);
  }
});

test('saved-state validation rejects broken set, wear, image, job and duplicate-ID relationships',()=>{
  const {state,top,skirt}=fixture();const setId=save(state,[top,skirt]);
  act(state,'wear.record',{setIds:[setId]});
  state.generationJobs.push({id:randomUUID(),requestId:'fixture-generation',status:'complete',sourceImageId:state.garments[0].sourceImageId,generatedImageId:state.garments[0].generatedImageId,createdAt:firstWear.toISOString()});
  assert.equal(validateState(state),state);
  for(const corrupt of [
    s=>{s.garments.push(structuredClone(s.garments[0]));},
    s=>{s.wearEvents.push({...structuredClone(s.wearEvents[0]),id:randomUUID()});},
    s=>{s.generationJobs.push({...structuredClone(s.generationJobs[0]),id:randomUUID()});},
    s=>{s.sets[0].garmentIds[0]='missing-garment';},
    s=>{s.wearEvents[0].garmentIds.push('missing-garment');},
    s=>{s.wearEvents[0].setGarments[setId]=['missing-member'];},
    s=>{s.generationJobs[0].sourceImageId='missing-source';},
    s=>{s.garments[0].generatedImageId=s.garments[0].sourceImageId;},
    s=>{const image=s.images[s.garments[0].sourceImageId];image.filename=`${randomUUID()}.jpg`;},
    s=>{const image=s.images[s.garments[0].sourceImageId];image.filename=`${image.id}.png`;},
    s=>{s.receipts=[];}
  ]) {
    const damaged=structuredClone(state);corrupt(damaged);
    assert.throws(()=>validateState(damaged),e=>e.status===500);
  }
});
