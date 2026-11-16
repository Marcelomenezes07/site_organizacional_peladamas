import { useEffect, useState, type FormEvent } from 'react';
import App from './App';
import {ArrowRight} from 'lucide-react';

export default function Admin(){
  const [session,setSession]=useState<boolean|null>(null);
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const expired=()=>{setSession(false);setPassword('');setError('Sua sessão expirou. Entre novamente.');};
    window.addEventListener('auth-expired',expired);
    void fetch('/api/auth',{cache:'no-store'}).then(async r=>{
      if(!r.ok)throw new Error();
      setSession(Boolean((await r.json()).authenticated));
    }).catch(()=>{setSession(false);setError('Não foi possível verificar sua sessão. Tente entrar novamente.');});
    return()=>window.removeEventListener('auth-expired',expired);
  },[]);
  async function login(e:FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try{
      const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json','X-Peladamas-Request':'1'},body:JSON.stringify({action:'login',username,password})});
      const result=await r.json();if(!r.ok)throw new Error(result.error||'Não foi possível entrar.');
      setPassword('');setSession(true);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível entrar.');}
    finally{setBusy(false);}
  }
  async function logout(){
    const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json','X-Peladamas-Request':'1'},body:JSON.stringify({action:'logout'})});
    if(!r.ok)throw new Error('Não foi possível sair. Tente novamente.');
    setSession(false);setPassword('');setError('');
  }
  if(session===null)return <main className="login"><p role="status" className="muted">Carregando…</p></main>;
  if(session)return <App onLogout={logout}/>;
  return <main className="login"><form onSubmit={login}>
    <div className="brand" aria-hidden="true">⚽ PELA<span>DAMAS</span></div>
    <h1>Área do organizador</h1><p>Crie peladas, sorteie os times e mantenha o ranking.</p>
    <div className="field"><label htmlFor="username">Usuário</label><input id="username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required maxLength={80} autoCapitalize="none" spellCheck={false}/></div>
    <div className="field"><label htmlFor="password">Senha</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={200}/></div>
    {error&&<p className="error-text" role="alert">{error}</p>}
    <button className="btn primary block" disabled={busy} type="submit">{busy?'Entrando…':'Entrar'}<ArrowRight size={18} aria-hidden="true"/></button>
  </form></main>;
}
