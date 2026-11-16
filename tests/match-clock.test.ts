import {beforeEach,describe,it,expect,vi} from 'vitest';
const memory=vi.hoisted(()=>({docs:new Map<string,{content:string;etag:string}>(),v:0}));
vi.mock('../lib/storage.js',()=>{
  class ConflictError extends Error{}
  return {ConflictError,readDocument:async(p:string)=>memory.docs.get(p)??null,listDocuments:async(prefix:string)=>[...memory.docs.keys()].filter(p=>p.startsWith(prefix)),
    deleteDocument:async(p:string)=>{memory.docs.delete(p);},
    createDocument:async(p:string,content:string)=>{if(memory.docs.has(p))throw new ConflictError();memory.docs.set(p,{content,etag:String(++memory.v)});},
    updateDocument:async(p:string,content:string,etag:string)=>{if(memory.docs.get(p)?.etag!==etag)throw new ConflictError();memory.docs.set(p,{content,etag:String(++memory.v)});},
  };
});
import {handlePublicPelada} from '../lib/public-pelada';
import {handleApi} from '../lib/service';
import {peladaToCsv,readCsv} from '../lib/csv';
import {changeClock,clockElapsed,teamLabel,type Match,type PublicPelada} from '../lib/matches';
const players=[{id:'p0',name:'Ana',aliases:'',stars:2},{id:'p1',name:'Bia',aliases:'',stars:5},{id:'p2',name:'Caio',aliases:'',stars:4},{id:'p3',name:'Duda',aliases:'',stars:4}];
const read=async()=>(await handlePublicPelada('GET',1,null)).value.pelada as PublicPelada;
const publish=async()=>handlePublicPelada('POST',1,{action:'publishTeams',teams:[['p0','p1'],['p2','p3']],etag:(await read()).etag},true);
const match=(goals:Match['goals']=[]):Match=>({id:'m1',homeId:'time-1',awayId:'time-2',status:'finished',homeScore:goals.filter(g=>g.teamId==='time-1').length,awayScore:goals.filter(g=>g.teamId==='time-2').length,goals});
const save=async(m:Match)=>handlePublicPelada('POST',1,{action:'saveMatch',match:m,etag:(await read()).etag});
const csv=()=>readCsv(memory.docs.get('peladas/pelada_1.csv')!.content);
beforeEach(()=>{memory.docs.clear();memory.v=0;memory.docs.set('peladas/pelada_1.csv',{content:peladaToCsv({players,createdAt:'2026-11-16'}),etag:'initial'});});

describe('Jogador de referência',()=>{
  it('escolhe a maior nota de cada time (empate em ordem alfabética) sem expor notas',async()=>{
    await publish();const p=await read();
    expect(p.teams.map(t=>t.leaderId)).toEqual(['p1','p2']);
    expect(teamLabel(p.teams[0],p.players)).toBe('Time de Bia');
    expect(p.players[0]).not.toHaveProperty('stars');
  });
  it('calcula a referência para times salvos antes desta versão',async()=>{
    await publish();
    const path=csv().matchFile!,state=JSON.parse(memory.docs.get(path)!.content);
    state.teams=state.teams.map(({leaderId:_,...t}:{leaderId?:string})=>t);
    memory.docs.set(path,{content:JSON.stringify(state),etag:'x'});
    expect((await read()).teams.map(t=>t.leaderId)).toEqual(['p1','p2']);
  });
  it('mostra o nome do time quando não há referência',()=>{
    expect(teamLabel({name:'Time 3'},[])).toBe('Time 3');
  });
});

describe('Relógio da partida',()=>{
  it('inicia, pausa e zera sem exigir a versão do celular e mantém o relógio ao editar o placar',async()=>{
    await publish();await save(match());
    expect((await handlePublicPelada('POST',1,{action:'clock',matchId:'m1',op:'start'})).status).toBe(200);
    let clock=(await read()).matches[0].clock!;expect(clock.startedAt).toEqual(expect.any(Number));
    expect((await save(match([{teamId:'time-1',scorerId:'p0',assistId:null,ownGoal:false}]))).status).toBe(200);
    expect((await read()).matches[0].clock).toEqual(clock);
    await handlePublicPelada('POST',1,{action:'clock',matchId:'m1',op:'pause'});
    clock=(await read()).matches[0].clock!;expect(clock.startedAt).toBeNull();
    await handlePublicPelada('POST',1,{action:'clock',matchId:'m1',op:'reset'});
    expect((await read()).matches[0].clock).toEqual({startedAt:null,elapsed:0});
  });
  it('rejeita ação desconhecida e partida inexistente',async()=>{
    await publish();await save(match());
    expect((await handlePublicPelada('POST',1,{action:'clock',matchId:'m1',op:'stop'})).status).toBe(400);
    expect((await handlePublicPelada('POST',1,{action:'clock',matchId:'nada',op:'start'})).status).toBe(404);
  });
  it('acumula o tempo entre pausas',()=>{
    let c=changeClock(undefined,'start',1000);c=changeClock(c,'pause',61000);
    expect(clockElapsed(c,99999)).toBe(60000);
    c=changeClock(c,'start',100000);expect(clockElapsed(c,130000)).toBe(90000);
    expect(changeClock(c,'start',200000)).toBe(c);
  });
});

describe('Tempo e situação da pelada',()=>{
  it('devolve 10 minutos quando a pelada não tem tempo salvo e conta as partidas no CSV',async()=>{
    expect((await read()).duration).toBe(10);
    await publish();await save(match());
    expect(csv().matchCount).toBe(1);
    const state=(await handleApi('GET',null)).value.state as {peladas:{teamsPublished:boolean;matchCount:number}[]};
    expect(state.peladas[0]).toMatchObject({teamsPublished:true,matchCount:1});
  });
  it('cria pelada com tempo e permite mudar o tempo depois',async()=>{
    memory.docs.clear();
    const created=await handleApi('POST',{action:'createPelada',players,duration:12});
    expect(created.status).toBe(201);
    const n=created.value.number as number,path=`peladas/pelada_${n}.csv`;
    expect(readCsv(memory.docs.get(path)!.content).duration).toBe(12);
    expect((await handleApi('POST',{action:'setPeladaDuration',number:n,duration:0,etag:memory.docs.get(path)!.etag})).status).toBe(400);
    expect((await handleApi('POST',{action:'setPeladaDuration',number:n,duration:8,etag:'velha'})).status).toBe(409);
    expect((await handleApi('POST',{action:'setPeladaDuration',number:n,duration:8,etag:memory.docs.get(path)!.etag})).status).toBe(200);
    expect(readCsv(memory.docs.get(path)!.content)).toMatchObject({duration:8,players:expect.any(Array)});
    expect((await handleApi('POST',{action:'createPelada',players,duration:91})).status).toBe(400);
  });
  it('mantém o tempo ao corrigir notas da pelada',async()=>{
    memory.docs.set('peladas/pelada_1.csv',{content:peladaToCsv({players,createdAt:'2026',duration:7}),etag:'e1'});
    expect((await handleApi('POST',{action:'savePelada',number:1,players:players.map(p=>({...p,stars:3})),etag:'e1'})).status).toBe(200);
    expect(csv().duration).toBe(7);
  });
});
