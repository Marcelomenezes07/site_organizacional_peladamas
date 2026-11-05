// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import PublicPeladaPage from '../src/PublicPelada';
import type {PublicPelada} from '../lib/matches';
const api=vi.hoisted(()=>({getPelada:vi.fn(),changePelada:vi.fn()}));
vi.mock('../src/pelada-api',()=>({...api,PeladaError:class extends Error{status=500;}}));
let host:HTMLDivElement,root:Root,game:PublicPelada;
const click=async(label:string,scope:ParentNode=document)=>{
 const b=Array.from(scope.querySelectorAll('button')).find(b=>b.textContent===label)!;
 expect(b).toBeTruthy();await act(async()=>b.click());
};
beforeEach(async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 game={number:1,createdAt:'2026-11-05',etag:'version-1',players:[{id:'a',name:'Jogador A',goals:0,assists:0},{id:'b',name:'Jogador B',goals:0,assists:0}],teams:[{id:'time-1',name:'Time 1',playerIds:['a']},{id:'time-2',name:'Time 2',playerIds:['b']}],matches:[]};
 vi.clearAllMocks();api.getPelada.mockImplementation(async()=>structuredClone(game));
 api.changePelada.mockImplementation(async(_n,body)=>{game.matches=[structuredClone(body.match)];game.etag='version-2';});
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<PublicPeladaPage number={1}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('creates a scheduled match using only two team choices; result fields appear afterwards',async()=>{
 await click('Criar partida');
 let editor=document.querySelector('.match-editor')!;
 expect(editor.querySelectorAll('select')).toHaveLength(2);
 expect(editor.querySelectorAll('input')).toHaveLength(0);
 expect(editor.textContent).not.toContain('Situação');
 await click('Criar partida',editor);
 expect(api.changePelada).toHaveBeenCalledWith(1,expect.objectContaining({action:'saveMatch',etag:'version-1',match:expect.objectContaining({homeId:'time-1',awayId:'time-2',status:'scheduled',homeScore:0,awayScore:0,goals:[]})}));
 expect(document.querySelector('.match-editor')).toBeNull();
 expect(document.querySelector('.match-card')?.textContent).toContain('A JOGAR');
 await click('Adicionar resultado');
 editor=document.querySelector('.match-editor')!;
 expect(editor.querySelectorAll('input[type="number"]')).toHaveLength(2);
 expect(editor.textContent).toContain('Situação');
 await click('Salvar partida',editor);
 expect(api.changePelada).toHaveBeenLastCalledWith(1,expect.objectContaining({etag:'version-2',match:expect.objectContaining({status:'finished',homeScore:0,awayScore:0})}));
 expect(game.matches).toHaveLength(1);
});
it('prevents selecting the same team twice and cancels creation without saving',async()=>{
 await click('Criar partida');
 const selects=document.querySelectorAll<HTMLSelectElement>('.match-editor select');
 expect(selects[0].querySelector<HTMLOptionElement>('option[value="time-2"]')?.disabled).toBe(true);
 expect(selects[1].querySelector<HTMLOptionElement>('option[value="time-1"]')?.disabled).toBe(true);
 await click('Cancelar',document.querySelector('.match-editor')!);await click('Confirmar');
 expect(api.changePelada).not.toHaveBeenCalled();expect(document.querySelector('.match-editor')).toBeNull();
});
