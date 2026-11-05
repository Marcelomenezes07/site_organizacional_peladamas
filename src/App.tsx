import {getPelada,changePelada} from './pelada-api';
import PeladaLinks from './PeladaLinks';
import { useConfirmation } from './useConfirmation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowRight, Check, CheckCircle2, ChevronDown, Clipboard,
  Cloud, CloudOff, Copy, FilePlus2, FileSpreadsheet, History, Info, LoaderCircle,
  PencilLine, Plus, RefreshCw, RotateCcw, Search, Settings2, ShieldAlert, Shuffle,
  Sparkles, Trash2, Trophy, Users, X
} from 'lucide-react';
import { formatStars, matchPlayer, normalize, parseWhatsAppList, sortTeams, starOptions, validStars, type Team, type DrawMode } from '../lib/logic';
import { peladaToCsv, rankingToCsv } from '../lib/csv';
import type { AppState, Pelada, Player } from '../lib/models';

type Tab = 'ranking' | 'sorteio';
type Mode = 'sortear' | 'criar';
type PreviewPlayer = Player & { unmatched?: boolean; reviewed?: boolean; original?: string };
const teamEmojis=['🔵','🔴','🟢','🟡','🟣','🟠','⚪','⚫'];
const currentList=(state:AppState,view:string):{players:Player[];etag:string|null}|undefined=>
  view==='geral'?state.ranking:state.peladas.find(p=>String(p.number)===view);
const ordered=(a:Player[])=>[...a].sort((x,y)=>y.stars-x.stars||x.name.localeCompare(y.name,'pt-BR'));
const teamTotal=(t:Team)=>t.reduce((s,p)=>s+p.stars,0);
const clonePlayers=(list:Player[])=>list.map(p=>({...p}));
const nextId=()=>`u-${crypto.randomUUID()}`;

async function remote<T>(method:'GET'|'POST',body?:unknown):Promise<T>{
  const response=await fetch('/api/data',{method,cache:'no-store',headers:body?{'Content-Type':'application/json','X-Peladamas-Request':'1'}:{},...(body?{body:JSON.stringify(body)}:{})});
  if(response.status===401)window.dispatchEvent(new Event('auth-expired'));
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Erro de conexão com o servidor.');
  return result as T;
}
function exportCSV(fileName:string,csv:string){
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=fileName;
  document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function messageForTeams(teams:Team[],number:number){
  return [
    `⚽ *PELADAMAS — PELADA ${number}* ⚽`, '',
    ...teams.flatMap((t,i)=>[
      `${teamEmojis[i%teamEmojis.length]} *TIME ${i+1}* — ${formatStars(teamTotal(t))} ⭐`,
      ...t.map((p,n)=>`${n+1}. ${p.name}`),''
    ]),'🏆 Boa pelada!'
  ].join('\n');
}
function StarsSelect({value,onChange,ariaLabel}: {value:number;onChange:(v:number)=>void;ariaLabel?:string}){
  return <select className="stars-select" aria-label={ariaLabel||'Nota em estrelas'} value={value} onChange={e=>onChange(Number(e.target.value))}>
    {starOptions.map(n=><option key={n} value={n}>{formatStars(n)} ★</option>)}
  </select>;
}
function Empty({icon,heading,detail}:{icon:ReactNode;heading:string;detail:string}){
  return <div className="empty"><div className="empty-icon">{icon}</div><strong>{heading}</strong><p>{detail}</p></div>;
}
export default function App({onLogout}:{onLogout:()=>Promise<void>}){
  const {confirm,confirmation}=useConfirmation();
  const [state,setState]=useState<AppState|null>(null);
  const [tab,setTab]=useState<Tab>('ranking');
  const [mode,setMode]=useState<Mode>('sortear');
  const [view,setView]=useState('geral');
  const [draft,setDraft]=useState<Player[]>([]);
  const [dirty,setDirty]=useState(false);
  const dirtyRef=useRef(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [online,setOnline]=useState(true);
  const [feedback,setFeedback]=useState('');
  const [search,setSearch]=useState('');
  const [newName,setNewName]=useState('');
  const [newAliases,setNewAliases]=useState('');
  const [newStars,setNewStars]=useState(3);
  const [showAdd,setShowAdd]=useState(false);
  const [sourceNumber,setSourceNumber]=useState<number|null>(null);
  const [listText,setListText]=useState('');
  const [preview,setPreview]=useState<PreviewPlayer[]>([]);
  const [perTeam,setPerTeam]=useState(5);
  const [drawMode,setDrawMode]=useState<DrawMode>('balanced');
  const [teams,setTeams]=useState<Team[]|null>(null);
  const [copied,setCopied]=useState(false);
  const [lastSync,setLastSync]=useState<Date|null>(null);
  const savingRef=useRef(false);
  const stateRef=useRef<AppState|null>(null);
  const currentViewRef=useRef('geral');
  const showMessage=(s:string)=>{setFeedback(s);};

  const refresh=useCallback(async(initial=false)=>{
    if(savingRef.current)return;
    try{
      const response=await remote<{state:AppState}>('GET');
      const fresh=response.state;
      stateRef.current=fresh;setState(fresh);setOnline(true);setLastSync(new Date());
      if(!dirtyRef.current){setDraft(clonePlayers(currentList(fresh,currentViewRef.current)?.players||fresh.ranking.players));}
      if(initial)setFeedback('');
    }catch(e){setOnline(false);if(initial||!stateRef.current)setFeedback((e as Error).message);}
    finally{if(initial)setLoading(false);}
  },[]);

  useEffect(()=>{void refresh(true);const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},12000);return()=>clearInterval(timer);},[refresh]);
  useEffect(()=>{const cb=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',cb);return()=>document.removeEventListener('visibilitychange',cb);},[refresh]);
  const mark=(players:Player[])=>{setDraft(players);setDirty(true);dirtyRef.current=true;setFeedback('');};
  const setRankingView=async(next:string)=>{
    if(next===view)return;
    if(dirtyRef.current&&!await confirm('Descartar alterações que ainda não foram salvas?'))return;
    currentViewRef.current=next;setView(next);
    setDraft(clonePlayers(state?currentList(state,next)?.players||[]:[]));setDirty(false);dirtyRef.current=false;setSearch('');setShowAdd(false);setFeedback('');
  };
  const modifyPlayer=(id:string,changes:Partial<Player>)=>mark(draft.map(p=>p.id===id?{...p,...changes}:p));
  const addPlayer=()=>{
    const name=newName.trim();if(!name)return;
    if(draft.some(p=>normalize(p.name)===normalize(name))){showMessage('Já existe um jogador com esse nome.');return;}
    mark([...draft,{id:nextId(),name,aliases:newAliases.trim(),stars:newStars}]);
    setNewName('');setNewAliases('');setNewStars(3);setShowAdd(false);
  };
  const deletePlayer=async(id:string)=>{
    const p=draft.find(p=>p.id===id);
    if(p&&await confirm(`Excluir ${p.name} deste ${view==='geral'?'ranking':'histórico'}? Depois, clique em Salvar alterações para gravar a remoção.`)){mark(draft.filter(x=>x.id!==id));showMessage('Jogador removido da edição. Clique em Salvar alterações para confirmar.');}
  };
  const discard=()=>{
    if(!state)return;setDraft(clonePlayers(currentList(state,view)?.players||[]));setDirty(false);dirtyRef.current=false;setFeedback('Alterações descartadas.');
  };
  const saveRanking=async()=>{
    if(!state||!dirty||savingRef.current)return;
    const names=draft.map(p=>normalize(p.name));
    if(draft.some(p=>!p.name.trim()||!validStars(p.stars))||new Set(names).size!==names.length){showMessage('Confira nomes repetidos, vazios e estrelas inválidas.');return;}
    savingRef.current=true;setSaving(true);setFeedback('');
    try{
      const target=currentList(state,view);if(!target)throw new Error('Ranking não encontrado.');
      await remote('POST',view==='geral'?{action:'saveRanking',players:draft,etag:target.etag}:
        {action:'savePelada',number:Number(view),players:draft,etag:target.etag});
      setDirty(false);dirtyRef.current=false;setFeedback('Alterações salvas e sincronizadas para todos!');
    }catch(e){showMessage((e as Error).message);}
    finally{savingRef.current=false;setSaving(false);await refresh();}
  };

  const analyze=()=>{
    if(!state)return;
    const entries=parseWhatsAppList(listText);
    if(entries.length===0){showMessage('Cole uma lista com pelo menos quatro nomes.');return;}
    const seen=new Set<string>();
    const result=entries.map(name=>{
      const known=matchPlayer(name,state.ranking.players);
      const item:PreviewPlayer=known?{...known,original:name}:{id:nextId(),name,aliases:'',stars:3,unmatched:true,original:name};
      if(seen.has(item.id))return null;
      seen.add(item.id);return item;
    }).filter((x):x is PreviewPlayer=>x!==null);
    setPreview(result);setFeedback('');
    if(result.length<4)showMessage('Adicione pelo menos quatro jogadores antes de criar a pelada.');
  };
  const createPelada=async()=>{
    if(preview.length<4||savingRef.current)return;
    const newcomers=preview.filter(p=>p.unmatched&&!matchPlayer(p.name,state?.ranking.players||[]));
    const addNewcomers=newcomers.length>0&&await confirm(`Adicionar estes ${newcomers.length} novos jogadores também ao Ranking Geral?\n\n${newcomers.map(p=>`${p.name}: ${formatStars(p.stars)} estrelas${p.reviewed?'':' (nota provisória)'}`).join('\n')}\n\nCancelar cria a pelada sem adicioná-los ao Geral.`);
    savingRef.current=true;setSaving(true);setFeedback('');
    try{
      const p=preview.map(({id,name,aliases,stars})=>({id,name,aliases,stars}));
      const answer=await remote<{ok:boolean;number:number;addedToRanking?:number;warning?:string}>('POST',{action:'createPelada',players:p,addToRankingIds:addNewcomers?newcomers.map(p=>p.id):[]});
      setSourceNumber(answer.number);setMode('sortear');setTeams(null);setPreview([]);setListText('');
      setFeedback(answer.warning||`Pelada ${answer.number} criada!${answer.addedToRanking?` ${answer.addedToRanking} novo(s) jogador(es) adicionado(s) ao Ranking Geral.`:' Os jogadores estão salvos e compartilhados.'}`);
    }catch(e){showMessage((e as Error).message);}
    finally{savingRef.current=false;setSaving(false);await refresh();}
  };
  const deletePelada=async(number:number)=>{
    const pelada=state?.peladas.find(p=>p.number===number);
    if(savingRef.current){showMessage('Aguarde a operação atual terminar antes de excluir.');return;}
    if(!pelada&&!state?.pendingDeletions?.includes(number)){showMessage('Esta pelada não está mais na lista. Atualize os dados para continuar.');return;}
    if(!await confirm(`Excluir a Pelada ${number}? O histórico desta pelada será removido. O Ranking Geral será mantido. Esta ação não pode ser desfeita.`))return;
    savingRef.current=true;setSaving(true);setFeedback('');
    try{
      await remote('POST',{action:'deletePelada',number,etag:pelada?.etag});
      if(currentViewRef.current===String(number)){
        currentViewRef.current='geral';setView('geral');setDirty(false);dirtyRef.current=false;
      }
      setSourceNumber(null);setTeams(null);setCopied(false);
      setFeedback(`Pelada ${number} excluída.`);
    }catch(e){showMessage((e as Error).message);}
    finally{savingRef.current=false;setSaving(false);await refresh();}
  };
  const activePelada:Pelada|undefined=state?.peladas.find(p=>p.number===(sourceNumber??state.peladas[0]?.number))||state?.peladas[0];
  const selectPelada=(value:number)=>{setSourceNumber(value);setTeams(null);setCopied(false);};
  const drawTeams=async()=>{
    if(!activePelada||savingRef.current)return;
    savingRef.current=true;setSaving(true);setFeedback('');
    try{
      const published=await getPelada(activePelada.number);
      if(published.matches.length)throw new Error('Os times não podem mudar porque já existem partidas registradas.');
      if(published.teams.length&&!await confirm('Sortear novamente e substituir os times publicados desta pelada?'))return;
      const result=sortTeams(activePelada.players,perTeam,drawMode);
      await changePelada(activePelada.number,{action:'publishTeams',teams:result.map(t=>t.map(p=>p.id)),etag:published.etag});
      setTeams(result);setCopied(false);setFeedback('Times sorteados e salvos na página pública. Você já pode copiar o link!');
    }catch(e){showMessage((e as Error).message);}
    finally{savingRef.current=false;setSaving(false);await refresh();}
  };
  const copyTeams=async()=>{
    if(!teams||!activePelada)return;
    try{await navigator.clipboard.writeText(messageForTeams(teams,activePelada.number));setCopied(true);setTimeout(()=>setCopied(false),2200);}
    catch{showMessage('Não foi possível copiar automaticamente. Selecione o texto na caixa abaixo.');}
  };
  const countNext=state?.nextPeladaNumber??((state?.peladas.reduce((m,p)=>Math.max(m,p.number),0)||0)+1);
  const rankRows=ordered(draft).filter(p=>normalize(p.name).includes(normalize(search)));
  const rankAvg=draft.length?draft.reduce((s,p)=>s+p.stars,0)/draft.length:0;
  const unknownCount=preview.filter(p=>p.unmatched).length;

  return <div className="app">
    {confirmation}
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-icon">⚽</div>
          <div><h1>PELA<span>DAMAS</span></h1><p>SEUS TIMES. SUA PELADA.</p></div>
        </div>
        <div className={'connection '+(online?'connected':'disconnected')} title={lastSync?`Atualizado às ${lastSync.toLocaleTimeString('pt-BR')}`:''}>
          {online?<Cloud size={15}/>:<CloudOff size={15}/>} <span>{online?'Sincronizado':'Sem conexão'}</span>
        </div>
      </div>
      <div className="header-decoration" aria-hidden="true" />
    </header>
    <main className="main">
      <div className="topline"><button className="refresh" onClick={async()=>{if(dirty&&!await confirm('Sair sem salvar as alterações?'))return;void onLogout().catch(e=>showMessage(e.message));}}>Sair</button><span><span className="online-indicator"/> Administração</span><button className="refresh" onClick={()=>void refresh()} title="Atualizar dados"><RefreshCw size={15}/> Atualizar</button></div>

      <nav className="tabs" aria-label="Áreas do Peladamas">
        <button type="button" onClick={()=>{setTab('ranking');setFeedback('');}} className={'tab '+(tab==='ranking'?'selected':'')}><Trophy size={18}/> Ranking geral</button>
        <button type="button" onClick={()=>{setTab('sorteio');setFeedback('');}} className={'tab '+(tab==='sorteio'?'selected':'')}><Shuffle size={18}/> Sortear times</button>
      </nav>

      {!!state?.pendingDeletions?.length&&<div className="panel"><h3>Arquivos com exclusão pendente</h3><p>Estas peladas já estão desativadas. Conclua a remoção dos arquivos antigos.</p>{state.pendingDeletions.map(number=><button key={number} className="button danger" disabled={saving} onClick={()=>void deletePelada(number)}>Concluir exclusão da Pelada {number}</button>)}</div>}
      {loading?<div className="loading-screen"><LoaderCircle size={30} className="spinner"/><p>Carregando rankings...</p></div>:
      !state?<div className="panel"><Empty icon={<CloudOff size={28}/>} heading="Não foi possível acessar os dados" detail="Confira se a API está funcionando e se o armazenamento foi configurado."/><button className="button primary full" onClick={()=>void refresh(true)}>Tentar novamente</button>{feedback&&<p className="error-text">{feedback}</p>}</div>:
      tab==='ranking'?<>
        <div className="section-top"><div><span className="eyebrow">CADASTRO DE JOGADORES</span><h3>Ranking de estrelas</h3></div><span className="label-tag"><History size={13}/> Histórico</span></div>
        <div className="panel selector-card"><label htmlFor="rankingSelector" className="form-label">Visualizar ranking</label>
          <div className="select-wrap"><select id="rankingSelector" className="main-select" value={view} onChange={e=>setRankingView(e.target.value)}>
            <option value="geral">⭐ Geral — ranking principal</option>
            {state.peladas.map((p,i)=><option key={p.number} value={String(p.number)}>{i===0?'⚽ Última pelada':i===1?'⚽ Penúltima pelada':'⚽ Pelada'} — Pelada {p.number}</option>)}
          </select><ChevronDown size={17}/></div>
          <div className="hint"><Info size={15}/>{view==='geral'?'Notas principais. Peladas novas começam com este ranking.':'Histórico independente: mudar estas estrelas não altera o ranking geral.'}</div>
          {view!=='geral'&&<button className="button danger" disabled={saving} onClick={()=>void deletePelada(Number(view))}><Trash2 size={16}/> Excluir Pelada {view}</button>}
        </div>
        {view!=='geral'&&<PeladaLinks key={view} number={Number(view)} version={state.peladas.find(p=>p.number===Number(view))?.etag}/>}
        <div className="stat-grid">
          <div className="stat"><div className="stat-icon"><Users size={18}/></div><div className="stat-number">{draft.length}</div><div className="stat-label">Jogadores</div></div>
          <div className="stat"><div className="stat-icon"><Sparkles size={18}/></div><div className="stat-number">{formatStars(rankAvg)}</div><div className="stat-label">Média de estrelas</div></div>
          <div className="stat"><div className="stat-icon"><FileSpreadsheet size={18}/></div><div className="stat-number">{view==='geral'?'GERAL':`#${view}`}</div><div className="stat-label">Arquivo CSV</div></div>
        </div>
        <div className="panel rank-panel">
          <div className="panel-heading"><div><h3>{view==='geral'?'Todos os craques':`Jogadores da Pelada ${view}`}</h3><p>Edite as estrelas de 0,5 em 0,5.</p></div>
            <button className="icon-button" title="Baixar o CSV" aria-label="Baixar CSV" onClick={()=>{
              const p=view==='geral'?rankingToCsv(draft):peladaToCsv({players:draft,createdAt:state.peladas.find(p=>String(p.number)===view)?.createdAt||''});
              exportCSV(view==='geral'?'ranking_geral.csv':`pelada_${view}.csv`,p);
            }}><ArrowDownToLine size={19}/></button></div>
          <div className="search-wrap"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar jogador..." aria-label="Buscar jogador" /></div>
          <div className="table-header"><span>#</span><span>JOGADOR</span><span>ESTRELAS</span><span></span></div>
          <div className="ranking-rows">
            {rankRows.length===0?<Empty icon={<Search size={26}/>} heading="Nenhum jogador" detail="Experimente outro nome de busca."/>:rankRows.map(p=>
              <div className="ranking-row" key={p.id}>
                <span className="rank-position">{ordered(draft).findIndex(x=>x.id===p.id)+1}</span>
                <div className="player-info">
                  {view==='geral'?<input className="inline-name" value={p.name} onChange={e=>modifyPlayer(p.id,{name:e.target.value})} aria-label={`Nome de ${p.name}`}/>:<strong>{p.name}</strong>}
                  {view==='geral'?<input className="alias" value={p.aliases} placeholder="Apelidos (separar por |)" onChange={e=>modifyPlayer(p.id,{aliases:e.target.value})} aria-label={`Apelidos de ${p.name}`}/>:<span className="alias-static">Pelada {view}</span>}
                </div>
                <StarsSelect value={p.stars} ariaLabel={`Estrelas de ${p.name}`} onChange={s=>modifyPlayer(p.id,{stars:s})}/>
                <button className="delete-button" onClick={()=>deletePlayer(p.id)} aria-label={`Excluir ${p.name}`} title="Excluir deste ranking"><Trash2 size={17}/></button>
              </div>)}
          </div>
          {view==='geral'&&<div className="add-area">{showAdd?<form onSubmit={e=>{e.preventDefault();addPlayer();}} className="add-form">
            <div className="add-fields"><input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nome do jogador" maxLength={55} required/><StarsSelect value={newStars} onChange={setNewStars}/></div>
            <input value={newAliases} onChange={e=>setNewAliases(e.target.value)} placeholder="Apelidos separados por | (opcional)" maxLength={180}/>
            <div className="button-row"><button className="button subtle" type="button" onClick={()=>setShowAdd(false)}>Cancelar</button><button className="button primary" type="submit"><Plus size={16}/> Adicionar</button></div>
          </form>:<button className="add-button" onClick={()=>setShowAdd(true)}><Plus size={17}/> Adicionar jogador</button>}</div>}
          <div className="save-area"><button className="button subtle" disabled={!dirty||saving} onClick={discard}><RotateCcw size={16}/> Descartar</button><button className="button primary" disabled={!dirty||saving} onClick={()=>void saveRanking()}>{saving?<LoaderCircle className="spinner" size={17}/>:<Check size={17}/>} Salvar alterações</button></div>
          <p className={'save-note '+(dirty?'attention':'')}>{dirty?'● Alterações ainda não salvas.':<><CheckCircle2 size={14}/> As alterações salvas aparecem em todos os celulares.</>}</p>
          {feedback&&<div className={'feedback '+(/erro|inválid|não |mudou|recarregue|repetid/i.test(feedback)?'error':'success')}>{feedback}</div>}
        </div>
      </>:<>
        <div className="section-top"><div><span className="eyebrow">ORGANIZAÇÃO DA PELADA</span><h3>{mode==='criar'?'Criar nova pelada':'Sorteio inteligente'}</h3></div><span className="label-tag"><Shuffle size={13}/> Equilibrado</span></div>
        <div className="mode-buttons"><button className={mode==='sortear'?'active':''} onClick={()=>{setMode('sortear');setFeedback('');}}><Shuffle size={17}/> Sortear pelada</button><button className={mode==='criar'?'active':''} onClick={()=>{setMode('criar');setFeedback('');}}><FilePlus2 size={17}/> Criar pelada</button></div>
        {mode==='criar'?<>
          <div className="panel creation-intro"><div className="step-number">01</div><div><span className="eyebrow">PRIMEIRO PASSO</span><h3>Cole a lista do WhatsApp</h3><p>Reconhecemos os nomes automaticamente pelo ranking e apelidos.</p></div></div>
          <div className="panel"><label className="form-label" htmlFor="whatslist">Jogadores convocados</label>
            <textarea id="whatslist" className="whatsapp-textarea" value={listText} onChange={e=>{setListText(e.target.value);setPreview([]);}} placeholder={'Peladamas quarta 21h:\n\n01. Jogador Á ✅\n02. Jogador 02 ✅\n03. Jogador 03 ✅\n04. Jogador 04 ✅\n05. Jogador 08 ✅'} rows={9}/>
            <div className="hint"><Info size={15}/> Aceita mensagens numeradas, emojis e marcações de presença. Para na “Lista de espera”.</div>
            <button className="button primary full" onClick={analyze}><Search size={17}/> Reconhecer jogadores <ArrowRight size={16}/></button>
          </div>
          {preview.length>0&&<div className="panel preview-panel">
            <div className="panel-heading"><div><span className="eyebrow">PASSO 02</span><h3>Revisar Pelada {countNext}</h3><p>{preview.length} jogadores encontrados · ajuste antes de criar.</p></div><span className="label-tag">{preview.length} <Users size={13}/></span></div>
            {unknownCount>0&&<div className="notice"><ShieldAlert size={18}/><span><strong>{unknownCount} nome(s) não encontrado(s) no ranking.</strong> Amarelo: nota provisória. Verde: nota ajustada. Ao criar a pelada, uma única pergunta permite adicionar todos os novos nomes ao Geral.</span></div>}
            <div className="preview-players">{preview.map(p=><div key={p.id} className={'preview-row'+(p.unmatched?(p.reviewed?' newcomer-reviewed':' newcomer-pending'):'')}><div className="preview-name"><input value={p.name} aria-label="Nome do convocado" onChange={e=>setPreview(old=>old.map(x=>x.id===p.id?{...x,name:e.target.value}:x))}/>{p.unmatched&&<small>{p.reviewed?'Novo · nota ajustada':'Novo · nota provisória'}</small>}</div><StarsSelect value={p.stars} ariaLabel={`Nota de ${p.name}`} onChange={n=>setPreview(old=>old.map(x=>x.id===p.id?{...x,stars:n,reviewed:true}:x))}/><button className="delete-button" title="Remover" onClick={()=>setPreview(old=>old.filter(x=>x.id!==p.id))}><X size={17}/></button></div>)}</div>
            <button className="button primary full" disabled={saving||preview.length<4||preview.some(p=>!p.name.trim())||new Set(preview.map(p=>normalize(p.name))).size!==preview.length} onClick={()=>void createPelada()}>{saving?<LoaderCircle size={17} className="spinner"/>:<CheckCircle2 size={17}/>} Confirmar e criar Pelada {countNext}</button>
            <p className="help-center">Ao confirmar, um arquivo CSV será salvo no armazenamento compartilhado.</p>
          </div>}
        </>:<>
          {!activePelada?<div className="panel"><Empty icon={<FilePlus2 size={28}/>} heading="Ainda não há peladas" detail="Crie a primeira pelada colando a lista do WhatsApp."/><button className="button primary full" onClick={()=>setMode('criar')}><Plus size={17}/> Criar primeira pelada</button></div>:<>
            <PeladaLinks key={activePelada.number} number={activePelada.number} version={activePelada.etag}/>
            <div className="panel selector-card"><label className="form-label" htmlFor="sourceSelect">Escolha a pelada</label><div className="select-wrap"><select id="sourceSelect" className="main-select" value={activePelada.number} onChange={e=>selectPelada(Number(e.target.value))}>{state.peladas.map((p,i)=><option key={p.number} value={p.number}>{i===0?'Última — ':''}Pelada {p.number} · {p.players.length} jogadores</option>)}</select><ChevronDown size={17}/></div>
            <div className="hint"><History size={15}/> As estrelas usadas serão as salvas no histórico desta pelada.</div><button className="button danger" disabled={saving} onClick={()=>void deletePelada(activePelada.number)}><Trash2 size={16}/> Excluir Pelada {activePelada.number}</button></div>
            <div className="stat-grid"><div className="stat"><div className="stat-icon"><Users size={18}/></div><div className="stat-number">{activePelada.players.length}</div><div className="stat-label">Convocados</div></div><div className="stat"><div className="stat-icon"><Trophy size={18}/></div><div className="stat-number">{Math.max(2,Math.ceil(activePelada.players.length/perTeam))}</div><div className="stat-label">Times</div></div><div className="stat"><div className="stat-icon"><Sparkles size={18}/></div><div className="stat-number">{formatStars(activePelada.players.reduce((s,p)=>s+p.stars,0))}</div><div className="stat-label">Total de estrelas</div></div></div>
            <div className="panel"><div className="panel-heading"><div><h3>Jogadores da Pelada {activePelada.number}</h3><p>Notas deste histórico.</p></div><button className="icon-button" title="Baixar CSV" onClick={()=>exportCSV(`pelada_${activePelada.number}.csv`,peladaToCsv(activePelada))}><ArrowDownToLine size={19}/></button></div>
              <div className="roster-grid">{ordered(activePelada.players).map(p=><div className="roster-player" key={p.id}><span className="roster-dot"/><span>{p.name}</span><strong>{formatStars(p.stars)} ★</strong></div>)}</div>
              <div className="hint" style={{marginTop:14}}><PencilLine size={15}/> Para corrigir as estrelas, selecione esta pelada na aba Ranking.</div>
            </div>
            <div className="panel"><h3 className="settings-title"><Settings2 size={19}/> Configurações do sorteio</h3>
              <div className="setting-row"><label htmlFor="sizeInput">Jogadores por time</label><div className="select-wrap small"><select id="sizeInput" value={perTeam} onChange={e=>{setPerTeam(Number(e.target.value));setTeams(null);}}>{[4,5,6,7,8,9,10,11].map(n=><option key={n} value={n}>{n}</option>)}</select><ChevronDown size={15}/></div></div>
              <div className="draw-mode"><label className="form-label" htmlFor="drawMode">Como equilibrar os times</label><select id="drawMode" className="main-select" value={drawMode} onChange={e=>{setDrawMode(e.target.value as DrawMode);setTeams(null);}}><option value="balanced">Equilíbrio geral (recomendado)</option><option value="tiers">Por faixas de habilidade</option></select><p className="hint">{drawMode==='balanced'?'Busca médias próximas e distribui os jogadores mais fortes entre os times.':'Dá mais peso à distribuição das faixas: até 2, de 2,5 a 3,5 e de 4 a 5 estrelas, mantendo as médias próximas.'}</p></div>
              <div className="hint"><Info size={15}/> Considera apenas os convocados, sem regras fixas por nome. Todos participam; se sobrarem jogadores, os times terão tamanhos diferentes e o equilíbrio será calculado pela média.</div>
              <button className="button primary full big-sort" disabled={saving} onClick={()=>void drawTeams()}><Shuffle size={19}/> {saving?'Salvando sorteio…':teams?'Sortear novamente':'Sortear times'}</button><p className="hint">Ao sortear, os times são salvos automaticamente na página pública.</p>
            </div>
            {teams&&<div className="results"><div className="results-heading"><div><span className="eyebrow">RESULTADO DO SORTEIO</span><h3>Times da Pelada {activePelada.number}</h3></div><span className="result-tag"><CheckCircle2 size={14}/> {drawMode==='balanced'?'Equilíbrio geral':'Por faixas'}</span></div>
              <p className="hint">Diferença entre médias: {formatStars(Math.max(...teams.map(t=>teamTotal(t)/t.length))-Math.min(...teams.map(t=>teamTotal(t)/t.length)))} ★ · O resultado depende das notas informadas.</p><div className="teams-grid">{teams.map((team,i)=><div className="team-card" key={i}><div className="team-head"><strong><span>{teamEmojis[i%teamEmojis.length]}</span> TIME {i+1}</strong><span>{formatStars(teamTotal(team))} ⭐</span></div><div className="team-body">{team.map((p,j)=><div className="team-member" key={p.id}><span><small>{String(j+1).padStart(2,'0')}</small>{p.name}</span><em>{formatStars(p.stars)}</em></div>)}</div><div className="team-footer">Média: <strong>{formatStars(teamTotal(team)/team.length)} ⭐</strong></div></div>)}</div>
              <div className="panel copy-panel"><h3><Clipboard size={18}/> Pronto para o WhatsApp</h3><textarea readOnly value={messageForTeams(teams,activePelada.number)} aria-label="Texto dos times" rows={Math.min(27,teams.flat().length+teams.length*3+3)}/>
              <button className="button primary full" onClick={()=>void copyTeams()}>{copied?<Check size={18}/>:<Copy size={18}/>} {copied?'Copiado!':'Copiar os times'}</button></div>
            </div>}
          </>}
        </>}
        {feedback&&<div className={'feedback bottom-feedback '+(/erro|inválid|não |mudou|recarregue|repetid/i.test(feedback)?'error':'success')}>{feedback}</div>}
      </>}
      <footer><div className="footer-mark">⚽ <strong>PELA<span>DAMAS</span></strong></div><p>Feito pra pelada ser justa. Salvo na nuvem, para todo mundo.</p></footer>
    </main>
  </div>;
}
