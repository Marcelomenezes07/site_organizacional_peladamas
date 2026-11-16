import {useState} from 'react';
import {ArrowRight,Check,LoaderCircle,X} from 'lucide-react';
import type {AppState,Player} from '../../lib/models';
import {formatStars,matchPlayer,normalize,parseWhatsAppList} from '../../lib/logic';
import {formatPeladaDay,todayLocal,validPeladaDate} from '../../lib/pelada-date';
import {DEFAULT_MATCH_MINUTES} from '../../lib/matches';
import {ActionBar,Stepper,Switch,TopBar} from '../ui';
import type {Run} from './api';

type PreviewPlayer=Player&{unmatched?:boolean;original?:string};
const nextId=()=>`u-${crypto.randomUUID()}`;
const starsLabel=(n:number)=>`${formatStars(n)} ★`;

export default function NovaPelada({state,run,saving,confirm,show,onCancel,onCreated}:{state:AppState;run:Run;saving:boolean;confirm:(text:string)=>Promise<boolean>;show:(text:string,error?:boolean)=>void;onCancel:()=>void;onCreated:(n:number)=>void}){
  const [step,setStep]=useState<1|2>(1),[motion,setMotion]=useState('screen-enter');
  const [date,setDate]=useState(todayLocal);
  const [duration,setDuration]=useState(state.peladas.find(p=>p.duration)?.duration??DEFAULT_MATCH_MINUTES);
  const [listText,setListText]=useState('');
  const [preview,setPreview]=useState<PreviewPlayer[]>([]);
  const [addNew,setAddNew]=useState(true);
  const found=parseWhatsAppList(listText).length;
  const move=(next:1|2)=>{setMotion(next===2?'screen-enter':'screen-back');setStep(next);window.scrollTo?.(0,0);};

  const review=()=>{
    if(preview.length>=4){move(2);return;}
    const seen=new Set<string>();
    const result=parseWhatsAppList(listText).map(name=>{
      const known=matchPlayer(name,state.ranking.players);
      const item:PreviewPlayer=known?{...known,original:name}:{id:nextId(),name,aliases:'',stars:3,unmatched:true,original:name};
      if(seen.has(item.id))return null;seen.add(item.id);return item;
    }).filter((p):p is PreviewPlayer=>p!==null);
    if(result.length<4){show('Cole uma lista com pelo menos quatro nomes.',true);return;}
    setPreview(result);move(2);
  };
  const cancel=async()=>{if(listText.trim()&&!await confirm('Sair sem criar a pelada? A lista colada será perdida.'))return;onCancel();};
  const update=(id:string,change:Partial<PreviewPlayer>)=>setPreview(list=>list.map(p=>p.id===id?{...p,...change}:p));
  const remove=(id:string)=>setPreview(list=>list.filter(p=>p.id!==id));

  const newcomers=preview.filter(p=>p.unmatched),known=preview.filter(p=>!p.unmatched);
  const names=preview.map(p=>normalize(p.name));
  const problem=preview.length<4?'A pelada precisa de pelo menos 4 jogadores.':preview.some(p=>!p.name.trim())?'Preencha o nome de todos os novos.':new Set(names).size!==names.length?'Há nomes repetidos na lista.':'';

  const create=async()=>{
    if(problem||saving)return;
    const answer=await run<{number:number;addedToRanking?:number;warning?:string}>({action:'createPelada',date,duration,
      players:preview.map(({id,name,aliases,stars})=>({id,name:name.trim(),aliases,stars})),addToRankingIds:addNew?newcomers.map(p=>p.id):[]});
    if(!answer)return;
    if(answer.warning)show(answer.warning,true);
    else show(`Pelada ${answer.number} criada${answer.addedToRanking?` · ${answer.addedToRanking} ${answer.addedToRanking===1?'novo jogador entrou':'novos jogadores entraram'} no ranking`:''}.`);
    onCreated(answer.number);
  };

  if(step===1)return <main className={'page has-actionbar '+motion}>
    <TopBar title="Nova pelada" subtitle="Etapa 1 de 2" onBack={()=>void cancel()}/>
    <div className="progress" aria-hidden="true"><span style={{width:'50%'}}/></div>
    <div className="field"><label htmlFor="peladaDate">Data</label><input id="peladaDate" type="date" min="1900-01-01" max="9999-12-31" required value={date} onChange={e=>setDate(e.target.value)}/></div>
    <div className="kv"><div className="kv-text"><strong>Tempo de cada partida</strong><small>Vira o relógio na página da pelada</small></div>
      <Stepper label="Tempo de cada partida" value={duration} min={1} max={90} onChange={setDuration} format={n=>`${n} min`}/></div>
    <div className="field"><label htmlFor="whatslist">Lista do WhatsApp</label>
      <textarea id="whatslist" value={listText} onChange={e=>{setListText(e.target.value);setPreview([]);}} placeholder={'Peladamas quarta 21h\n01. Nome ✅\n02. Nome ✅\n03. Nome ✅\n04. Nome ✅'}/>
      <small>Números, emojis e ✅ são ignorados. A leitura para em “Lista de espera”. Apelidos do ranking são reconhecidos.</small></div>
    <ActionBar><button type="button" className="btn primary block" disabled={!validPeladaDate(date)||!listText.trim()} onClick={review}>
      {found>=4?`Revisar ${found} jogadores`:'Revisar jogadores'} <ArrowRight size={18} aria-hidden="true"/></button></ActionBar>
  </main>;

  return <main className={'page has-actionbar '+motion}>
    <TopBar title="Revisar jogadores" subtitle={`Etapa 2 de 2 · ${formatPeladaDay(date)} · partidas de ${duration} min`} onBack={()=>move(1)}/>
    <div className="progress" aria-hidden="true"><span style={{width:'100%'}}/></div>
    {newcomers.length>0&&<>
      <h2 className="label">{newcomers.length} {newcomers.length===1?'novo · confira a nota':'novos · confira as notas'}</h2>
      <div className="list">{newcomers.map(p=><div key={p.id} className="row newcomer">
        <div className="newcomer-top"><input aria-label="Nome do convocado" value={p.name} maxLength={55} onChange={e=>update(p.id,{name:e.target.value})}/>
          <button type="button" className="icon-btn" aria-label={`Remover ${p.name} da lista`} onClick={()=>remove(p.id)}><X size={20} aria-hidden="true"/></button></div>
        <div className="kv"><span className="muted small">Nota</span><Stepper label={`Nota de ${p.name||'novo jogador'}`} value={p.stars} min={0.5} max={5} step={0.5} format={starsLabel} onChange={n=>update(p.id,{stars:n})}/></div>
      </div>)}</div>
      <div className="card"><Switch checked={addNew} onChange={setAddNew} title="Adicionar os novos ao ranking" detail="Assim eles são reconhecidos nas próximas peladas."/></div>
    </>}
    {known.length>0&&<>
      <h2 className="label">{known.length} já {known.length===1?'está':'estão'} no ranking</h2>
      <div className="list">{known.map(p=><div key={p.id} className="row">
        <span className="row-main"><strong>{p.name}</strong>{p.original&&normalize(p.original)!==normalize(p.name)&&<small>Na lista: {p.original}</small>}</span>
        <span className="stars">{starsLabel(p.stars)}</span>
        <button type="button" className="icon-btn" aria-label={`Remover ${p.name} da lista`} onClick={()=>remove(p.id)}><X size={20} aria-hidden="true"/></button>
      </div>)}</div>
    </>}
    <ActionBar>
      {problem&&<p className="error-text" role="alert">{problem}</p>}
      <button type="button" className="btn primary block" disabled={!!problem||saving} onClick={()=>void create()}>
        {saving?<LoaderCircle className="spin" size={18} aria-hidden="true"/>:<Check size={18} aria-hidden="true"/>} Criar pelada com {preview.length}</button>
    </ActionBar>
  </main>;
}
