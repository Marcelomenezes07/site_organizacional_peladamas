import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

export function useConfirmation(){
  const [message,setMessage]=useState<string|null>(null);
  const pending=useRef<((accepted:boolean)=>void)|null>(null);
  const dialog=useRef<HTMLDivElement>(null);
  const id=useId();
  const finish=useCallback((accepted:boolean)=>{
    const resolve=pending.current;pending.current=null;
    setMessage(null);resolve?.(accepted);
  },[]);
  useEffect(()=>{
    if(message===null)return;
    const previousFocus=document.activeElement as HTMLElement|null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();finish(false);return;}
      if(event.key!=='Tab')return;
      const buttons=dialog.current?.querySelectorAll<HTMLButtonElement>('button');
      if(!buttons?.length)return;
      const first=buttons[0],last=buttons[buttons.length-1];
      if(event.shiftKey&&(document.activeElement===first||!dialog.current?.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!dialog.current?.contains(document.activeElement))){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',keydown);
    return()=>{document.removeEventListener('keydown',keydown);document.body.style.overflow=previousOverflow;if(previousFocus?.isConnected)previousFocus.focus();};
  },[message,finish]);
  useEffect(()=>()=>{pending.current?.(false);pending.current=null;},[]);
  const confirm=(text:string)=>new Promise<boolean>(resolve=>{
    pending.current?.(false);pending.current=resolve;setMessage(text);
  });
  // Render directly from React state: no native dialog/showModal dependency.
  const confirmation=message===null?null:createPortal(<div className="confirmation-overlay">
    <div ref={dialog} role="dialog" aria-modal="true" className="confirmation-dialog" aria-labelledby={id+'-title'} aria-describedby={id+'-message'}>
      <h2 id={id+'-title'}>Confirmar ação</h2>
      <p id={id+'-message'}>{message}</p>
      <div className="button-row"><button type="button" className="button subtle" onClick={()=>finish(false)}>Cancelar</button><button type="button" className="button primary" onClick={()=>finish(true)}>Confirmar</button></div>
    </div>
  </div>,document.body);
  return {confirm,confirmation};
}
