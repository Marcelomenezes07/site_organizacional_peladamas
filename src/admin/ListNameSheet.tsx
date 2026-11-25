import {useState} from 'react';
import {Check,Search} from 'lucide-react';
import type {Player} from '../../lib/models';
import {formatStars,normalize,suggestPlayers} from '../../lib/logic';
import {Sheet,Stepper} from '../ui';

const stars=(n:number)=>`${formatStars(n)} ★`;

/**
 * Painel de um nome da lista que não bateu com o ranking. Mostra uma coisa por vez:
 * "Quem é?" (sugestões e busca no ranking) ou "É novo" (nome e nota).
 * Abre em "Quem é?" quando há sugestão ou associação; senão, direto em "É novo".
 * Monte com `key` por nome para começar sempre do valor atual.
 */
export default function ListNameSheet({open,listName,newcomer,linked,available,onLink,onNew,onRemove,onClose}:{
  open:boolean;listName:string;newcomer:Pick<Player,'name'|'stars'>;linked:Player|null;available:Player[];
  onLink:(player:Player)=>void;onNew:(draft:Pick<Player,'name'|'stars'>)=>void;onRemove:()=>void;onClose:()=>void}){
  const suggested=suggestPlayers(listName,available);
  const [mode,setMode]=useState<'ranking'|'new'>(linked||suggested.length?'ranking':'new');
  const [name,setName]=useState(newcomer.name),[rating,setRating]=useState(newcomer.stars),[query,setQuery]=useState('');
  const q=normalize(query);
  const found=q?available.filter(r=>normalize(`${r.name} ${r.aliases}`).includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')):suggested;
  // Quem já está associado aparece primeiro, marcado.
  const options=linked&&!q?[linked,...found.filter(p=>p.id!==linked.id)]:found;

  if(mode==='new')return <Sheet open={open} title={`${listName} é novo`} onClose={onClose}>
    <div className="field"><label htmlFor="newcomer-name">Nome</label><input id="newcomer-name" value={name} maxLength={55} autoComplete="off" onChange={e=>setName(e.target.value)}/></div>
    <div className="kv"><strong>Nota</strong><Stepper label="Nota" value={rating} min={0.5} max={5} step={0.5} format={stars} onChange={setRating}/></div>
    <button type="button" className="btn primary block" disabled={!name.trim()} onClick={()=>onNew({name:name.trim(),stars:rating})}><Check size={18} aria-hidden="true"/> Confirmar</button>
    <div className="sheet-links">
      <button type="button" className="btn text" onClick={()=>setMode('ranking')}>Buscar no ranking</button>
      <button type="button" className="btn text danger-text" onClick={onRemove}>Tirar da lista</button>
    </div>
  </Sheet>;

  return <Sheet open={open} title={`Quem é ${listName}?`} onClose={onClose}>
    <div className="search"><Search size={18} aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar no ranking" aria-label="Buscar no ranking"/></div>
    {options.length>0?<div className="list">{options.map(p=>{const current=p.id===linked?.id;
      return <button key={p.id} type="button" className="row" aria-pressed={current} onClick={()=>current?onClose():onLink(p)}>
        <span className="row-main"><strong>{p.name}</strong></span><span className="stars">{stars(p.stars)}</span>
        {current&&<Check className="chev" size={20} aria-hidden="true"/>}
      </button>;})}</div>
      :<p className="muted small">{q?'Ninguém do ranking com esse nome.':'Digite o nome para buscar.'}</p>}
    <button type="button" className="btn subtle block" onClick={()=>setMode('new')}>É novo</button>
  </Sheet>;
}
