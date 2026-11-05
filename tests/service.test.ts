import { beforeEach, describe, expect, it, vi } from 'vitest';
const memory=vi.hoisted(()=>({docs:new Map<string,{content:string;etag:string}>(),failRanking:false,version:0}));
vi.mock('../lib/storage.js',()=>({
  ConflictError:class extends Error {},
  readDocument:async(path:string)=>memory.docs.get(path)??null,
  listDocuments:async(prefix:string)=>[...memory.docs.keys()].filter(p=>p.startsWith(prefix)),
  createDocument:async(path:string,content:string)=>{
    if(path==='ranking_geral.csv'&&memory.failRanking)throw new Error('Storage unavailable');
    memory.docs.set(path,{content,etag:String(++memory.version)});
  },
  updateDocument:async(path:string,content:string)=>{
    if(path==='ranking_geral.csv'&&memory.failRanking)throw new Error('Storage unavailable');
    memory.docs.set(path,{content,etag:String(++memory.version)});
  },
}));
import {handleApi} from '../lib/service';
import {starterPlayers} from '../lib/models';
import {readCsv,rankingToCsv} from '../lib/csv';
const newcomer={id:'new-1',name:'Convidado',aliases:'',stars:4};
const players=[...starterPlayers.slice(0,3),newcomer];
beforeEach(()=>{memory.docs.clear();memory.failRanking=false;memory.version=0;});
describe('Inclusão em lote no Geral',()=>{
  it('adiciona somente com consentimento e preserva notas existentes',async()=>{
    const current=starterPlayers.map(p=>({...p,stars:2}));
    memory.docs.set('ranking_geral.csv',{content:rankingToCsv(current),etag:'old'});
    const reply=await handleApi('POST',{action:'createPelada',players,addToRankingIds:[newcomer.id,players[0].id]});
    expect(reply.status).toBe(201);
    expect(reply.value.addedToRanking).toBe(1);
    const saved=readCsv(memory.docs.get('ranking_geral.csv')!.content).players;
    expect(saved).toEqual([...current,newcomer]);
    expect(readCsv(memory.docs.get('peladas/pelada_1.csv')!.content).players).toEqual(players);
  });
  it('recusar cria a pelada sem gravar no Geral',async()=>{
    expect((await handleApi('POST',{action:'createPelada',players})).status).toBe(201);
    expect(memory.docs.has('ranking_geral.csv')).toBe(false);
    expect(memory.docs.has('peladas/pelada_1.csv')).toBe(true);
  });
  it('não duplica jogadores já incluídos por outra sessão',async()=>{
    for(let i=0;i<2;i++)expect((await handleApi('POST',{action:'createPelada',players,addToRankingIds:[newcomer.id]})).status).toBe(201);
    const saved=readCsv(memory.docs.get('ranking_geral.csv')!.content).players;
    expect(saved.filter(p=>p.name===newcomer.name)).toHaveLength(1);
  });
  it('rejeita inclusão de alguém que não está na pelada',async()=>{
    expect((await handleApi('POST',{action:'createPelada',players,addToRankingIds:['absent']})).status).toBe(400);
    expect(memory.docs.size).toBe(0);
  });
  it('informa falha parcial mantendo a pelada criada',async()=>{
    memory.failRanking=true;
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    try{
      const reply=await handleApi('POST',{action:'createPelada',players,addToRankingIds:[newcomer.id]});
      expect(reply.status).toBe(201);
      expect(reply.value.warning).toContain('A pelada foi criada');
      expect(memory.docs.has('peladas/pelada_1.csv')).toBe(true);
    }finally{log.mockRestore();}
  });
});
describe('Excluir pelada',()=>{
  it('remove apenas o histórico selecionado e não reutiliza seu número',async()=>{
    await handleApi('POST',{action:'createPelada',players,addToRankingIds:[newcomer.id]});
    await handleApi('POST',{action:'createPelada',players});
    const originalRanking=memory.docs.get('ranking_geral.csv')!.content;
    const doc=memory.docs.get('peladas/pelada_2.csv')!;
    expect((await handleApi('POST',{action:'deletePelada',number:2,etag:'outdated'})).status).toBe(409);
    expect((await handleApi('POST',{action:'deletePelada',number:2,etag:doc.etag})).status).toBe(200);
    const state=(await handleApi('GET',null)).value.state as {peladas:{number:number}[];nextPeladaNumber:number};
    expect(state.peladas.map(p=>p.number)).toEqual([1]);
    expect(state.nextPeladaNumber).toBe(3);
    expect(memory.docs.get('ranking_geral.csv')!.content).toBe(originalRanking);
    expect((await handleApi('POST',{action:'savePelada',number:2,players,etag:doc.etag})).status).toBe(404);
    expect((await handleApi('POST',{action:'createPelada',players})).value.number).toBe(3);
  });
  it('recusa números inválidos e peladas inexistentes',async()=>{
    expect((await handleApi('POST',{action:'deletePelada',number:-1})).status).toBe(400);
    expect((await handleApi('POST',{action:'deletePelada',number:999})).status).toBe(404);
  });
});
