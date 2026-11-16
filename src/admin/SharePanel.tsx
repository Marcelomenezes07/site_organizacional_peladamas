import {useEffect,useState} from 'react';
import {ChevronRight,Copy,RefreshCw} from 'lucide-react';
import {copyText,organizerPeladaUrl} from './api';

/** Tudo o que vai para o grupo num lugar só: texto dos times, link e senha de exclusão. */
export default function SharePanel({number,message,show}:{number:number;message:string|null;show:(text:string,error?:boolean)=>void}){
  const [password,setPassword]=useState(''),[passwordError,setPasswordError]=useState(''),[retry,setRetry]=useState(0);
  const link=`${window.location.origin}/pelada/${number}`;
  useEffect(()=>{
    let live=true;setPassword('');setPasswordError('');
    void fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json','X-Peladamas-Request':'1'},body:JSON.stringify({action:'getPeladaPassword',number})}).then(async r=>{
      const result=await r.json();if(!r.ok)throw new Error(result.error||'Não foi possível carregar a senha.');
      if(live)setPassword(result.password);
    }).catch(e=>{if(live)setPasswordError((e as Error).message);});
    return()=>{live=false;};
  },[number,retry]);
  return <>
    {message&&<>
      <pre className="wa-preview" aria-label="Texto dos times">{message}</pre>
      <button type="button" className="btn primary block" onClick={async()=>{const ok=await copyText(message);show(ok?'Texto dos times copiado. Cole no grupo.':'Não foi possível copiar. Selecione o texto acima e copie.',!ok);}}>
        <Copy size={18} aria-hidden="true"/> Copiar texto dos times</button>
    </>}
    <div className="list">
      <button type="button" className="row" onClick={async()=>{const ok=await copyText(link);show(ok?'Link copiado.':`Copie este link: ${link}`,!ok);}}>
        <span className="row-main"><strong>Copiar link da pelada</strong><small>{link.replace(/^https?:\/\//,'')}</small></span><Copy size={18} aria-hidden="true"/></button>
      <div className="row"><span className="row-main"><strong>Senha para excluir partidas</strong><small>Mande só para quem cuida do placar</small></span>
        {password?<button type="button" className="btn subtle small" aria-label="Copiar senha da pelada" onClick={async()=>{const ok=await copyText(password);show(ok?'Senha copiada.':'Selecione a senha exibida para copiar.',!ok);}}><span className="code">{password}</span><Copy size={16} aria-hidden="true"/></button>
        :passwordError?<button type="button" className="btn subtle small" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={16} aria-hidden="true"/> Tentar de novo</button>
        :<span className="muted small">Carregando…</span>}</div>
      <a className="row" href={organizerPeladaUrl(number)}><span className="row-main"><strong>Abrir página da pelada</strong><small>A mesma página que os jogadores veem</small></span><ChevronRight className="chev" size={20} aria-hidden="true"/></a>
    </div>
    {passwordError&&<p className="error-text" role="alert">{passwordError}</p>}
  </>;
}
