import { t, getLanguage, setLanguage } from './i18n.js';
import { icon } from './icons.js';

const app = document.querySelector('#app');
const nav = document.querySelector('#app-nav');
let state = null;
let sort = 'newest';
let busy = false;
let error = '';
let homeGarmentId = null;
let pollTimer = null;
let toastTimer = null;
let intake = readIntake();
let categoryFilter = '';
let editingGarmentId = null;
let editDraft = null;
let setBuilderName = '';
let setSelection = new Set();
let wearSelection = readSession('wardrobe-selection', {garmentIds:[],setIds:[]});
let wearDecision = null;
let removeEventId = null;
let dailyNo = false;
let archiveTargetId = null;
let reviewSettingsDraft = null;
let pendingMutation = readSession('wardrobe-pending-action', null);
const garmentTypes = ['top','bottom','dress','outerwear','shoes','accessory','other'];

export function escapeHTML(value = '') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const e = escapeHTML;
const media = id => `/media/${encodeURIComponent(id)}`;
const button = (action, text, cls = 'primary', extra = '') => `<button type="button" class="button ${cls}" data-action="${action}" ${busy ? 'disabled' : ''} ${extra}>${text}</button>`;
const activeSets = () => (state?.sets || []).filter(s => s.status === 'active');
const activeGarments = () => (state?.garments || []).filter(g => g.status === 'active');
const date = value => new Date(value).toLocaleDateString(getLanguage() === 'zh' ? 'zh-CN' : 'en-GB', {year:'numeric',month:'short',day:'numeric'});
const labels = values => (values || []).map(x => `<span class="tag">${e(x)}</span>`).join('');

function readSession(key, fallback) { try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function persistSelection() { sessionStorage.setItem('wardrobe-selection',JSON.stringify(wearSelection)); }
function splitLabels(value='') { return value.split(/[,，、\n]/).map(s=>s.trim()).filter(Boolean); }
function readIntake() {
  try { return JSON.parse(sessionStorage.getItem('wardrobe-intake')) || {}; } catch { return {}; }
}
function saveIntake() { sessionStorage.setItem('wardrobe-intake', JSON.stringify(intake)); }
function captureDraft() {
  const reviewForm=document.querySelector('#review-settings-form');
  if(reviewForm)reviewSettingsDraft={enabled:reviewForm.elements.enabled.checked,intervalDays:reviewForm.elements.intervalDays.value};
  const editForm=document.querySelector('#edit-form');
  if(editForm) editDraft=Object.fromEntries(new FormData(editForm));
  const setNameInput=document.querySelector('#set-name');if(setNameInput)setBuilderName=setNameInput.value;
  const wearSetName=document.querySelector('#wear-set-name');if(wearSetName&&wearDecision)wearDecision.name=wearSetName.value;
  const form = document.querySelector('#confirm-form');
  if (form && !intake.pendingConfirm) { intake.draft = Object.fromEntries(new FormData(form)); saveIntake(); }
}
function toast(message) {
  const element = document.querySelector('#toast'); element.textContent = message; element.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; }, 4200);
}
async function api(path, payload) {
  let response;
  try { response = await fetch(path, payload === undefined ? {cache:'no-store'} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); }
  catch { throw new Error(t('connectionError')); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { const failure=new Error(body.error || t('connectionError'));failure.httpStatus=response.status;throw failure; }
  return body;
}
async function refresh() { state = await api('/api/state'); }
function route() { return (location.hash || '#home').slice(1).split('/'); }
function go(path) { if (location.hash === `#${path}`) render(); else location.hash = path; }
function image(id, alt, cls = '') { return `<img src="${media(id)}" alt="${e(alt)}" class="${cls}" loading="lazy">`; }
function renderShell() {
  document.querySelector('#brand-title').textContent = t('title');
  document.querySelector('#saved-indicator').textContent = t('saved');
  document.querySelector('#app-footer').textContent = t('footer');
  const lang = document.querySelector('#language-button'); lang.textContent = getLanguage() === 'zh' ? 'EN' : '中文'; lang.setAttribute('aria-label', getLanguage() === 'zh' ? 'Switch to English' : '切换中文');
  const banner=document.querySelector('#review-banner');
  const showReminder=Boolean(state?.review?.due && state?.reviewSettings?.enabled);
  banner.hidden=!showReminder;
  banner.innerHTML=showReminder?`<div class="review-reminder-copy">${icon('review')}<p>${t('reviewReminder')}</p></div><a class="button secondary" href="#review">${t('reviewOpen')} ↗</a>`:'';
  const current = route()[0];
  nav.innerHTML = [['home','home'],['wardrobe','wardrobe'],['sets','sets'],['wear','wear'],['add','add'],['review','review'],['archive','archive']].map(([path,key]) => `<a href="#${path}" class="nav-item ${current===path ? 'active' : ''}" ${current===path ? 'aria-current="page"' : ''}>${icon(key)}<span>${t(key)}</span></a>`).join('');
  nav.setAttribute('aria-label', getLanguage() === 'zh' ? '主要导航' : 'Main navigation');
}
function errorBlock(message = error) { return message ? `<div class="error-message" role="alert">${e(message)}</div>` : ''; }
function card(g) {
  return `<a class="garment-card" href="#garment/${encodeURIComponent(g.id)}"><div class="card-image">${image(g.generatedImageId, g.name)}<span class="card-number">${e(t(g.type))}</span></div><div class="card-caption"><h3>${e(g.name)}</h3><p>${(g.categories || []).length ? e(g.categories.join(' · ')) : date(g.enteredAt)}</p></div></a>`;
}
function emptyCollection() { return `<div class="empty-collection">${icon('wardrobe','empty-icon')}<h3>${t('emptyTitle')}</h3><p>${t('emptyText')}</p><a class="text-link" href="#add">${t('addFirst')} <span aria-hidden="true">↗</span></a></div>`; }
function home() {
  const garments = activeGarments();
  let hero;
  if (!garments.length) {
    hero = `<section class="welcome-hero"><div class="hero-copy"><p class="eyebrow">${t('eyebrow')}</p><h1>${t('welcome').split('\n').join('<br>')}</h1><p class="hero-description">${t('welcomeText').split('\n').join('<br>')}</p><a class="button primary" href="#add">${icon('add')}${t('addFirst')}<span aria-hidden="true">↗</span></a><span class="hero-whisper">${t('gentle')}</span></div><div class="hero-art"><span class="art-star star-one" aria-hidden="true">✧</span><img src="/art/wardrobe-welcome.png" alt="" width="500" height="500"><span class="art-star star-two" aria-hidden="true">✧</span><span class="art-note">a place for your favorites</span></div></section>`;
  } else {
    if (!garments.some(g => g.id === homeGarmentId)) homeGarmentId = garments[Math.floor(Math.random()*garments.length)].id;
    const g = garments.find(g => g.id === homeGarmentId);
    hero = `<section class="daily-hero"><div class="hero-copy"><p class="eyebrow">${t('today')}</p><h1>${t('todayQuestion')}</h1><p class="hero-description">${t('todayText')}</p><h2 class="daily-garment-name">${e(g.name)}</h2><div class="button-row">${button('wore-yes',t('woreYes'),'primary')}${button('wore-no',t('woreNo'),'secondary')}</div><a class="text-link" href="#wear">${t('chooseActual')} ↗</a>${dailyNo?`<p class="daily-no-note">${t('noWearNotice')}</p>`:''}<div>${button('another',t('another'),'text-button')}</div></div><a class="daily-card" href="#garment/${encodeURIComponent(g.id)}">${image(g.generatedImageId,g.name)}<span>${e(t(g.type))}</span></a></section>`;
  }
  return hero + (!garments.length ? `<section class="how-section"><div class="section-heading"><h2>${t('howTitle')}</h2><span class="tiny-flower" aria-hidden="true">✳</span></div><div class="steps">${[['add','step1','step1text'],['wardrobe','step2','step2text'],['keep','step3','step3text']].map(([ic,title,text],i)=>`<article class="step-card"><span class="step-number">0${i+1}</span>${icon(ic)}<h3>${t(title)}</h3><p>${t(text)}</p></article>`).join('')}</div></section>` : '') + `<section class="collection-section"><div class="section-heading"><div><p class="eyebrow">THE PIECES OF YOU</p><h2>${t('collection')} <span class="count-pill">${garments.length}</span></h2></div>${garments.length ? `<a class="text-link" href="#wardrobe">${t('viewWardrobe')} ↗</a>` : ''}</div>${garments.length ? `<div class="garment-grid">${garments.slice(-6).reverse().map(card).join('')}</div>` : emptyCollection()}</section>`;
}
function wardrobe() {
  const allGarments=activeGarments();
  const categories=[...new Set(allGarments.flatMap(g=>g.categories || []))];
  const garments=allGarments.filter(g=>!categoryFilter||g.categories.includes(categoryFilter)).sort((a,b)=>sort==='newest'?new Date(b.enteredAt)-new Date(a.enteredAt):new Date(a.enteredAt)-new Date(b.enteredAt));
  return `<section class="page-section"><div class="page-heading"><div><p class="eyebrow">EVERY PIECE, A LITTLE STORY</p><h1>${t('wardrobe')}</h1><p class="muted">${allGarments.length} ${t('pieces')}</p></div><a class="button primary compact" href="#add">${icon('add')}${t('add')}</a></div><div class="collection-toolbar"><label class="category-label"><select id="category-filter" aria-label="${e(t('categoryFilter'))}"><option value="">${t('categoryAll')}</option>${categories.map(c=>`<option value="${e(c)}" ${categoryFilter===c?'selected':''}>${e(c)}</option>`).join('')}</select></label><label class="sort-label"><select id="sort-select" aria-label="${e(t('newest'))}"><option value="newest" ${sort==='newest'?'selected':''}>${t('newest')}</option><option value="oldest" ${sort==='oldest'?'selected':''}>${t('oldest')}</option></select></label></div><div class="wardrobe-shortcuts"><a class="text-link" href="#wear">${t('chooseActual')} ↗</a><a class="text-link" href="#sets/new">${t('newSet')} ↗</a></div>${garments.length?`<div class="garment-grid">${garments.map(card).join('')}</div>`:emptyCollection()}</section>`;
}
function detail(id) {
  const g = state.garments.find(x=>x.id===id);
  if (!g) return `<section class="page-section"><p>${t('notFound')}</p><a href="#wardrobe" class="text-link">${t('back')}</a></section>`;
  if(editingGarmentId===id && g.status==='active')return editGarment(g);
  const archived=g.status==='archived';
  const counts = state.counts?.garments?.[g.id] || {total:0,individual:0,set:0};
  return `<section class="page-section"><a class="back-link" href="${archived?'#archive/singles':'#wardrobe'}">← ${t(archived?'pastSingles':'wardrobe')}</a><div class="detail-layout"><div class="detail-visuals"><div class="detail-main-image">${image(g.generatedImageId,g.name)}</div><details class="source-disclosure"><summary>${t('source')}</summary><div class="source-detail">${image(g.sourceImageId,t('source'))}</div></details></div><article class="detail-copy"><p class="eyebrow">YOUR ILLUSTRATED PIECE</p><span class="tag type-tag">${e(t(g.type))}</span>${archived?` <span class="tag archive-label">${t('archived')}</span>`:''}<h1>${e(g.name)}</h1><p class="entry-date">${t('entered')} · ${date(g.enteredAt)}${archived&&g.archivedAt?`<br>${t('archivedAt')} · ${date(g.archivedAt)}`:''}</p><div class="tags">${labels(g.categories)}${labels(g.tags)}</div><div class="notes-block"><h3>${t('notes')}</h3><p>${e(g.notes || t('noNotes'))}</p></div><div class="wear-stats"><h3>${t('counts')}</h3><div class="stats-row">${[['wearTotal',counts.total],['wearIndividual',counts.individual],['wearSet',counts.set]].map(([key,n])=>`<div><strong>${n}</strong><span>${t(key)}</span></div>`).join('')}</div></div>${!archived?`<div class="detail-actions">${button('edit-garment',t('edit'),'secondary',`data-id="${e(g.id)}"`)}${button('wear-one',t('woreYes'),'primary',`data-id="${e(g.id)}"`)}</div><div class="detail-archive-action">${archiveTargetId===g.id?`<div class="archive-confirm"><h3>${t('archiveConfirm')}</h3><p>${t('archiveConfirmText')}</p><div class="button-row">${button('confirm-archive',t('archiveConfirmAction'),'secondary',`data-id="${e(g.id)}"`)}${button('cancel-archive',t('cancel'),'text-button')}</div></div>`:button('ask-archive',`${icon('archive')}${t('archiveGarment')}`,'text-button',`data-id="${e(g.id)}"`)}</div>`:''}</article></div></section>`;
}
function photoInput() { return `<input id="photo-input" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label="${e(t('choosePhoto'))}">`; }
function intakeForm() {
  const draft = intake.draft || {};
  const locked = intake.pendingConfirm ? 'readonly' : '';
  return `<form id="confirm-form" class="confirm-form"><div class="field"><label for="garment-name">${t('name')} <span class="required-star">*</span></label><input id="garment-name" name="name" ${locked} required maxlength="100" placeholder="${e(t('namePlaceholder'))}" value="${e(draft.name || '')}"></div><div class="field"><label for="garment-type">${t('type')}</label><select id="garment-type" name="garmentType" ${locked?'disabled':''}>${garmentTypes.map(type=>`<option value="${type}" ${(draft.garmentType||'top')===type?'selected':''}>${t(type)}</option>`).join('')}</select></div><div class="field-pair"><div class="field"><label for="categories">${t('categories')}</label><input id="categories" name="categories" ${locked} maxlength="1000" placeholder="${e(t('categoriesHelp'))}" value="${e(draft.categories || '')}"></div><div class="field"><label for="tags">${t('tags')}</label><input id="tags" name="tags" ${locked} maxlength="1000" placeholder="${e(t('tagsHelp'))}" value="${e(draft.tags || '')}"></div></div><div class="field"><label for="notes">${t('notes')}</label><textarea id="notes" name="notes" ${locked} maxlength="3000" rows="3" placeholder="${e(t('notesHelp'))}">${e(draft.notes || '')}</textarea></div><button type="submit" class="button primary full-width" ${busy?'disabled':''}>${icon('keep')}${busy?t('confirming'):intake.pendingConfirm?t('retryConfirm'):t('confirm')}</button></form>`;
}
function intakePage() {
  const job = intake.job;
  let body;
  if (!intake.sourceImageId) {
    body = `<div class="upload-area"><div class="upload-icon">${icon('add')}</div><h2>${t('choosePhoto')}</h2><p>${t('photoAdvice')}</p><label for="photo-input" class="button primary upload-label" ${busy?'aria-disabled="true"':''}>${busy?t('uploading'):t('choosePhoto')} <span aria-hidden="true">＋</span></label><small>${t('photoHint')}</small></div><div class="sample-row">${button('sample',t('sample'),'text-button')}<p>${t('sampleNote')}</p></div>`;
  } else if (job && ['pending','running'].includes(job.status)) {
    body = `<div class="generation-progress" role="status"><div class="progress-image">${image(intake.sourceImageId,t('source'))}<div class="drawing-shimmer"></div><span class="progress-badge">${icon('wardrobe')}</span></div><span class="spinner"></span><h2>${t('generating')}</h2><p>${t('generationNote')}</p><div class="progress-track"><span></span></div></div>`;
  } else if (job?.status==='complete' && job.generatedImageId) {
    body = `<div class="preview-heading"><h2>${t('compareTitle')}</h2><p>${t('compareText')}</p></div><div class="comparison"><figure><div>${image(intake.sourceImageId,t('source'))}</div><figcaption><span class="small-dot"></span>${t('source')}</figcaption></figure><figure class="illustration-figure"><div>${image(job.generatedImageId,t('illustration'))}<span class="image-sparkle" aria-hidden="true">✧</span></div><figcaption><span class="small-dot mauve"></span>${t('illustration')}</figcaption></figure></div><div class="preview-actions">${button('regenerate',t('regenerate'),'secondary')}<label for="photo-input" class="button text-button">${t('replace')}</label></div>${intakeForm()}`;
  } else {
    body = `<div class="ready-photo"><div class="ready-image">${image(intake.sourceImageId,t('source'))}</div><div class="ready-copy"><p class="eyebrow">YOUR ORIGINAL PIECE</p><h2>${job?.status==='failed'?t('generationFailed'):t('photoReady')}</h2><p>${job?.status==='failed'?t('failedHint'):t('photoAdvice')}</p>${job?.status==='failed'?errorBlock(job.error):''}${button('generate',job?.status==='failed'?t('regenerate'):t('generate'),'primary')}<label for="photo-input" class="button text-button">${t('replace')}</label></div></div>`;
  }
  return `<section class="page-section intake-section"><div class="intake-heading"><p class="eyebrow">${t('intakeEyebrow')}</p><h1>${t('intakeTitle')}</h1><p>${t('intakeText')}</p></div><ol class="intake-steps" aria-label="${e(t('howTitle'))}"><li class="${!intake.sourceImageId?'current':'done'}"><span>1</span>${t('step1')}</li><li class="${intake.sourceImageId&&job?.status!=='complete'?'current':job?.status==='complete'?'done':''}"><span>2</span>${t('step2')}</li><li class="${job?.status==='complete'?'current':''}"><span>3</span>${t('step3')}</li></ol>${errorBlock()}${body}${photoInput()}<p class="privacy-note">${t('privacy')}</p></section>`;
}
function fieldInputs(draft, prefix) {
  const type=draft.garmentType || draft.type || 'top';
  const options=garmentTypes.includes(type)?garmentTypes:[type,...garmentTypes];
  return `<div class="field"><label for="${prefix}-name">${t('name')} <span class="required-star">*</span></label><input id="${prefix}-name" name="name" maxlength="100" required value="${e(draft.name || '')}"></div><div class="field"><label for="${prefix}-type">${t('type')}</label><select id="${prefix}-type" name="garmentType">${options.map(value=>`<option value="${e(value)}" ${type===value?'selected':''}>${e(t(value))}</option>`).join('')}</select></div><div class="field-pair"><div class="field"><label for="${prefix}-categories">${t('categories')}</label><input id="${prefix}-categories" name="categories" maxlength="1000" placeholder="${e(t('categoriesHelp'))}" value="${e(Array.isArray(draft.categories)?draft.categories.join('，'):draft.categories || '')}"></div><div class="field"><label for="${prefix}-tags">${t('tags')}</label><input id="${prefix}-tags" name="tags" maxlength="1000" placeholder="${e(t('tagsHelp'))}" value="${e(Array.isArray(draft.tags)?draft.tags.join('，'):draft.tags || '')}"></div></div><div class="field"><label for="${prefix}-notes">${t('notes')}</label><textarea id="${prefix}-notes" name="notes" maxlength="3000" rows="4" placeholder="${e(t('notesHelp'))}">${e(draft.notes || '')}</textarea></div>`;
}
function editGarment(g) {
  return `<section class="page-section"><div class="page-heading"><div><p class="eyebrow">A FEW LITTLE DETAILS</p><h1>${t('edit')}</h1><p class="muted">${t('editIntro')}</p></div></div><form id="edit-form" class="confirm-form">${fieldInputs(editDraft || g,'edit')}<div class="button-row"><button type="submit" class="button primary" ${busy?'disabled':''}>${t('saveChanges')}</button>${button('cancel-edit',t('cancel'),'secondary')}</div></form></section>`;
}
function setImages(set, className='') {
  return `<div class="set-collage ${className}">${set.garmentIds.map(id=>state.garments.find(g=>g.id===id)).filter(Boolean).map(g=>image(g.generatedImageId,g.name)).join('')}</div>`;
}
function setCard(set) {
  return `<a class="garment-card set-card" href="#set/${encodeURIComponent(set.id)}"><div class="card-image">${setImages(set)}<span class="card-number">${set.garmentIds.length} ${t('setPieces')}</span></div><div class="card-caption"><h3>${e(set.name)}</h3><p>${t('setWear')} · ${state.counts?.sets?.[set.id] || 0} ${t('times')}</p></div></a>`;
}
function selectGarment(g,kind,checked) {
  const attribute=kind==='builder'?'data-select-garment':'data-wear-garment';
  const count=state.counts?.garments?.[g.id]?.total || 0;
  return `<label class="selection-card ${checked?'selected':''}"><input type="checkbox" ${attribute}="${e(g.id)}" ${checked?'checked':''} ${busy?'disabled':''}><span class="selection-check" aria-hidden="true">✓</span><span class="select-image">${image(g.generatedImageId,g.name)}</span><span class="select-caption"><strong>${e(g.name)}</strong><small>${e(t(g.type))} · ${count} ${t('times')}</small></span></label>`;
}
function setsPage(part) {
  if(part==='new') {
    const available=activeGarments();
    return `<section class="page-section"><a class="back-link" href="#sets">← ${t('sets')}</a><div class="page-heading"><div><p class="eyebrow">BETTER TOGETHER</p><h1>${t('newSet')}</h1><p class="muted">${t('selectPieces')}</p></div><span class="count-pill">${setSelection.size}</span></div><form id="set-form"><div class="set-name-panel"><div class="field"><label for="set-name">${t('setName')}</label><input id="set-name" name="name" value="${e(setBuilderName)}" required maxlength="100" placeholder="${e(t('setNamePlaceholder'))}"></div><button type="submit" class="button primary" ${busy?'disabled':''}>${icon('sets')}${t('saveSet')}</button></div><div class="garment-grid selection-grid">${available.map(g=>selectGarment(g,'builder',setSelection.has(g.id))).join('')}</div>${!available.length?emptyCollection():''}</form></section>`;
  }
  const sets=activeSets();
  return `<section class="page-section"><div class="page-heading"><div><p class="eyebrow">LITTLE THINGS, BETTER TOGETHER</p><h1>${t('sets')}</h1><p class="muted">${t('chooseSet')}</p></div><a class="button primary compact" href="#sets/new">${icon('sets')}${t('newSet')}</a></div>${sets.length?`<div class="garment-grid">${sets.slice().reverse().map(setCard).join('')}</div>`:`<div class="empty-collection">${icon('sets','empty-icon')}<h3>${t('setEmpty')}</h3><p>${t('setEmptyText')}</p><a class="text-link" href="#sets/new">${t('newSet')} ↗</a></div>`}</section>`;
}
function setDetail(id) {
  const set=state.sets.find(s=>s.id===id);
  if(!set)return `<section class="page-section"><p>${t('notFound')}</p><a href="#sets" class="text-link">${t('back')}</a></section>`;
  const components=set.garmentIds.map(id=>state.garments.find(g=>g.id===id)).filter(Boolean);
  return `<section class="page-section"><a class="back-link" href="${set.status==='archived'?'#archive/sets':'#sets'}">← ${t(set.status==='archived'?'pastSets':'sets')}</a><div class="set-detail-heading"><div><p class="eyebrow">YOUR FAVORITES, TOGETHER</p><h1>${e(set.name)}</h1>${set.status==='archived'?`<span class="tag archive-label">${t('archived')}</span>`:''}<p class="muted">${date(set.createdAt)} · ${set.garmentIds.length} ${t('setPieces')}</p></div><div class="set-wear-count"><strong>${state.counts?.sets?.[set.id] || 0}</strong><span>${t('setWear')}</span></div></div>${set.status==='active'?button('wear-this-set',t('chooseActual'),'primary',`data-id="${e(set.id)}"`):''}<h2 class="subsection-title">${t('setComponents')}</h2><div class="garment-grid">${components.map(card).join('')}</div></section>`;
}
function selectedGarmentIds() {
  return [...new Set([...wearSelection.garmentIds,...activeSets().filter(s=>wearSelection.setIds.includes(s.id)).flatMap(s=>s.garmentIds)])];
}
function exactSelectedSet() {
  const ids=[...new Set(wearSelection.garmentIds)].sort();
  return activeSets().find(s=>s.garmentIds.length===ids.length && [...s.garmentIds].sort().every((id,i)=>id===ids[i]));
}
function wearPage() {
  const garments=activeGarments();
  wearSelection.garmentIds=wearSelection.garmentIds.filter(id=>garments.some(g=>g.id===id));
  const sets=activeSets();wearSelection.setIds=wearSelection.setIds.filter(id=>sets.some(s=>s.id===id));
  const count=selectedGarmentIds().length;
  const exact=!wearSelection.setIds.length && exactSelectedSet();
  const history=state.wearEvents.slice().sort((a,b)=>new Date(b.occurredAt)-new Date(a.occurredAt));
  return `<section class="page-section"><div class="page-heading"><div><p class="eyebrow">THE OUTFIT YOU LIVED IN</p><h1>${t('wearHeading')}</h1><p class="muted">${t('wearIntro')}</p></div></div><div class="wear-selection-heading"><h2>${t('singles')}</h2><span class="muted">${t('selected')} ${count} ${t('pieces')}</span></div>${garments.length?`<div class="garment-grid selection-grid">${garments.map(g=>selectGarment(g,'wear',wearSelection.garmentIds.includes(g.id))).join('')}</div>`:emptyCollection()}${sets.length?`<div class="wear-selection-heading"><div><h2>${t('savedSets')}</h2><p class="muted">${t('chooseFromSet')}</p></div></div><div class="garment-grid selection-grid">${sets.map(s=>`<label class="selection-card ${wearSelection.setIds.includes(s.id)?'selected':''}"><input type="checkbox" data-wear-set="${e(s.id)}" ${wearSelection.setIds.includes(s.id)?'checked':''} ${busy?'disabled':''}><span class="selection-check" aria-hidden="true">✓</span><span class="select-image">${setImages(s)}</span><span class="select-caption"><strong>${e(s.name)}</strong><small>${s.garmentIds.length} ${t('setPieces')}</small></span></label>`).join('')}</div>`:''}${exact?`<p class="exact-set-note">${icon('sets')}${t('matchedSet')} <strong>${e(exact.name)}</strong></p>`:''}${wearDecision?`<div class="wear-decision"><p class="eyebrow">KEEP THIS COMBINATION?</p><h2>${t('saveCombination')}</h2><p>${t('saveCombinationText')}</p><form id="wear-set-form"><div class="field"><label for="wear-set-name">${t('setName')}</label><input id="wear-set-name" name="name" maxlength="100" required value="${e(wearDecision.name || '')}" placeholder="${e(t('setNamePlaceholder'))}"></div><button class="button primary" type="submit" ${busy?'disabled':''}>${t('saveAndWear')}</button></form><div class="button-row">${button('decline-set',t('recordIndividually'),'secondary')}${button('cancel-wear-decision',t('cancel'),'text-button')}</div></div>`:`<div class="outfit-save-bar"><div><strong>${t('selectedOutfit')}</strong><span>${count} ${t('pieces')}</span></div>${button('record-wear',t('recordWear'),'primary',count?'':'disabled')}</div>`}<section class="wear-history"><div class="section-heading"><h2>${t('wearHistory')}</h2><span class="count-pill">${history.length}</span></div>${history.length?history.map(wearHistoryItem).join(''):`<p class="history-empty">${t('noWearHistory')}</p>`}</section></section>`;
}
function wearHistoryItem(event) {
  const garmentNames=event.garmentIds.map(id=>state.garments.find(g=>g.id===id)?.name || id);
  const setNames=event.setIds.map(id=>state.sets.find(s=>s.id===id)?.name || id);
  const when=new Date(event.occurredAt).toLocaleString(getLanguage()==='zh'?'zh-CN':'en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  return `<article class="history-item"><div class="history-art">${icon(setNames.length?'sets':'wardrobe')}</div><div class="history-copy"><time datetime="${e(event.occurredAt)}">${e(when)}</time><h3>${e(garmentNames.join(' + '))}</h3><p>${setNames.length?`${t('setAttribution')} · ${e(setNames.join(' + '))}`:t('individualAttribution')}</p>${removeEventId===event.id?`<div class="remove-confirm"><p>${t('removeConfirm')}</p><div class="button-row">${button('confirm-remove',t('confirmRemove'),'secondary',`data-id="${e(event.id)}"`)}${button('cancel-remove',t('cancel'),'text-button')}</div></div>`:''}</div>${removeEventId!==event.id?button('remove-wear',t('removeWear'),'text-button',`data-id="${e(event.id)}"`):''}</article>`;
}
function prepareWear() {
  if(busy)return;
  if(pendingMutation) { error=t('resolveSave');render();return; }
  if(!selectedGarmentIds().length) { error=t('nothingSelected');render();return; }
  if(!wearSelection.setIds.length && wearSelection.garmentIds.length>=2 && !exactSelectedSet()) { wearDecision={name:''};error='';render();document.querySelector('#wear-set-name')?.focus();return; }
  return perform(()=>mutate({type:'wear.record',garmentIds:[...wearSelection.garmentIds],setIds:[...wearSelection.setIds]}));
}
async function mutate(payload) {
  if(pendingMutation)throw new Error(t('resolveSave'));
  pendingMutation={...payload,requestId:crypto.randomUUID()};
  sessionStorage.setItem('wardrobe-pending-action',JSON.stringify(pendingMutation));
  return commitPending();
}
async function commitPending() {
  if(!pendingMutation)return;
  const payload=pendingMutation;
  let response;
  try { response=await api('/api/actions',payload); }
  catch(failure) { if(failure.httpStatus) { pendingMutation=null;sessionStorage.removeItem('wardrobe-pending-action'); }throw failure; }
  state=response.state || await api('/api/state');
  pendingMutation=null;sessionStorage.removeItem('wardrobe-pending-action');
  if(payload.type==='garment.update') { editingGarmentId=null;editDraft=null;toast(t('changed')); }
  if(payload.type==='set.save') { setSelection.clear();setBuilderName='';app.innerHTML='';toast(response.result?.reused?t('setReused'):t('setSaved'));go(`set/${encodeURIComponent(response.result.setId)}`); }
  if(payload.type==='wear.record') { wearSelection={garmentIds:[],setIds:[]};wearDecision=null;dailyNo=false;persistSelection();toast(t('wearSaved')); }
  if(payload.type==='wear.remove') { removeEventId=null;toast(t('wearRemoved')); }
  if(payload.type==='review.settings') { reviewSettingsDraft=null;toast(t('reviewSettingsSaved')); }
  if(payload.type==='review.start') { go('review'); }
  if(payload.type==='review.decide') { toast(t(payload.decision==='keep'?'reviewKept':'reviewArchived')); }
  if(payload.type==='garment.archive') { archiveTargetId=null;toast(t('archivedSaved'));go('archive/singles'); }
  return response;
}

function calendarDate(value) { return value?date(`${value}T12:00:00`):'—'; }
function reviewSettingsForm() {
  const settings=reviewSettingsDraft || state.reviewSettings;
  return `<form id="review-settings-form" class="review-settings-form"><div class="review-settings-title">${icon('review')}<div><h2>${t('reviewSettings')}</h2><p>${t('reviewOptional')}</p></div></div><label class="switch-label"><span>${t('reviewEnabled')}</span><input type="checkbox" name="enabled" ${settings.enabled?'checked':''} ${busy?'disabled':''}><span class="switch-track" aria-hidden="true"></span></label><div class="interval-setting"><div class="field"><label for="review-interval">${t('reviewInterval')}</label><div class="interval-input"><input id="review-interval" name="intervalDays" type="number" min="7" max="365" step="1" required value="${e(settings.intervalDays)}"><span>${t('reviewDays')}</span></div><small>${t('reviewRange')}</small></div><button class="button secondary" type="submit" ${busy?'disabled':''}>${t('reviewSave')}</button></div></form>`;
}
function reviewPage() {
  const session=state.reviewSession;
  const unfinished=Boolean(session && !session.completedDate && session.remainingIds.length);
  const settings=state.reviewSettings;
  const due=state.review?.due;
  const next=state.review?.dueDate;
  let content;
  if(unfinished) {
    const id=session.remainingIds[0];
    const garment=state.garments.find(g=>g.id===id && g.status==='active');
    const done=session.snapshotIds.length-session.remainingIds.length;
    content=`<section class="review-round"><div class="review-progress-heading"><div><p class="eyebrow">ONE PIECE AT A TIME</p><h2>${t('reviewProgress')} <strong>${done}<span> / ${session.snapshotIds.length}</span></strong></h2></div><p>${session.remainingIds.length} ${t('reviewRemaining')}</p></div><div class="review-dots" aria-hidden="true">${session.snapshotIds.map((_,i)=>`<span class="${i<done?'complete':i===done?'current':''}"></span>`).join('')}</div>${garment?`<article class="review-garment"><p class="eyebrow">${t('reviewCurrent')}</p><a href="#garment/${encodeURIComponent(garment.id)}" class="review-garment-image">${image(garment.generatedImageId,garment.name)}</a><h2>${e(garment.name)}</h2><p>${e(t(garment.type))}${garment.categories.length?' · '+e(garment.categories.join(' · ')):''}</p><div class="review-choice-row"><button type="button" class="review-choice keep-choice" data-action="review-keep" data-session="${e(session.id)}" data-id="${e(garment.id)}" ${busy?'disabled':''}><span class="choice-icon">${icon('keep')}</span><strong>${t('reviewKeep')}</strong><small>${t('reviewKeepHint')}</small></button><button type="button" class="review-choice archive-choice" data-action="review-archive" data-session="${e(session.id)}" data-id="${e(garment.id)}" ${busy?'disabled':''}><span class="choice-icon">${icon('archive')}</span><strong>${t('reviewArchive')}</strong><small>${t('reviewArchiveHint')}</small></button></div></article>`:`<div class="review-rest"><h2>${t('reviewEmpty')}</h2><p>${t('reviewEmptyText')}</p></div>`}<p class="review-session-date">${t('reviewStarted')} · ${calendarDate(session.startedDate)}</p></section>`;
  } else if(!activeGarments().length) {
    content=`<div class="review-rest">${icon('review','rest-icon')}<h2>${t('reviewEmpty')}</h2><p>${t('reviewEmptyText')}</p><a class="button primary" href="#add">${t('addFirst')}</a>${settings.enabled&&due?button('start-review',t('reviewStart'),'secondary'):''}</div>`;
  } else if(settings.enabled && due) {
    content=`<div class="review-rest review-due">${icon('review','rest-icon')}<p class="eyebrow">A LITTLE SPACE TO BREATHE</p><h2>${t('reviewReminder')}</h2><p>${activeGarments().length} ${t('reviewDoneCount')}</p>${button('start-review',t('reviewStart'),'primary')}</div>`;
  } else {
    const complete=Boolean(session?.completedDate);
    content=`<div class="review-rest">${icon(complete?'keep':'review','rest-icon')}<h2>${complete?t('reviewComplete'):settings.enabled?t('reviewNext'):t('reviewDisabled')}</h2><p>${complete?t('reviewCompleteText'):settings.enabled?t('reviewNotDue'):t('reviewNotEnabled')}</p>${complete?`<p class="completed-date">${t('reviewCompleteDate')} · ${calendarDate(session.completedDate)}</p>`:''}${settings.enabled&&next?`<div class="next-review-date"><span>${t('reviewNext')}</span><strong>${calendarDate(next)}</strong></div>`:''}<a class="text-link" href="#wardrobe">${t('keepBrowsing')} ↗</a></div>`;
  }
  return `<section class="page-section review-section"><div class="page-heading"><div><p class="eyebrow">A GENTLE WARDROBE MOMENT</p><h1>${t('reviewTitle')}</h1><p class="muted">${t('reviewIntro')}</p></div></div>${content}${reviewSettingsForm()}</section>`;
}
function archivePage(part) {
  const garments=state.garments.filter(g=>g.status==='archived');
  const sets=state.sets.filter(s=>s.status==='archived');
  if(part==='singles'||part==='sets') {
    const singles=part==='singles';const records=singles?garments:sets;
    return `<section class="page-section archive-page"><a class="back-link" href="#archive">← ${t('archive')}</a><div class="page-heading"><div><p class="eyebrow">A LITTLE CHAPTER, KEPT</p><h1>${t(singles?'pastSingles':'pastSets')}</h1><p class="muted">${t('archiveGreyNote')}</p></div><span class="count-pill">${records.length}</span></div>${records.length?`<div class="garment-grid archive-grid">${records.slice().reverse().map(singles?card:setCard).join('')}</div>`:`<div class="empty-collection">${icon(singles?'wardrobe':'sets','empty-icon')}<h3>${t(singles?'archiveEmptySingles':'archiveEmptySets')}</h3><a class="text-link" href="#wardrobe">${t('keepBrowsing')} ↗</a></div>`}</section>`;
  }
  return `<section class="page-section archive-hub"><div class="page-heading"><div><p class="eyebrow">ONCE LOVED, ALWAYS A LITTLE STORY</p><h1>${t('archiveTitle')}</h1><p class="muted">${t('archiveIntro')}</p></div></div><div class="archive-door-grid"><a href="#archive/singles" class="archive-door"><div class="archive-door-art">${icon('wardrobe')}</div><span class="eyebrow">THE INDIVIDUAL PIECES</span><h2>${t('pastSingles')}</h2><p>${t('archiveSinglesText')}</p><div class="archive-door-bottom"><span class="count-pill">${garments.length}</span><span aria-hidden="true">↗</span></div></a><a href="#archive/sets" class="archive-door"><div class="archive-door-art">${icon('sets')}</div><span class="eyebrow">THE COMBINATIONS</span><h2>${t('pastSets')}</h2><p>${t('archiveSetsText')}</p><div class="archive-door-bottom"><span class="count-pill">${sets.length}</span><span aria-hidden="true">↗</span></div></a></div><p class="archive-preservation-note">${icon('archive')}${t('archiveGreyNote')}</p></section>`;
}

function render() {
  captureDraft(); renderShell();
  if (!state) { app.innerHTML = `<div class="loading-screen">${error ? errorBlock()+button('reload',t('retry'),'secondary') : `<span class="spinner"></span><p>${t('loading')}</p>`}</div>`; return; }
  const [page,id] = route();
  app.innerHTML = (pendingMutation?`<div class="pending-save" role="status"><p>${t('pendingSave')}</p>${button('retry-mutation',t('retrySave'),'secondary')}</div>`:'') + (page!=='add'?errorBlock():'') + (page==='add' ? intakePage() : page==='wardrobe' ? wardrobe() : page==='garment' ? detail(decodeURIComponent(id||'')) : page==='sets' ? setsPage(id) : page==='set' ? setDetail(decodeURIComponent(id||'')) : page==='wear' ? wearPage() : page==='review' ? reviewPage() : page==='archive' ? archivePage(id) : home());
}
async function upload(blob) {
  if (!['image/jpeg','image/png','image/webp'].includes(blob.type)) throw new Error(t('invalidPhoto'));
  if (blob.size>8*1024*1024) throw new Error(t('tooLarge'));
  clearTimeout(pollTimer);
  const data = await new Promise((resolve,reject)=>{ const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error(t('connectionError')));reader.readAsDataURL(blob); });
  const response = await api('/api/uploads',{mimeType:blob.type,data});
  intake={sourceImageId:response.image.id,draft:intake.draft || {}};saveIntake();
}
async function generate() {
  if (intake.pendingConfirm) throw new Error(t('retryConfirm'));
  captureDraft();
  // Reuse this request ID after an uncertain network failure. A completed/failed
  // provider attempt only gets a new ID when explicitly generated again.
  if (!intake.generationRequestId || intake.job?.status==='failed' || intake.job?.status==='complete') intake.generationRequestId=crypto.randomUUID();
  intake.confirmRequestId=null;saveIntake();
  const response=await api('/api/generations',{sourceImageId:intake.sourceImageId,requestId:intake.generationRequestId});
  intake.job=response.job;saveIntake();pollJob();
}
async function pollJob() {
  clearTimeout(pollTimer);
  if (!intake.job || !['pending','running'].includes(intake.job.status)) return;
  try {
    const id=intake.job.id;
    const response=await api(`/api/generations/${encodeURIComponent(id)}`);
    if (intake.job?.id!==id) return;
    intake.job=response.job;saveIntake();
    if (route()[0]==='add') render();
    if (['pending','running'].includes(intake.job.status)) pollTimer=setTimeout(pollJob,1800);
  } catch (failure) {
    error=failure.message;if(route()[0]==='add')render();pollTimer=setTimeout(pollJob,4000);
  }
}
async function perform(operation) {
  if (busy) return;
  captureDraft();busy=true;error='';render();
  try { await operation(); }
  catch (failure) { error=failure.message; }
  finally { busy=false;render(); }
}
app.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');if(!target || target.disabled)return;
  const action=target.dataset.action;
  if(action==='start-review')return perform(()=>mutate({type:'review.start'}));
  if(action==='review-keep'||action==='review-archive')return perform(()=>mutate({type:'review.decide',sessionId:target.dataset.session,garmentId:target.dataset.id,decision:action==='review-keep'?'keep':'archive'}));
  if(action==='ask-archive') { archiveTargetId=target.dataset.id;render();return; }
  if(action==='cancel-archive') { archiveTargetId=null;render();return; }
  if(action==='confirm-archive')return perform(()=>mutate({type:'garment.archive',garmentId:target.dataset.id}));
  if(action==='retry-mutation')return perform(commitPending);
  if(action==='edit-garment') { captureDraft();editingGarmentId=target.dataset.id;editDraft=null;render();return; }
  if(action==='cancel-edit') { editingGarmentId=null;editDraft=null;render();return; }
  if(action==='wore-no') { dailyNo=true;render();return; }
  if(action==='wore-yes')return perform(()=>mutate({type:'wear.record',garmentIds:[homeGarmentId],setIds:[]}));
  if(action==='wear-one')return perform(()=>mutate({type:'wear.record',garmentIds:[target.dataset.id],setIds:[]}));
  if(action==='record-wear')return prepareWear();
  if(action==='decline-set')return perform(()=>mutate({type:'wear.record',garmentIds:[...wearSelection.garmentIds],setIds:[...wearSelection.setIds],saveAsSet:false}));
  if(action==='cancel-wear-decision') { wearDecision=null;render();return; }
  if(action==='wear-this-set') { wearSelection={garmentIds:[],setIds:[target.dataset.id]};wearDecision=null;persistSelection();go('wear');return; }
  if(action==='remove-wear') { removeEventId=target.dataset.id;render();return; }
  if(action==='cancel-remove') { removeEventId=null;render();return; }
  if(action==='confirm-remove')return perform(()=>mutate({type:'wear.remove',eventId:target.dataset.id}));
  if(action==='reload')return perform(refresh);
  if(action==='another') { dailyNo=false;const previous=homeGarmentId;const active=activeGarments();const choices=active.filter(g=>g.id!==previous);homeGarmentId=(choices.length?choices:active)[Math.floor(Math.random()*(choices.length||active.length))]?.id;render();return; }
  if(action==='sample')return perform(async()=>{const response=await fetch('/samples/blue-shirt-source.jpg');if(!response.ok)throw new Error(t('connectionError'));await upload(await response.blob());});
  if(action==='generate'||action==='regenerate')return perform(generate);
});
app.addEventListener('change',event=>{
  if(event.target.dataset.selectGarment) { captureDraft();const id=event.target.dataset.selectGarment;if(event.target.checked)setSelection.add(id);else setSelection.delete(id);render(); }
  if(event.target.dataset.wearGarment || event.target.dataset.wearSet) { captureDraft();const key=event.target.dataset.wearGarment?'garmentIds':'setIds';const id=event.target.dataset.wearGarment||event.target.dataset.wearSet;wearSelection[key]=event.target.checked?[...new Set([...wearSelection[key],id])]:wearSelection[key].filter(x=>x!==id);wearDecision=null;persistSelection();render(); }
  if(event.target.id==='category-filter') { categoryFilter=event.target.value;render(); }
  if(event.target.id==='sort-select') { sort=event.target.value;render(); }
  if(event.target.id==='photo-input' && event.target.files[0]) { if(intake.pendingConfirm) { toast(t('retryConfirm'));return; }const file=event.target.files[0];go('add');perform(()=>upload(file)); }
});
app.addEventListener('submit',event=>{
  if(event.target.id==='review-settings-form') {
    event.preventDefault();if(!event.target.reportValidity())return;
    const enabled=event.target.elements.enabled.checked;
    const intervalDays=Number(event.target.elements.intervalDays.value);
    return perform(async()=>{if(!Number.isInteger(intervalDays)||intervalDays<7||intervalDays>365)throw new Error(t('reviewIntervalInvalid'));await mutate({type:'review.settings',enabled,intervalDays});});
  }
  if(['edit-form','set-form','wear-set-form'].includes(event.target.id)) {
    event.preventDefault();if(!event.target.reportValidity())return;
    const values=Object.fromEntries(new FormData(event.target));
    if(event.target.id==='edit-form')return perform(()=>mutate({type:'garment.update',garmentId:editingGarmentId,name:values.name.trim(),garmentType:values.garmentType,categories:splitLabels(values.categories),tags:splitLabels(values.tags),notes:values.notes}));
    if(event.target.id==='set-form')return perform(async()=>{if(setSelection.size<2)throw new Error(t('setMinimum'));await mutate({type:'set.save',name:values.name.trim(),garmentIds:[...setSelection]});});
    if(event.target.id==='wear-set-form')return perform(()=>mutate({type:'wear.record',garmentIds:[...wearSelection.garmentIds],setIds:[...wearSelection.setIds],saveAsSet:true,setName:values.name.trim()}));
  }
  if(event.target.id!=='confirm-form')return;event.preventDefault();
  if(!event.target.reportValidity())return;
  const values=Object.fromEntries(new FormData(event.target));
  perform(async()=>{
    if(!values.name.trim())throw new Error(t('nameRequired'));
    intake.confirmRequestId ||= crypto.randomUUID();saveIntake();
    const list=value=>value.split(/[,，、\n]/).map(s=>s.trim()).filter(Boolean);
    intake.pendingConfirm ||= {type:'garment.confirm',requestId:intake.confirmRequestId,jobId:intake.job.id,name:values.name.trim(),garmentType:values.garmentType,categories:list(values.categories),tags:list(values.tags),notes:values.notes};
    saveIntake();
    let response;
    try { response=await api('/api/actions',intake.pendingConfirm); }
    catch (failure) { if(failure.httpStatus && failure.httpStatus!==409) { delete intake.pendingConfirm;delete intake.confirmRequestId;saveIntake(); }throw failure; }
    state=response.state || await api('/api/state');
    const garmentId=response.result?.id || response.result?.garmentId || state.garments.find(g=>g.generatedImageId===intake.job.generatedImageId)?.id;
    intake={};sessionStorage.removeItem('wardrobe-intake');
    // Remove the old confirmation form before rendering so its inputs cannot
    // repopulate the already-confirmed intake draft.
    app.innerHTML='';toast(t('confirmed'));go(garmentId?`garment/${encodeURIComponent(garmentId)}`:'wardrobe');
  });
});
app.addEventListener('input',event=>{if(event.target.closest('form'))captureDraft();});
document.querySelector('#language-button').addEventListener('click',()=>{captureDraft();setLanguage(getLanguage()==='zh'?'en':'zh');render();});
window.addEventListener('hashchange',()=>{error='';render();window.scrollTo({top:0,behavior:'instant'});});
setLanguage(getLanguage());
refresh().catch(failure=>{error=failure.message;}).finally(()=>{render();pollJob();});
