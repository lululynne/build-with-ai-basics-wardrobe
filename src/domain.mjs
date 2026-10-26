import {randomUUID} from 'node:crypto';

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function assert(value, message, status = 400) { if (!value) throw new AppError(message, status); }
export function textValue(value, label, max = 200, required = false) {
  assert(typeof value === 'string', `${label}需要填写文字 / Text required`);
  const result = value.trim();
  assert(result.length <= max && (!required || result.length), `${label}请填写 1–${max} 个字 / Check text length`);
  return result;
}
export function labels(value) {
  assert(Array.isArray(value) && value.length <= 30, '分类/标签最多 30 项 / Up to 30 labels');
  return [...new Set(value.map(v => textValue(v, '分类/标签', 100, true)))];
}
export function localDate(now = new Date()) {
  return [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
}
export function dateAfter(date,days) {
  const value=new Date(`${date}T00:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);
}
export function reviewStatus(state,now=new Date()) {
  const {enabled,intervalDays,anchorDate}=state.reviewSettings;
  const today=localDate(now),dueDate=anchorDate ? dateAfter(anchorDate,intervalDays) : null;
  return {today,dueDate,due:Boolean(enabled && ((state.reviewSession && !state.reviewSession.completedDate) || (dueDate && today>=dueDate)))};
}
export function initialState() {
  return {schemaVersion:1,garments:[],sets:[],wearEvents:[],reviewSettings:{enabled:false,intervalDays:30,anchorDate:null},reviewSession:null,generationJobs:[],images:{},receipts:{}};
}
export function validateState(s) {
  assert(s && s.schemaVersion === 1, '保存文件版本无法读取 / Unsupported saved data', 500);
  for (const field of ['garments','sets','wearEvents','generationJobs']) assert(Array.isArray(s[field]), '保存文件损坏 / Invalid saved data', 500);
  assert(s.images && typeof s.images === 'object' && !Array.isArray(s.images) && s.receipts && typeof s.receipts === 'object', '保存文件损坏 / Invalid saved data', 500);
  assert(s.reviewSettings && typeof s.reviewSettings.enabled === 'boolean' && Number.isInteger(s.reviewSettings.intervalDays) && s.reviewSettings.intervalDays >= 7 && s.reviewSettings.intervalDays <= 365, '复查设置损坏 / Invalid review settings', 500);
  for (const [id,img] of Object.entries(s.images)) assert(img.id === id && /^[a-f0-9-]{36}$/.test(id) && ['image/jpeg','image/png','image/webp'].includes(img.mimeType) && img.filename === `${id}.${{'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[img.mimeType]}` && ['source','generated'].includes(img.kind), '图片登记损坏 / Invalid image record',500);
  for (const g of s.garments) assert(typeof g.id === 'string' && typeof g.name === 'string' && ['active','archived'].includes(g.status) && s.images[g.sourceImageId] && s.images[g.generatedImageId] && Array.isArray(g.categories) && Array.isArray(g.tags), '衣物记录损坏 / Invalid garment record',500);
  const valid=(condition)=>assert(condition,'保存记录关联损坏 / Invalid saved record relationships',500);
  const listIds=entries=>new Set(entries.map(x=>x?.id));
  for(const field of ['garments','sets','wearEvents','generationJobs']) valid(s[field].every(x=>x && typeof x.id==='string' && x.id.length>0) && listIds(s[field]).size===s[field].length);
  for(const field of ['wearEvents','generationJobs']) valid(new Set(s[field].map(x=>x.requestId)).size===s[field].length);
  const garmentIds=listIds(s.garments),setIds=listIds(s.sets);
  for(const g of s.garments) valid(typeof g.type==='string' && typeof g.notes==='string' && Number.isFinite(Date.parse(g.enteredAt)) && g.categories.every(x=>typeof x==='string') && g.tags.every(x=>typeof x==='string') && Object.hasOwn(s.images,g.sourceImageId) && Object.hasOwn(s.images,g.generatedImageId) && s.images[g.sourceImageId].kind==='source' && s.images[g.generatedImageId].kind==='generated');
  for(const set of s.sets) valid(typeof set.name==='string' && ['active','archived'].includes(set.status) && Array.isArray(set.garmentIds) && set.garmentIds.length>=2 && new Set(set.garmentIds).size===set.garmentIds.length && set.garmentIds.every(id=>garmentIds.has(id) && (set.status==='archived' || s.garments.find(g=>g.id===id).status==='active')) && Number.isFinite(Date.parse(set.createdAt)));
  for(const event of s.wearEvents) valid(typeof event.requestId==='string' && Array.isArray(event.garmentIds) && event.garmentIds.length>0 && new Set(event.garmentIds).size===event.garmentIds.length && event.garmentIds.every(id=>garmentIds.has(id)) && Array.isArray(event.setIds) && new Set(event.setIds).size===event.setIds.length && event.setIds.every(id=>setIds.has(id)) && event.setGarments && typeof event.setGarments==='object' && Object.keys(event.setGarments).length===event.setIds.length && event.setIds.every(id=>Object.hasOwn(event.setGarments,id) && Array.isArray(event.setGarments[id]) && event.setGarments[id].every(gid=>event.garmentIds.includes(gid))) && Number.isFinite(Date.parse(event.occurredAt)));
  for(const job of s.generationJobs) valid(typeof job.requestId==='string' && ['pending','running','complete','failed'].includes(job.status) && Object.hasOwn(s.images,job.sourceImageId) && s.images[job.sourceImageId].kind==='source' && (job.status!=='complete' || (Object.hasOwn(s.images,job.generatedImageId) && s.images[job.generatedImageId].kind==='generated')) && (!job.confirmedGarmentId || garmentIds.has(job.confirmedGarmentId)));
  valid(!Array.isArray(s.receipts) && !Object.hasOwn(s.receipts,'__proto__'));
  const calendarDate=date=>typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date;
  valid((s.reviewSettings.anchorDate===null && !s.reviewSettings.enabled) || calendarDate(s.reviewSettings.anchorDate));
  if(s.reviewSession!==null) {
    const session=s.reviewSession;
    valid(session && typeof session.id==='string' && Array.isArray(session.snapshotIds) && new Set(session.snapshotIds).size===session.snapshotIds.length && session.snapshotIds.every(id=>garmentIds.has(id)) && Array.isArray(session.remainingIds) && new Set(session.remainingIds).size===session.remainingIds.length && session.remainingIds.every(id=>session.snapshotIds.includes(id) && s.garments.find(g=>g.id===id).status==='active') && Array.isArray(session.decisions) && new Set(session.decisions.map(d=>d.garmentId)).size===session.decisions.length && session.decisions.every(d=>session.snapshotIds.includes(d.garmentId) && !session.remainingIds.includes(d.garmentId) && ['keep','archive'].includes(d.decision) && calendarDate(d.decidedDate)) && session.remainingIds.length+session.decisions.length===session.snapshotIds.length && calendarDate(session.startedDate) && (session.completedDate===null ? session.remainingIds.length>0 : calendarDate(session.completedDate) && session.remainingIds.length===0));
  }
  return s;
}
export function requestId(value) { assert(typeof value === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value) && !['__proto__','constructor','prototype'].includes(value), '请求编号无效 / Invalid request ID'); return value; }

function ids(value) {
  assert(Array.isArray(value) && value.length<=1000 && value.every(v=>typeof v==='string' && v.length>0 && v.length<=100),'衣物选择无效 / Invalid selection');
  return [...new Set(value)];
}
function activeGarment(state,id) {
  const g=state.garments.find(g=>g.id===id);
  assert(g?.status==='active','这件衣服已不在当前衣柜 / Garment is not in the current wardrobe',409);
  return g;
}
function activeSet(state,id) {
  const set=state.sets.find(s=>s.id===id);
  assert(set?.status==='active','这套搭配已不在当前衣柜 / Set is not in the current wardrobe',409);
  for(const gid of set.garmentIds) activeGarment(state,gid);
  return set;
}
export function findExactSet(state,garmentIds) {
  const key=[...new Set(garmentIds)].sort().join(',');
  return state.sets.find(s=>s.status==='active' && [...s.garmentIds].sort().join(',')===key);
}
function saveSet(state,garmentIds,name,now) {
  const members=ids(garmentIds);assert(members.length>=2,'选择至少两件衣服来绑定 set / Select at least two garments');
  members.forEach(id=>activeGarment(state,id));
  const existing=findExactSet(state,members);
  if(existing) return {set:existing,reused:true};
  const set={id:randomUUID(),name:textValue(name,'套装名称',100,true),garmentIds:members,status:'active',createdAt:now.toISOString(),archivedAt:null};
  state.sets.push(set);return {set,reused:false};
}
function completeReviewIfFinished(state,today) {
  const session=state.reviewSession;
  if(session && !session.completedDate && session.remainingIds.length===0) {session.completedDate=today;state.reviewSettings.anchorDate=today;}
}
function archiveGarment(state,garmentId,now) {
  const garment=state.garments.find(g=>g.id===garmentId);
  assert(garment,'衣服不存在 / Garment not found',404);
  if(garment.status==='archived') return {garmentId,archivedSetIds:[],alreadyArchived:true};
  const timestamp=now.toISOString();garment.status='archived';garment.archivedAt=timestamp;
  const archivedSetIds=[];
  for(const set of state.sets) if(set.status==='active' && set.garmentIds.includes(garmentId)) {set.status='archived';set.archivedAt=timestamp;archivedSetIds.push(set.id);}
  const session=state.reviewSession;
  if(session && !session.completedDate && session.remainingIds.includes(garmentId)) {
    session.remainingIds=session.remainingIds.filter(id=>id!==garmentId);
    session.decisions.push({garmentId,decision:'archive',decidedDate:localDate(now)});
    completeReviewIfFinished(state,localDate(now));
  }
  return {garmentId,archivedSetIds};
}

export function applyAction(state, action, now = new Date()) {
  assert(action && typeof action === 'object', '操作格式无效 / Invalid action');
  const rid = requestId(action.requestId);
  const fingerprint = JSON.stringify(action);
  if (Object.hasOwn(state.receipts,rid)) {
    assert(state.receipts[rid].fingerprint === fingerprint, '请求编号已用于其他操作 / Request ID conflict',409);
    return state.receipts[rid].result;
  }
  let result;
  if (action.type === 'garment.confirm') {
    const job = state.generationJobs.find(j => j.id === action.jobId);
    assert(job?.status === 'complete' && state.images[job.generatedImageId], '请等待插画完成再确认 / Wait for a completed illustration');
    if (job.confirmedGarmentId) result = {garmentId:job.confirmedGarmentId};
    else {
      const garment = {id:randomUUID(),name:textValue(action.name,'衣物名称',100,true),type:textValue(action.garmentType,'类型',60,true),categories:labels(action.categories ?? []),tags:labels(action.tags ?? []),notes:textValue(action.notes ?? '','记录',3000),sourceImageId:job.sourceImageId,generatedImageId:job.generatedImageId,status:'active',enteredAt:now.toISOString(),archivedAt:null};
      state.garments.push(garment); job.confirmedGarmentId = garment.id; result = {garmentId:garment.id};
    }
  } else if(action.type==='garment.update') {
    const garment=activeGarment(state,action.garmentId);
    const changes={name:textValue(action.name ?? garment.name,'衣物名称',100,true),type:textValue(action.garmentType ?? garment.type,'类型',60,true),categories:labels(action.categories ?? garment.categories),tags:labels(action.tags ?? garment.tags),notes:textValue(action.notes ?? garment.notes,'记录',3000)};
    Object.assign(garment,changes);result={garmentId:garment.id};
  } else if(action.type==='set.save') {
    const {set,reused}=saveSet(state,action.garmentIds,action.name,now);result={setId:set.id,reused};
  } else if(action.type==='wear.record') {
    const selected=ids(action.garmentIds ?? []);let setIds=ids(action.setIds ?? []);
    selected.forEach(id=>activeGarment(state,id));
    let selectedSets=setIds.map(id=>activeSet(state,id));
    const garmentIds=[...new Set([...selected,...selectedSets.flatMap(s=>s.garmentIds)])];
    assert(garmentIds.length>0,'先选今天穿的衣服 / Select what you wore');
    let createdSetId;
    if(!setIds.length && garmentIds.length>=2) {
      const exact=findExactSet(state,garmentIds);
      if(exact) selectedSets=[exact];
      else {
        assert(typeof action.saveAsSet==='boolean','这组衣服还未保存为 set，请选择保存套装或分别计次 / Choose save as a set or record individually',409);
        if(action.saveAsSet) {const saved=saveSet(state,garmentIds,action.setName,now);selectedSets=[saved.set];createdSetId=saved.set.id;}
      }
      setIds=selectedSets.map(s=>s.id);
    }
    const event={id:randomUUID(),requestId:rid,garmentIds,setIds,setGarments:Object.fromEntries(selectedSets.map(s=>[s.id,[...s.garmentIds]])),occurredAt:now.toISOString()};
    state.wearEvents.push(event);result={eventId:event.id,...(createdSetId?{setId:createdSetId}:{})};
  } else if(action.type==='wear.remove') {
    const index=state.wearEvents.findIndex(event=>event.id===action.eventId);
    assert(index>=0,'找不到这条穿着记录 / Wear event not found',404);
    state.wearEvents.splice(index,1);result={removedEventId:action.eventId};
  } else if(action.type==='review.settings') {
    assert(typeof action.enabled==='boolean','请选择是否开启轮转 / Choose whether review is enabled');
    assert(Number.isInteger(action.intervalDays) && action.intervalDays>=7 && action.intervalDays<=365,'周期需要 7–365 的整数天数 / Choose a whole number from 7 to 365 days');
    state.reviewSettings={enabled:action.enabled,intervalDays:action.intervalDays,anchorDate:state.reviewSettings.anchorDate ?? (action.enabled?localDate(now):null)};
    result={reviewSettings:structuredClone(state.reviewSettings)};
  } else if(action.type==='review.start') {
    assert(state.reviewSettings.enabled,'请先开启衣柜轮转 / Enable wardrobe review first',409);
    if(state.reviewSession && !state.reviewSession.completedDate) result={sessionId:state.reviewSession.id};
    else {
      assert(reviewStatus(state,now).due,'轮转日期还未到 / The next review is not due yet',409);
      const snapshotIds=state.garments.filter(g=>g.status==='active').sort((a,b)=>Date.parse(a.enteredAt)-Date.parse(b.enteredAt) || a.id.localeCompare(b.id)).map(g=>g.id);
      state.reviewSession={id:randomUUID(),snapshotIds,remainingIds:[...snapshotIds],decisions:[],startedDate:localDate(now),completedDate:null};
      completeReviewIfFinished(state,localDate(now));
      result={sessionId:state.reviewSession.id,empty:snapshotIds.length===0};
    }
  } else if(action.type==='review.decide') {
    const session=state.reviewSession;
    assert(session && session.id===action.sessionId,'这轮整理已更新，请重新打开 / Review session changed; reopen it',409);
    assert(['keep','archive'].includes(action.decision),'请选择保留或归档 / Choose keep or archive');
    const previous=session.decisions.find(d=>d.garmentId===action.garmentId);
    if(previous) {assert(previous.decision===action.decision,'这张卡片已经处理，请继续下一张 / This card has already been reviewed',409);result={sessionId:session.id,alreadyDecided:true};}
    else {
      assert(!session.completedDate && session.remainingIds[0]===action.garmentId,'卡片顺序已更新，请继续当前这一张 / Review card changed; continue with the current card',409);
      activeGarment(state,action.garmentId);
      if(action.decision==='archive') archiveGarment(state,action.garmentId,now);
      else {session.remainingIds.shift();session.decisions.push({garmentId:action.garmentId,decision:'keep',decidedDate:localDate(now)});completeReviewIfFinished(state,localDate(now));}
      result={sessionId:session.id,completed:Boolean(session.completedDate)};
    }
  } else if(action.type==='garment.archive') {
    result=archiveGarment(state,action.garmentId,now);
  } else throw new AppError('暂不支持这个操作 / Unknown action');
  state.receipts[rid] = {fingerprint,result};
  return result;
}
export function viewState(state, now = new Date()) {
  const result = structuredClone(state);
  delete result.receipts;
  result.counts = {garments:Object.fromEntries(state.garments.map(g=>[g.id,{total:0,individual:0,set:0}])),sets:Object.fromEntries(state.sets.map(s=>[s.id,0]))};
  for(const event of state.wearEvents) {
    for(const setId of new Set(event.setIds)) if(Object.hasOwn(result.counts.sets,setId)) result.counts.sets[setId]++;
    const inSets=new Set(Object.values(event.setGarments).flat());
    for(const garmentId of new Set(event.garmentIds)) {
      const count=result.counts.garments[garmentId];if(!count)continue;
      count.total++;count[inSets.has(garmentId)?'set':'individual']++;
    }
  }
  result.review = reviewStatus(state,now);
  return result;
}
