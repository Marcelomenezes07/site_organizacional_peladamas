import {useCallback,useEffect,useState} from 'react';
import {summarize,type PublicPelada,type Match,type Goal} from '../lib/matches';
import {getPelada,changePelada,PeladaError} from './pelada-api';
import {useConfirmation} from './useConfirmation';

export default function PublicPeladaPage({number}:{number:number}){
  const [data,setData]=useState<PublicPelada|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [tab,setTab]=useState<'update'|'summary'|'teams'>('update'),[ranking,setRanking]=useState<'goals'|'assists'>('goals');
  const [draft,setDraft]=useState<Match|null>(null),[version,setVersion]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const {confirm,confirmation}=useConfirmation();
  const refresh=useCallback(async()=>{try{setData(await getPelada(number));setError('');}catch(e){if(e instanceof PeladaError&&e.status===404)setData(null);setError((e as Error).message);}finally{setLoading(false);}},[number]);
  useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},12000);const visible=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[refresh]);
  const summary=data?summarize(data,data.players):null;
  const teamName=(id:string)=>data?.teams.find(t=>t.id===id)?.name||id;
  async function edit(match?:Match){
    if(!data)return;
    if(draft&&!await confirm('Descartar a edição atual para abrir outra partida?'))return;
    setDraft(match?structuredClone(match):{id:crypto.randomUUID(),homeId:data.teams[0].id,awayId:data.teams[1].id,status:'finished',homeScore:0,awayScore:0,goals:[]});
    setVersion(data.etag);setNotice('');setTab('update');
  }
  function score(side:'homeScore'|'awayScore',value:number){
    if(!draft||!Number.isInteger(value)||value<0||value>30)return;
    const teamId=side==='homeScore'?draft.homeId:draft.awayId;
    const current=draft.goals.filter(g=>g.teamId===teamId).slice(0,value);
    while(current.length<value)current.push({teamId,scorerId:null,assistId:null,ownGoal:false});
    setDraft({...draft,[side]:value,goals:[...draft.goals.filter(g=>g.teamId!==teamId),...current]});
  }
  function changeGoal(index:number,change:Partial<Goal>){if(draft)setDraft({...draft,goals:draft.goals.map((g,i)=>i===index?{...g,...change}:g)});}
  async function save(){
    if(!draft||busy)return;
    setBusy(true);setNotice('');
    try{await changePelada(number,{action:'saveMatch',match:draft,etag:version});setDraft(null);setNotice('Partida salva. Estatísticas atualizadas!');await refresh();}
    catch(e){setNotice((e as Error).message);await refresh();}
    finally{setBusy(false);}
  }
  const played=summary?.table.some(t=>t.played);
  const first=summary?.table[0];
  const leaders=played?summary!.table.filter(t=>t.points===first!.points&&t.balance===first!.balance&&t.goalsFor===first!.goalsFor).map(t=>t.name).join(' · '):'Aguardando partidas';
  function top(key:'goals'|'assists'){
    const max=Math.max(0,...(summary?.totals.map(p=>p[key])||[]));
    return max?summary!.totals.filter(p=>p[key]===max).map(p=>p.name).join(' · ')+` (${max})`:'Ainda sem registros';
  }
  const ranked=summary?[...summary.totals].sort((a,b)=>b[ranking]-a[ranking]||a.name.localeCompare(b.name)):[];
  return <div className="app public-pelada">{confirmation}
    <header className="header"><div className="header-inner"><div className="brand"><div className="brand-icon">⚽</div><div><h1>PELA<span>DAMAS</span></h1><p>PELADA {number}</p></div></div><button className="connection" onClick={()=>void refresh()}>Atualizar</button></div></header>
    <main className="main"><div className="section-top"><div><span className="eyebrow">JUNTOS EM CAMPO</span><h2>Pelada {number}</h2></div><span className="label-tag">Sem login</span></div>
      <nav className="tabs public-tabs" aria-label="Página da pelada"><button className={'tab '+(tab==='update'?'selected':'')} onClick={()=>setTab('update')}>Atualizar pelada</button><button className={'tab '+(tab==='summary'?'selected':'')} onClick={()=>setTab('summary')}>Resumo</button><button className={'tab '+(tab==='teams'?'selected':'')} onClick={()=>setTab('teams')}>Times</button></nav>
      {error&&<div className="panel error-text" role="alert">{error}<button className="button subtle" onClick={()=>void refresh()}>Tentar novamente</button></div>}
      {loading?<p role="status">Carregando pelada…</p>:data&&<>
        {!data.teams.length?<div className="panel"><h3>Aguardando os times</h3><p>O administrador precisa sortear e salvar os times. Esta página atualiza automaticamente.</p></div>:tab==='update'?<>
          <div className="panel"><div className="panel-heading"><div><h3>Partidas da pelada</h3><p>Registre o resultado e informe quem fez cada gol.</p></div></div><button className="button primary full" disabled={busy} onClick={()=>void edit()}>Criar partida</button></div>
          {draft&&<section className="panel match-editor" aria-labelledby="match-editor-title"><h3 id="match-editor-title">{data.matches.some(m=>m.id===draft.id)?'Editar partida':'Nova partida'}</h3>
            {version!==data.etag&&<p role="alert" className="error-text">A pelada mudou em outro dispositivo. Sua edição foi mantida. Cancele e reabra a partida antes de salvar.</p>}
            <fieldset disabled={busy}><legend>Times e resultado</legend><div className="match-grid">
              <label>Time A<select value={draft.homeId} onChange={e=>setDraft({...draft,homeId:e.target.value,homeScore:0,awayScore:0,goals:[]})}>{data.teams.map(t=><option key={t.id} value={t.id} disabled={t.id===draft.awayId}>{t.name}</option>)}</select></label>
              <label>Time B<select value={draft.awayId} onChange={e=>setDraft({...draft,awayId:e.target.value,homeScore:0,awayScore:0,goals:[]})}>{data.teams.map(t=><option key={t.id} value={t.id} disabled={t.id===draft.homeId}>{t.name}</option>)}</select></label>
            </div><label>Situação<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as Match['status'],...(e.target.value==='scheduled'?{homeScore:0,awayScore:0,goals:[]}: {})})}><option value="finished">Finalizada</option><option value="scheduled">A jogar</option></select></label>
            {draft.status==='finished'&&<><div className="match-grid"><label>Gols do {teamName(draft.homeId)}<input type="number" min={0} max={30} value={draft.homeScore} onChange={e=>score('homeScore',Number(e.target.value))}/></label><label>Gols do {teamName(draft.awayId)}<input type="number" min={0} max={30} value={draft.awayScore} onChange={e=>score('awayScore',Number(e.target.value))}/></label></div>
              {draft.goals.map((g,i)=>{const members=data.players.filter(p=>data.teams.find(t=>t.id===g.teamId)?.playerIds.includes(p.id));return <div className="goal-entry" key={i}><strong>{teamName(g.teamId)} · Gol {draft.goals.slice(0,i+1).filter(x=>x.teamId===g.teamId).length}</strong><div className="match-grid">
                <label>Quem fez o gol {i+1}<select aria-label={`Quem fez o gol ${i+1}`} value={g.ownGoal?'own':g.scorerId||''} onChange={e=>changeGoal(i,{scorerId:e.target.value==='own'?null:e.target.value||null,ownGoal:e.target.value==='own',assistId:null})}><option value="">Selecione o jogador</option>{members.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}<option value="own">Gol contra do adversário</option></select></label>
                <label>Assistência do gol {i+1}<select aria-label={`Assistência do gol ${i+1}`} disabled={g.ownGoal||!g.scorerId} value={g.assistId||''} onChange={e=>changeGoal(i,{assistId:e.target.value||null})}><option value="">Sem assistência</option>{members.filter(p=>p.id!==g.scorerId).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
              </div></div>;})}
              <p className="hint">O placar deve ter um autor para cada gol. Gol contra conta para o time, sem crédito no ranking individual.</p>
            </>}
            <div className="button-row"><button className="button subtle" onClick={()=>void confirm('Descartar esta edição?').then(ok=>{if(ok)setDraft(null);})}>Cancelar edição</button><button className="button primary" disabled={version!==data.etag||draft.goals.some(g=>!g.ownGoal&&!g.scorerId)} onClick={()=>void save()}>{busy?'Salvando…':'Salvar partida'}</button></div></fieldset>
          </section>}
          {notice&&<div className="panel" role="status">{notice}</div>}
          <section aria-label="Histórico de partidas">{!data.matches.length?<div className="panel"><p>Nenhuma partida registrada.</p></div>:[...data.matches].reverse().map((m,i)=><article key={m.id} className="panel match-card"><div className="panel-heading"><span className="eyebrow">PARTIDA {data.matches.length-i} · {m.status==='finished'?'FINALIZADA':'A JOGAR'}</span><button className="button subtle" disabled={busy} onClick={()=>void edit(m)}>Editar</button></div><h3>{teamName(m.homeId)} <span>{m.status==='finished'?`${m.homeScore} × ${m.awayScore}`:'×'}</span> {teamName(m.awayId)}</h3>{m.goals.map((g,j)=><p key={j} className="match-event">⚽ {g.ownGoal?`Gol contra a favor do ${teamName(g.teamId)}`:data.players.find(p=>p.id===g.scorerId)?.name}{g.assistId?` · Assistência: ${data.players.find(p=>p.id===g.assistId)?.name}`:''}</p>)}</article>)}</section>
        </>:tab==='summary'?<>
          <div className="stat-grid"><div className="stat"><div className="stat-label">Time líder</div><strong className="leader-name">{leaders}</strong></div><div className="stat"><div className="stat-label">Artilheiro</div><strong className="leader-name">{top('goals')}</strong></div><div className="stat"><div className="stat-label">Garçom</div><strong className="leader-name">{top('assists')}</strong></div></div>
          <section className="panel"><h3>Classificação dos times</h3><p className="hint">Vitória: 3 pontos · Empate: 1 ponto. Desempate: saldo de gols e gols marcados. Empates restantes são compartilhados.</p><div className="table-scroll"><table><caption className="sr-only">Estatísticas dos times</caption><thead><tr>{['Time','PTS','J','V','E','D','GP','GC','SG'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{summary!.table.map(t=><tr key={t.id}><th scope="row">{t.name}</th>{[t.points,t.played,t.wins,t.draws,t.losses,t.goalsFor,t.goalsAgainst,t.balance].map((n,i)=><td key={i}>{n}</td>)}</tr>)}</tbody></table></div><p className="hint">J: jogos · V: vitórias · E: empates · D: derrotas · GP: gols pró · GC: gols contra · SG: saldo.</p></section>
          <section className="panel"><h3>Ranking dos jogadores</h3><div className="mode-buttons" aria-label="Ranking individual"><button className={ranking==='goals'?'active':''} onClick={()=>setRanking('goals')}>Gols</button><button className={ranking==='assists'?'active':''} onClick={()=>setRanking('assists')}>Assistências</button></div>{ranked.map(p=><div className="ranking-result" key={p.id}><span>{p.name}</span><strong>{p[ranking]} {ranking==='goals'?(p[ranking]===1?'gol':'gols'):(p[ranking]===1?'assistência':'assistências')}</strong></div>)}</section>
        </>:<section className="panel" aria-labelledby="public-teams-title"><h3 id="public-teams-title">Times da pelada</h3><p className="hint">Confira seu time e quem joga com você.</p><div className="public-rosters">{data.teams.map(t=><article className="public-team" key={t.id}><h4>{t.name}</h4><p>{t.playerIds.length} jogadores</p><ul>{t.playerIds.map(id=><li key={id}>{data.players.find(p=>p.id===id)?.name||'Jogador indisponível'}</li>)}</ul></article>)}</div></section>}
      </>}
      <footer><p>Atualização automática a cada 12 segundos. Qualquer pessoa com este link pode registrar e corrigir partidas.</p></footer>
    </main>
  </div>;
}
