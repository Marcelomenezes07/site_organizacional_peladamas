// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import App from '../src/App';
import type {AppState} from '../lib/models';
let host:HTMLDivElement,root:Root,state:AppState,writes:number;
const button=(label:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)||Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label);
const click=async(label:string)=>{const b=button(label);expect(b,label).toBeTruthy();await act(async()=>b!.click());};
const type=async(selector:string,value:string)=>{const el=document.querySelector<HTMLInputElement>(selector)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});};
const rows=()=>Array.from(document.querySelectorAll('.ranking-row')).map(r=>r.textContent);
beforeEach(async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.stubGlobal('scrollTo',()=>{});writes=0;
 state={ranking:{etag:'v1',players:[{id:'b',name:'Beta',aliases:'',stars:3},{id:'a',name:'Alfa',aliases:'Capitão',stars:5}]},peladas:[]};
 vi.stubGlobal('fetch',vi.fn(async(_url,options)=>{if(options?.method==='POST'){writes++;const body=JSON.parse(options.body);state.ranking={players:body.players,etag:`v${writes+1}`};return Response.json({ok:true});}return Response.json({state:structuredClone(state)});}));
 host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<App onLogout={async()=>{}}/>));await click('Ranking');
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
it('lists by rating and saves one player right away from the panel',async()=>{
 expect(rows()[0]).toContain('Alfa');expect(button('Salvar alterações')).toBeUndefined();
 await click('Editar Alfa, 5 estrelas');
 expect(document.querySelector<HTMLInputElement>('#player-name')?.value).toBe('Alfa');
 expect(document.querySelector<HTMLInputElement>('#player-aliases')?.value).toBe('Capitão');
 for(let i=0;i<5;i++)await click('Diminuir nota');
 await click('Salvar');
 expect(state.ranking.players).toEqual([{id:'b',name:'Beta',aliases:'',stars:3},{id:'a',name:'Alfa',aliases:'Capitão',stars:2.5}]);
 expect(document.querySelector('[role="dialog"]')).toBeNull();
 expect(rows()[0]).toContain('Beta');
 expect(document.querySelector('[role="status"]')?.textContent).toContain('Alfa salvo');
});
it('searches names and aliases',async()=>{
 await type('[aria-label="Buscar jogador"]','capi');
 expect(rows()).toHaveLength(1);expect(rows()[0]).toContain('Alfa');
 await type('[aria-label="Buscar jogador"]','zzz');
 expect(rows()).toHaveLength(0);expect(document.body.textContent).toContain('Nenhum jogador encontrado');
});
it('adds a player and refuses a duplicated name without writing',async()=>{
 await click('Adicionar jogador');await type('#player-name','alfa');await click('Salvar');
 expect(writes).toBe(0);expect(document.querySelector('[role="alert"]')?.textContent).toContain('Já existe');
 await type('#player-name','Gama');await click('Salvar');
 expect(state.ranking.players.map(p=>p.name)).toEqual(['Beta','Alfa','Gama']);
});
it('asks a second time before removing a player',async()=>{
 await click('Editar Beta, 3 estrelas');await click('Excluir jogador');
 expect(writes).toBe(0);expect(document.querySelector('[role="dialog"] h2')?.textContent).toBe('Excluir Beta?');
 await click('Excluir Beta');
 expect(state.ranking.players.map(p=>p.name)).toEqual(['Alfa']);
});
it('does not let a refresh started before saving overwrite the saved ranking',async()=>{
 let release!:()=>void;const stale=structuredClone(state);
 const base=vi.mocked(fetch).getMockImplementation()!;
 vi.mocked(fetch).mockImplementationOnce(async()=>{await new Promise<void>(r=>{release=r;});return Response.json({state:stale});});
 await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));});
 vi.mocked(fetch).mockImplementation(base);
 await click('Editar Alfa, 5 estrelas');await click('Diminuir nota');await click('Salvar');
 await act(async()=>{release();await new Promise(r=>setTimeout(r,0));});
 expect(rows().find(r=>r?.includes('Alfa'))).toContain('4,5');
});
