import {useEffect,useState} from 'react';
import {ArrowUpRight,Copy} from 'lucide-react';
import type {PublicPelada} from '../lib/matches';
import {getPelada} from './pelada-api';
export default function PeladaLinks({number,version}:{number:number;version?:string|null}){
  const [info,setInfo]=useState<PublicPelada|null>(null),[message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [password,setPassword]=useState(''),[passwordError,setPasswordError]=useState('');
  const [passwordRetry,setPasswordRetry]=useState(0);
  useEffect(()=>{
    let live=true;setPassword('');setPasswordError('');
    void fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json','X-Peladamas-Request':'1'},body:JSON.stringify({action:'getPeladaPassword',number})}).then(async r=>{
      const result=await r.json();if(!r.ok)throw new Error(result.error||'Não foi possível carregar a senha.');
      if(live)setPassword(result.password);
    }).catch(e=>{if(live)setPasswordError(e.message);});
    return()=>{live=false;};
  },[number,passwordRetry]);
  const link=`${window.location.origin}/pelada/${number}`;
  useEffect(()=>{
    let live=true;setInfo(null);setMessage('');setError('');
    const refresh=()=>void getPelada(number).then(p=>{if(live){setInfo(p);setError('');}}).catch(e=>{if(live)setError(e.message);});
    refresh();const timer=setInterval(refresh,12000);return()=>{live=false;clearInterval(timer);};
  },[number,version]);
  const ready=Boolean(info?.teams.length)&&!error;
  async function copyLink(){
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(link);setMessage('Link copiado!');
    }catch{setMessage(`Copie este link: ${link}`);}
  }
  async function copyPassword(){
    try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(password);setMessage('Senha copiada!');}
    catch{setMessage('Selecione a senha exibida para copiar manualmente.');}
  }
  return <section className={'panel share-pelada'+(ready?' ready':'')} aria-label={`Compartilhar Pelada ${number}`}>
    <div className="share-heading"><div><h3>Página da Pelada {number}</h3><p>{error?'Não foi possível conferir os times publicados.':!info?'Conferindo os times publicados…':ready?`${info.teams.length} times publicados · ${info.matches.length} partidas registradas`:'Sorteie os times para liberar o link.'}</p></div></div>
    <div className="button-row"><a className="button subtle" href={`/pelada/${number}`} target="_blank" rel="noreferrer">Abrir página da pelada <ArrowUpRight size={17} aria-hidden="true"/></a><button className="button subtle" disabled={!ready} onClick={()=>void copyLink()}><Copy size={17} aria-hidden="true"/> Copiar link</button></div>
    <div className="pelada-password"><span>Senha para excluir partidas: </span>{password?<><code>{password}</code><button type="button" className="password-copy" aria-label="Copiar senha da pelada" title="Copiar senha" onClick={()=>void copyPassword()}><Copy size={13} aria-hidden="true"/></button></>:<span>{passwordError||'Carregando…'}</span>}{passwordError&&<button type="button" className="password-copy" onClick={()=>setPasswordRetry(n=>n+1)}>Tentar novamente</button>}</div>
    {!!info?.matches.length&&<p>Os times estão fixos porque já existem partidas.</p>}
    {error&&<p className="error-text" role="alert">{error} Uma nova tentativa será feita automaticamente.</p>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
