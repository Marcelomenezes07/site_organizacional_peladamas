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
 host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<App onLogout={async()=>{}}/>));
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
