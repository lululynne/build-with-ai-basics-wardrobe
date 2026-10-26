import http from 'node:http';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Store} from './src/store.mjs';
import {AppError,assert,requestId,applyAction,viewState} from './src/domain.mjs';
import {generateImage,imageType} from './src/gemini.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const EXTENSIONS={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const PUBLIC_MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.svg':'image/svg+xml'};
const MAX_IMAGE=8*1024*1024;

async function bodyJSON(req) {
  assert((req.headers['content-type'] ?? '').split(';')[0] === 'application/json', '请使用 JSON 请求 / JSON required',415);
  const chunks=[];let size=0;
  for await (const chunk of req) {size+=chunk.length; assert(size<=12*1024*1024,'照片不能超过 8 MB / Photo must be 8 MB or smaller',413);chunks.push(chunk);}
  try {const b=JSON.parse(Buffer.concat(chunks).toString());assert(b && typeof b==='object' && !Array.isArray(b),'请求格式错误 / Invalid body');return b;}
  catch(e){if(e instanceof AppError)throw e;throw new AppError('请求内容无法读取 / Invalid JSON');}
}
export async function createApp({dataDirectory=path.join(ROOT,'data'),generator=generateImage,now=()=>new Date(),storeOptions={},httpServer}={}) {
  const store=await new Store(dataDirectory,storeOptions).init();
  const tasks=new Set(); const jobErrors=new Map();
  async function saveImage(bytes,mimeType,kind) {
    const id=randomUUID();const filename=`${id}.${EXTENSIONS[mimeType]}`;
    await fs.writeFile(path.join(dataDirectory,'images',filename),bytes,{flag:'wx',mode:0o600});
    const image={id,filename,mimeType,kind,bytes:bytes.length,createdAt:now().toISOString()};
    try {await store.transaction(s=>{s.images[id]=image;});}
    catch(error){await fs.unlink(path.join(dataDirectory,'images',filename)).catch(()=>{});throw error;}
    return image;
  }
  async function runJob(id) {
    try {
      await store.transaction(s=>{s.generationJobs.find(j=>j.id===id).status='running';});
      const job=store.read().generationJobs.find(j=>j.id===id);
      const source=store.read().images[job.sourceImageId];
      const started=Date.now();
      const output=await generator({mimeType:source.mimeType,bytes:await fs.readFile(path.join(dataDirectory,'images',source.filename))});
      assert(EXTENSIONS[output.mimeType] && imageType(output.bytes)===output.mimeType,'生成图片格式无效 / Invalid generated image',502);
      const image=await saveImage(output.bytes,output.mimeType,'generated');
      await store.transaction(s=>Object.assign(s.generationJobs.find(j=>j.id===id),{status:'complete',generatedImageId:image.id,completedAt:now().toISOString(),elapsedMs:Date.now()-started,model:output.model,promptVersion:output.promptVersion}));
    } catch(error) {
      const message=error instanceof AppError ? error.message : '生成结果未能保存，请检查磁盘后主动重试 / Could not save generation; check disk and retry explicitly';
      try {await store.transaction(s=>Object.assign(s.generationJobs.find(j=>j.id===id),{status:'failed',error:message}));}
      catch {jobErrors.set(id,message);}
    }
  }
  function send(res,status,value,mime='application/json; charset=utf-8') {
    res.writeHead(status,{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    res.end(mime.startsWith('application/json') ? JSON.stringify(value) : value);
  }
  const server=httpServer ?? http.createServer();
  server.on('request',async(req,res)=>{
    try {
      const host=req.headers.host ?? '';
      let url;try{url=new URL(req.url,`http://${host}`);}catch{throw new AppError('地址无效 / Invalid URL');}
      const bound=server.address();
      const hostname=url.hostname.replace(/^\[|\]$/g,'');
      const allowedHosts=new Set(['127.0.0.1','localhost','::1',...Object.values(os.networkInterfaces()).flat().filter(Boolean).map(a=>a.address)]);
      assert(allowedHosts.has(hostname) && (!url.port || Number(url.port)===bound.port),'访问地址不受支持 / Invalid host',403);
      // Following an external link may label the initial document cross-site.
      // Only the public entry document gets this exception; private APIs, media
      // and every mutation still require the original same-origin checks.
      const publicNavigation=req.method==='GET' && url.pathname==='/' && req.headers['sec-fetch-mode']==='navigate' && req.headers['sec-fetch-dest']==='document';
      if(!publicNavigation) {
        if(req.headers.origin) assert(req.headers.origin===url.origin,'仅接受同源请求 / Same-origin requests only',403);
        assert(!['cross-site'].includes(req.headers['sec-fetch-site']),'仅接受同源请求 / Same-origin requests only',403);
      }
      const pathname=decodeURIComponent(url.pathname);
      if(req.method==='GET' && pathname==='/api/state') return send(res,200,viewState(store.read(),now()));
      if(req.method==='POST' && pathname==='/api/uploads') {
        const b=await bodyJSON(req);
        assert(EXTENSIONS[b.mimeType] && typeof b.data==='string','支持 JPEG、PNG、WebP，请更换照片 / Choose JPEG, PNG or WebP',415);
        assert(b.data.length<=Math.ceil(MAX_IMAGE/3)*4,'照片不能超过 8 MB / Maximum 8 MB',413);
        assert(b.data.length%4===0 && /^[A-Za-z0-9+/]*={0,2}$/.test(b.data),'图片编码无效 / Invalid image encoding');
        const bytes=Buffer.from(b.data,'base64');
        assert(bytes.length>0 && bytes.length<=MAX_IMAGE,'照片不能超过 8 MB / Maximum 8 MB',413);
        assert(imageType(bytes)===b.mimeType,'图片内容与格式不符，请更换照片 / Image contents do not match its type',415);
        return send(res,201,{image:await saveImage(bytes,b.mimeType,'source')});
      }
      if(req.method==='POST' && pathname==='/api/generations') {
        const b=await bodyJSON(req);requestId(b.requestId);
        const {result}=await store.transaction(s=>{
          const existing=s.generationJobs.find(j=>j.requestId===b.requestId);
          if(existing){assert(existing.sourceImageId===b.sourceImageId,'请求编号冲突 / Request ID conflict',409);return {job:existing,isNew:false};}
          assert(s.images[b.sourceImageId]?.kind==='source','请先上传原照片 / Upload a source photo first');
          assert(s.generationJobs.filter(j=>['pending','running'].includes(j.status)).length<2,'请等待当前生成完成 / Wait for current generations',429);
          const job={id:randomUUID(),requestId:b.requestId,sourceImageId:b.sourceImageId,status:'pending',generatedImageId:null,createdAt:now().toISOString()};
          s.generationJobs.push(job);return {job,isNew:true};
        });
        if(result.isNew){const task=runJob(result.job.id);tasks.add(task);task.finally(()=>tasks.delete(task));}
        return send(res,202,{job:result.job});
      }
      if(req.method==='GET' && /^\/api\/generations\/[a-f0-9-]{36}$/.test(pathname)) {
        const job=store.read().generationJobs.find(j=>j.id===pathname.split('/').pop());assert(job,'找不到生成任务 / Job not found',404);
        if(jobErrors.has(job.id)){job.status='failed';job.error=jobErrors.get(job.id);}
        return send(res,200,{job});
      }
      if(req.method==='POST' && pathname==='/api/actions') {
        const action=await bodyJSON(req);const {result,state}=await store.transaction(s=>applyAction(s,action,now()));
        return send(res,200,{result,state:viewState(state,now())});
      }
      if(req.method==='GET' && /^\/media\/[a-f0-9-]{36}$/.test(pathname)) {
        const image=store.read().images[pathname.split('/').pop()];assert(image,'图片不存在 / Image not found',404);
        return send(res,200,await fs.readFile(path.join(dataDirectory,'images',image.filename)),image.mimeType);
      }
      if(req.method==='GET') {
        const relative=pathname==='/' ? 'index.html' : pathname.slice(1);
        assert(!relative.split('/').some(p=>p.startsWith('.') || p==='') && !relative.includes('\\') && (['index.html','app.js','styles.css','icons.js','i18n.js'].includes(relative) || /^(art|samples)\/[a-zA-Z0-9_./-]+\.(png|jpg|webp|svg)$/.test(relative)), '页面不存在 / Not found',404);
        const filename=path.resolve(ROOT,'public',relative);assert(filename.startsWith(path.join(ROOT,'public')+path.sep),'页面不存在 / Not found',404);
        return send(res,200,await fs.readFile(filename),PUBLIC_MIME[path.extname(filename)] ?? 'application/octet-stream');
      }
      throw new AppError('页面不存在 / Not found',404);
    } catch(error) {
      if(res.headersSent){res.destroy();return;}
      const status=error instanceof AppError ? error.status : error.code==='ENOENT' ? 404 : error instanceof URIError ? 400 : 500;
      send(res,status,{error:error instanceof AppError ? error.message : status===404 ? '页面不存在 / Not found' : status===400 ? '地址格式无效 / Invalid address' : '保存失败，请检查磁盘后重试。已保存衣柜保留 / Save failed; check disk and retry. Saved wardrobe is preserved'});
    }
  });
  return {server,store,waitForJobs:()=>Promise.all([...tasks])};
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {process.loadEnvFile(path.join(ROOT,'.env'));} catch(e){if(e.code!=='ENOENT') throw e;}
  const runtimeServer=http.createServer();
  try {
    const lan=process.argv.includes('--lan');
    // Reserve the port before touching saved jobs. A duplicate launch must not
    // mark the first process's still-running generation as interrupted.
    await new Promise((resolve,reject)=>{runtimeServer.once('error',reject);runtimeServer.listen(4317,lan?'0.0.0.0':'127.0.0.1',resolve);});
    await createApp({httpServer:runtimeServer});
    console.log('Wardrobe: http://127.0.0.1:4317');
    if(lan) for(const address of Object.values(os.networkInterfaces()).flat().filter(Boolean)) if(address.family==='IPv4'&&!address.internal) console.log(`Phone / 同一网络: http://${address.address}:4317`);
  } catch(error) {
    runtimeServer.close();
    console.error(error.code==='EADDRINUSE' ? '4317 端口已占用，请使用已经运行的窗口 / Port 4317 is in use; use the running service' : '衣柜无法打开，原数据已保留。请检查 data/wardrobe.json 和磁盘权限 / Cannot open wardrobe; saved data has not been reset.');process.exitCode=1;
  }
}
