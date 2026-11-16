import {useCallback,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {AlertCircle,Check,ChevronLeft,Minus,Plus,X} from 'lucide-react';

/** Cabeçalho de tela. Telas de aba usam título grande; telas internas usam `onBack` e título compacto. */
export function TopBar({title,subtitle,onBack,right,brand=false}:{title:string;subtitle?:string;onBack?:()=>void;right?:ReactNode;brand?:boolean}){
  return <header className={'topbar'+(onBack?' compact':'')}>
    {onBack&&<button type="button" className="icon-btn" aria-label="Voltar" onClick={onBack}><ChevronLeft size={26} aria-hidden="true"/></button>}
    <div className="topbar-title">
      {brand&&<div className="brand" aria-hidden="true">⚽ PELA<span>DAMAS</span></div>}
      <h1 tabIndex={-1}>{title}</h1>
      {subtitle&&<p>{subtitle}</p>}
    </div>
    {right&&<div className="topbar-right">{right}</div>}
  </header>;
}

export type TabItem<T extends string>={value:T;label:string;icon:ReactNode};
/** Navegação principal, sempre embaixo e com no máximo três abas. */
export function TabBar<T extends string>({label,items,value,onChange}:{label:string;items:TabItem<T>[];value:T|null;onChange:(value:T)=>void}){
  return <nav className="tabbar" aria-label={label}><div className="tabbar-inner">
    {items.map(item=><button key={item.value} type="button" aria-current={item.value===value?'page':undefined} onClick={()=>onChange(item.value)}>
      <span className="tab-pill" aria-hidden="true">{item.icon}</span>{item.label}
    </button>)}
  </div></nav>;
}

/** Barra fixa com a ação principal de telas sem abas (formulários e edição). */
export function ActionBar({children}:{children:ReactNode}){
  return <div className="actionbar"><div className="actionbar-inner">{children}</div></div>;
}

const focusableSelector='button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]';
/** Painel que sobe de baixo para tarefas rápidas. Fecha com Esc, com o X ou tocando fora. */
export function Sheet({open,title,subtitle,onClose,children}:{open:boolean;title:string;subtitle?:string;onClose:()=>void;children:ReactNode}){
  const id=useId(),ref=useRef<HTMLDivElement>(null),close=useRef(onClose);
  close.current=onClose;
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    ref.current?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(document.querySelector('.confirmation-overlay'))return;
      if(event.key==='Escape'){event.preventDefault();close.current();return;}
      if(event.key!=='Tab'||!ref.current)return;
      const items=Array.from(ref.current.querySelectorAll<HTMLElement>(focusableSelector));
      if(!items.length)return;
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',keydown);
    return()=>{document.removeEventListener('keydown',keydown);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
  },[open]);
  if(!open)return null;
  return createPortal(<div className="sheet-layer">
    <div className="sheet-scrim" aria-hidden="true" onClick={()=>close.current()}/>
    <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
      <div className="sheet-grab" aria-hidden="true"/>
      <div className="sheet-head"><div><h2 id={id}>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>
        <button type="button" className="icon-btn" aria-label="Fechar" onClick={()=>close.current()}><X size={22} aria-hidden="true"/></button></div>
      {children}
    </div>
  </div>,document.body);
}

export function Stepper({value,onChange,min,max,step=1,format=String,label}:{value:number;onChange:(value:number)=>void;min:number;max:number;step?:number;format?:(value:number)=>string;label:string}){
  const move=(delta:number)=>onChange(Math.min(max,Math.max(min,Math.round((value+delta)*10)/10)));
  return <div className="stepper" role="group" aria-label={label}>
    <button type="button" aria-label={`Diminuir ${label.toLowerCase()}`} disabled={value<=min} onClick={()=>move(-step)}><Minus size={18} aria-hidden="true"/></button>
    <output aria-live="polite">{format(value)}</output>
    <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={value>=max} onClick={()=>move(step)}><Plus size={18} aria-hidden="true"/></button>
  </div>;
}

export function Switch({checked,onChange,title,detail}:{checked:boolean;onChange:(value:boolean)=>void;title:string;detail?:string}){
  return <button type="button" className="switch" role="switch" aria-checked={checked} onClick={()=>onChange(!checked)}>
    <span className="row-main"><strong>{title}</strong>{detail&&<small>{detail}</small>}</span><span className="track" aria-hidden="true"/>
  </button>;
}

/** Aviso rápido no rodapé. Sucesso some sozinho; erro fica mais tempo e pode ser fechado. */
export function useToast(){
  const [toast,setToast]=useState<{text:string;error:boolean;id:number}|null>(null);
  const timer=useRef<number|undefined>(undefined);
  const show=useCallback((text:string,error=false)=>{
    window.clearTimeout(timer.current);
    setToast({text,error,id:Date.now()});
    timer.current=window.setTimeout(()=>setToast(null),error?7000:2800);
  },[]);
  useEffect(()=>()=>window.clearTimeout(timer.current),[]);
  const node=toast&&<div key={toast.id} className={'toast'+(toast.error?' error':'')} role={toast.error?'alert':'status'}>
    {toast.error?<AlertCircle size={20} aria-hidden="true"/>:<Check size={20} aria-hidden="true"/>}<span>{toast.text}</span>
    {toast.error&&<button type="button" className="btn text" onClick={()=>setToast(null)}>OK</button>}
  </div>;
  return {toast:node,show};
}

export function teamIndex(teams:{id:string}[],id:string){return Math.max(0,teams.findIndex(t=>t.id===id))%4;}
export function TeamDot({index}:{index:number}){return <i className="dot" data-team={index} aria-hidden="true"/>;}
