import {useEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw} from 'lucide-react';
import {clockElapsed,type MatchClock as Clock} from '../../lib/matches';

const mmss=(ms:number)=>{const s=Math.ceil(ms/1000);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};

/**
 * Contagem regressiva da partida. O estado fica no servidor (início e tempo acumulado),
 * então todos os celulares mostram o mesmo tempo. `offset` corrige o relógio do aparelho.
 */
export default function MatchClock({clock,duration,offset,busy,onChange}:{clock?:Clock;duration:number;offset:number;busy:boolean;onChange:(op:'start'|'pause'|'reset')=>void}){
  const running=!!clock&&clock.startedAt!==null;
  const [now,setNow]=useState(()=>Date.now()+offset);
  useEffect(()=>{
    setNow(Date.now()+offset);
    if(!running)return;
    const timer=setInterval(()=>setNow(Date.now()+offset),250);
    return()=>clearInterval(timer);
  },[running,offset,clock?.startedAt,clock?.elapsed]);
  const elapsed=clockElapsed(clock,now),remaining=Math.max(0,duration*60000-elapsed),ended=remaining===0;
  const warned=useRef(false);
  useEffect(()=>{
    if(ended&&running&&!warned.current){warned.current=true;navigator.vibrate?.([300,150,300]);}
    if(!ended)warned.current=false;
  },[ended,running]);
  const fresh=elapsed===0;
  const label=ended?'Tempo esgotado':!running&&!fresh?'Pausado':`Partida de ${duration} min`;
  const button=ended?{op:'reset' as const,text:'Zerar',icon:<RotateCcw size={18} aria-hidden="true"/>,kind:'subtle'}
    :running?{op:'pause' as const,text:'Pausar',icon:<Pause size={18} aria-hidden="true"/>,kind:'subtle'}
    :{op:'start' as const,text:fresh?'Iniciar':'Retomar',icon:<Play size={18} aria-hidden="true"/>,kind:'primary'};
  return <div className={'clock'+(ended?' ended':'')} role="timer" aria-label={`Relógio: ${mmss(remaining)} restantes. ${label}`}>
    <div><span className="clock-time">{mmss(remaining)}</span><small>{label}</small></div>
    <button type="button" className={'btn '+button.kind} disabled={busy} onClick={()=>onChange(button.op)}>{button.icon} {button.text}</button>
  </div>;
}
