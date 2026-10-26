import * as fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {initialState,validateState} from './domain.mjs';

export class Store {
  constructor(directory, {io = fs} = {}) { this.directory=directory; this.file=path.join(directory,'wardrobe.json'); this.io=io; this.tail=Promise.resolve(); }
  async init() {
    await this.io.mkdir(path.join(this.directory,'images'),{recursive:true,mode:0o700});
    try { this.state=validateState(JSON.parse(await this.io.readFile(this.file,'utf8'))); }
    catch(error) {
      if(error.code !== 'ENOENT') throw new Error('保存文件无法读取，原文件已保留。Saved wardrobe is unreadable; it has not been reset.', {cause:error});
      this.state=initialState(); await this.persist(this.state);
    }
    if(this.state.generationJobs.some(j=>['pending','running'].includes(j.status))) {
      await this.transaction(s=>{for(const j of s.generationJobs) if(['pending','running'].includes(j.status)){j.status='failed';j.error='服务曾中断，请主动重新生成 / Service restarted; explicitly retry generation';}});
    }
    return this;
  }
  read() { return structuredClone(this.state); }
  async persist(next) {
    validateState(next);
    const temporary=path.join(this.directory,`.wardrobe-${randomUUID()}.tmp`);
    let handle;
    try {
      handle=await this.io.open(temporary,'wx',0o600);
      await handle.writeFile(JSON.stringify(next,null,2)+'\n'); await handle.sync(); await handle.close(); handle=null;
      await this.io.rename(temporary,this.file);
    } catch(error) { if(handle) await handle.close().catch(()=>{}); await this.io.unlink(temporary).catch(()=>{}); throw error; }
  }
  transaction(mutate) {
    const operation=this.tail.then(async()=>{
      const next=this.read(); const result=await mutate(next);
      await this.persist(next); this.state=next;
      return {result,state:this.read()};
    });
    this.tail=operation.catch(()=>{});
    return operation;
  }
}
