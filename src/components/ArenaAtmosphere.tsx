import {useEffect,useRef} from 'react';
/** Decorative stadium light; pointer highlight is disabled with reduced motion. */
export default function ArenaAtmosphere(){
 const layer=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;
  const move=(e:PointerEvent)=>{if(media.matches||e.pointerType!=='mouse')return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const x=`${e.clientX/innerWidth*100}%`;layer.current?.style.setProperty('--light-x',x);document.documentElement.style.setProperty('--arena-light-x',x);});};
  window.addEventListener('pointermove',move,{passive:true});
  return()=>{window.removeEventListener('pointermove',move);cancelAnimationFrame(frame);document.documentElement.style.removeProperty('--arena-light-x');};
 },[]);
 return <div className="arena-atmosphere" ref={layer} aria-hidden="true"><i/><i/><span className="arena-orbit"/></div>;
}
