import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,ChevronRight,Download,LoaderCircle,MoreHorizontal,Send,Shuffle,Trash2,TriangleAlert} from 'lucide-react';
import type {Pelada} from '../../lib/models';
import {formatStars,sortTeams,type DrawMode} from '../../lib/logic';
import {DEFAULT_MATCH_MINUTES,teamLabel,type PublicPelada} from '../../lib/matches';
import {peladaToCsv} from '../../lib/csv';
import {getPelada,changePelada} from '../pelada-api';
import {Sheet,Stepper,TeamDot,TopBar} from '../ui';
import {downloadCsv,type Run} from './api';
import SharePanel from './SharePanel';
import {peladaTitle} from './PeladasList';

const emojis=['🔵','🔴','🟡','🟣'];
const modes:[DrawMode,string,string][]=[
  ['balanced','Equilíbrio geral','Médias parecidas e os melhores espalhados. Recomendado.'],
  ['balanced-five-stars','Separar os 5 estrelas','Como o geral, sem juntar os jogadores de 5 estrelas.'],
  ['tiers','Por faixas','Cada time recebe jogadores de cada nível: até 2, de 2,5 a 3,5 e de 4 a 5 estrelas.']
];

export function teamsMessage(info:PublicPelada,pelada:Pelada,duration:number){
  const stars=new Map(pelada.players.map(p=>[p.id,p.stars]));
  const name=(id:string)=>info.players.find(p=>p.id===id)?.name??'';
  return [`⚽ *PELADAMAS — ${peladaTitle(pelada).toUpperCase()}* ⚽`,'',
    ...info.teams.flatMap((t,i)=>[
      `${emojis[i%4]} *${teamLabel(t,info.players).toUpperCase()}* — ${formatStars(t.playerIds.reduce((s,id)=>s+(stars.get(id)??0),0))} ⭐`,
      ...[...t.playerIds].sort((a,b)=>Number(b===t.leaderId)-Number(a===t.leaderId)).map((id,n)=>`${n+1}. ${name(id)}`),''
    ]),
    `⏱ Partidas de ${duration} min`,`📲 Placar ao vivo: ${window.location.origin}/pelada/${pelada.number}`
  ].join('\n');
}

type SheetName='draw'|'share'|'time'|'menu'|'delete'|null;
export default function PeladaScreen({number,pelada,openDraw,run,saving,show,refresh,onBack,onRoster,onDeleted}:{number:number;pelada?:Pelada;openDraw?:boolean;run:Run;saving:boolean;show:(text:string,error?:boolean)=>void;refresh:()=>Promise<void>;onBack:()=>void;onRoster:()=>void;onDeleted:()=>void}){
  const [info,setInfo]=useState<PublicPelada|null>(null),[infoError,setInfoError]=useState('');
  const [sheet,setSheet]=useState<SheetName>(null);
  const [perTeam,setPerTeam]=useState(()=>Math.max(2,Math.min(5,Math.floor((pelada?.players.length??10)/2)))),[mode,setMode]=useState<DrawMode>('balanced'),[drawing,setDrawing]=useState(false);
  const [minutes,setMinutes]=useState(DEFAULT_MATCH_MINUTES);
  const loadInfo=useCallback(async()=>{
    try{setInfo(await getPelada(number));setInfoError('');}catch(e){setInfoError((e as Error).message);}
  },[number]);
  useEffect(()=>{
    void loadInfo();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void loadInfo();},12000);
    return()=>clearInterval(timer);
  },[loadInfo,pelada?.etag]);
  const autoOpened=useRef(false);
  useEffect(()=>{if(openDraw&&pelada&&!autoOpened.current){autoOpened.current=true;setSheet('draw');}},[openDraw,pelada]);

  if(!pelada)return <><TopBar title={`Pelada ${number}`} onBack={onBack}/><div className="loading" role="status"><LoaderCircle className="spin" size={28} aria-hidden="true"/>Carregando a pelada…</div></>;

  const duration=pelada.duration??DEFAULT_MATCH_MINUTES;
  const teams=info?.teams??[];
  const hasTeams=info?teams.length>0:!!pelada.teamsPublished;
  const matchCount=info?info.matches.length:pelada.matchCount??0;
  const teamCount=Math.max(2,Math.ceil(pelada.players.length/perTeam));
  const base=Math.floor(pelada.players.length/teamCount),extra=pelada.players.length%teamCount;
  const sizes=extra?`${teamCount} times: ${teamCount-extra} de ${base} e ${extra} de ${base+1}`:`${teamCount} times de ${base}`;
  const message=info&&teams.length?teamsMessage(info,pelada,duration):null;
  const close=()=>setSheet(null);

  const draw=async()=>{
    if(drawing)return;setDrawing(true);
    try{
      const published=await getPelada(number);
      if(published.matches.length)throw new Error('Os times não podem mudar porque já existem partidas registradas.');
      const result=sortTeams(pelada.players,perTeam,mode);
      await changePelada(number,{action:'publishTeams',teams:result.map(t=>t.map(p=>p.id)),etag:published.etag});
      close();show('Times sorteados e publicados na página da pelada.');
      await loadInfo();await refresh();
    }catch(e){show((e as Error).message,true);}
    finally{setDrawing(false);}
  };

  const teamList=<ul className="teams-mini">{teams.map((t,i)=>{
    const avg=t.playerIds.reduce((s,id)=>s+(pelada.players.find(p=>p.id===id)?.stars??0),0)/Math.max(1,t.playerIds.length);
    const names=[...t.playerIds].sort((a,b)=>Number(b===t.leaderId)-Number(a===t.leaderId)).map(id=>info!.players.find(p=>p.id===id)?.name).filter(Boolean);
    return <li key={t.id}><TeamDot index={i%4}/><div><b>{teamLabel(t,info!.players)}</b><span>{names.join(', ')} · média {formatStars(avg)} ★</span></div></li>;
  })}</ul>;
  const openPage=(primary:boolean)=><a className={'btn block '+(primary?'primary':'subtle')} href={`/pelada/${number}`} target="_blank" rel="noreferrer"><ArrowUpRight size={18} aria-hidden="true"/> Abrir página da pelada</a>;

  let step;
  if(!hasTeams)step=<section className="card" aria-label="Próximo passo"><span className="label">Próximo passo</span><p>Sorteie os times. A página da pelada é liberada logo depois.</p>
    <button type="button" className="btn primary block" onClick={()=>setSheet('draw')}><Shuffle size={18} aria-hidden="true"/> Sortear times</button></section>;
  else if(!matchCount)step=<section className="card" aria-label="Times sorteados"><span className="label">{teams.length||''} times sorteados</span>{info&&teamList}
    <button type="button" className="btn primary block" onClick={()=>setSheet('share')}><Send size={18} aria-hidden="true"/> Enviar no grupo</button>
    {openPage(false)}
    <button type="button" className="btn text" onClick={()=>setSheet('draw')}>Sortear de novo</button></section>;
  else step=<section className="card" aria-label="Times da pelada"><span className="label">{matchCount} {matchCount===1?'partida registrada':'partidas registradas'}</span>{info&&teamList}
    {openPage(true)}
    <button type="button" className="btn subtle block" onClick={()=>setSheet('share')}><Send size={18} aria-hidden="true"/> Enviar no grupo</button>
    <p className="muted small">Os times ficam fixos depois da primeira partida.</p></section>;

  return <>
    <TopBar title={peladaTitle(pelada)} subtitle={`Pelada ${number} · ${pelada.players.length} jogadores`} onBack={onBack}
      right={<button type="button" className="icon-btn" aria-label="Mais opções da pelada" onClick={()=>setSheet('menu')}><MoreHorizontal size={24} aria-hidden="true"/></button>}/>
    {infoError&&<div className="notice error" role="alert"><TriangleAlert size={18} aria-hidden="true"/><span>Não foi possível conferir os times publicados. Nova tentativa em instantes.</span></div>}
    {step}
    <div className="list">
      <button type="button" className="row" onClick={onRoster}><span className="row-main"><strong>Jogadores e notas</strong><small>Notas usadas no sorteio desta pelada</small></span><span className="chip">{pelada.players.length}</span><ChevronRight className="chev" size={20} aria-hidden="true"/></button>
      <button type="button" className="row" onClick={()=>{setMinutes(duration);setSheet('time');}}><span className="row-main"><strong>Tempo de cada partida</strong><small>Relógio na página da pelada</small></span><span className="chip">{duration} min</span><ChevronRight className="chev" size={20} aria-hidden="true"/></button>
      {hasTeams&&<button type="button" className="row" onClick={()=>setSheet('share')}><span className="row-main"><strong>Link e senha</strong><small>{window.location.host}/pelada/{number}</small></span><ChevronRight className="chev" size={20} aria-hidden="true"/></button>}
    </div>

    <Sheet open={sheet==='draw'} title="Sortear times" subtitle={`${pelada.players.length} jogadores`} onClose={close}>
      <div className="kv"><div className="kv-text"><strong>Jogadores por time</strong><small>{sizes}</small></div>
        <Stepper label="Jogadores por time" value={perTeam} min={2} max={15} onChange={setPerTeam}/></div>
      <div className="choices" role="radiogroup" aria-label="Como equilibrar">{modes.map(([value,title,detail])=>
        <button key={value} type="button" role="radio" aria-checked={mode===value} className="choice" onClick={()=>setMode(value)}><span className="radio" aria-hidden="true"/><span><b>{title}</b><span>{detail}</span></span></button>)}</div>
      {hasTeams&&<div className="notice" role="note"><TriangleAlert size={18} aria-hidden="true"/><span>Os times publicados serão substituídos.</span></div>}
      <button type="button" className="btn primary block" disabled={drawing} onClick={()=>void draw()}>{drawing?<LoaderCircle className="spin" size={18} aria-hidden="true"/>:<Shuffle size={18} aria-hidden="true"/>} {hasTeams?'Sortear e substituir':'Sortear'}</button>
    </Sheet>

    <Sheet open={sheet==='share'} title="Enviar no grupo" subtitle={`Pelada ${number}`} onClose={close}>
      <SharePanel number={number} message={message} show={show}/>
    </Sheet>

    <Sheet open={sheet==='time'} title="Tempo de cada partida" subtitle={`Pelada ${number}`} onClose={close}>
      <p className="muted">Vale para todas as partidas desta pelada. Quem marca o placar inicia o relógio quando a bola rola.</p>
      <div className="kv"><strong>Duração</strong><Stepper label="Tempo de cada partida" value={minutes} min={1} max={90} onChange={setMinutes} format={n=>`${n} min`}/></div>
      <button type="button" className="btn primary block" disabled={saving||minutes===duration} onClick={async()=>{if(await run({action:'setPeladaDuration',number,duration:minutes,etag:pelada.etag},`Partidas de ${minutes} min.`))close();}}>Salvar</button>
    </Sheet>

    <Sheet open={sheet==='menu'} title={`Pelada ${number}`} subtitle={peladaTitle(pelada)} onClose={close}>
      <div className="list">
        <button type="button" className="row" onClick={()=>{downloadCsv(`pelada_${number}.csv`,peladaToCsv(pelada));close();}}><Download size={20} aria-hidden="true"/><span className="row-main"><strong>Baixar planilha</strong><small>Jogadores, notas, gols e assistências (CSV)</small></span></button>
        <button type="button" className="row danger" onClick={()=>setSheet('delete')}><Trash2 size={20} aria-hidden="true"/><span className="row-main"><strong>Excluir pelada</strong></span></button>
      </div>
    </Sheet>

    <Sheet open={sheet==='delete'} title={`Excluir a Pelada ${number}?`} onClose={close}>
      <p>Os times, as partidas e os gols desta pelada são apagados. O ranking geral continua igual. Não dá para desfazer.</p>
      <button type="button" className="btn danger block" disabled={saving} onClick={async()=>{if(await run({action:'deletePelada',number,etag:pelada.etag},`Pelada ${number} excluída.`)){close();onDeleted();}}}>Excluir Pelada {number}</button>
      <button type="button" className="btn subtle block" onClick={close}>Cancelar</button>
    </Sheet>
  </>;
}
