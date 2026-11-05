// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {useConfirmation} from '../src/useConfirmation';

let host:HTMLDivElement,root:Root;
const remove=vi.fn();
function Harness(){
  const {confirm,confirmation}=useConfirmation();
  return <>{confirmation}<button onClick={async()=>{if(await confirm('Excluir a Pelada 1?'))remove();}}>Excluir pelada</button></>;
}
const button=(label:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent===label)!;
const click=async(label:string)=>{await act(async()=>button(label).click());};
beforeEach(async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  // Some embedded/older browsers lack the native modal-dialog API.
  Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:undefined});
  remove.mockClear();host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(<Harness/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('opens a visible confirmation without native dialog support and deletes only after approval',async()=>{
  await click('Excluir pelada');
  const dialog=document.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();expect(dialog?.getAttribute('aria-modal')).toBe('true');
  expect(remove).not.toHaveBeenCalled();expect(document.activeElement).toBe(button('Cancelar'));
  await click('Confirmar');expect(remove).toHaveBeenCalledTimes(1);expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it('cancels and permits another confirmation with exactly the same message',async()=>{
  button('Excluir pelada').focus();await click('Excluir pelada');await click('Cancelar');
  expect(remove).not.toHaveBeenCalled();expect(document.activeElement).toBe(button('Excluir pelada'));
  await click('Excluir pelada');await click('Confirmar');expect(remove).toHaveBeenCalledTimes(1);
});
it('supports Escape and traps keyboard focus inside the confirmation',async()=>{
  await click('Excluir pelada');
  await act(async()=>button('Cancelar').dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true})));
  expect(document.activeElement).toBe(button('Confirmar'));
  await act(async()=>button('Confirmar').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  expect(remove).not.toHaveBeenCalled();expect(document.querySelector('[role="dialog"]')).toBeNull();
});
