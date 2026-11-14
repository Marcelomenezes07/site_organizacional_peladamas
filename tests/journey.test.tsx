// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import App from '../src/App';
let root:Root,host:HTMLDivElement;
const click=async(name:string)=>{const b=Array.from(host.querySelectorAll('button')).find(b=>(b.getAttribute('aria-label')||b.textContent?.trim())===name);expect(b).toBeTruthy();await act(async()=>b!.click());};
const input=async(el:HTMLInputElement|HTMLTextAreaElement,value:string)=>{await act(async()=>{Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});};
beforeEach(async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({state:{ranking:{players:[],etag:null},peladas:[]}})));
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(<App onLogout={async()=>{}}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
it('starts with peladas, shows one creation step and retains edits when going back',async()=>{
  expect(host.textContent).toContain('Sua próxima partida começa aqui.');await click('Nova pelada');
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
it('keeps selection, drawing and sharing on separate task screens',async()=>{
 const players=Array.from({length:4},(_,i)=>({id:String(i),name:`Jogador ${i}`,aliases:'',stars:3}));
 vi.mocked(fetch).mockImplementation(async(url)=>Response.json(String(url).includes('/api/pelada')?{pelada:{teams:[],matches:[]}}:{state:{ranking:{players,etag:null},peladas:[{number:1,players,date:'2026-12-05',createdAt:'2026',etag:'v1'}]}}));
 await click('Atualizar');expect(host.querySelector('#sourceSelect')).not.toBeNull();expect(host.querySelector('#sizeInput')).toBeNull();
 await click('Sortear times');expect(host.querySelector('#sourceSelect')).toBeNull();expect(host.querySelector('#sizeInput')).not.toBeNull();expect(host.querySelector('.share-pelada')).toBeNull();
 await click('Voltar');await click('Times e compartilhar');expect(host.querySelector('.share-pelada')).not.toBeNull();expect(host.querySelector('#sizeInput')).toBeNull();
});
it('never draws the previous pelada while a newly created one is still loading',async()=>{
 const players=Array.from({length:4},(_,i)=>({id:String(i),name:`Jogador${i}`,aliases:'',stars:3}));
 vi.mocked(fetch).mockImplementation(async(_url,options)=>Response.json(options?.method==='POST'?{ok:true,number:2}:{state:{ranking:{players,etag:'r1'},peladas:[{number:1,players,createdAt:'2026',etag:'old'}]}}));
 await click('Atualizar');await click('Nova pelada');await input(host.querySelector('#whatslist')!,'1. Jogador0\n2. Jogador1\n3. Jogador2\n4. Jogador3');await click('Revisar jogadores');await click('Criar pelada e continuar');
 expect(host.querySelector('#sizeInput')).toBeNull();expect(host.textContent).toContain('Carregando a pelada');
});
