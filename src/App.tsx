import ScreenHeader from './components/ScreenHeader';
import Stepper,{Step} from './components/Stepper';
import JourneyNav from './components/JourneyNav';
import './components/transitions.css';
import {todayLocal,validPeladaDate,formatPeladaDate} from '../lib/pelada-date';
import {getPelada,changePelada} from './pelada-api';
import PeladaLinks from './PeladaLinks';
import { useConfirmation } from './useConfirmation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowRight, Check, CheckCircle2, ChevronDown, Clipboard,
  Cloud, CloudOff, Copy, FilePlus2, History, Info, LoaderCircle,
  PencilLine, Plus, RefreshCw, RotateCcw, Search, Settings2, ShieldAlert, Shuffle,
  Trash2, Trophy, Users, X, LayoutGrid, List, ChevronLeft, ChevronRight
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
  const [tab,setTab]=useState<Tab>('sorteio');
  const [creationStep,setCreationStep]=useState(1),[previewPage,setPreviewPage]=useState(0);
  const flowRef=useRef<HTMLDivElement>(null);
  const moveToStep=(step:number)=>{setCreationStep(step);flowRef.current?.scrollIntoView?.({block:'start',behavior:'auto'});};
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
  const [rankingLayout,setRankingLayout]=useState<'list'|'grid'>('grid');
  const [rankingPage,setRankingPage]=useState(0);
  const [ratingPlayer,setRatingPlayer]=useState<string|null>(null);
  const [newName,setNewName]=useState('');
  const [newAliases,setNewAliases]=useState('');
  const [newStars,setNewStars]=useState(3);
  const [showAdd,setShowAdd]=useState(false);
  const [editingPlayer,setEditingPlayer]=useState<string|null>(null);
  const [sourceNumber,setSourceNumber]=useState<number|null>(null);
  const [listText,setListText]=useState('');
  const [peladaDate,setPeladaDate]=useState(todayLocal);
  const [preview,setPreview]=useState<PreviewPlayer[]>([]);
  const [perTeam,setPerTeam]=useState(5);
  const [drawMode,setDrawMode]=useState<DrawMode>('balanced');
  const [teams,setTeams]=useState<Team[]|null>(null);
  const [organizerScreen,setOrganizerScreen]=useState<'overview'|'draw'|'share'>('overview');
  const [resultTeam,setResultTeam]=useState(0);
  const [copied,setCopied]=useState(false);
  const [lastSync,setLastSync]=useState<Date|null>(null);
  const savingRef=useRef(false);
  const stateRef=useRef<AppState|null>(null);
  const currentViewRef=useRef('geral');
  const showMessage=(s:string)=>{setFeedback(s);};

  const refreshingRef=useRef(false);
  const failuresRef=useRef(0);
  const retryAtRef=useRef(0);
  // Bumped whenever a save starts: a GET issued before it may carry pre-save data and must not be applied.
  const saveGenerationRef=useRef(0);
  const refreshAgainRef=useRef(false);
  const refresh=useCallback(async(initial=false):Promise<void>=>{
    if(savingRef.current)return;
    if(refreshingRef.current){refreshAgainRef.current=true;return;}
    refreshingRef.current=true;refreshAgainRef.current=false;
    const generation=saveGenerationRef.current;
    try{
      const response=await remote<{state:AppState}>('GET');
      failuresRef.current=0;retryAtRef.current=0;
      if(generation!==saveGenerationRef.current||savingRef.current){refreshAgainRef.current=true;return;}
      const fresh=response.state;
      stateRef.current=fresh;setState(fresh);setOnline(true);setLastSync(new Date());
      if(!dirtyRef.current){setDraft(clonePlayers(currentList(fresh,currentViewRef.current)?.players||fresh.ranking.players));}
      if(initial)setFeedback('');
    }catch(e){retryAtRef.current=Date.now()+Math.min(120000,12000*2**Math.min(++failuresRef.current,4));setOnline(false);if(initial||!stateRef.current)setFeedback((e as Error).message);}
    finally{
      refreshingRef.current=false;if(initial)setLoading(false);
      if(refreshAgainRef.current&&!savingRef.current){refreshAgainRef.current=false;await refresh();}
    }
  },[]);

  useEffect(()=>{void refresh(true);const timer=setInterval(()=>{if(document.visibilityState==='visible'&&Date.now()>=retryAtRef.current)void refresh();},12000);return()=>clearInterval(timer);},[refresh]);
  useEffect(()=>{const cb=()=>{if(document.visibilityState==='visible'&&Date.now()>=retryAtRef.current)void refresh();};document.addEventListener('visibilitychange',cb);return()=>document.removeEventListener('visibilitychange',cb);},[refresh]);
  const mark=(players:Player[])=>{setDraft(players);setDirty(true);dirtyRef.current=true;setFeedback('');};
  const setRankingView=async(next:string)=>{
    if(next===view)return;
    if(dirtyRef.current&&!await confirm('Descartar alterações que ainda não foram salvas?'))return;
    currentViewRef.current=next;setView(next);setEditingPlayer(null);setRankingPage(0);
    setDraft(clonePlayers(state?currentList(state,next)?.players||[]:[]));setDirty(false);dirtyRef.current=false;setSearch('');setShowAdd(false);setFeedback('');
  };
  const modifyPlayer=(id:string,changes:Partial<Player>)=>mark(draft.map(p=>p.id===id?{...p,...changes}:p));
  const addPlayer=()=>{
    const name=newName.trim();if(!name)return;
    if(draft.some(p=>normalize(p.name)===normalize(name))){showMessage('Já existe um jogador com esse nome.');return;}
    mark([...draft,{id:nextId(),name,aliases:newAliases.trim(),stars:newStars}]);
    setSearch('');setRankingPage(Math.floor(draft.length/12));
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
    savingRef.current=true;saveGenerationRef.current++;setSaving(true);setFeedback('');
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
    if(preview.length>=4&&validPeladaDate(peladaDate)){moveToStep(2);return;}
    const entries=parseWhatsAppList(listText);
    if(entries.length===0){showMessage('Cole uma lista com pelo menos quatro nomes.');return;}
    const seen=new Set<string>();
    const result=entries.map(name=>{
      const known=matchPlayer(name,state.ranking.players);
      const item:PreviewPlayer=known?{...known,original:name}:{id:nextId(),name,aliases:'',stars:3,unmatched:true,original:name};
      if(seen.has(item.id))return null;
      seen.add(item.id);return item;
    }).filter((x):x is PreviewPlayer=>x!==null);
    setPreview(result);setPreviewPage(0);setFeedback('');
    if(result.length>=4&&validPeladaDate(peladaDate))moveToStep(2);
    if(result.length<4)showMessage('Adicione pelo menos quatro jogadores antes de criar a pelada.');
  };
  const createPelada=async()=>{
    if(preview.length<4||savingRef.current)return;
    if(!validPeladaDate(peladaDate)){showMessage('Informe uma data válida para a pelada.');return;}
    const newcomers=preview.filter(p=>p.unmatched&&!matchPlayer(p.name,state?.ranking.players||[]));
    const addNewcomers=newcomers.length>0&&await confirm(`Adicionar estes ${newcomers.length} novos jogadores também ao Ranking Geral?\n\n${newcomers.map(p=>`${p.name}: ${formatStars(p.stars)} estrelas${p.reviewed?'':' (nota provisória)'}`).join('\n')}\n\nCancelar cria a pelada sem adicioná-los ao Geral.`);
    savingRef.current=true;saveGenerationRef.current++;setSaving(true);setFeedback('');
    try{
      const p=preview.map(({id,name,aliases,stars})=>({id,name,aliases,stars}));
      const answer=await remote<{ok:boolean;number:number;addedToRanking?:number;warning?:string}>('POST',{action:'createPelada',date:peladaDate,players:p,addToRankingIds:addNewcomers?newcomers.map(p=>p.id):[]});
      setSourceNumber(answer.number);setMode('sortear');setOrganizerScreen('draw');setTeams(null);setPreview([]);setListText('');setCreationStep(1);setPreviewPage(0);
      setFeedback(answer.warning||`Pelada ${answer.number} criada!${answer.addedToRanking?` ${answer.addedToRanking} novo(s) jogador(es) adicionado(s) ao Ranking Geral.`:' Os jogadores estão salvos e compartilhados.'}`);
    }catch(e){showMessage((e as Error).message);}
    finally{savingRef.current=false;setSaving(false);await refresh();}
  };
  const deletePelada=async(number:number)=>{
    const pelada=state?.peladas.find(p=>p.number===number);
    if(savingRef.current){showMessage('Aguarde a operação atual terminar antes de excluir.');return;}
    if(!pelada&&!state?.pendingDeletions?.includes(number)){showMessage('Esta pelada não está mais na lista. Atualize os dados para continuar.');return;}
    if(!await confirm(`Excluir a Pelada ${number}? O histórico desta pelada será removido. O Ranking Geral será mantido. Esta ação não pode ser desfeita.`))return;
    savingRef.current=true;saveGenerationRef.current++;setSaving(true);setFeedback('');
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
  const activePelada:Pelada|undefined=state?.peladas.find(p=>p.number===(sourceNumber??state.peladas[0]?.number));
  const selectPelada=(value:number)=>{setSourceNumber(value);setOrganizerScreen('overview');setTeams(null);setCopied(false);};
  const drawTeams=async()=>{
    if(!activePelada||savingRef.current)return;
    savingRef.current=true;saveGenerationRef.current++;setSaving(true);setFeedback('');
    try{
      const published=await getPelada(activePelada.number);
      if(published.matches.length)throw new Error('Os times não podem mudar porque já existem partidas registradas.');
      if(published.teams.length&&!await confirm('Sortear novamente e substituir os times publicados desta pelada?'))return;
      const result=sortTeams(activePelada.players,perTeam,drawMode);
      await changePelada(activePelada.number,{action:'publishTeams',teams:result.map(t=>t.map(p=>p.id)),etag:published.etag});
      setTeams(result);setResultTeam(0);setOrganizerScreen('share');setCopied(false);setFeedback('Times sorteados e salvos na página pública. Você já pode copiar o link!');
    }catch(e){showMessage((e as Error).message);}
    finally{savingRef.current=false;setSaving(false);await refresh();}
  };
  const copyTeams=async()=>{
    if(!teams||!activePelada)return;
    try{await navigator.clipboard.writeText(messageForTeams(teams,activePelada.number));setCopied(true);setTimeout(()=>setCopied(false),2200);}
    catch{showMessage('Não foi possível copiar automaticamente. Selecione o texto na caixa abaixo.');}
  };
  const savedOrder=new Map(ordered(state?currentList(state,view)?.players||[]:[]).map((p,i)=>[p.id,i]));
  const stableRanking=[...draft].sort((a,b)=>(savedOrder.get(a.id)??Number.MAX_SAFE_INTEGER)-(savedOrder.get(b.id)??Number.MAX_SAFE_INTEGER));
  const rankRows=stableRanking.filter(p=>normalize(`${p.name} ${p.aliases}`).includes(normalize(search)));
  const rankingPages=Math.max(1,Math.ceil(rankRows.length/12));
  const visibleRankingPage=Math.min(rankingPage,rankingPages-1);
  const visibleRankRows=rankRows.slice(visibleRankingPage*12,(visibleRankingPage+1)*12);
  const rankAvg=draft.length?draft.reduce((s,p)=>s+p.stars,0)/draft.length:0;
  const unknownCount=preview.filter(p=>p.unmatched).length;
  const reviewPageCount=Math.max(1,Math.ceil(preview.length/4));
  const reviewPage=Math.min(previewPage,reviewPageCount-1);

  return <div className="app">
    {confirmation}
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">⚽</div>
          <div><h1>PELA<span>DAMAS</span></h1><p>Administração</p></div>
        </div>
        <div className={'connection '+(online?'connected':'disconnected')} title={lastSync?`Atualizado às ${lastSync.toLocaleTimeString('pt-BR')}`:''}>
          {online?<Cloud size={15}/>:<CloudOff size={15}/>} <span>{online?'Sincronizado':'Sem conexão'}</span>
        </div>
      </div>
      <div className="header-decoration" aria-hidden="true" />
    </header>
    <main className="main">
      <div className="topline"><button className="refresh" onClick={async()=>{if(dirty&&!await confirm('Sair sem salvar as alterações?'))return;void onLogout().catch(e=>showMessage(e.message));}}>Sair</button><button className="refresh" onClick={()=>void refresh()} title="Atualizar dados"><RefreshCw size={15}/> Atualizar</button></div>

      <JourneyNav label="Áreas do Peladamas" value={tab==='ranking'?'ranking':mode==='criar'?'criar':'peladas'} items={[
        {value:'peladas',label:'Peladas',icon:<History size={18} aria-hidden="true"/>},
        {value:'criar',label:'Nova pelada',icon:<Plus size={18} aria-hidden="true"/>},
        {value:'ranking',label:'Ranking geral',icon:<Trophy size={18} aria-hidden="true"/>}
      ]} onChange={value=>{setTab(value==='ranking'?'ranking':'sorteio');if(value!=='ranking'){setMode(value==='criar'?'criar':'sortear');setOrganizerScreen('overview');}setFeedback('');}}/>


      {!!state?.pendingDeletions?.length&&<div className="panel"><h3>Arquivos com exclusão pendente</h3><p>Estas peladas já estão desativadas. Conclua a remoção dos arquivos antigos.</p>{state.pendingDeletions.map(number=><button key={number} className="button danger" disabled={saving} onClick={()=>void deletePelada(number)}>Concluir exclusão da Pelada {number}</button>)}</div>}
      {loading?<div className="loading-screen"><LoaderCircle size={30} className="spinner"/><p>Carregando rankings...</p></div>:
      !state?<div className="panel"><Empty icon={<CloudOff size={28}/>} heading="Não foi possível acessar os dados" detail="Confira se a API está funcionando e se o armazenamento foi configurado."/><button className="button primary full" onClick={()=>void refresh(true)}>Tentar novamente</button>{feedback&&<p className="error-text">{feedback}</p>}</div>:
      tab==='ranking'?<section className="ranking-workspace" aria-label="Ranking de estrelas">
        <div className="section-top"><div><h2>Ranking de estrelas</h2></div></div>
        <div className="ranking-source"><label htmlFor="rankingSelector" className="form-label">Visualizar ranking</label>
          <div className="select-wrap"><select id="rankingSelector" className="main-select" value={view} onChange={e=>setRankingView(e.target.value)}>
            <option value="geral">⭐ Geral — ranking principal</option>
            {state.peladas.map((p,i)=><option key={p.number} value={String(p.number)}>{i===0?'⚽ Última pelada':i===1?'⚽ Penúltima pelada':'⚽ Pelada'} — Pelada {p.number}</option>)}
          </select><ChevronDown size={17}/></div>
          <div className="hint"><Info size={15}/>{view==='geral'?'Notas principais. Peladas novas começam com este ranking.':'Histórico independente: mudar estas estrelas não altera o ranking geral.'}</div>
          {view!=='geral'&&<button className="button danger" disabled={saving} onClick={()=>void deletePelada(Number(view))}><Trash2 size={16}/> Excluir Pelada {view}</button>}
        </div>
        {view!=='geral'&&<PeladaLinks key={view} number={Number(view)} version={state.peladas.find(p=>p.number===Number(view))?.etag}/>}
        <p className="context-line">{draft.length} jogadores <span aria-hidden="true">·</span> Média {formatStars(rankAvg)} estrelas</p>
        <div className="rank-panel">
          <div className="panel-heading ranking-tools"><JourneyNav label="Visualização dos jogadores" value={rankingLayout} onChange={value=>setRankingLayout(value as 'list'|'grid')} items={[{value:'list',label:'Lista',icon:<List size={17} aria-hidden="true"/>},{value:'grid',label:'Grade',icon:<LayoutGrid size={17} aria-hidden="true"/>}]}/>
            <button className="icon-button" title="Baixar o CSV" aria-label="Baixar CSV" onClick={()=>{
              const p=view==='geral'?rankingToCsv(draft):peladaToCsv({players:draft,date:state.peladas.find(p=>String(p.number)===view)?.date,createdAt:state.peladas.find(p=>String(p.number)===view)?.createdAt||''});
              exportCSV(view==='geral'?'ranking_geral.csv':`pelada_${view}.csv`,p);
            }}><ArrowDownToLine size={19}/></button></div>
          {dirty&&<div className="ranking-save"><div className="save-area"><button className="button subtle" disabled={!dirty||saving} onClick={discard}><RotateCcw size={16}/> Descartar</button><button className="button primary" disabled={!dirty||saving} onClick={()=>void saveRanking()}>{saving?<LoaderCircle className="spinner" size={17}/>:<Check size={17}/>} Salvar alterações</button></div>
            <p className="save-note attention">Alterações ainda não salvas.</p></div>}
          <div className="search-wrap"><Search size={18}/><input value={search} onChange={e=>{setSearch(e.target.value);setRankingPage(0);}} placeholder="Pesquisar jogador..." aria-label="Buscar jogador" /></div>
          <div className={`ranking-display ranking-${rankingLayout}`} role="table" aria-label="Ranking dos jogadores"><div className="table-header" role="row"><span role="columnheader">#</span><span role="columnheader">JOGADOR</span><span role="columnheader">ESTRELAS</span><span role="columnheader" aria-label="Ações"></span></div>
          <div className="ranking-rows" role="rowgroup">
            {rankRows.length===0?<div role="row"><div role="cell" aria-colspan={4}><Empty icon={<Search size={26}/>} heading="Nenhum jogador" detail="Experimente outro nome de busca."/></div></div>:visibleRankRows.map(p=>
              <div className={'ranking-row'+(editingPlayer===p.id?' editing-player':'')} key={p.id} role="row">
                <span className="rank-position" role="cell">{stableRanking.findIndex(x=>x.id===p.id)+1}</span>
                <div className="player-info" role="cell" id={`player-${p.id}`}>
                  {view==='geral'&&editingPlayer===p.id?<label className="ranking-field"><span>Nome</span><input className="inline-name" value={p.name} onChange={e=>modifyPlayer(p.id,{name:e.target.value})} aria-label={`Nome de ${p.name}`}/></label>:rankingLayout==='grid'?<button type="button" className="ranking-player-name" aria-label={`Alterar estrelas de ${p.name}`} aria-expanded={ratingPlayer===p.id} onClick={()=>setRatingPlayer(ratingPlayer===p.id?null:p.id)}>{p.name}</button>:<strong>{p.name}</strong>}
                  {view==='geral'&&editingPlayer===p.id?<label className="ranking-field"><span>Apelidos</span><input className="alias" value={p.aliases} placeholder="Apelidos (separar por |)" onChange={e=>modifyPlayer(p.id,{aliases:e.target.value})} aria-label={`Apelidos de ${p.name}`}/></label>:<span className="alias-static">{view==='geral'?p.aliases:`Pelada ${view}`}</span>}
                  {view==='geral'&&editingPlayer===p.id&&<button className="button subtle remove-player" onClick={()=>void deletePlayer(p.id)}><Trash2 size={16}/> Excluir jogador</button>}
                </div>
                <div role="cell" className="ranking-rating"><span className="touch-label">Estrelas</span>{rankingLayout==='list'||ratingPlayer===p.id||editingPlayer===p.id?<StarsSelect value={p.stars} ariaLabel={`Estrelas de ${p.name}`} onChange={s=>{modifyPlayer(p.id,{stars:s});setRatingPlayer(null);}}/>:<strong className="ranking-static-stars">{formatStars(p.stars)} ★</strong>}</div>
                <div role="cell" className="ranking-actions">{view==='geral'?<button className="icon-button" aria-label={`${editingPlayer===p.id?'Fechar edição de':'Editar'} ${p.name}`} aria-expanded={editingPlayer===p.id} aria-controls={`player-${p.id}`} onClick={()=>setEditingPlayer(editingPlayer===p.id?null:p.id)}>{editingPlayer===p.id?<X size={17}/>:<PencilLine size={17}/>}</button>:<button className="delete-button" onClick={()=>deletePlayer(p.id)} aria-label={`Excluir ${p.name}`} title="Excluir deste ranking"><Trash2 size={17}/></button>}</div>
              </div>)}
          </div></div>
          <nav className="ranking-pagination" aria-label="Páginas do ranking"><button className="icon-button" aria-label="Página anterior de jogadores" disabled={visibleRankingPage===0} onClick={()=>setRankingPage(visibleRankingPage-1)}><ChevronLeft size={18}/></button><span role="status" aria-live="polite">{rankRows.length?`${visibleRankingPage*12+1}–${Math.min((visibleRankingPage+1)*12,rankRows.length)} de ${rankRows.length}`:'0 jogadores'} <small>· Página {visibleRankingPage+1} de {rankingPages}</small></span><button className="icon-button" aria-label="Próxima página de jogadores" disabled={visibleRankingPage>=rankingPages-1} onClick={()=>setRankingPage(visibleRankingPage+1)}><ChevronRight size={18}/></button></nav>
          {view==='geral'&&<div className="add-area">{showAdd?<form onSubmit={e=>{e.preventDefault();addPlayer();}} className="add-form">
            <div className="add-fields"><input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nome do jogador" maxLength={55} required/><StarsSelect value={newStars} onChange={setNewStars}/></div>
            <input value={newAliases} onChange={e=>setNewAliases(e.target.value)} placeholder="Apelidos separados por | (opcional)" maxLength={180}/>
            <div className="button-row"><button className="button subtle" type="button" onClick={()=>setShowAdd(false)}>Cancelar</button><button className="button primary" type="submit"><Plus size={16}/> Adicionar</button></div>
          </form>:<button className="add-button" onClick={()=>setShowAdd(true)}><Plus size={17}/> Adicionar jogador</button>}</div>}

          {feedback&&<div role="status" aria-live="polite" className={'feedback '+(/erro|inválid|não |mudou|recarregue|repetid/i.test(feedback)?'error':'success')}>{feedback}</div>}
        </div>
      </section>:<>
        <div className="organization-heading journey-heading" hidden={mode==='sortear'&&organizerScreen!=='overview'}><div><span className="eyebrow">ORGANIZAÇÃO</span><h2>{mode==='criar'?'Monte a próxima.':'Sua próxima partida começa aqui.'}</h2><p>{mode==='criar'?'Lista, revisão e times. Tudo no seu ritmo.':'Escolha a data. Prepare os times. Entre em campo.'}</p></div></div>
        {mode==='criar'?<div ref={flowRef} className="creation-flow"><Stepper step={creationStep} onStepChange={step=>{if(step===1)moveToStep(1);else if(preview.length>=4&&validPeladaDate(peladaDate))moveToStep(2);}} linear showFooter={false} theme="dark" accentColor="#ffac82" frame={false} width="100%" transition="slide">
          <Step title="Data e lista"><div className="panel"><div className="panel-heading"><div><h3>Cole a lista do WhatsApp</h3><p>Vamos reconhecer os nomes e apelidos do ranking.</p></div></div>
            <label className="form-label" htmlFor="peladaDate">Data da pelada</label><input id="peladaDate" type="date" min="1900-01-01" max="9999-12-31" required value={peladaDate} onChange={e=>setPeladaDate(e.target.value)} style={{marginBottom:16}}/>
            <label className="form-label" htmlFor="whatslist">Jogadores convocados</label><textarea id="whatslist" className="whatsapp-textarea" value={listText} onChange={e=>{setListText(e.target.value);setPreview([]);}} placeholder={'Peladamas quarta 21h:\n\n01. Jogador Á ✅\n02. Jogador 02 ✅\n03. Jogador 03 ✅\n04. Jogador 04 ✅\n05. Jogador 08 ✅'} rows={9}/>
            <div className="hint"><Info size={15}/> Aceita mensagens numeradas, emojis e marcações de presença. Para na “Lista de espera”.</div>
            <button className="button primary full" disabled={!validPeladaDate(peladaDate)||!listText.trim()} onClick={analyze}><Search size={17}/> Revisar jogadores <ArrowRight size={16}/></button>
          </div>
          </Step><Step title="Revisar e criar"><div className="panel preview-panel">
            <div className="panel-heading"><div><span className="eyebrow">REVISÃO</span><h3>Pelada · {formatPeladaDate(peladaDate)}</h3><p>{preview.length} jogadores encontrados · ajuste antes de criar.</p></div><span className="label-tag">{preview.length} <Users size={13}/></span></div>
            {unknownCount>0&&<div className="notice"><ShieldAlert size={18}/><span><strong>{unknownCount} novos jogadores.</strong> Revise as notas. Ao criar, você confirma uma vez a inclusão no Ranking Geral.</span></div>}
            <div className="preview-players">{preview.slice(reviewPage*4,(reviewPage+1)*4).map(p=><div key={p.id} className={'preview-row'+(p.unmatched?(p.reviewed?' newcomer-reviewed':' newcomer-pending'):'')}><div className="preview-name"><input value={p.name} aria-label="Nome do convocado" onChange={e=>setPreview(old=>old.map(x=>x.id===p.id?{...x,name:e.target.value}:x))}/>{p.unmatched&&<small>{p.reviewed?'Novo · nota ajustada':'Novo · nota provisória'}</small>}</div><StarsSelect value={p.stars} ariaLabel={`Nota de ${p.name}`} onChange={n=>setPreview(old=>old.map(x=>x.id===p.id?{...x,stars:n,reviewed:true}:x))}/><button className="delete-button" title="Remover" aria-label={`Remover ${p.name} da lista`} onClick={()=>setPreview(old=>old.filter(x=>x.id!==p.id))}><X size={17}/></button></div>)}</div>
            <div className="review-pagination"><button type="button" className="button subtle" disabled={reviewPage===0} onClick={()=>setPreviewPage(Math.max(0,reviewPage-1))}>Anterior</button><span>{reviewPage+1} de {reviewPageCount}</span><button type="button" className="button subtle" disabled={reviewPage+1>=reviewPageCount} onClick={()=>setPreviewPage(reviewPage+1)}>Próximos</button></div>
            <div className="creation-actions"><button type="button" className="button subtle" disabled={saving} onClick={()=>moveToStep(1)}>Voltar à lista</button>
            <button className="button primary full" disabled={saving||!validPeladaDate(peladaDate)||preview.length<4||preview.some(p=>!p.name.trim())||new Set(preview.map(p=>normalize(p.name))).size!==preview.length} onClick={()=>void createPelada()}>{saving?<LoaderCircle size={17} className="spinner"/>:<CheckCircle2 size={17}/>} Criar pelada e continuar</button></div>
            <p className="help-center">A lista será salva. Em seguida, confira os jogadores e sorteie os times.</p>
          </div></Step></Stepper></div>
        :<>
          {!activePelada?<div className="panel"><Empty icon={<FilePlus2 size={28}/>} heading={sourceNumber!==null?'Carregando a pelada…':'Ainda não há peladas'} detail={sourceNumber!==null?'Atualizando os dados da pelada selecionada.':'Crie a primeira pelada colando a lista do WhatsApp.'}/><button className="button primary full" onClick={()=>{if(sourceNumber!==null){setSourceNumber(null);setOrganizerScreen('overview');}else setMode('criar');}}><Plus size={17}/> {sourceNumber!==null?'Voltar às peladas':'Criar primeira pelada'}</button></div>:<>
            {organizerScreen==='overview'&&<><div className="arena-overview-meta"><span><strong>{state.peladas.length}</strong> peladas salvas</span><span><strong>{activePelada.players.length}</strong> convocados</span><span className="arena-live"><span/> Pronto para jogar</span></div><div className="panel selector-card"><label className="form-label" htmlFor="sourceSelect">Escolha a pelada</label><div className="select-wrap"><select id="sourceSelect" className="main-select" value={activePelada.number} onChange={e=>selectPelada(Number(e.target.value))}>{state.peladas.map(p=><option key={p.number} value={p.number}>{p.date?formatPeladaDate(p.date):`Pelada ${p.number}`} · {p.players.length} jogadores</option>)}</select><ChevronDown size={17}/></div>
            <div className="hint"><History size={15}/> Os times, a página e o link abaixo pertencem a esta pelada.</div></div>
            <div className="ds-task-actions"><button className="button primary" aria-label="Sortear times" onClick={()=>setOrganizerScreen('draw')}><Shuffle size={18} aria-hidden="true"/><span>Sortear times</span><small>Equilibre os times da pelada</small></button><button className="button subtle" aria-label="Times e compartilhar" onClick={()=>setOrganizerScreen('share')}><ArrowRight size={18} aria-hidden="true"/><span>Times e compartilhar</span><small>Confira e envie o link ao grupo</small></button></div>
            <details className="panel roster-review" key={`roster-${activePelada.number}`}><summary>Conferir os {activePelada.players.length} jogadores <ChevronDown size={18}/></summary><div className="panel-heading"><div><h3>Jogadores da Pelada {activePelada.number}</h3><p>Estas notas serão usadas no sorteio.</p></div><button className="icon-button" title="Baixar CSV" onClick={()=>exportCSV(`pelada_${activePelada.number}.csv`,peladaToCsv(activePelada))}><ArrowDownToLine size={19}/></button></div>
              <div className="roster-grid">{ordered(activePelada.players).map(p=><div className="roster-player" key={p.id}><span className="roster-dot"/><span>{p.name}</span><strong>{formatStars(p.stars)} ★</strong></div>)}</div>
              <button type="button" className="button subtle roster-correct-notes" onClick={()=>{void setRankingView(String(activePelada.number));setTab('ranking');}}>Corrigir notas desta pelada</button>
            </details>
            <details className="manage-pelada"><summary>Gerenciar Pelada {activePelada.number}<ChevronDown size={17}/></summary><p>Excluir remove os jogos e o histórico desta pelada. O Ranking Geral é mantido.</p><button className="button danger" disabled={saving} onClick={()=>void deletePelada(activePelada.number)}><Trash2 size={16}/> Excluir Pelada {activePelada.number}</button></details></>}
            {organizerScreen!=='overview'&&<ScreenHeader title={organizerScreen==='draw'?'Sortear times':'Times e compartilhamento'} context={activePelada.date?`Pelada · ${formatPeladaDate(activePelada.date)}`:`Pelada ${activePelada.number}`} onBack={()=>setOrganizerScreen('overview')} disabled={saving}/>}
            {organizerScreen==='draw'&&<div className="panel draw-settings ds-task-panel"><h3 className="sr-only"><Settings2 size={19}/> Sortear times da Pelada {activePelada.number}</h3>
              <div className="setting-row"><label htmlFor="sizeInput">Jogadores por time</label><div className="select-wrap small"><select id="sizeInput" value={perTeam} onChange={e=>{setPerTeam(Number(e.target.value));setTeams(null);}}>{[4,5,6,7,8,9,10,11].map(n=><option key={n} value={n}>{n}</option>)}</select><ChevronDown size={15}/></div></div>
              <div className="draw-mode"><label className="form-label" htmlFor="drawMode">Como equilibrar os times</label><select id="drawMode" className="main-select" value={drawMode} onChange={e=>{setDrawMode(e.target.value as DrawMode);setTeams(null);}}><option value="balanced">Equilíbrio geral (recomendado)</option><option value="tiers">Por faixas de habilidade</option><option value="balanced-five-stars">Equilíbrio geral + separação dos 5 estrelas</option></select><details className="inline-help"><summary>Como funciona o equilíbrio</summary><p className="hint">{drawMode==='balanced'?'Busca médias próximas e distribui os jogadores mais fortes entre os times.':drawMode==='balanced-five-stars'?'Distribui os jogadores de 5 estrelas entre os times, com diferença máxima de um por time, e busca médias próximas.':'Dá mais peso à distribuição das faixas: até 2, de 2,5 a 3,5 e de 4 a 5 estrelas, mantendo as médias próximas.'}</p>
              <div className="hint"><Info size={15}/> Considera apenas os convocados, sem regras fixas por nome. Todos participam; se sobrarem jogadores, os times terão tamanhos diferentes e o equilíbrio será calculado pela média.</div></details></div>
              <button className="button primary full big-sort" disabled={saving} onClick={()=>void drawTeams()}><Shuffle size={19}/> {saving?'Salvando sorteio…':teams?'Sortear novamente':'Sortear times'}</button><p className="hint">{Math.max(2,Math.ceil(activePelada.players.length/perTeam))} times previstos · O sorteio é salvo automaticamente.</p>
            </div>}
            {organizerScreen==='share'&&<><PeladaLinks key={activePelada.number} number={activePelada.number} version={activePelada.etag}/>
            {teams&&<div className="results"><div className="results-heading"><div><span className="eyebrow">RESULTADO DO SORTEIO</span><h3>Times da Pelada {activePelada.number}</h3></div><span className="result-tag"><CheckCircle2 size={14}/> {drawMode==='balanced'?'Equilíbrio geral':drawMode==='balanced-five-stars'?'Equilíbrio geral + separação dos 5 estrelas':'Por faixas'}</span></div>
              <p className="hint">Diferença entre médias: {formatStars(Math.max(...teams.map(t=>teamTotal(t)/t.length))-Math.min(...teams.map(t=>teamTotal(t)/t.length)))} ★ · O resultado depende das notas informadas.</p><JourneyNav label="Times sorteados" value={String(resultTeam)} items={teams.map((_,i)=>({value:String(i),label:`Time ${i+1}`,icon:<Users size={15}/>}))} onChange={value=>setResultTeam(Number(value))}/><div className="teams-grid ds-single-team">{teams.map((team,i)=>i===resultTeam&&<div className="team-card" data-team={i%4} key={i}><div className="team-head"><strong><span>{teamEmojis[i%teamEmojis.length]}</span> TIME {i+1}</strong><span>{formatStars(teamTotal(team))} ⭐</span></div><div className="team-body">{team.map((p,j)=><div className="team-member" key={p.id}><span><small>{String(j+1).padStart(2,'0')}</small>{p.name}</span><em>{formatStars(p.stars)}</em></div>)}</div><div className="team-footer">Média: <strong>{formatStars(teamTotal(team)/team.length)} ⭐</strong></div></div>)}</div>
              <details className="panel copy-panel"><summary><Clipboard size={18}/> Texto dos times para WhatsApp <ChevronDown size={17}/></summary><textarea readOnly value={messageForTeams(teams,activePelada.number)} aria-label="Texto dos times" rows={Math.min(27,teams.flat().length+teams.length*3+3)}/>
              <button className="button primary full" onClick={()=>void copyTeams()}>{copied?<Check size={18}/>:<Copy size={18}/>} {copied?'Copiado!':'Copiar os times'}</button></details>
            </div>}
            {!teams&&<p className="hint">Os times já publicados podem ser conferidos em Abrir página da pelada.</p>}</>}
          </>}
        </>}
        {feedback&&<div role="status" aria-live="polite" className={'feedback bottom-feedback '+(/erro|inválid|não |mudou|recarregue|repetid/i.test(feedback)?'error':'success')}>{feedback}</div>}
      </>}
      <footer><div className="footer-mark"><span aria-hidden="true">⚽</span> <strong>PELA<span>DAMAS</span></strong></div></footer>
    </main>
  </div>;
}
