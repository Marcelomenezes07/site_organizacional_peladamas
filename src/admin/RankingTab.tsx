import {useState} from 'react';
import {ChevronRight,Download,Plus,Search} from 'lucide-react';
import type {AppState,Player} from '../../lib/models';
import {formatStars,normalize} from '../../lib/logic';
import {rankingToCsv} from '../../lib/csv';
import {TopBar} from '../ui';
import {downloadCsv,type Run} from './api';
import {newId} from '../id';
import PlayerSheet,{type PlayerDraft} from './PlayerSheet';

export const byStars=(a:Player,b:Player)=>b.stars-a.stars||a.name.localeCompare(b.name,'pt-BR');
const nextId=()=>`u-${newId()}`;

/** Ranking geral: uma lista com busca. Tocar no jogador abre o painel de edição. */
export default function RankingTab({state,run,saving,online,show}:{state:AppState;run:Run;saving:boolean;online:boolean;show:(text:string,error?:boolean)=>void}){
  const [search,setSearch]=useState('');
  const [editing,setEditing]=useState<{player:Player|null;key:number}|null>(null);
  const players=[...state.ranking.players].sort(byStars);
  const query=normalize(search);
  const rows=players.filter(p=>normalize(`${p.name} ${p.aliases}`).includes(query));
  const average=players.length?players.reduce((s,p)=>s+p.stars,0)/players.length:0;

  const save=async(draft:PlayerDraft)=>{
    const current=editing?.player;
    if(state.ranking.players.some(p=>p.id!==current?.id&&normalize(p.name)===normalize(draft.name))){show('Já existe um jogador com esse nome.',true);return false;}
    const next=current?state.ranking.players.map(p=>p.id===current.id?{...p,...draft}:p):[...state.ranking.players,{id:nextId(),...draft}];
    return Boolean(await run({action:'saveRanking',players:next,etag:state.ranking.etag},`${draft.name} salvo.`));
  };
  const remove=async()=>{
    const current=editing?.player;if(!current)return false;
    return Boolean(await run({action:'saveRanking',players:state.ranking.players.filter(p=>p.id!==current.id),etag:state.ranking.etag},`${current.name} saiu do ranking.`));
  };

  return <>
    <TopBar brand title="Ranking" subtitle={online?`${players.length} jogadores · média ${formatStars(average)} ★`:'Sem conexão · tentando de novo'}
      right={<button type="button" className="icon-btn" aria-label="Baixar planilha do ranking" onClick={()=>downloadCsv('ranking_geral.csv',rankingToCsv(players))}><Download size={22} aria-hidden="true"/></button>}/>
    <div className="search"><Search size={18} aria-hidden="true"/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar jogador ou apelido" aria-label="Buscar jogador"/></div>
    <button type="button" className="btn subtle block" onClick={()=>setEditing({player:null,key:Date.now()})}><Plus size={18} aria-hidden="true"/> Adicionar jogador</button>
    {rows.length?<div className="list" aria-label="Jogadores do ranking">{rows.map(p=><button key={p.id} type="button" className="row ranking-row" aria-label={`Editar ${p.name}, ${formatStars(p.stars)} estrelas`} onClick={()=>setEditing({player:p,key:Date.now()})}>
      <span className="pos" aria-hidden="true">{players.indexOf(p)+1}</span>
      <span className="row-main"><strong>{p.name}</strong>{p.aliases&&<small>{p.aliases.split('|').map(a=>a.trim()).filter(Boolean).join(', ')}</small>}</span>
      <span className="stars">{formatStars(p.stars)} ★</span><ChevronRight className="chev" size={20} aria-hidden="true"/>
    </button>)}</div>
    :<div className="card empty"><Search size={26} aria-hidden="true"/><strong>Nenhum jogador encontrado</strong><p>{search?'Tente outro nome ou apelido.':'Adicione o primeiro jogador.'}</p></div>}
    {editing&&<PlayerSheet key={editing.key} open player={editing.player} context="Ranking geral" withAliases canDelete saving={saving} onSave={save} onDelete={remove} onClose={()=>setEditing(null)}/>}
  </>;
}
