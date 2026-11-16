// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import SharePanel from '../src/admin/SharePanel';
it.each(['missing','rejected','success'])('handles clipboard %s without losing the link or password',async(mode)=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({password:'test-password'})));
  const original=Object.getOwnPropertyDescriptor(navigator,'clipboard');
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='missing'?undefined:{writeText:mode==='rejected'?vi.fn().mockRejectedValue(new Error('denied')):vi.fn().mockResolvedValue(undefined)}});
  const show=vi.fn();
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  const ok=mode==='success';
  try{
    await act(async()=>root.render(<SharePanel number={7} message="⚽ times" show={show}/>));
    const button=(text:string)=>Array.from(host.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')===text||b.textContent?.includes(text))!;
    await act(async()=>button('Copiar link da pelada').click());
    expect(show).toHaveBeenLastCalledWith(ok?'Link copiado.':`Copie este link: ${window.location.origin}/pelada/7`,!ok);
    expect(host.querySelector('.code')?.textContent).toBe('test-password');
    await act(async()=>button('Copiar senha da pelada').click());
    expect(show).toHaveBeenLastCalledWith(ok?'Senha copiada.':'Selecione a senha exibida para copiar.',!ok);
    await act(async()=>button('Copiar texto dos times').click());
    expect(show).toHaveBeenLastCalledWith(ok?'Texto dos times copiado. Cole no grupo.':'Não foi possível copiar. Selecione o texto acima e copie.',!ok);
  }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();if(original)Object.defineProperty(navigator,'clipboard',original);else Reflect.deleteProperty(navigator,'clipboard');}
});
