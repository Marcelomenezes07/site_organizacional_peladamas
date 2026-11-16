import {useState} from 'react';
import {Check,LoaderCircle} from 'lucide-react';
import type {Player} from '../../lib/models';
import {formatStars} from '../../lib/logic';
import {Sheet,Stepper} from '../ui';

export type PlayerDraft=Pick<Player,'name'|'aliases'|'stars'>;
/**
 * Edição de um jogador num painel. "Salvar" grava na hora; não existe alteração pendente.
 * Monte com `key` por jogador para começar sempre do valor salvo.
 */
export default function PlayerSheet({open,player,context,withAliases,canDelete,saving,onSave,onDelete,onClose}:{open:boolean;player:Player|null;context:string;withAliases:boolean;canDelete:boolean;saving:boolean;onSave:(draft:PlayerDraft)=>Promise<boolean>;onDelete?:()=>Promise<boolean>;onClose:()=>void}){
  const [name,setName]=useState(player?.name??''),[aliases,setAliases]=useState(player?.aliases??''),[stars,setStars]=useState(player?.stars??3);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const save=async()=>{if(name.trim()&&await onSave({name:name.trim(),aliases:aliases.trim(),stars}))onClose();};
  if(confirmDelete&&player)return <Sheet open={open} title={`Excluir ${player.name}?`} subtitle={context} onClose={onClose}>
    <p>{player.name} sai desta lista. Gols e partidas já registrados não mudam.</p>
    <button type="button" className="btn danger block" disabled={saving} onClick={async()=>{if(await onDelete?.())onClose();}}>Excluir {player.name}</button>
    <button type="button" className="btn subtle block" onClick={()=>setConfirmDelete(false)}>Cancelar</button>
  </Sheet>;
  return <Sheet open={open} title={player?'Editar jogador':'Novo jogador'} subtitle={player?`${context} · ${formatStars(player.stars)} ★ hoje`:context} onClose={onClose}>
    <form className="choices" onSubmit={e=>{e.preventDefault();void save();}}>
      <div className="field"><label htmlFor="player-name">Nome</label><input id="player-name" value={name} maxLength={55} required autoComplete="off" onChange={e=>setName(e.target.value)}/></div>
      {withAliases&&<div className="field"><label htmlFor="player-aliases">Apelidos</label><input id="player-aliases" value={aliases} maxLength={180} autoComplete="off" placeholder="Ex.: Bru | Brunão" onChange={e=>setAliases(e.target.value)}/><small>Separe com |. Ajudam a reconhecer o nome na lista do WhatsApp.</small></div>}
      <div className="kv"><strong>Nota</strong><Stepper label="Nota" value={stars} min={0.5} max={5} step={0.5} format={n=>`${formatStars(n)} ★`} onChange={setStars}/></div>
      <button type="submit" className="btn primary block" disabled={saving||!name.trim()}>{saving?<LoaderCircle className="spin" size={18} aria-hidden="true"/>:<Check size={18} aria-hidden="true"/>} Salvar</button>
      {player&&canDelete&&<button type="button" className="btn text danger-text" onClick={()=>setConfirmDelete(true)}>Excluir jogador</button>}
    </form>
  </Sheet>;
}
