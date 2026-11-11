// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import PeladaLinks from '../src/PeladaLinks';
vi.mock('../src/pelada-api',()=>({getPelada:async()=>({teams:[{id:'time-1'}],matches:[]})}));
it.each(['missing','rejected','success'])('handles clipboard %s without losing the share link',async(mode)=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  const original=Object.getOwnPropertyDescriptor(navigator,'clipboard');
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='missing'?undefined:{writeText:mode==='rejected'?vi.fn().mockRejectedValue(new Error('denied')):vi.fn().mockResolvedValue(undefined)}});
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
    await act(async()=>root.render(<PeladaLinks number={7}/>));
    await act(async()=>host.querySelector('button')!.click());
    expect(host.querySelector('[role="status"]')?.textContent).toBe(mode==='success'?'Link copiado!':`Copie este link: ${window.location.origin}/pelada/7`);
  }finally{await act(async()=>root.unmount());host.remove();if(original)Object.defineProperty(navigator,'clipboard',original);else Reflect.deleteProperty(navigator,'clipboard');}
});
