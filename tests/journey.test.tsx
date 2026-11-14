// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import App from '../src/App';
let root:Root,host:HTMLDivElement;
const click=async(name:string)=>{const b=Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.trim()===name);expect(b).toBeTruthy();await act(async()=>b!.click());};
const input=async(el:HTMLInputElement|HTMLTextAreaElement,value:string)=>{await act(async()=>{Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});};
beforeEach(async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({state:{ranking:{players:[],etag:null},peladas:[]}})));
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(<App onLogout={async()=>{}}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
it('starts with peladas, shows one creation step and retains edits when going back',async()=>{
  expect(host.textContent).toContain('Suas peladas');await click('Nova pelada');
  await input(host.querySelector('#whatslist')!,'1. Alfa\n2. Beta\n3. Gama\n4. Delta\n5. Epsilon\n6. Zeta\n7. Eta');
  await click('Revisar jogadores');
  expect(host.querySelector('#whatslist')).toBeNull();
  const names=host.querySelectorAll<HTMLInputElement>('[aria-label="Nome do convocado"]');expect(names).toHaveLength(4);
  await input(names[0],'Alfa corrigido');await click('Próximos');
  expect(host.querySelectorAll('[aria-label="Nome do convocado"]')).toHaveLength(3);
  await click('Voltar à lista');expect((host.querySelector('#whatslist') as HTMLTextAreaElement).value).toContain('Alfa');
  await click('Revisar jogadores');await click('Anterior');
  expect((host.querySelector('[aria-label="Nome do convocado"]') as HTMLInputElement).value).toBe('Alfa corrigido');
});
it('does not advance with fewer than four names',async()=>{
  await click('Nova pelada');await input(host.querySelector('#whatslist')!,'1. Alfa\n2. Beta');await click('Revisar jogadores');
  expect(host.querySelector('#whatslist')).not.toBeNull();expect(host.textContent).toContain('pelo menos quatro');
});
