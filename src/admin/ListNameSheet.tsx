import {useState} from 'react';
import {Check,Search} from 'lucide-react';
import type {Player} from '../../lib/models';
import {formatStars,normalize,suggestPlayers} from '../../lib/logic';
import {Sheet,Stepper} from '../ui';

/**
 * Painel de um nome da lista que não bateu com o ranking: escolher quem é no ranking
 * (sugestões ou busca) ou confirmar como jogador novo, com nome e nota.
 * Monte com `key` por nome para começar sempre do valor atual.
 */
export default function ListNameSheet({open,listName,newcomer,linked,available,onLink,onNew,onRemove,onClose}:{
  open:boolean;listName:string;newcomer:Pick<Player,'name'|'stars'>;linked:Player|null;available:Player[];
  onLink:(player:Player)=>void;onNew:(draft:Pick<Player,'name'|'stars'>)=>void;onRemove:()=>void;onClose:()=>void}){
  const [name,setName]=useState(newcomer.name),[stars,setStars]=useState(newcomer.stars),[query,setQuery]=useState('');
  const q=normalize(query);
  const found=q?available.filter(r=>normalize(`${r.name} ${r.aliases}`).includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')):suggestPlayers(listName,available);
  // Quem já está associado aparece primeiro, marcado.
  const options=linked&&!q?[linked,...found.filter(p=>p.id!==linked.id)]:found;
  return <Sheet open={open} title={listName} subtitle="Como veio na lista" onClose={onClose}>
    <h3 className="label">É alguém do ranking?</h3>
    <div className="search"><Search size={18} aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar no ranking" aria-label="Buscar no ranking"/></div>
    {options.length>0&&<div className="pick">{options.map(p=><button key={p.id} type="button" aria-pressed={p.id===linked?.id} onClick={()=>p.id===linked?.id?onClose():onLink(p)}>{p.name}</button>)}</div>}
    <p className="muted small">{q&&!options.length?'Ninguém do ranking com esse nome.':!q&&!options.length?'Sem sugestões. Busque pelo nome.':`Ao escolher, “${listName}” vira apelido e é reconhecido na próxima vez.`}</p>
    <div className="or" aria-hidden="true"><span>ou</span></div>
    <h3 className="label">É novo</h3>
    <div className="field"><label htmlFor="newcomer-name">Nome</label><input id="newcomer-name" value={name} maxLength={55} autoComplete="off" onChange={e=>setName(e.target.value)}/></div>
    <div className="kv"><strong>Nota</strong><Stepper label="Nota" value={stars} min={0.5} max={5} step={0.5} format={n=>`${formatStars(n)} ★`} onChange={setStars}/></div>
    <button type="button" className="btn primary block" disabled={!name.trim()} onClick={()=>onNew({name:name.trim(),stars})}><Check size={18} aria-hidden="true"/> Confirmar novo</button>
    <button type="button" className="btn text danger-text" onClick={onRemove}>Tirar da lista</button>
  </Sheet>;
}
