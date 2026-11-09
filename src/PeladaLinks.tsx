import {useEffect,useState} from 'react';
import {ArrowUpRight,Copy} from 'lucide-react';
import type {PublicPelada} from '../lib/matches';
import {getPelada} from './pelada-api';
export default function PeladaLinks({number,version}:{number:number;version?:string|null}){
  const [info,setInfo]=useState<PublicPelada|null>(null),[message,setMessage]=useState('');
  const [error,setError]=useState('');
  const link=`${window.location.origin}/pelada/${number}`;
  useEffect(()=>{
    let live=true;setInfo(null);setMessage('');setError('');
    const refresh=()=>void getPelada(number).then(p=>{if(live){setInfo(p);setError('');}}).catch(e=>{if(live)setError(e.message);});
    refresh();const timer=setInterval(refresh,12000);return()=>{live=false;clearInterval(timer);};
  },[number,version]);
  const ready=Boolean(info?.teams.length)&&!error;
  return <section className={'panel share-pelada'+(ready?' ready':'')} aria-label={`Compartilhar Pelada ${number}`}>
    <div className="share-heading"><div><h3>Página da Pelada {number}</h3><p>{error?'Não foi possível conferir os times publicados.':!info?'Conferindo os times publicados…':ready?`${info.teams.length} times publicados · ${info.matches.length} partidas registradas`:'Sorteie os times para liberar o link.'}</p></div></div>
    <div className="button-row"><a className="button subtle" href={`/pelada/${number}`} target="_blank" rel="noreferrer">Abrir página da pelada <ArrowUpRight size={17} aria-hidden="true"/></a><button className="button subtle" disabled={!ready} onClick={()=>void navigator.clipboard.writeText(link).then(()=>setMessage('Link copiado!')).catch(()=>setMessage(`Copie este link: ${link}`))}><Copy size={17} aria-hidden="true"/> Copiar link</button></div>
    {!!info?.matches.length&&<p>Os times estão fixos porque já existem partidas.</p>}
    {error&&<p className="error-text" role="alert">{error} Uma nova tentativa será feita automaticamente.</p>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
