import {useState} from 'react';
import {ChevronLeft,LoaderCircle,TriangleAlert} from 'lucide-react';
import type {Goal} from '../../lib/matches';
import {Sheet} from '../ui';

/**
 * Marcar gol em dois toques: autor e assistência (ou "Sem assistência").
 * Sem menus suspensos. Em caso de erro, mantém a escolha para tentar de novo.
 */
export default function GoalSheet({open,teamId,title,members,initial,busy,error,onPick,onClose}:{open:boolean;teamId:string;title:string;members:{id:string;name:string}[];initial?:Goal;busy:boolean;error:string;onPick:(goal:Goal)=>void;onClose:()=>void}){
  const [scorer,setScorer]=useState<string|null>(null);
  const [last,setLast]=useState<Goal|null>(null);
  const pick=(goal:Goal)=>{setLast(goal);onPick(goal);};
  const scorerName=members.find(p=>p.id===scorer)?.name;
  if(error&&last)return <Sheet open={open} title={title} subtitle="O gol ainda não foi salvo" onClose={onClose}>
    <div className="notice error" role="alert"><TriangleAlert size={18} aria-hidden="true"/><span>{error}</span></div>
    <button type="button" className="btn primary block" disabled={busy} onClick={()=>onPick(last)}>{busy&&<LoaderCircle className="spin" size={18} aria-hidden="true"/>} Salvar mesmo assim</button>
    <button type="button" className="btn subtle block" onClick={onClose}>Cancelar</button>
  </Sheet>;
  if(!scorer)return <Sheet open={open} title={title} subtitle="Quem fez o gol?" onClose={onClose}>
    <div className="pick">
      {members.map(p=><button key={p.id} type="button" aria-pressed={initial?.scorerId===p.id} onClick={()=>setScorer(p.id)}>{p.name}</button>)}
      <button type="button" className="wide quiet" disabled={busy} onClick={()=>pick({teamId,scorerId:null,assistId:null,ownGoal:true})}>Gol contra do adversário</button>
    </div>
  </Sheet>;
  return <Sheet open={open} title={`Gol de ${scorerName}`} subtitle="Quem deu a assistência?" onClose={onClose}>
    <div className="pick">
      {members.filter(p=>p.id!==scorer).map(p=><button key={p.id} type="button" aria-pressed={initial?.assistId===p.id} disabled={busy} onClick={()=>pick({teamId,scorerId:scorer,assistId:p.id,ownGoal:false})}>{p.name}</button>)}
      <button type="button" className="wide" disabled={busy} onClick={()=>pick({teamId,scorerId:scorer,assistId:null,ownGoal:false})}>{busy&&<LoaderCircle className="spin" size={18} aria-hidden="true"/>} Sem assistência</button>
    </div>
    <button type="button" className="btn text" onClick={()=>setScorer(null)}><ChevronLeft size={18} aria-hidden="true"/> Trocar autor</button>
  </Sheet>;
}
