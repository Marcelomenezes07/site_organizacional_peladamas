import {useLayoutEffect,useRef,type ReactNode} from 'react';
export default function JourneyNav({label,value,items,onChange}:{label:string;value:string;items:{value:string;label:string;icon:ReactNode}[];onChange:(value:string)=>void}){
  const bar=useRef<HTMLElement>(null),pill=useRef<HTMLSpanElement>(null),initialized=useRef(false);
  useLayoutEffect(()=>{
    const move=(animate:boolean)=>{
      const active=bar.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');const marker=pill.current;
      if(!active||!marker)return;
      const previous=marker.style.transition;if(!animate)marker.style.transition='none';
      marker.style.transform=`translateX(${active.offsetLeft}px)`;marker.style.width=`${active.offsetWidth}px`;
      if(!animate){void marker.offsetWidth;marker.style.transition=previous;}
    };
    move(initialized.current);initialized.current=true;
    const resize=()=>move(false);window.addEventListener('resize',resize);
    return()=>window.removeEventListener('resize',resize);
  },[value]);
  return <nav ref={bar} className="t-tabs journey-nav" aria-label={label}><span ref={pill} className="t-tabs-pill" aria-hidden="true"/>{items.map(item=><button key={item.value} type="button" className="t-tab" aria-pressed={value===item.value} onClick={()=>onChange(item.value)}>{item.icon}<span>{item.label}</span></button>)}</nav>;
}
