import {useState} from 'react';
import {ChevronRight,LoaderCircle} from 'lucide-react';
import type {Pelada,Player} from '../../lib/models';
import {formatStars,normalize} from '../../lib/logic';
import {TopBar} from '../ui';
import type {Run} from './api';
import PlayerSheet,{type PlayerDraft} from './PlayerSheet';
import {byStars} from './RankingTab';
import {peladaTitle} from './PeladasList';

/** Notas de uma pelada. Mudar aqui não altera o ranking geral. */
export default function RosterScreen({pelada,number,run,saving,show,onBack}:{pelada?:Pelada;number:number;run:Run;saving:boolean;show:(text:string,error?:boolean)=>void;onBack:()=>void}){
  const [editing,setEditing]=useState<{player:Player;key:number}|null>(null);
  if(!pelada)return <><TopBar title="Jogadores e notas" onBack={onBack}/><div className="loading" role="status"><LoaderCircle className="spin" size={28} aria-hidden="true"/>Carregando…</div></>;
  const players=[...pelada.players].sort(byStars);
  const canRemove=!pelada.teamsPublished&&pelada.players.length>4;
  const write=(next:Player[],message:string)=>run({action:'savePelada',number,players:next.map(({id,name,aliases,stars})=>({id,name,aliases,stars})),etag:pelada.etag},message).then(Boolean);
  const save=async(draft:PlayerDraft)=>{
    const current=editing!.player;
    if(pelada.players.some(p=>p.id!==current.id&&normalize(p.name)===normalize(draft.name))){show('Já existe um jogador com esse nome nesta pelada.',true);return false;}
    return write(pelada.players.map(p=>p.id===current.id?{...p,name:draft.name,stars:draft.stars}:p),`${draft.name} salvo.`);
  };
  return <>
    <TopBar title="Jogadores e notas" subtitle={`${peladaTitle(pelada)} · não altera o ranking geral`} onBack={onBack}/>
    <div className="list" aria-label="Jogadores desta pelada">{players.map((p,i)=><button key={p.id} type="button" className="row" aria-label={`Editar ${p.name}, ${formatStars(p.stars)} estrelas`} onClick={()=>setEditing({player:p,key:Date.now()})}>
      <span className="pos" aria-hidden="true">{i+1}</span><span className="row-main"><strong>{p.name}</strong>{(p.goals||p.assists)?<small>{p.goals??0} gols · {p.assists??0} assistências</small>:null}</span>
      <span className="stars">{formatStars(p.stars)} ★</span><ChevronRight className="chev" size={20} aria-hidden="true"/>
    </button>)}</div>
    {pelada.teamsPublished&&<p className="muted small">Com os times sorteados, dá para corrigir nomes e notas, mas não tirar jogadores.</p>}
    {editing&&<PlayerSheet key={editing.key} open player={editing.player} context={`Pelada ${number}`} withAliases={false} canDelete={canRemove} saving={saving}
      onSave={save} onDelete={()=>write(pelada.players.filter(p=>p.id!==editing.player.id),`${editing.player.name} saiu da pelada.`)} onClose={()=>setEditing(null)}/>}
  </>;
}
