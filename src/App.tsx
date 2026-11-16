import {useCallback,useEffect,useRef,useState} from 'react';
import {LoaderCircle,CloudOff,List,Trophy} from 'lucide-react';
import type {AppState} from '../lib/models';
import {remote,type Run} from './admin/api';
import PeladasList from './admin/PeladasList';
import NovaPelada from './admin/NovaPelada';
import PeladaScreen from './admin/PeladaScreen';
import RosterScreen from './admin/RosterScreen';
import RankingTab from './admin/RankingTab';
import {TabBar,TopBar,useToast} from './ui';
import {useConfirmation} from './useConfirmation';

type Route={name:'list'}|{name:'nova'}|{name:'pelada';number:number;openDraw?:boolean}|{name:'roster';number:number};
type Tab='peladas'|'ranking';

/** Área do organizador: abas Peladas e Ranking; Nova pelada, Pelada e Jogadores são telas internas. */
export default function App({onLogout}:{onLogout:()=>Promise<void>}){
  const {confirm,confirmation}=useConfirmation();
  const {toast,show}=useToast();
  const [state,setState]=useState<AppState|null>(null);
  const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[online,setOnline]=useState(true);
  const [tab,setTab]=useState<Tab>('peladas');
  const [route,setRoute]=useState<Route>({name:'list'});
  const [motion,setMotion]=useState<'screen-enter'|'screen-back'|'tab-enter'>('tab-enter');
  const [saving,setSaving]=useState(false);
  const savingRef=useRef(false),refreshingRef=useRef(false),againRef=useRef(false),failuresRef=useRef(0),retryAtRef=useRef(0);
  // Uma leitura iniciada antes de uma gravação pode trazer dados antigos e é descartada.
  const generationRef=useRef(0);

  const refresh=useCallback(async(initial=false):Promise<void>=>{
    if(savingRef.current)return;
    if(refreshingRef.current){againRef.current=true;return;}
    refreshingRef.current=true;againRef.current=false;
    const generation=generationRef.current;
    try{
      const {state:fresh}=await remote<{state:AppState}>('GET');
      failuresRef.current=0;retryAtRef.current=0;
      if(generation!==generationRef.current||savingRef.current){againRef.current=true;return;}
      setState(fresh);setOnline(true);setLoadError('');
    }catch(e){
      retryAtRef.current=Date.now()+Math.min(120000,12000*2**Math.min(++failuresRef.current,4));
      setOnline(false);if(initial)setLoadError((e as Error).message);
    }finally{
      refreshingRef.current=false;if(initial)setLoading(false);
      if(againRef.current&&!savingRef.current){againRef.current=false;await refresh();}
    }
  },[]);
  useEffect(()=>{
    void refresh(true);
    const tick=()=>{if(document.visibilityState==='visible'&&Date.now()>=retryAtRef.current)void refresh();};
    const timer=setInterval(tick,12000);document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
  },[refresh]);

  const run:Run=useCallback(async<T,>(body:unknown,success?:string)=>{
    if(savingRef.current)return null;
    savingRef.current=true;generationRef.current++;setSaving(true);
    try{const result=await remote<T>('POST',body);if(success)show(success);return result;}
    catch(e){show((e as Error).message,true);return null;}
    finally{savingRef.current=false;setSaving(false);await refresh();}
  },[refresh,show]) as Run;

  const go=(next:Route,back=false)=>{setMotion(back?'screen-back':'screen-enter');setRoute(next);};
  const changeTab=(next:Tab)=>{setMotion('tab-enter');setTab(next);if(next==='peladas'&&tab==='peladas')setRoute({name:'list'});};
  useEffect(()=>{window.scrollTo?.(0,0);document.querySelector<HTMLElement>('.topbar h1')?.focus({preventScroll:true});},[route,tab]);

  const logout=()=>void onLogout().catch(e=>show((e as Error).message,true));
  const pelada=(n:number)=>state?.peladas.find(p=>p.number===n);

  let content;
  if(loading)content=<><TopBar title="Peladas" brand/><div className="loading" role="status"><LoaderCircle className="spin" size={28} aria-hidden="true"/>Carregando…</div></>;
  else if(!state)content=<><TopBar title="Peladas" brand/><div className="card empty"><CloudOff size={28} aria-hidden="true"/><strong>Não foi possível carregar os dados</strong><p>{loadError||'Confira a conexão e tente de novo.'}</p><button type="button" className="btn primary block" onClick={()=>{setLoading(true);void refresh(true);}}>Tentar novamente</button></div></>;
  else if(tab==='ranking')content=<RankingTab state={state} run={run} saving={saving} online={online} show={show}/>;
  else if(route.name==='pelada')content=<PeladaScreen key={route.number} number={route.number} pelada={pelada(route.number)} openDraw={route.openDraw} run={run} saving={saving} show={show} refresh={refresh}
    onBack={()=>go({name:'list'},true)} onRoster={()=>go({name:'roster',number:route.number})} onDeleted={()=>go({name:'list'},true)}/>;
  else if(route.name==='roster')content=<RosterScreen pelada={pelada(route.number)} number={route.number} run={run} saving={saving} show={show} onBack={()=>go({name:'pelada',number:route.number},true)}/>;
  else content=<PeladasList state={state} online={online} saving={saving} run={run} onNew={()=>go({name:'nova'})} onOpen={n=>go({name:'pelada',number:n})} onRefresh={()=>void refresh()} onLogout={logout}/>;

  if(route.name==='nova'&&tab==='peladas'&&state)return <div className="app">{confirmation}
    <NovaPelada state={state} run={run} saving={saving} confirm={confirm} show={show} onCancel={()=>go({name:'list'},true)} onCreated={n=>go({name:'pelada',number:n,openDraw:true})}/>{toast}</div>;

  return <div className="app">{confirmation}
    <main key={tab+route.name+('number' in route?route.number:'')} className={'page '+motion}>{content}</main>
    <TabBar label="Áreas do organizador" value={tab} onChange={changeTab} items={[
      {value:'peladas',label:'Peladas',icon:<List size={22}/>},
      {value:'ranking',label:'Ranking',icon:<Trophy size={22}/>}
    ]}/>
    {toast}
  </div>;
}
