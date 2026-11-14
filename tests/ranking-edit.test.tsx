// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import App from '../src/App';
import type {AppState} from '../lib/models';
let host:HTMLDivElement,root:Root,state:AppState;
const click=async(label:string)=>{const b=document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)||Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()===label);expect(b).toBeTruthy();await act(async()=>b!.click());};
beforeEach(async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 state={ranking:{etag:'v1',players:[{id:'a',name:'Alfa',aliases:'Capitão',stars:5},{id:'b',name:'Beta',aliases:'',stars:3}]},peladas:[]};
 vi.stubGlobal('fetch',vi.fn(async(_url,options)=>{if(options?.method==='POST'){const body=JSON.parse(options.body);state.ranking={players:body.players,etag:'v2'};return Response.json({ok:true});}return Response.json({state});}));
 host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<App onLogout={async()=>{}}/>));await click('Ranking geral');await click('Lista');
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
it('keeps rows compact and opens only the chosen player editor',async()=>{
 expect(document.querySelectorAll('.ranking-field input')).toHaveLength(0);
 await click('Editar Alfa');expect(document.querySelectorAll('.ranking-field input')).toHaveLength(2);
 expect(document.querySelector<HTMLInputElement>('.alias')?.value).toBe('Capitão');
 await click('Editar Beta');expect(document.querySelectorAll('.ranking-field input')).toHaveLength(2);
 expect(document.querySelector<HTMLInputElement>('.inline-name')?.value).toBe('Beta');
 await click('Fechar edição de Beta');expect(document.querySelectorAll('.ranking-field input')).toHaveLength(0);
});
it('keeps ordering stable while editing stars and reorders after saving',async()=>{
 const select=document.querySelector<HTMLSelectElement>('[aria-label="Estrelas de Alfa"]')!;
 await act(async()=>{select.value='1';select.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(document.querySelector('.ranking-row')?.textContent).toContain('Alfa');
 expect(document.querySelector('.ranking-save')).not.toBeNull();
 await click('Salvar alterações');
 expect(state.ranking.players.find(p=>p.id==='a')?.stars).toBe(1);
 expect(document.querySelector('.ranking-row')?.textContent).toContain('Beta');
 expect(document.querySelector('.ranking-save')).toBeNull();
});
it('does not let a refresh started before saving overwrite the saved ranking',async()=>{
 let releaseStale!:()=>void;
 const stale=structuredClone(state);
 const base=vi.mocked(fetch).getMockImplementation()!;
 vi.mocked(fetch).mockImplementationOnce(async()=>{await new Promise<void>(r=>{releaseStale=r;});return Response.json({state:stale});});
 await click('Atualizar');
 const select=document.querySelector<HTMLSelectElement>('[aria-label="Estrelas de Alfa"]')!;
 await act(async()=>{select.value='1';select.dispatchEvent(new Event('change',{bubbles:true}));});
 vi.mocked(fetch).mockImplementation(base);
 await click('Salvar alterações');
 await act(async()=>{releaseStale();await new Promise(r=>setTimeout(r,0));});
 expect(state.ranking.players.find(p=>p.id==='a')?.stars).toBe(1);
 expect(document.querySelector<HTMLSelectElement>('[aria-label="Estrelas de Alfa"]')?.value).toBe('1');
 expect(document.querySelector('.ranking-row')?.textContent).toContain('Beta');
});
it('paginates both layouts and keeps edits from other pages when saving',async()=>{
 state.ranking.players=Array.from({length:14},(_,i)=>({id:`p${i}`,name:`Jogador ${String(i+1).padStart(2,'0')}`,aliases:'',stars:3}));
 await click('Atualizar');
 expect(document.querySelectorAll('.ranking-row')).toHaveLength(6);
 await click('Grade');
 expect(document.querySelector('.ranking-grid')).not.toBeNull();
 await click('Alterar estrelas de Jogador 01');
 const select=document.querySelector<HTMLSelectElement>('[aria-label="Estrelas de Jogador 01"]')!;
 await act(async()=>{select.value='4';select.dispatchEvent(new Event('change',{bubbles:true}));});
 await click('Próxima página de jogadores');
 expect(document.querySelector('.ranking-row')?.textContent).toContain('Jogador 07');
 await click('Lista');
 expect(document.querySelector('.ranking-list')).not.toBeNull();
 expect(document.querySelector('.ranking-row')?.textContent).toContain('Jogador 07');
 await click('Próxima página de jogadores');
 expect(document.querySelectorAll('.ranking-row')).toHaveLength(2);
 expect(document.querySelector<HTMLButtonElement>('[aria-label="Próxima página de jogadores"]')?.disabled).toBe(true);
 await click('Salvar alterações');
 expect(state.ranking.players).toHaveLength(14);
 expect(state.ranking.players.find(p=>p.id==='p0')?.stars).toBe(4);
});
it('searches the whole ranking and resets pagination, including no results',async()=>{
 state.ranking.players=Array.from({length:14},(_,i)=>({id:`p${i}`,name:`Jogador ${String(i+1).padStart(2,'0')}`,aliases:'',stars:3}));
 await click('Atualizar');await click('Próxima página de jogadores');
 const input=document.querySelector<HTMLInputElement>('[aria-label="Buscar jogador"]')!;
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
 await act(async()=>{setter.call(input,'Jogador 14');input.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(document.querySelectorAll('.ranking-row')).toHaveLength(1);
 expect(document.querySelector('.ranking-row')?.textContent).toContain('Jogador 14');
 expect(document.querySelector<HTMLButtonElement>('[aria-label="Página anterior de jogadores"]')?.disabled).toBe(true);
 await act(async()=>{setter.call(input,'Inexistente');input.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(document.querySelectorAll('.ranking-row')).toHaveLength(0);
 expect(document.querySelector('.ranking-pagination')?.textContent).toContain('0 jogadores');
});

it('lets a player name open just the star picker in grade view',async()=>{
 await click('Grade');
 expect(document.querySelector('[aria-label="Estrelas de Alfa"]')).toBeNull();
 await click('Alterar estrelas de Alfa');
 expect(document.querySelectorAll('.ranking-field input')).toHaveLength(0);
 const select=document.querySelector<HTMLSelectElement>('[aria-label="Estrelas de Alfa"]')!;
 await act(async()=>{select.value='4';select.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(document.querySelector('[aria-label="Estrelas de Alfa"]')).toBeNull();
 await click('Salvar alterações');
 expect(state.ranking.players.find(p=>p.id==='a')?.stars).toBe(4);
});
