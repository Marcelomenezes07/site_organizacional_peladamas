import {useState} from 'react';
import {ChevronRight,MoreHorizontal,Plus,RefreshCw,LogOut,FilePlus2} from 'lucide-react';
import type {AppState,Pelada} from '../../lib/models';
import {formatPeladaDay} from '../../lib/pelada-date';
import {Sheet,TopBar} from '../ui';
import type {Run} from './api';

export function peladaTitle(p:Pick<Pelada,'date'|'number'>){return formatPeladaDay(p.date)||`Pelada ${p.number}`;}
function Status({pelada}:{pelada:Pelada}){
  if(!pelada.teamsPublished)return <span className="chip warn">Sem times</span>;
  if(pelada.matchCount)return <span className="chip">{pelada.matchCount} {pelada.matchCount===1?'partida':'partidas'}</span>;
  return <span className="chip ok">Times prontos</span>;
}

export default function PeladasList({state,online,saving,run,onNew,onOpen,onRefresh,onLogout}:{state:AppState;online:boolean;saving:boolean;run:Run;onNew:()=>void;onOpen:(n:number)=>void;onRefresh:()=>void;onLogout:()=>void}){
  const [menu,setMenu]=useState(false);
  const count=state.peladas.length;
  return <>
    <TopBar brand title="Peladas" subtitle={online?(count?`${count} ${count===1?'pelada':'peladas'}`:undefined):'Sem conexão · tentando de novo'}
      right={<button type="button" className="icon-btn" aria-label="Mais opções" onClick={()=>setMenu(true)}><MoreHorizontal size={24} aria-hidden="true"/></button>}/>
    <button type="button" className="btn primary block" onClick={onNew}><Plus size={20} aria-hidden="true"/> Nova pelada</button>
    {!!state.pendingDeletions?.length&&<div className="notice error" role="alert"><div className="row-main"><strong>Exclusão incompleta</strong><small>A limpeza de arquivos falhou. Toque para concluir.</small></div>
      {state.pendingDeletions.map(n=><button key={n} type="button" className="btn danger small" disabled={saving} onClick={()=>void run({action:'deletePelada',number:n},`Pelada ${n} excluída.`)}>Concluir Pelada {n}</button>)}</div>}
    {count?<div className="list">{state.peladas.map(p=><button key={p.number} type="button" className="row" onClick={()=>onOpen(p.number)}>
      <span className="row-main"><strong>{peladaTitle(p)}</strong><small>Pelada {p.number} · {p.players.length} jogadores</small></span>
      <Status pelada={p}/><ChevronRight className="chev" size={20} aria-hidden="true"/>
    </button>)}</div>
    :<div className="card empty"><FilePlus2 size={28} aria-hidden="true"/><strong>Nenhuma pelada ainda</strong><p>Toque em Nova pelada e cole a lista do WhatsApp.</p></div>}
    <Sheet open={menu} title="Opções" onClose={()=>setMenu(false)}>
      <div className="list">
        <button type="button" className="row" onClick={()=>{setMenu(false);onRefresh();}}><RefreshCw size={20} aria-hidden="true"/><span className="row-main"><strong>Atualizar agora</strong><small>A lista já se atualiza a cada 12 segundos</small></span></button>
        <button type="button" className="row" onClick={()=>{setMenu(false);onLogout();}}><LogOut size={20} aria-hidden="true"/><span className="row-main"><strong>Sair</strong></span></button>
      </div>
    </Sheet>
  </>;
}
