import {useEffect,useState} from 'react';
import type {Team} from '../lib/logic';
import type {PublicPelada} from '../lib/matches';
import {getPelada,changePelada} from './pelada-api';
import {useConfirmation} from './useConfirmation';
export default function PeladaLinks({number,teams,onSaved}:{number:number;teams?:Team[]|null;onSaved:()=>void}){
  const [info,setInfo]=useState<PublicPelada|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const {confirm,confirmation}=useConfirmation();const link=`${window.location.origin}/pelada/${number}`;
  useEffect(()=>{let live=true;setInfo(null);setMessage('');void getPelada(number).then(p=>{if(live)setInfo(p);}).catch(e=>{if(live)setMessage(e.message);});return()=>{live=false;};},[number]);
  async function save(){
    if(!teams||!info||busy)return;
    if(info.teams.length&&!await confirm('Substituir os times publicados por este sorteio?'))return;
    setBusy(true);setMessage('');
    try{await changePelada(number,{action:'publishTeams',teams:teams.map(t=>t.map(p=>p.id)),etag:info.etag});setInfo(await getPelada(number));setMessage('Times salvos! A página pública já pode receber partidas.');onSaved();}
    catch(e){setMessage((e as Error).message);void getPelada(number).then(setInfo).catch(()=>{});}
    finally{setBusy(false);}
  }
  return <div className="panel share-pelada">{confirmation}<h3>Página da Pelada {number}</h3>
    <p>{info?.teams.length?`${info.teams.length} times publicados · ${info.matches.length} partidas registradas`:'Sorteie e salve os times para liberar o registro de partidas.'}</p>
    <div className="button-row"><a className="button primary" href={`/pelada/${number}`} target="_blank" rel="noreferrer">Abrir página da pelada</a><button className="button subtle" onClick={()=>void navigator.clipboard.writeText(link).then(()=>setMessage('Link copiado!')).catch(()=>setMessage(`Copie este link: ${link}`))}>Copiar link</button></div>
    {teams&&<button className="button primary full" disabled={busy||!info||!!info.matches.length} onClick={()=>void save()}>{busy?'Salvando…':'Salvar times na página pública'}</button>}
    {!!info?.matches.length&&<p>Os times estão fixos porque já existem partidas.</p>}
    {message&&<p role="status">{message}</p>}
  </div>;
}
