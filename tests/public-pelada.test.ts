import {beforeEach,describe,it,expect,vi} from 'vitest';
const memory=vi.hoisted(()=>({docs:new Map<string,{content:string;etag:string}>(),v:0,failCommit:false}));
vi.mock('../lib/storage.js',()=>{
  class ConflictError extends Error{}
  return {ConflictError,readDocument:async(p:string)=>memory.docs.get(p)??null,listDocuments:async(prefix:string)=>[...memory.docs.keys()].filter(p=>p.startsWith(prefix)),
    deleteDocument:async(p:string)=>{memory.docs.delete(p);},
    createDocument:async(p:string,content:string)=>{if(memory.docs.has(p))throw new ConflictError();memory.docs.set(p,{content,etag:String(++memory.v)});},
    updateDocument:async(p:string,content:string,etag:string)=>{if(memory.failCommit)throw new Error('Storage failed');if(memory.docs.get(p)?.etag!==etag)throw new ConflictError();memory.docs.set(p,{content,etag:String(++memory.v)});},
  };
});
import {handlePublicPelada} from '../lib/public-pelada';
import {handleApi} from '../lib/service';
import {handleRequest} from '../lib/http';
import {peladaToCsv,readCsv} from '../lib/csv';
import {summarize,type PublicPelada,type Match} from '../lib/matches';
const players=Array.from({length:4},(_,i)=>({id:`p${i}`,name:`Pessoa ${i}`,aliases:'',stars:3}));
const headers={'content-type':'application/json','x-peladamas-request':'1'};
const read=async()=>(await handlePublicPelada('GET',1,null)).value.pelada as PublicPelada;
const match=(id='m1'):Match=>({id,homeId:'time-1',awayId:'time-2',status:'finished',homeScore:1,awayScore:0,goals:[{teamId:'time-1',scorerId:'p0',assistId:'p1',ownGoal:false}]});
const save=async(m:Match,etag?:string)=>handlePublicPelada('POST',1,{action:'saveMatch',match:m,etag:etag??(await read()).etag});
async function publish(){return handlePublicPelada('POST',1,{action:'publishTeams',teams:[['p0','p1'],['p2','p3']],etag:(await read()).etag},true);}
beforeEach(()=>{memory.docs.clear();memory.v=0;memory.failCommit=false;memory.docs.set('peladas/pelada_1.csv',{content:peladaToCsv({players,createdAt:'2026-11-05'}),etag:'initial'});});
describe('Página pública e persistência',()=>{
  it('abre sem login, mas impede publicação de times e ações administrativas',async()=>{
    expect((await handleRequest('/api/pelada?number=1','GET',null,{})).status).toBe(200);
    expect((await handleRequest('/api/data','POST',{action:'deletePelada',number:1},headers)).status).toBe(401);
    expect((await handlePublicPelada('POST',1,{action:'publishTeams',etag:'initial'})).status).toBe(401);
    expect((await handlePublicPelada('POST',1,{action:'saveRanking',etag:'initial'})).status).toBe(400);
    const p=(await read()).players[0];expect(p).not.toHaveProperty('stars');expect(p).not.toHaveProperty('aliases');
  });
  it('aceita CSV legado e inicializa as colunas ao salvar times',async()=>{
    memory.docs.set('peladas/pelada_1.csv',{content:'id;nome;apelidos;estrelas;criada_em\np0;Pessoa 0;;3;2026\np1;Pessoa 1;;3;2026\np2;Pessoa 2;;3;2026\np3;Pessoa 3;;3;2026\n',etag:'legacy'});
    expect((await read()).players.every(p=>p.goals===0&&p.assists===0)).toBe(true);
    expect((await publish()).status).toBe(200);
    expect(memory.docs.get('peladas/pelada_1.csv')!.content).toContain('gols;assistencias');
  });
  it('registra e corrige resultado sem acumular gols antigos',async()=>{
    await publish();expect((await save(match())).status).toBe(200);
    let p=await read();expect(p.players[0].goals).toBe(1);expect(p.players[1].assists).toBe(1);
    let csv=readCsv(memory.docs.get('peladas/pelada_1.csv')!.content);expect(csv.players[0].goals).toBe(1);
    expect(csv.matchFile).toMatch(/^partidas\//);
    const edited={...match(),homeScore:0,awayScore:0,goals:[]};expect((await save(edited)).status).toBe(200);
    p=await read();expect(p.matches).toHaveLength(1);expect(p.players.every(x=>x.goals===0&&x.assists===0)).toBe(true);
    expect(summarize(p,p.players).table.every(t=>t.draws===1&&t.points===1)).toBe(true);
  });
  it('rejeita placares, assistências e autores inválidos',async()=>{
    await publish();
    for(const m of [{...match(),homeScore:-1},{...match(),homeScore:2},{...match(),awayId:'time-1'},{...match(),goals:[{...match().goals[0],scorerId:'p3'}]},{...match(),goals:[{...match().goals[0],assistId:'p0'}]}])expect((await save(m)).status).toBe(400);
    expect((await read()).matches).toHaveLength(0);
  });
  it('não aceita jogadores repetidos ou ausentes ao publicar times',async()=>{
    const response=await handlePublicPelada('POST',1,{action:'publishTeams',teams:[['p0','p1'],['p0','p3']],etag:'initial'},true);expect(response.status).toBe(400);
  });
  it('uma escrita concorrente vence; a outra recebe conflito sem perder dados',async()=>{
    await publish();const etag=(await read()).etag;
    const results=await Promise.all([save(match('m1'),etag),save(match('m2'),etag)]);
    expect(results.map(r=>r.status).sort()).toEqual([200,409]);expect((await read()).matches).toHaveLength(1);
  });
  it('não publica snapshot incompleto se o CSV falhar',async()=>{
    await publish();memory.failCommit=true;const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    try{expect((await save(match())).status).toBe(500);expect((await read()).matches).toHaveLength(0);}finally{log.mockRestore();}
  });
  it('fixa times e convocados depois da publicação e preserva estatísticas na edição administrativa',async()=>{
    await publish();await save(match());expect((await publish()).status).toBe(409);
    let doc=memory.docs.get('peladas/pelada_1.csv')!;
    expect((await handleApi('POST',{action:'savePelada',number:1,etag:doc.etag,players:players.map(p=>({...p,stars:4}))})).status).toBe(200);
    expect((await read()).players[0].goals).toBe(1);
    doc=memory.docs.get('peladas/pelada_1.csv')!;
    expect((await handleApi('POST',{action:'savePelada',number:1,etag:doc.etag,players:players.map((p,i)=>i? p:{...p,id:'new'})})).status).toBe(400);
    expect((await handleApi('POST',{action:'deletePelada',number:1,etag:doc.etag})).status).toBe(200);
    expect((await handlePublicPelada('GET',1,null)).status).toBe(404);
    expect(memory.docs.has('peladas/pelada_1.csv')).toBe(false);
    expect([...memory.docs.keys()].filter(p=>p.startsWith('partidas/pelada_1_'))).toEqual([]);
  });
  it('partidas agendadas não contam; gol contra não entra no ranking individual',async()=>{
    await publish();await save({...match('future'),status:'scheduled',homeScore:0,goals:[]});
    expect(summarize(await read(),players).table.every(t=>!t.played)).toBe(true);
    await save({...match(),goals:[{teamId:'time-1',scorerId:null,assistId:null,ownGoal:true}]});
    const p=await read(),s=summarize(p,p.players);expect(s.table[0].points).toBe(3);expect(s.table[1].losses).toBe(1);expect(p.players.every(x=>x.goals===0)).toBe(true);
  });
});
