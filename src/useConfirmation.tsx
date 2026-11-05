import {useEffect,useRef,useState} from 'react';

export function useConfirmation(){
  const [message,setMessage]=useState<string|null>(null);
  const pending=useRef<((accepted:boolean)=>void)|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const finish=(accepted:boolean)=>{
    pending.current?.(accepted);pending.current=null;
    dialog.current?.close();setMessage(null);
  };
  useEffect(()=>{if(message!==null&&!dialog.current?.open)dialog.current?.showModal();},[message]);
  useEffect(()=>()=>{pending.current?.(false);pending.current=null;},[]);
  const confirm=(text:string)=>new Promise<boolean>(resolve=>{
    pending.current?.(false);pending.current=resolve;setMessage(text);
  });
  const confirmation=<dialog ref={dialog} className="confirmation-dialog" aria-labelledby="confirmation-title" aria-describedby="confirmation-message" onCancel={e=>{e.preventDefault();finish(false);}}>
    <h2 id="confirmation-title">Confirmar ação</h2>
    <p id="confirmation-message">{message}</p>
    <div className="button-row"><button type="button" className="button subtle" autoFocus onClick={()=>finish(false)}>Cancelar</button><button type="button" className="button primary" onClick={()=>finish(true)}>Confirmar</button></div>
  </dialog>;
  return {confirm,confirmation};
}
