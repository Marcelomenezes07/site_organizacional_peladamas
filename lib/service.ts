import {readMatchState} from './public-pelada.js';
import { readCsv, rankingToCsv, peladaToCsv } from './csv.js';
import { starterPlayers, type AppState, type Pelada, type Player, type Ranking } from './models.js';
import { validStars, normalize, matchPlayer } from './logic.js';
import { readDocument, listDocuments, createDocument, updateDocument, deleteDocument, ConflictError } from './storage.js';

const rankPath='ranking_geral.csv';
const peladaPath=(n:number)=>`peladas/pelada_${n}.csv`;
const deletedMarker='# peladamas:deleted\n';
export type ApiReply={status:number;value:Record<string,unknown>};
const output=(status:number,value:Record<string,unknown>):ApiReply=>({status,value});

function checkPlayers(value:unknown,max=250):Player[]{
  if(!Array.isArray(value)||value.length>max)throw new Error('Quantidade de jogadores inválida.');
  const list:Player[]=value.map((obj:unknown)=>{
    if(!obj||typeof obj!=='object')throw new Error('Jogador inválido.');
    const p=obj as Record<string,unknown>;
    const id=String(p.id??'').trim(), name=String(p.name??'').trim(), aliases=String(p.aliases??'').trim(), stars=Number(p.stars);
    if(!/^[\w-]{1,75}$/.test(id)||name.length<1||name.length>55||aliases.length>180||!validStars(stars))throw new Error('Nome, ID ou estrelas inválidos.');
    return {id,name,aliases,stars};
  });
  if(new Set(list.map(p=>p.id)).size!==list.length)throw new Error('Há IDs duplicados.');
  if(new Set(list.map(p=>normalize(p.name))).size!==list.length)throw new Error('Há nomes duplicados.');
  return list;
}
async function ranking():Promise<Ranking>{
  const doc=await readDocument(rankPath);
  if(!doc)return {players:starterPlayers.map(x=>({...x})),etag:null};
  return {players:checkPlayers(readCsv(doc.content).players),etag:doc.etag};
}
async function peladas():Promise<Pelada[]>{
  const paths=(await listDocuments('peladas/')).filter(p=>/^peladas\/pelada_\d+\.csv$/.test(p));
  const docs=await Promise.all(paths.map(async path=>{
    const doc=await readDocument(path);if(!doc||doc.content===deletedMarker)return null;
    const parsed=readCsv(doc.content);
    return {number:Number(path.match(/pelada_(\d+)\.csv$/)?.[1]),createdAt:parsed.createdAt,
      players:checkPlayers(parsed.players,120).map(p=>({...p,goals:parsed.players.find(x=>x.id===p.id)?.goals??0,assists:parsed.players.find(x=>x.id===p.id)?.assists??0})),etag:doc.etag};
  }));
  return docs.filter(x=>x!==null).sort((a,b)=>b.number-a.number);
}
async function usedPeladaNumbers(){
  const groups=await Promise.all([listDocuments('peladas/'),listDocuments('excluidas/')]);
  return groups.flat().map(path=>Number(path.match(/pelada_(\d+)\.(?:csv|json)$/)?.[1]||0));
}
async function getState():Promise<AppState>{
  const [r,p,ids,paths]=await Promise.all([ranking(),peladas(),usedPeladaNumbers(),listDocuments('peladas/')]);
  const pending=await Promise.all(paths.filter(path=>/^peladas\/pelada_\d+\.csv$/.test(path)).map(async path=>(await readDocument(path))?.content===deletedMarker?Number(path.match(/pelada_(\d+)/)![1]):null));
  const nextPeladaNumber=Math.max(0,...ids)+1;
  return {ranking:r,peladas:p,nextPeladaNumber,pendingDeletions:pending.filter((n):n is number=>n!==null)};
}
async function addToRanking(players:Player[]):Promise<number>{
  if(!players.length)return 0;
  for(let attempt=0;attempt<3;attempt++){
    const current=await ranking();
    const additions=players.filter(p=>!current.players.some(x=>x.id===p.id||normalize(x.name)===normalize(p.name))&&!matchPlayer(p.name,current.players));
    if(!additions.length)return 0;
    const merged=checkPlayers([...current.players,...additions]);
    try{
      if(current.etag)await updateDocument(rankPath,rankingToCsv(merged),current.etag);
      else await createDocument(rankPath,rankingToCsv(merged));
      return additions.length;
    }catch(e){if(!(e instanceof ConflictError)||attempt===2)throw e;}
  }
  return 0;
}
export async function handleApi(method:string, payload:unknown):Promise<ApiReply>{
  try{
    if(method==='GET')return output(200,{state:await getState()});
    if(method!=='POST')return output(405,{error:'Método não permitido.'});
    if(!payload||typeof payload!=='object')return output(400,{error:'Solicitação inválida.'});
    const data=payload as Record<string,unknown>;
    if(data.action==='saveRanking'){
      const players=checkPlayers(data.players);
      const doc=await readDocument(rankPath);
      const expected=data.etag;
      if(doc){if(typeof expected!=='string'||doc.etag!==expected)throw new ConflictError();
        await updateDocument(rankPath,rankingToCsv(players),doc.etag);
      }else{if(expected!==null)throw new ConflictError();await createDocument(rankPath,rankingToCsv(players));}
      return output(200,{ok:true});
    }
    if(data.action==='deletePelada'){
      const number=Number(data.number);
      if(!Number.isSafeInteger(number)||number<1)return output(400,{error:'Pelada inválida.'});
      const path=peladaPath(number),doc=await readDocument(path);
      if(!doc)return output(404,{error:'Pelada não encontrada.'});
      if(doc.content!==deletedMarker&&(typeof data.etag!=='string'||data.etag!==doc.etag))throw new ConflictError();
      const reservation=`excluidas/pelada_${number}.json`;
      if(!await readDocument(reservation)){
        try{await createDocument(reservation,JSON.stringify({number}));}catch(e){if(!(e instanceof ConflictError))throw e;}
      }
      if(doc.content!==deletedMarker)await updateDocument(path,deletedMarker,doc.etag);
      // Keep the marker until all snapshots are removed, so partial cleanup can be retried.
      try{
        const snapshots=(await listDocuments('partidas/')).filter(p=>p.startsWith(`partidas/pelada_${number}_`)&&p.endsWith('.json'));
        for(const snapshot of snapshots)await deleteDocument(snapshot);
        const marker=await readDocument(path);
        if(marker){if(marker.content!==deletedMarker)throw new ConflictError();await deleteDocument(path,marker.etag);}
      }catch(e){console.error('Limpeza pendente da pelada',number,e);return output(500,{error:'A pelada foi desativada, mas a limpeza dos arquivos falhou. Use Concluir exclusão para tentar novamente.'});}
      return output(200,{ok:true});
    }
    if(data.action==='savePelada'){
      const number=Number(data.number);
      if(!Number.isSafeInteger(number)||number<1)return output(400,{error:'Pelada inválida.'});
      const players=checkPlayers(data.players,120);
      if(players.length<4)throw new Error('A pelada precisa de pelo menos 4 jogadores.');
      const path=peladaPath(number), doc=await readDocument(path);
      if(!doc||doc.content===deletedMarker) return output(404,{error:'Pelada não encontrada.'});
      if(typeof data.etag!=='string'||doc.etag!==data.etag)throw new ConflictError();
      const parsed=readCsv(doc.content);
      const matchState=await readMatchState(number,parsed.matchFile);
      if(matchState.teams.length&&(players.length!==parsed.players.length||players.some(p=>!parsed.players.some(x=>x.id===p.id))))return output(400,{error:'Os convocados não podem mudar depois de salvar os times. Você ainda pode corrigir nomes e estrelas.'});
      const preserved=players.map(p=>({...p,goals:parsed.players.find(x=>x.id===p.id)?.goals??0,assists:parsed.players.find(x=>x.id===p.id)?.assists??0}));
      await updateDocument(path,peladaToCsv({players:preserved,createdAt:parsed.createdAt||new Date().toISOString(),matchFile:parsed.matchFile}),doc.etag);
      return output(200,{ok:true});
    }
    if(data.action==='createPelada'){
      const players=checkPlayers(data.players,120);
      if(players.length<4)throw new Error('A pelada precisa de pelo menos 4 jogadores.');
      const addIds=data.addToRankingIds??[];
      if(!Array.isArray(addIds)||addIds.some(id=>typeof id!=='string'||!players.some(p=>p.id===id)))return output(400,{error:'Jogadores inválidos para o ranking.'});
      for(let i=0;i<6;i++){
        const ids=await usedPeladaNumbers();
        const number=Math.max(0,...ids)+1;
        try{
          await createDocument(peladaPath(number),peladaToCsv({players,createdAt:new Date().toISOString()}));
          // The game is already saved. Report a partial failure without inviting a duplicate game.
          let addedToRanking=0;
          try{addedToRanking=await addToRanking(players.filter(p=>addIds.includes(p.id)));}
          catch(e){console.error('Erro ao adicionar jogadores ao Geral',e);return output(201,{ok:true,number,warning:'A pelada foi criada, mas não foi possível adicionar os novos jogadores ao Geral. Adicione-os pela aba Ranking.'});}
          return output(201,{ok:true,number,addedToRanking});
        }catch(e){if(!(e instanceof ConflictError))throw e;}
      }
      return output(409,{error:'Outra pelada foi criada ao mesmo tempo. Tente novamente.'});
    }
    return output(400,{error:'Ação não reconhecida.'});
  }catch(e){
    if(e instanceof ConflictError)return output(409,{error:e.message});
    if(e instanceof Error && /inválid|duplicad|precisa|quantidade|Nome|CSV sem coluna/.test(e.message))return output(400,{error:e.message});
    console.error('Erro Peladamas API',e);
    return output(500,{error:'Não foi possível acessar os arquivos. Confira o armazenamento na Vercel.'});
  }
}
