import ScreenHeader from './components/ScreenHeader';
import JourneyNav from './components/JourneyNav';
import './components/transitions.css';
import {formatPeladaDate} from '../lib/pelada-date';
import {useCallback,useEffect,useRef,useState} from 'react';
import {CircleDot,RefreshCw,Plus,Pencil,ChevronDown,Users,Trophy,Target,Handshake,Check,Clock3,Info,Trash2} from 'lucide-react';
import {summarize,type PublicPelada,type Match,type Goal} from '../lib/matches';
import {getPelada,changePelada,PeladaError} from './pelada-api';
import {useConfirmation} from './useConfirmation';

// randomUUID requires HTTPS; getRandomValues also works on a local HTTP network.
function newMatchId(){
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export default function PublicPeladaPage({number}:{number:number}){
  const [data,setData]=useState<PublicPelada|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [tab,setTab]=useState<'update'|'summary'|'teams'>('update'),[ranking,setRanking]=useState<'goals'|'assists'>('goals');
  const [draft,setDraft]=useState<Match|null>(null),[version,setVersion]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [noticeError,setNoticeError]=useState(false);
  const [deleting,setDeleting]=useState(false),[deletePassword,setDeletePassword]=useState(''),[deleteError,setDeleteError]=useState('');
  const [showAllRanking,setShowAllRanking]=useState(false);
  const [goalPage,setGoalPage]=useState(0);
  const [lastSync,setLastSync]=useState<Date|null>(null);
  const [quickGoal,setQuickGoal]=useState<{match:Match;teamId:string;etag:string;scorer:string;assist:string;error:string}|null>(null);
  const {confirm,confirmation}=useConfirmation();
  const editorRef=useRef<HTMLElement>(null);
  useEffect(()=>{if(draft){editorRef.current?.closest('main')?.scrollIntoView?.({block:'start'});editorRef.current?.closest('main')?.querySelector<HTMLElement>('h2')?.focus({preventScroll:true});}},[draft?.id]);
  const refresh=useCallback(async()=>{try{setData(await getPelada(number));setLastSync(new Date());setError('');}catch(e){if(e instanceof PeladaError&&e.status===404)setData(null);setError((e as Error).message);}finally{setLoading(false);}},[number]);
  useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},12000);const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[refresh]);
  const summary=data?summarize(data,data.players):null;
  const teamName=(id:string)=>data?.teams.find(t=>t.id===id)?.name||id;
  async function edit(match?:Match){
    if(!data)return;
    if(data.teams.length<2){setNoticeError(true);setNotice('É preciso publicar pelo menos dois times para criar uma partida.');return;}
    if(draft&&!await confirm('Descartar a edição atual para abrir outra partida?'))return;
    const next:Match=match?{...structuredClone(match),status:'finished'}:{id:newMatchId(),homeId:data.teams[0].id,awayId:data.teams[1].id,status:'finished',homeScore:0,awayScore:0,goals:[]};
    setDeleting(false);setDeletePassword('');setDeleteError('');
    setGoalPage(0);setQuickGoal(null);setDraft(next);
    setVersion(data.etag);setNotice('');setNoticeError(false);setTab('update');
  }
  async function openQuickGoal(match:Match,teamId:string){
    if(!data||busy)return;
    if(draft&&!await confirm('Descartar a edição atual para adicionar este gol?'))return;
    setDraft(null);setNotice('');setNoticeError(false);
    setQuickGoal({match:structuredClone(match),teamId,etag:data.etag,scorer:'',assist:'',error:''});
  }
  async function saveQuickGoal(){
    if(!quickGoal||!quickGoal.scorer||busy)return;
    const q=quickGoal,side=q.teamId===q.match.homeId?'homeScore':'awayScore';
    if(q.match[side]>=30)return;
    const ownGoal=q.scorer==='own';
    const match:Match={...q.match,status:'finished',[side]:q.match[side]+1,goals:[...q.match.goals,{teamId:q.teamId,scorerId:ownGoal?null:q.scorer,assistId:ownGoal?null:q.assist||null,ownGoal}]};
    setBusy(true);
    try{await changePelada(number,{action:'saveMatch',match,etag:q.etag});setQuickGoal(null);setNotice('Gol adicionado. Placar e estatísticas atualizados!');await refresh();}
    catch(e){setQuickGoal(current=>current?{...current,error:(e as Error).message}:null);await refresh();}
    finally{setBusy(false);}
  }
  async function changeTeam(side:'homeId'|'awayId',id:string){
    if(!draft)return;
    if(draft.goals.length&&!await confirm('Trocar o time vai zerar o placar e remover os gols e assistências desta edição. Deseja continuar? Você ainda pode cancelar a edição para recuperar a partida salva.'))return;
    setDraft({...draft,[side]:id,homeScore:0,awayScore:0,goals:[]});
  }
  async function reviewQuickGoal(){
    if(!quickGoal||!data)return;
    const current=data.matches.find(m=>m.id===quickGoal.match.id);
    if(!current||current.homeId!==quickGoal.match.homeId||current.awayId!==quickGoal.match.awayId)return;
    if(!await confirm('Confira se este gol já foi registrado por outra pessoa. Deseja manter autor e assistência escolhidos para revisar e salvar com o placar atualizado?'))return;
    setQuickGoal({...quickGoal,match:structuredClone(current),etag:data.etag,error:''});
  }
  function addGoal(teamId:string){
    if(!draft)return;
    const side=teamId===draft.homeId?'homeScore':'awayScore';
    if(draft[side]>=30)return;
    setGoalPage(Math.floor(draft.goals.length/4));
    setDraft({...draft,[side]:draft[side]+1,goals:[...draft.goals,{teamId,scorerId:null,assistId:null,ownGoal:false}]});
  }
  function removeGoal(index:number){
    if(!draft)return;const goal=draft.goals[index],side=goal.teamId===draft.homeId?'homeScore':'awayScore';
    setDraft({...draft,[side]:draft[side]-1,goals:draft.goals.filter((_,i)=>i!==index)});
  }
  function changeGoal(index:number,change:Partial<Goal>){if(draft)setDraft({...draft,goals:draft.goals.map((g,i)=>i===index?{...g,...change}:g)});}
  async function save(){
    if(!draft||busy)return;
    setBusy(true);setNotice('');setNoticeError(false);
    try{await changePelada(number,{action:'saveMatch',match:draft,etag:version});setDraft(null);setNotice(isNewMatch?'Partida criada! Use Adicionar gol para atualizar durante o jogo.':'Partida salva. Estatísticas atualizadas!');await refresh();}
    catch(e){setNoticeError(true);setNotice((e as Error).message);await refresh();}
    finally{setBusy(false);}
  }
  async function deleteMatch(){
    if(!draft||busy||!deletePassword.trim())return;
    if(!await confirm('Excluir esta partida? O resultado, os gols e as assistências dela serão removidos das estatísticas. Esta ação não pode ser desfeita.'))return;
    setBusy(true);setDeleteError('');
    try{
      await changePelada(number,{action:'deleteMatch',matchId:draft.id,password:deletePassword,etag:version});
      setDraft(null);setDeleting(false);setDeletePassword('');setNoticeError(false);setNotice('Partida excluída. Estatísticas atualizadas!');await refresh();
    }catch(e){setDeleteError((e as Error).message);await refresh();}
    finally{setBusy(false);}
  }
  const goalPageCount=Math.max(1,Math.ceil((draft?.goals.length||0)/4));
  const visibleGoalPage=Math.min(goalPage,goalPageCount-1);
  const isNewMatch=!!draft&&!data?.matches.some(m=>m.id===draft.id);
  const hasUnsavedChanges=!!quickGoal?.scorer||!!draft&&JSON.stringify(draft)!==JSON.stringify(data?.matches.find(m=>m.id===draft.id));
  useEffect(()=>{
    if(!hasUnsavedChanges)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[hasUnsavedChanges]);
  const played=summary?.table.some(t=>t.played);
  const first=summary?.table[0];
  const leaders=played?summary!.table.filter(t=>t.points===first!.points&&t.balance===first!.balance&&t.goalsFor===first!.goalsFor).map(t=>t.name).join(' · '):'Aguardando partidas';
  function top(key:'goals'|'assists'){
    const max=Math.max(0,...(summary?.totals.map(p=>p[key])||[]));
    return max?summary!.totals.filter(p=>p[key]===max).map(p=>p.name).join(' · ')+` (${max})`:null;
  }
  const ranked=summary?[...summary.totals].sort((a,b)=>b[ranking]-a[ranking]||a.name.localeCompare(b.name)):[];
  function renderMatch(m:Match,index:number,featured=false){
    if(!data)return null;
    const home=data!.teams.findIndex(t=>t.id===m.homeId),away=data!.teams.findIndex(t=>t.id===m.awayId);
    return <article key={m.id} className={'panel match-card '+(featured?'featured':'')} aria-label={`Partida ${index}`}>
      <div className="match-top"><div className="match-index"><CircleDot size={17} aria-hidden="true"/><span>Partida {index}</span>{featured&&<span className="latest-label">Mais recente</span>}</div><button className="button subtle edit-match" disabled={busy} onClick={()=>void edit(m)}><Pencil size={15} aria-hidden="true"/> Editar</button></div>
      <div className="scoreboard" aria-label={`${teamName(m.homeId)} ${m.homeScore} a ${m.awayScore} ${teamName(m.awayId)}`}>
        <div className="score-side"><span className="team-marker" data-team={home%4}><Users size={18} aria-hidden="true"/></span><h3>{teamName(m.homeId)}</h3><strong className="score-number">{m.homeScore}</strong></div>
        <span className="score-divider" aria-hidden="true">×</span>
        <div className="score-side"><span className="team-marker" data-team={away%4}><Users size={18} aria-hidden="true"/></span><h3>{teamName(m.awayId)}</h3><strong className="score-number">{m.awayScore}</strong></div>
      </div>
      <span className="sr-only">{m.homeScore} × {m.awayScore}</span>
      <div className="match-grid goal-actions">{[m.homeId,m.awayId].map(id=><button className="button primary" key={id} disabled={busy||(id===m.homeId?m.homeScore:m.awayScore)>=30} onClick={()=>void openQuickGoal(m,id)}>+ Gol · {teamName(id)}</button>)}</div>
      {quickGoal?.match.id===m.id&&<form className="quick-goal" aria-label="Adicionar gol" onSubmit={e=>{e.preventDefault();void saveQuickGoal();}}>
            <h4>Gol do {teamName(quickGoal.teamId)}</h4>
            <fieldset disabled={busy}><div className="match-grid">
              <label>De quem foi o gol?<select aria-label="De quem foi o gol?" required value={quickGoal.scorer} onChange={e=>setQuickGoal({...quickGoal,scorer:e.target.value,assist:''})}><option value="">Selecione o jogador</option>{data.players.filter(p=>data.teams.find(t=>t.id===quickGoal.teamId)?.playerIds.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}<option value="own">Gol contra do adversário</option></select></label>
              <label>De quem foi a assistência?<select aria-label="De quem foi a assistência?" disabled={!quickGoal.scorer||quickGoal.scorer==='own'} value={quickGoal.assist} onChange={e=>setQuickGoal({...quickGoal,assist:e.target.value})}><option value="">Sem assistência</option>{data.players.filter(p=>p.id!==quickGoal.scorer&&data.teams.find(t=>t.id===quickGoal.teamId)?.playerIds.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            </div>
            {quickGoal.error&&<p role="alert" className="error-text">{quickGoal.error}</p>}
            {quickGoal.etag!==data.etag&&<p role="alert" className="error-text">O placar foi atualizado por outra pessoa. Suas escolhas foram mantidas. Confira o gol antes de continuar.</p>}
            {quickGoal.etag!==data.etag&&<button type="button" className="button subtle full" onClick={()=>void reviewQuickGoal()}>Revisar com placar atualizado</button>}
            <div className="button-row"><button type="button" className="button subtle" onClick={()=>setQuickGoal(null)}>Cancelar</button><button type="submit" className="button primary" disabled={!quickGoal.scorer||quickGoal.etag!==data.etag}>{busy?'Salvando…':'Salvar gol'}</button></div></fieldset>
          </form>}
      {m.goals.length>0?<details className="match-events"><summary><span><Target size={15} aria-hidden="true"/> {m.goals.length} {m.goals.length===1?'gol registrado':'gols registrados'}</span><ChevronDown size={16} aria-hidden="true"/></summary><div>{m.goals.map((g,j)=><div key={j} className="match-event"><span className="event-icon"><Target size={16} aria-hidden="true"/></span><div><strong>{g.ownGoal?`Gol contra a favor do ${teamName(g.teamId)}`:data!.players.find(p=>p.id===g.scorerId)?.name}</strong><span>{g.assistId?`Assistência de ${data!.players.find(p=>p.id===g.assistId)?.name}`:'Sem assistência'} · {teamName(g.teamId)}</span></div></div>)}</div></details>:<p className="no-goals">O placar está aberto. Adicione o primeiro gol.</p>}
    </article>;
  }
  if(draft&&data)return <div className={'app public-pelada ds-editor-page'+(!isNewMatch?' ds-editor-minimal':'')}>{confirmation}<main className="ds-editor-main"><ScreenHeader title={isNewMatch?'Nova partida':'Editar partida'} context={data.date?`Pelada · ${formatPeladaDate(data.date)}`:`Pelada ${number}`} disabled={busy} onBack={()=>{void confirm('Descartar esta edição?').then(ok=>{if(ok)setDraft(null);});}}/>
{<section className={'panel match-editor'+(!isNewMatch?' edit-existing':'')} ref={editorRef} aria-labelledby="match-editor-title"><div className="edit-heading">{!isNewMatch&&<span className="edit-heading-icon" aria-hidden="true"><Pencil size={19}/></span>}<div><h3 id="match-editor-title">{isNewMatch?'Nova partida':'Editar partida'}</h3>{!isNewMatch&&<p>Confira os times e ajuste os gols abaixo.</p>}</div></div>
            {version!==data.etag&&<p role="alert" className="error-text">A pelada mudou em outro dispositivo. Sua edição foi mantida. Cancele e reabra a partida antes de salvar.</p>}
            <fieldset disabled={busy}><legend className="sr-only">{isNewMatch?'Times da partida':'Times e resultado'}</legend><details className="ds-team-disclosure" open={isNewMatch}><summary>{isNewMatch?'Times da partida':'Alterar times'} <ChevronDown size={16}/></summary><div className="match-grid">
              <label>Time A<select value={draft.homeId} onChange={e=>void changeTeam('homeId',e.target.value)}>{data.teams.map(t=><option key={t.id} value={t.id} disabled={t.id===draft.awayId}>{t.name}</option>)}</select></label>
              <label>Time B<select value={draft.awayId} onChange={e=>void changeTeam('awayId',e.target.value)}>{data.teams.map(t=><option key={t.id} value={t.id} disabled={t.id===draft.homeId}>{t.name}</option>)}</select></label>
            </div></details>
            {!isNewMatch&&<><div className="live-score edit-score" aria-label="Placar atual"><span className="edit-score-team">{teamName(draft.homeId)}</span><strong>{draft.homeScore} <span className="edit-score-divider">×</span> {draft.awayScore}</strong><span className="edit-score-team">{teamName(draft.awayId)}</span><span className="edit-score-caption">Placar desta edição</span></div><div className="edit-goals-heading"><h4>Gols e assistências</h4><span>{draft.goals.length} {draft.goals.length===1?'gol':'gols'}</span></div><div className="match-grid edit-add-goals">{[draft.homeId,draft.awayId].map(id=><button type="button" className="button primary" key={id} disabled={(id===draft.homeId?draft.homeScore:draft.awayScore)>=30} onClick={()=>addGoal(id)}>+ Gol · {teamName(id)}</button>)}</div>
              {draft.goals.map((g,i)=>{if(Math.floor(i/4)!==visibleGoalPage)return null;const members=data.players.filter(p=>data.teams.find(t=>t.id===g.teamId)?.playerIds.includes(p.id));return <div className="goal-entry" key={i}><div className="edit-goal-heading"><strong>{teamName(g.teamId)} · Gol {draft.goals.slice(0,i+1).filter(x=>x.teamId===g.teamId).length}</strong><button type="button" className="button subtle" aria-label={`Remover gol ${i+1}`} title="Remover gol" onClick={()=>removeGoal(i)}><Trash2 size={17} aria-hidden="true"/></button></div><div className="match-grid">
                <label>Autor<select aria-label={`Quem fez o gol ${i+1}`} value={g.ownGoal?'own':g.scorerId||''} onChange={e=>changeGoal(i,{scorerId:e.target.value==='own'?null:e.target.value||null,ownGoal:e.target.value==='own',assistId:null})}><option value="">Selecione o jogador</option>{members.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}<option value="own">Gol contra do adversário</option></select></label>
                <label>Assistência<select aria-label={`Assistência do gol ${i+1}`} disabled={g.ownGoal||!g.scorerId} value={g.assistId||''} onChange={e=>changeGoal(i,{assistId:e.target.value||null})}><option value="">Sem assistência</option>{members.filter(p=>p.id!==g.scorerId).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
              </div></div>;})}
              {draft.goals.length>4&&<div className="review-pagination"><button type="button" className="button subtle" disabled={visibleGoalPage===0} onClick={()=>setGoalPage(Math.max(0,visibleGoalPage-1))}>Gols anteriores</button><span>{visibleGoalPage+1} / {goalPageCount}</span><button type="button" className="button subtle" disabled={visibleGoalPage+1>=goalPageCount} onClick={()=>setGoalPage(visibleGoalPage+1)}>Próximos gols</button></div>}<p className="hint edit-goals-hint">{draft.goals.length?'Selecione o autor de cada gol. A assistência é opcional.':'Nenhum gol nesta partida. Use os botões acima para adicionar.'}</p>
            </>}
            <div className={'button-row'+(!isNewMatch?' edit-save-actions':'')}><button className="button subtle" onClick={()=>void confirm('Descartar esta edição?').then(ok=>{if(ok)setDraft(null);})}>{isNewMatch?'Cancelar':'Cancelar edição'}</button><button className="button primary" disabled={version!==data.etag||draft.goals.some(g=>!g.ownGoal&&!g.scorerId)} onClick={()=>void save()}>{busy?'Salvando…':isNewMatch?'Criar partida':'Salvar partida'}</button></div></fieldset>
            {!isNewMatch&&<div className="match-delete-area">{!deleting?<button type="button" className="button danger" disabled={busy} onClick={()=>{setDeleting(true);setDeletePassword('');setDeleteError('');}}>Excluir partida</button>:<form onSubmit={e=>{e.preventDefault();void deleteMatch();}}><h4>Excluir esta partida</h4><p className="hint">O resultado, os gols e as assistências serão removidos.</p><label htmlFor="delete-match-password">Senha da pelada</label><input id="delete-match-password" type="password" autoComplete="off" maxLength={100} required value={deletePassword} disabled={busy} onChange={e=>setDeletePassword(e.target.value)}/><p className="hint">Peça a senha ao organizador para excluir esta partida.</p>{deleteError&&<p role="alert" className="error-text">{deleteError}</p>}<div className="button-row"><button type="button" className="button subtle" disabled={busy} onClick={()=>{setDeleting(false);setDeletePassword('');setDeleteError('');}}>Cancelar exclusão</button><button type="submit" className="button danger" disabled={busy||!deletePassword.trim()||version!==data.etag}>{busy?'Excluindo…':'Excluir partida'}</button></div></form>}</div>}
          </section>}
    {notice&&<p role={noticeError?'alert':'status'} className={noticeError?'error-text':'hint'}>{notice}</p>}
    {error&&<p role="alert" className="error-text">{error}</p>}
  </main></div>;
  return <div className="app public-pelada">{confirmation}
    <header className="header"><div className="header-inner"><div className="brand"><div className="brand-icon" aria-hidden="true">⚽</div><div><h1>PELA<span>DAMAS</span></h1><p>Página da pelada</p></div></div><button className="connection" onClick={()=>void refresh()}><RefreshCw size={16} aria-hidden="true"/> Atualizar</button></div></header>
    <main className="main"><div className="public-heading"><div><h2>{data?.date?`Pelada · ${formatPeladaDate(data.date)}`:`Pelada ${number}`}<span className="heading-dot">.</span></h2><p>Partidas, times e estatísticas.</p></div><div className="sync-label" role="status"><span className="sync-dot"/>{lastSync?`Atualizado às ${lastSync.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Conectando…'}</div></div>
      <JourneyNav label="Página da pelada" value={tab} items={[{value:'update',label:'Partidas',icon:<CircleDot size={17} aria-hidden="true"/>},{value:'teams',label:'Times',icon:<Users size={17} aria-hidden="true"/>},{value:'summary',label:'Resumo',icon:<Trophy size={17} aria-hidden="true"/>}]} onChange={value=>setTab(value as typeof tab)}/>
      {error&&<div className="panel error-text" role="alert">{error}<button className="button subtle" onClick={()=>void refresh()}>Tentar novamente</button></div>}
      {loading?<p role="status">Carregando pelada…</p>:data&&<>
        {!data.teams.length?<div className="panel"><h3>Aguardando os times</h3><p>O administrador precisa sortear e salvar os times. Esta página atualiza automaticamente.</p></div>:tab==='update'?<>
          <div className="matches-toolbar"><div><h3>Partidas</h3></div>{!draft&&<button className="button primary" disabled={busy} onClick={()=>void edit()}><Plus size={18} aria-hidden="true"/> Criar partida</button>}</div>
          {notice&&<div className={'match-notice'+(noticeError?' error':'')} role={noticeError?'alert':'status'}>{noticeError?<Info size={18} aria-hidden="true"/>:<Check size={18} aria-hidden="true"/>}{notice}</div>}
          <section aria-label="Partidas desta pelada" className="match-list">
            {!data.matches.length?(!draft&&<div className="empty-match"><h3>Nenhuma partida ainda</h3><p>Crie a partida escolhendo os dois times. Depois, registre os gols conforme o jogo acontece.</p></div>):<>
              {renderMatch(data.matches[data.matches.length-1],data.matches.length,true)}
              {data.matches.length>1&&<details className="match-history">
                <summary><div><h3>Outros jogos desta pelada</h3><p>{data.matches.length-1} {data.matches.length===2?'partida registrada':'partidas registradas'} · consulte ou corrija os resultados</p></div><ChevronDown size={20} aria-hidden="true"/></summary>
                <div className="history-matches">{[...data.matches].slice(0,-1).reverse().map((m,i)=>renderMatch(m,data.matches.length-i-1))}</div>
              </details>}
            </>}
          </section>
        </>:tab==='summary'?<>
          <div className="stat-grid"><div className="stat"><div className="stat-label"><Trophy size={18} aria-hidden="true"/> Time líder</div>{played?<strong className="leader-name">{leaders}</strong>:<span className="summary-empty">Sem partidas</span>}</div><div className="stat"><div className="stat-label"><Target size={18} aria-hidden="true"/> Artilheiro</div>{top('goals')?<strong className="leader-name">{top('goals')}</strong>:<span className="summary-empty">Sem gols</span>}</div><div className="stat"><div className="stat-label"><Handshake size={18} aria-hidden="true"/> Garçom</div>{top('assists')?<strong className="leader-name">{top('assists')}</strong>:<span className="summary-empty">Sem assistências</span>}</div></div>
          <section className="panel"><h3>Classificação dos times</h3><details className="inline-help"><summary>Como funciona a classificação</summary><p className="hint">Vitória: 3 pontos · Empate: 1 ponto. Resultados parciais contam durante o jogo. Desempate: saldo de gols e gols marcados. Empates restantes são compartilhados.</p><p className="hint">J: jogos · V: vitórias · E: empates · D: derrotas · GP: gols pró · GC: gols contra · SG: saldo.</p></details><div className="table-scroll" role="region" aria-label="Classificação dos times" tabIndex={0}><table><caption className="sr-only">Estatísticas dos times</caption><thead><tr>{['Time','PTS','J','V','E','D','GP','GC','SG'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{summary!.table.map(t=><tr key={t.id}><th scope="row">{t.name}</th>{[t.points,t.played,t.wins,t.draws,t.losses,t.goalsFor,t.goalsAgainst,t.balance].map((n,i)=><td key={i}>{n}</td>)}</tr>)}</tbody></table></div></section>
          <section className="panel"><h3>Ranking dos jogadores</h3><div className="mode-buttons" aria-label="Ranking individual"><button aria-pressed={ranking==='goals'} className={ranking==='goals'?'active':''} onClick={()=>setRanking('goals')}>Gols</button><button aria-pressed={ranking==='assists'} className={ranking==='assists'?'active':''} onClick={()=>setRanking('assists')}>Assistências</button></div>{!(showAllRanking?ranked:ranked.filter(p=>p[ranking]>0)).length&&<p className="hint">Ainda não há {ranking==='goals'?'gols':'assistências'} registrados.</p>}{(showAllRanking?ranked:ranked.filter(p=>p[ranking]>0)).map(p=><div className="ranking-result" key={p.id}><span>{p.name}</span><strong>{p[ranking]} {ranking==='goals'?(p[ranking]===1?'gol':'gols'):(p[ranking]===1?'assistência':'assistências')}</strong></div>)}{ranked.some(p=>p[ranking]===0)&&<button className="button subtle full show-ranking" aria-expanded={showAllRanking} onClick={()=>setShowAllRanking(!showAllRanking)}>{showAllRanking?'Mostrar só quem pontuou':`Ver todos os ${ranked.length} jogadores`}</button>}</section>
        </>:<section className="panel" aria-labelledby="public-teams-title"><h3 id="public-teams-title">Times da pelada</h3><div className="public-rosters">{data.teams.map((t,i)=><article className="public-team" data-team={i%4} key={t.id}><h4><span className="team-marker" data-team={i%4}><Users size={18} aria-hidden="true"/></span>{t.name}</h4><p>{t.playerIds.length} jogadores</p><ul>{t.playerIds.map(id=><li key={id}>{data.players.find(p=>p.id===id)?.name||'Jogador indisponível'}</li>)}</ul></article>)}</div></section>}
      </>}
      <footer className="public-footer"><p><Clock3 size={14} aria-hidden="true"/> Atualização automática a cada 12 segundos</p></footer>
    </main>
  </div>;
}
