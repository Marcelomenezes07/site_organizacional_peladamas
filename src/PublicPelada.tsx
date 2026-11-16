import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeftRight,ChevronRight,CircleDot,LoaderCircle,Pencil,Plus,Trash2,TriangleAlert,Trophy,Users} from 'lucide-react';
import {changeClock,summarize,teamLabel,DEFAULT_MATCH_MINUTES,type Goal,type Match,type PublicPelada} from '../lib/matches';
import {formatPeladaDay} from '../lib/pelada-date';
import {getPelada,changePelada,PeladaError} from './pelada-api';
import {useConfirmation} from './useConfirmation';
import {ActionBar,Sheet,TabBar,TeamDot,TopBar,teamIndex,useToast} from './ui';
import MatchClock from './public/MatchClock';
import GoalSheet from './public/GoalSheet';

// randomUUID exige HTTPS; getRandomValues também funciona na rede local por HTTP.
function newMatchId(){
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
const withScore=(m:Match):Match=>({...m,homeScore:m.goals.filter(g=>g.teamId===m.homeId).length,awayScore:m.goals.filter(g=>g.teamId===m.awayId).length});
/** Conteúdo que o placar mostra; o relógio fica de fora porque muda sem mexer nos gols. */
const content=(m?:Match)=>m?JSON.stringify([m.homeId,m.awayId,m.goals]):'';
class GoalsChanged extends Error{constructor(public current:Match){super('O placar mudou.');}}

type Tab='jogo'|'times'|'resumo';
type GoalTarget={teamId:string;matchId?:string;index?:number;seen?:string;key:number};

/** Página aberta pelo link da pelada: placar ao vivo, relógio, times e resumo. Sem login. */
export default function PublicPeladaPage({number}:{number:number}){
  const {confirm,confirmation}=useConfirmation();
  const {toast,show}=useToast();
  const [data,setData]=useState<PublicPelada|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[online,setOnline]=useState(true);
  const [offset,setOffset]=useState(0);
  const [tab,setTab]=useState<Tab>('jogo');
  const [edit,setEdit]=useState<{draft:Match;original:string}|null>(null);
  const [goal,setGoal]=useState<GoalTarget|null>(null),[goalError,setGoalError]=useState('');
  const [sheet,setSheet]=useState<'new'|'teams'|'delete'|null>(null);
  const [pick,setPick]=useState<string[]>([]);
  const [password,setPassword]=useState(''),[deleteError,setDeleteError]=useState('');
  const [busy,setBusy]=useState(false);
  const [ranking,setRanking]=useState<'goals'|'assists'>('goals'),[showAll,setShowAll]=useState(false);
  const dataRef=useRef<PublicPelada|null>(null);
  // Aberta pelo organizador (?org=1): mostra Voltar, porque o app instalado não tem o voltar do navegador.
  const [fromOrganizer]=useState(()=>new URLSearchParams(window.location.search).has('org'));

  const refresh=useCallback(async():Promise<PublicPelada|null>=>{
    try{
      const fresh=await getPelada(number);
      dataRef.current=fresh;setData(fresh);setError('');setOnline(true);
      if(fresh.serverNow)setOffset(fresh.serverNow-Date.now());
      return fresh;
    }catch(e){
      if(e instanceof PeladaError&&e.status===404){dataRef.current=null;setData(null);}else setOnline(false);
      setError((e as Error).message);return null;
    }finally{setLoading(false);}
  },[number]);
  useEffect(()=>{
    void refresh();
    const tick=()=>{if(document.visibilityState==='visible')void refresh();};
    const timer=setInterval(tick,12000);document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
  },[refresh]);

  const unsaved=!!edit&&content(edit.draft)!==edit.original||!!goal?.matchId;
  useEffect(()=>{
    if(!unsaved)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[unsaved]);
  useEffect(()=>{window.scrollTo?.(0,0);document.querySelector<HTMLElement>('.topbar h1')?.focus({preventScroll:true});},[tab,!!edit]);

  /** Grava sobre a versão mais recente. Se outra pessoa salvou antes, relê e tenta uma vez de novo. */
  async function write(build:(fresh:PublicPelada)=>unknown){
    let fresh=dataRef.current;
    for(let attempt=0;attempt<2;attempt++){
      if(!fresh)throw new Error('Sem conexão com a pelada. Tente de novo.');
      const body=build(fresh);
      try{await changePelada(number,body);await refresh();return;}
      catch(e){const latest=await refresh();if(attempt===1||!latest||latest.etag===fresh.etag)throw e;fresh=latest;}
    }
  }

  const teams=data?.teams??[],players=data?.players??[];
  const team=(id:string)=>teams.find(t=>t.id===id);
  const label=(id:string)=>teamLabel(team(id),players);
  const name=(id:string|null)=>players.find(p=>p.id===id)?.name??'Jogador';
  const members=(teamId:string)=>{const t=team(teamId);if(!t)return [];return [...t.playerIds].sort((a,b)=>Number(b===t.leaderId)-Number(a===t.leaderId)).map(id=>({id,name:name(id)}));};
  const goalText=(g:Goal)=>g.ownGoal?`Gol contra · ponto para ${label(g.teamId)}.`:`Gol de ${name(g.scorerId)}${g.assistId?` · assistência de ${name(g.assistId)}`:''}.`;
  const duration=data?.duration??DEFAULT_MATCH_MINUTES;

  const openGoal=(teamId:string,match?:Match,index?:number)=>{setGoalError('');setGoal({teamId,matchId:match?.id,index,seen:match?JSON.stringify(match.goals):undefined,key:Date.now()});};
  const closeGoal=()=>{setGoal(null);setGoalError('');};
  async function pickGoal(g:Goal){
    if(!goal)return;
    if(!goal.matchId){
      setEdit(e=>{if(!e)return e;const goals=[...e.draft.goals];if(goal.index!==undefined)goals[goal.index]=g;else goals.push(g);return {...e,draft:withScore({...e.draft,goals})};});
      closeGoal();return;
    }
    const target=goal;setBusy(true);setGoalError('');
    try{
      await write(fresh=>{
        const current=fresh.matches.find(m=>m.id===target.matchId);
        if(!current)throw new Error('Esta partida foi excluída em outro celular.');
        if(JSON.stringify(current.goals)!==target.seen)throw new GoalsChanged(current);
        const match=withScore({...current,status:'finished',goals:[...current.goals,g]});
        if(match.homeScore>30||match.awayScore>30)throw new Error('Limite de 30 gols por time.');
        const {clock:_clock,...body}=match;
        return {action:'saveMatch',match:body,etag:fresh.etag};
      });
      closeGoal();show(goalText(g));
    }catch(e){
      if(e instanceof GoalsChanged){
        const m=e.current;setGoal({...target,seen:JSON.stringify(m.goals)});
        setGoalError(`O placar mudou em outro celular: ${label(m.homeId)} ${m.homeScore} × ${m.awayScore} ${label(m.awayId)}. Se este gol ainda não foi marcado, salve mesmo assim.`);
      }else setGoalError((e as Error).message);
    }finally{setBusy(false);}
  }
  async function clockChange(match:Match,op:'start'|'pause'|'reset'){
    setData(d=>d&&{...d,matches:d.matches.map(m=>m.id===match.id?{...m,clock:changeClock(m.clock,op,Date.now()+offset)}:m)});
    try{await changePelada(number,{action:'clock',matchId:match.id,op});}catch(e){show((e as Error).message,true);}
    await refresh();
  }
  const togglePick=(id:string)=>setPick(list=>list.includes(id)?list.filter(x=>x!==id):[...list,id].slice(-2));
  async function startMatch(){
    if(pick.length!==2||busy)return;setBusy(true);
    const match:Match={id:newMatchId(),homeId:pick[0],awayId:pick[1],status:'finished',homeScore:0,awayScore:0,goals:[]};
    try{await write(fresh=>({action:'saveMatch',match,etag:fresh.etag}));setSheet(null);setPick([]);show('Partida criada. Inicie o relógio quando a bola rolar.');}
    catch(e){show((e as Error).message,true);}
    finally{setBusy(false);}
  }

  const openEdit=(m:Match)=>{setEdit({draft:structuredClone(m),original:content(m)});};
  const leaveEdit=async()=>{if(edit&&content(edit.draft)!==edit.original&&!await confirm('Descartar as alterações desta partida?'))return;setEdit(null);setSheet(null);};
  const saved=edit?data?.matches.find(m=>m.id===edit.draft.id):undefined;
  const stale=!!edit&&!!data&&content(saved)!==edit.original;
  async function saveEdit(){
    if(!edit||stale||busy)return;setBusy(true);
    try{
      await write(fresh=>{
        if(content(fresh.matches.find(m=>m.id===edit.draft.id))!==edit.original)throw new Error('A partida mudou em outro celular. Volte e abra de novo.');
        const {clock:_clock,...match}=edit.draft;
        return {action:'saveMatch',match:{...match,status:'finished'},etag:fresh.etag};
      });
      setEdit(null);show('Partida salva.');
    }catch(e){show((e as Error).message,true);}
    finally{setBusy(false);}
  }
  async function deleteMatch(){
    if(!edit||!password.trim()||busy)return;setBusy(true);setDeleteError('');
    try{await write(fresh=>({action:'deleteMatch',matchId:edit.draft.id,password,etag:fresh.etag}));setSheet(null);setEdit(null);show('Partida excluída.');}
    catch(e){setDeleteError((e as Error).message);}
    finally{setBusy(false);}
  }
  function applyTeams(){
    if(!edit||pick.length!==2)return;
    setEdit({...edit,draft:{...edit.draft,homeId:pick[0],awayId:pick[1],goals:[],homeScore:0,awayScore:0}});setSheet(null);
  }

  function renderScore(m:Match){
    const side=(id:string,n:number)=>{const t=team(id),text=label(id);
      return <div className="score-side"><span className="score-team"><TeamDot index={teamIndex(teams,id)}/><span>{text}</span></span>{t&&text!==t.name&&<span className="score-ref">{t.name}</span>}<span className="score-n">{n}</span></div>;};
    return <div className="score" role="group" aria-label={`${label(m.homeId)} ${m.homeScore} a ${m.awayScore} ${label(m.awayId)}`}>{side(m.homeId,m.homeScore)}<span className="score-x" aria-hidden="true">×</span>{side(m.awayId,m.awayScore)}</div>;
  }
  const matchNumber=(id:string)=>{const i=data?.matches.findIndex(m=>m.id===id)??-1;return i>=0?i+1:(data?.matches.length??0)+1;};

  const sheets=data&&<>
    {goal&&<GoalSheet key={goal.key} open teamId={goal.teamId} title={`Gol · ${label(goal.teamId)}`} members={members(goal.teamId)} initial={goal.index!==undefined?edit?.draft.goals[goal.index]:undefined}
      busy={busy} error={goalError} onPick={g=>void pickGoal(g)} onClose={closeGoal}/>}
    <Sheet open={sheet==='new'||sheet==='teams'} title={sheet==='teams'?'Trocar times':'Nova partida'} subtitle="Toque nos dois times que vão jogar" onClose={()=>setSheet(null)}>
      <div className="pick">{teams.map((t,i)=><button key={t.id} type="button" className="wide" aria-pressed={pick.includes(t.id)} onClick={()=>togglePick(t.id)}><TeamDot index={i%4}/>{label(t.id)}</button>)}</div>
      {sheet==='new'&&<div className="kv"><div className="kv-text"><strong>Tempo da partida</strong><small>Definido pelo organizador</small></div><strong>{duration} min</strong></div>}
      {sheet==='teams'&&!!edit?.draft.goals.length&&<div className="notice" role="note"><TriangleAlert size={18} aria-hidden="true"/><span>Trocar os times apaga os gols desta edição. Nada é gravado até você salvar a partida.</span></div>}
      <button type="button" className="btn primary block" disabled={pick.length!==2||busy} onClick={()=>sheet==='teams'?applyTeams():void startMatch()}>
        {busy&&<LoaderCircle className="spin" size={18} aria-hidden="true"/>}{sheet==='teams'?'Trocar times':'Começar partida'}</button>
    </Sheet>
    <Sheet open={sheet==='delete'} title={`Excluir a partida ${edit?matchNumber(edit.draft.id):''}?`} subtitle="O placar, os gols e as assistências saem do resumo" onClose={()=>setSheet(null)}>
      <form className="choices" onSubmit={e=>{e.preventDefault();void deleteMatch();}}>
        <div className="field"><label htmlFor="delete-match-password">Senha da pelada</label><input id="delete-match-password" type="password" autoComplete="off" maxLength={100} value={password} onChange={e=>setPassword(e.target.value)}/><small>Peça a senha ao organizador.</small></div>
        {deleteError&&<p className="error-text" role="alert">{deleteError}</p>}
        <button type="submit" className="btn danger block" disabled={busy||!password.trim()}>Excluir partida</button>
        <button type="button" className="btn subtle block" onClick={()=>setSheet(null)}>Cancelar</button>
      </form>
    </Sheet>
  </>;

  if(edit&&data){
    const m=edit.draft;
    return <div className="app">{confirmation}
      <main className="page has-actionbar screen-enter match-editor">
        <TopBar title={`Partida ${matchNumber(m.id)}`} subtitle={`${label(m.homeId)} × ${label(m.awayId)}`} onBack={()=>void leaveEdit()}/>
        {stale&&<div className="notice error" role="alert"><TriangleAlert size={18} aria-hidden="true"/><span>Esta partida mudou em outro celular. Volte e abra de novo para ver a versão atual.</span></div>}
        <section className="card" aria-label="Placar desta edição">{renderScore(m)}
          <div className="pair">{[m.homeId,m.awayId].map(id=><button key={id} type="button" className="btn subtle" aria-label={`Adicionar gol para ${label(id)}`} disabled={(id===m.homeId?m.homeScore:m.awayScore)>=30} onClick={()=>openGoal(id)}><Plus size={18} aria-hidden="true"/> Gol</button>)}</div>
        </section>
        <h2 className="label">Gols da partida</h2>
        {m.goals.length?m.goals.map((g,i)=><div key={i} className="goal-line goal-entry"><TeamDot index={teamIndex(teams,g.teamId)}/>
          <button type="button" className="row-main" aria-label={`Alterar gol ${i+1}`} onClick={()=>openGoal(g.teamId,undefined,i)}><b>{g.ownGoal?'Gol contra':name(g.scorerId)}</b><span>{g.ownGoal?`ponto para ${label(g.teamId)}`:g.assistId?`assistência de ${name(g.assistId)}`:'sem assistência'}</span></button>
          <button type="button" className="icon-btn" aria-label={`Remover gol ${i+1}`} onClick={()=>setEdit({...edit,draft:withScore({...m,goals:m.goals.filter((_,n)=>n!==i)})})}><Trash2 size={18} aria-hidden="true"/></button>
        </div>):<p className="muted">Nenhum gol nesta partida. Use + Gol para adicionar.</p>}
        <div className="list">
          <button type="button" className="row" onClick={()=>{setPick([m.homeId,m.awayId]);setSheet('teams');}}><ArrowLeftRight size={20} aria-hidden="true"/><span className="row-main"><strong>Trocar times</strong></span></button>
          <button type="button" className="row danger" onClick={()=>{setPassword('');setDeleteError('');setSheet('delete');}}><Trash2 size={20} aria-hidden="true"/><span className="row-main"><strong>Excluir partida</strong><small>Pede a senha da pelada</small></span></button>
        </div>
        <ActionBar><button type="button" className="btn primary block" disabled={busy||stale} onClick={()=>void saveEdit()}>{busy&&<LoaderCircle className="spin" size={18} aria-hidden="true"/>} Salvar partida</button></ActionBar>
      </main>
      {sheets}{toast}
    </div>;
  }

  const title=formatPeladaDay(data?.date)||`Pelada ${number}`;
  const status=<span className={'chip '+(online?'live':'offline')}>{online?'ao vivo':'sem conexão'}</span>;
  let body;
  if(loading)body=<div className="loading" role="status"><LoaderCircle className="spin" size={28} aria-hidden="true"/>Carregando pelada…</div>;
  else if(!data)body=<div className="card empty" role="alert"><strong>Pelada não encontrada</strong><p>{error||'Confira o link com o organizador.'}</p><button type="button" className="btn subtle" onClick={()=>void refresh()}>Tentar de novo</button></div>;
  else if(!teams.length)body=<div className="card empty"><Users size={28} aria-hidden="true"/><strong>Aguardando os times</strong><p>O organizador ainda vai sortear os times. Esta página se atualiza sozinha.</p></div>;
  else if(tab==='times')body=teams.map((t,i)=><article key={t.id} className="team-card" aria-labelledby={`team-${t.id}`}>
    <header><h2 id={`team-${t.id}`}><TeamDot index={i%4}/>{label(t.id)}</h2><p>{label(t.id)!==t.name?`${t.name} · `:''}{t.playerIds.length} jogadores</p></header>
    <ol>{members(t.id).map((p,n)=><li key={p.id}><span className="n" aria-hidden="true">{n+1}</span>{p.name}{p.id===t.leaderId&&<span className="chip">Referência</span>}</li>)}</ol></article>);
  else if(tab==='resumo'){
    const summary=summarize(data,players),played=summary.table.some(t=>t.played),first=summary.table[0];
    const leaders=played?summary.table.filter(t=>t.points===first.points&&t.balance===first.balance&&t.goalsFor===first.goalsFor):[];
    const top=(key:'goals'|'assists')=>{const max=Math.max(0,...summary.totals.map(p=>p[key]));return max?{names:summary.totals.filter(p=>p[key]===max).map(p=>p.name).join(' · '),max}:null;};
    const scorer=top('goals'),assist=top('assists');
    const ranked=[...summary.totals].sort((a,b)=>b[ranking]-a[ranking]||a.name.localeCompare(b.name,'pt-BR'));
    const visible=showAll?ranked:ranked.filter(p=>p[ranking]>0);
    body=<>
      <div className="tiles">
        <div className="tile"><small>Líder</small>{leaders.length?<><b className="leader-name">{leaders.map(t=>label(t.id)).join(' · ')}</b><span>{first.points} pontos</span></>:<span className="summary-empty">Sem partidas</span>}</div>
        <div className="tile"><small>Artilheiro</small>{scorer?<><b className="leader-name">{scorer.names}</b><span>{scorer.max} {scorer.max===1?'gol':'gols'}</span></>:<span className="summary-empty">Sem gols</span>}</div>
        <div className="tile"><small>Garçom</small>{assist?<><b className="leader-name">{assist.names}</b><span>{assist.max} assist.</span></>:<span className="summary-empty">Sem assistências</span>}</div>
      </div>
      <section className="card"><h2 className="label">Classificação</h2>
        <table className="table"><caption className="sr-only">Classificação dos times</caption><thead><tr><th scope="col">Time</th><th scope="col"><abbr title="Pontos">P</abbr></th><th scope="col"><abbr title="Jogos">J</abbr></th><th scope="col"><abbr title="Vitórias">V</abbr></th><th scope="col"><abbr title="Saldo de gols">SG</abbr></th></tr></thead>
          <tbody>{summary.table.map(t=><tr key={t.id}><td><span><TeamDot index={teamIndex(teams,t.id)}/>{label(t.id)}</span></td><td><b>{t.points}</b></td><td>{t.played}</td><td>{t.wins}</td><td>{t.balance>0?'+':''}{t.balance}</td></tr>)}</tbody></table>
        <p className="muted small">Vitória vale 3 pontos e empate 1. Desempate por saldo e por gols marcados.</p>
      </section>
      <section className="card"><div className="seg" role="group" aria-label="Ranking individual">
          <button type="button" aria-pressed={ranking==='goals'} onClick={()=>setRanking('goals')}>Gols</button>
          <button type="button" aria-pressed={ranking==='assists'} onClick={()=>setRanking('assists')}>Assistências</button></div>
        <div className="leaders">{visible.length?visible.map(p=><div key={p.id} className="kv ranking-result"><span>{p.name}</span><b>{p[ranking]}</b></div>)
          :<p className="muted">Ainda não há {ranking==='goals'?'gols':'assistências'}.</p>}</div>
        {ranked.some(p=>p[ranking]===0)&&<button type="button" className="btn text" aria-expanded={showAll} onClick={()=>setShowAll(!showAll)}>{showAll?'Mostrar só quem marcou':`Ver todos os ${ranked.length} jogadores`}</button>}
      </section>
    </>;
  }else{
    const current=data.matches[data.matches.length-1],previous=data.matches.slice(0,-1).reverse();
    body=<>
      {current?<section className="card match-card" aria-label={`Partida ${data.matches.length}, agora`}>
        <div className="card-head"><span className="label">Partida {data.matches.length} · agora</span>
          <button type="button" className="btn text small" disabled={busy} onClick={()=>openEdit(current)}><Pencil size={16} aria-hidden="true"/> Editar</button></div>
        <MatchClock clock={current.clock} duration={duration} offset={offset} busy={busy} onChange={op=>void clockChange(current,op)}/>
        {renderScore(current)}
        <div className="pair">{[current.homeId,current.awayId].map(id=><button key={id} type="button" className="btn primary" aria-label={`Gol para ${label(id)}`} disabled={busy||(id===current.homeId?current.homeScore:current.awayScore)>=30} onClick={()=>openGoal(id,current)}><Plus size={18} aria-hidden="true"/> Gol</button>)}</div>
        {current.goals.length>0&&<ul className="events" aria-label="Gols desta partida">{[...current.goals].reverse().map((g,i)=><li key={i}><TeamDot index={teamIndex(teams,g.teamId)}/>{g.ownGoal?'Gol contra':name(g.scorerId)}<span>{g.assistId?`· assist. ${name(g.assistId)}`:''}</span></li>)}</ul>}
      </section>
      :<div className="card empty"><CircleDot size={28} aria-hidden="true"/><strong>Nenhuma partida ainda</strong><p>Escolha os dois times que vão jogar. Depois marque os gols conforme o jogo acontece.</p></div>}
      <button type="button" className={'btn block '+(current?'subtle':'primary')} onClick={()=>{setPick([]);setSheet('new');}}><Plus size={18} aria-hidden="true"/> Nova partida</button>
      {previous.length>0&&<><h2 className="label">Partidas anteriores</h2>
        <div className="list match-history">{previous.map(m=><button key={m.id} type="button" className="row" aria-label={`Editar partida ${matchNumber(m.id)}`} onClick={()=>openEdit(m)}>
          <span className="row-main"><small>Partida {matchNumber(m.id)}</small><span className="match-row-teams">
            <span className="match-row-team"><TeamDot index={teamIndex(teams,m.homeId)}/>{label(m.homeId)}<b>{m.homeScore}</b></span>
            <span className="match-row-team"><TeamDot index={teamIndex(teams,m.awayId)}/>{label(m.awayId)}<b>{m.awayScore}</b></span></span></span>
          <ChevronRight className="chev" size={20} aria-hidden="true"/></button>)}</div></>}
    </>;
  }

  return <div className="app">{confirmation}
    <main key={tab} className="page tab-enter">
      <TopBar brand={!fromOrganizer} title={title} subtitle={data?.date?`Pelada ${number}`:undefined} right={data&&status} onBack={fromOrganizer?()=>window.location.assign(`/adm?pelada=${number}`):undefined}/>
      {error&&data&&<div className="notice error" role="alert"><TriangleAlert size={18} aria-hidden="true"/><span>Sem conexão. Tentando de novo a cada 12 segundos.</span></div>}
      {body}
    </main>
    {data&&teams.length>0&&<TabBar label="Página da pelada" value={tab} onChange={setTab} items={[
      {value:'jogo',label:'Jogo',icon:<CircleDot size={22}/>},
      {value:'times',label:'Times',icon:<Users size={22}/>},
      {value:'resumo',label:'Resumo',icon:<Trophy size={22}/>}
    ]}/>}
    {sheets}{toast}
  </div>;
}
