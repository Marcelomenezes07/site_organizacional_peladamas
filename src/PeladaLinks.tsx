import {useEffect,useState} from 'react';
import type {PublicPelada} from '../lib/matches';
import {getPelada} from './pelada-api';
export default function PeladaLinks({number,version}:{number:number;version?:string|null}){
  const [info,setInfo]=useState<PublicPelada|null>(null),[message,setMessage]=useState('');
  const link=`${window.location.origin}/pelada/${number}`;
  useEffect(()=>{
    let live=true;setInfo(null);setMessage('');
    const refresh=()=>void getPelada(number).then(p=>{if(live)setInfo(p);}).catch(e=>{if(live)setMessage(e.message);});
    refresh();const timer=setInterval(refresh,12000);return()=>{live=false;clearInterval(timer);};
  },[number,version]);
  return <div className="panel share-pelada"><h3>Página da Pelada {number}</h3>
    <p>{info?.teams.length?`${info.teams.length} times publicados · ${info.matches.length} partidas registradas`:'Clique em Sortear times. O sorteio será salvo automaticamente antes de liberar o link.'}</p>
    <div className="button-row"><a className="button primary" href={`/pelada/${number}`} target="_blank" rel="noreferrer">Abrir página da pelada</a><button className="button subtle" disabled={!info?.teams.length} onClick={()=>void navigator.clipboard.writeText(link).then(()=>setMessage('Link copiado!')).catch(()=>setMessage(`Copie este link: ${link}`))}>Copiar link</button></div>
    {!!info?.matches.length&&<p>Os times estão fixos porque já existem partidas.</p>}
    {message&&<p role="status">{message}</p>}
  </div>;
}
