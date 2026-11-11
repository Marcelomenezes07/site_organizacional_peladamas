import {randomUUID} from 'node:crypto';
import {readDocument,createDocument,updateDocument,deleteDocument,ConflictError} from './storage.js';
import {readCsv,peladaToCsv} from './csv.js';
import {summarize,validateMatch,type MatchState,type SavedTeam} from './matches.js';

export async function readMatchState(number:number,matchFile?:string):Promise<MatchState>{
  if(!matchFile)return {teams:[],matches:[]};
  if(!new RegExp(`^partidas/pelada_${number}_[a-f0-9-]+\\.json$`).test(matchFile))throw new Error('Estado de partidas inválido.');
  const doc=await readDocument(matchFile);if(!doc)throw new Error('Arquivo de partidas indisponível.');
  return JSON.parse(doc.content) as MatchState;
}
export async function handlePublicPelada(method:string,number:number,payload:unknown,admin=false){
  const reply=(status:number,value:Record<string,unknown>)=>({status,value});
  try{
    if(!Number.isSafeInteger(number)||number<1)return reply(400,{error:'Pelada inválida.'});
    const path=`peladas/pelada_${number}.csv`,doc=await readDocument(path);
    if(!doc||doc.content==='# peladamas:deleted\n')return reply(404,{error:'Pelada não encontrada ou excluída.'});
    const parsed=readCsv(doc.content),state=await readMatchState(number,parsed.matchFile);
    if(method==='GET'){
      const {totals}=summarize(state,parsed.players);
      return reply(200,{pelada:{number,createdAt:parsed.createdAt,date:parsed.date,etag:doc.etag,...state,players:totals.map(({id,name,goals,assists})=>({id,name,goals,assists}))}});
    }
    if(method!=='POST')return reply(405,{error:'Método não permitido.'});
    if(!payload||typeof payload!=='object')return reply(400,{error:'Solicitação inválida.'});
    const data=payload as Record<string,unknown>;
    if(!['publishTeams','saveMatch'].includes(String(data.action)))return reply(400,{error:'Ação não permitida nesta página.'});
    if(data.action==='publishTeams'&&!admin)return reply(401,{error:'Somente o administrador pode salvar os times.'});
    if(data.etag!==doc.etag)throw new ConflictError();
    let next:MatchState;
    if(data.action==='publishTeams'){
      if(state.matches.length)return reply(409,{error:'Os times não podem mudar depois de registrar partidas.'});
      if(!Array.isArray(data.teams)||data.teams.length<2||data.teams.length>60)return reply(400,{error:'Times inválidos.'});
      const ids=data.teams.flat();
      if(data.teams.some(t=>!Array.isArray(t)||!t.length)||ids.length!==parsed.players.length||new Set(ids).size!==ids.length||ids.some(id=>!parsed.players.some(p=>p.id===id)))return reply(400,{error:'Distribua todos os convocados uma única vez.'});
      const teams:SavedTeam[]=data.teams.map((playerIds,i)=>({id:`time-${i+1}`,name:`Time ${i+1}`,playerIds}));
      next={teams,matches:[]};
    }else{
      if(!state.teams.length)return reply(409,{error:'Aguarde o administrador salvar os times.'});
      const match=validateMatch(data.match,state.teams);
      const exists=state.matches.some(m=>m.id===match.id);
      if(!exists&&state.matches.length>=300)return reply(400,{error:'Limite de 300 partidas por pelada.'});
      next={teams:state.teams,matches:exists?state.matches.map(m=>m.id===match.id?match:m):[...state.matches,match]};
    }
    const {totals}=summarize(next,parsed.players);
    const players=parsed.players.map(p=>({...p,goals:totals.find(t=>t.id===p.id)!.goals,assists:totals.find(t=>t.id===p.id)!.assists}));
    // Immutable snapshot first; the CSV pointer and totals commit atomically with its ETag.
    const matchFile=`partidas/pelada_${number}_${randomUUID()}.json`;
    await createDocument(matchFile,JSON.stringify(next));
    try{await updateDocument(path,peladaToCsv({...parsed,players,matchFile}),doc.etag);}
    catch(e){try{await deleteDocument(matchFile);}catch(cleanup){console.error('Revisão não publicada pendente de limpeza',cleanup);}throw e;}
    return reply(200,{ok:true});
  }catch(e){
    if(e instanceof ConflictError)return reply(409,{error:e.message});
    if(e instanceof Error&&/inválid|Confira/.test(e.message))return reply(400,{error:e.message});
    console.error('Erro na página da pelada',e);return reply(500,{error:'Não foi possível salvar ou consultar a pelada. Tente novamente.'});
  }
}
