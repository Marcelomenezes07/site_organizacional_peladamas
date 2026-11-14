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
 const b=Array.from(scope.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!;
 expect(b).toBeTruthy();await act(async()=>b.click());
};
beforeEach(async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 game={number:1,createdAt:'2026-11-05',etag:'version-1',players:[{id:'a',name:'Jogador A',goals:0,assists:0},{id:'b',name:'Jogador B',goals:0,assists:0},{id:'c',name:'Jogador C',goals:0,assists:0}],teams:[{id:'time-1',name:'Time 1',playerIds:['a']},{id:'time-2',name:'Time 2',playerIds:['b']},{id:'time-3',name:'Time 3',playerIds:['c']}],matches:[]};
 vi.clearAllMocks();api.getPelada.mockImplementation(async()=>structuredClone(game));
 api.changePelada.mockImplementation(async(_n,body)=>{game.matches=game.matches.some(m=>m.id===body.match.id)?game.matches.map(m=>m.id===body.match.id?structuredClone(body.match):m):[...game.matches,structuredClone(body.match)];game.etag='version-2';});
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<PublicPeladaPage number={1}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('creates a live match using only two team choices; keeps Edit without a status field',async()=>{
 await click('Criar partida');
 let editor=document.querySelector('.match-editor')!;
 expect(editor.querySelectorAll('select')).toHaveLength(2);
 expect(editor.querySelectorAll('input')).toHaveLength(0);
 expect(editor.textContent).not.toContain('Situação');
 await click('Criar partida',editor);
 expect(api.changePelada).toHaveBeenCalledWith(1,expect.objectContaining({action:'saveMatch',etag:'version-1',match:expect.objectContaining({homeId:'time-1',awayId:'time-2',status:'finished',homeScore:0,awayScore:0,goals:[]})}));
 expect(document.querySelector('.match-editor')).toBeNull();
 expect(document.querySelector('.match-card')?.textContent).toContain('0 × 0');
 await click('Editar');
 editor=document.querySelector('.match-editor')!;
 expect(editor.querySelector('.live-score')).not.toBeNull();
 expect(editor.textContent).not.toContain('Situação');
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

it('adds a goal from the match card, saves its scorer, and corrects it through Edit',async()=>{
 await click('Criar partida');await click('Criar partida',document.querySelector('.match-editor')!);
 await click('+ Gol · Time 1',document.querySelector('.match-card')!);
 expect(document.querySelector('.match-editor')).toBeNull();
 let editor=document.querySelector('.quick-goal')!;
 expect(editor.querySelectorAll('select')).toHaveLength(2);
 const scorer=editor.querySelector<HTMLSelectElement>('select')!;
 expect(scorer).not.toBeNull();
 await act(async()=>{scorer.value='a';scorer.dispatchEvent(new Event('change',{bubbles:true}));});
 await click('Salvar gol',editor);
 expect(game.matches[0].homeScore).toBe(1);expect(game.matches[0].goals[0].scorerId).toBe('a');
 await click('Editar');editor=document.querySelector('.match-editor')!;
 await act(async()=>editor.querySelector<HTMLButtonElement>('[aria-label="Remover gol 1"]')!.click());await click('Salvar partida',editor);
 expect(game.matches[0].homeScore).toBe(0);expect(game.matches[0].goals).toEqual([]);
 expect(game.matches).toHaveLength(1);
});

it('cancels a quick goal without changing the score or sending a write',async()=>{
 await click('Criar partida');await click('Criar partida',document.querySelector('.match-editor')!);
 const writes=api.changePelada.mock.calls.length;
 await click('+ Gol · Time 1',document.querySelector('.match-card')!);
 await click('Cancelar',document.querySelector('.quick-goal')!);
 expect(api.changePelada.mock.calls).toHaveLength(writes);expect(game.matches[0].homeScore).toBe(0);
 expect(document.querySelector('.quick-goal')).toBeNull();
});
it('keeps a failed quick goal visible and blocks a stale update instead of overwriting another score',async()=>{
 await click('Criar partida');await click('Criar partida',document.querySelector('.match-editor')!);
 await click('+ Gol · Time 1',document.querySelector('.match-card')!);
 const scorer=document.querySelector<HTMLSelectElement>('.quick-goal select')!;
 await act(async()=>{scorer.value='a';scorer.dispatchEvent(new Event('change',{bubbles:true}));});
 api.changePelada.mockImplementationOnce(async()=>{game.etag='version-3';throw new Error('Outro jogador atualizou o placar.');});
 await click('Salvar gol',document.querySelector('.quick-goal')!);
 expect(document.querySelector('.quick-goal')?.textContent).toContain('Outro jogador');
 const save=Array.from(document.querySelectorAll<HTMLButtonElement>('.quick-goal button')).find(b=>b.textContent==='Salvar gol')!;
 expect(save.disabled).toBe(true);expect(game.matches[0].homeScore).toBe(0);
});

it('asks before changing a team with goals and preserves events when canceled',async()=>{
 await click('Criar partida');await click('Criar partida',document.querySelector('.match-editor')!);
 await click('+ Gol · Time 1',document.querySelector('.match-card')!);
 const scorer=document.querySelector<HTMLSelectElement>('.quick-goal select')!;
 await act(async()=>{scorer.value='a';scorer.dispatchEvent(new Event('change',{bubbles:true}));});
 await click('Salvar gol',document.querySelector('.quick-goal')!);await click('Editar');
 const home=document.querySelector<HTMLSelectElement>('.match-editor select')!;
 await act(async()=>{home.value='time-3';home.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(document.querySelector('[role="dialog"]')?.textContent).toContain('remover os gols');
 await click('Cancelar',document.querySelector('[role="dialog"]')!);
 expect(document.querySelectorAll('.goal-entry')).toHaveLength(1);
 await click('Salvar partida',document.querySelector('.match-editor')!);
 expect(game.matches[0].homeId).toBe('time-1');expect(game.matches[0].homeScore).toBe(1);
});
it('keeps previous games in a collapsed section of this same pelada',async()=>{
 for(let i=0;i<2;i++){await click('Criar partida');await click('Criar partida',document.querySelector('.match-editor')!);}
 const history=document.querySelector<HTMLDetailsElement>('.match-history')!;
 expect(history.open).toBe(false);expect(history.textContent).toContain('Outros jogos desta pelada');
 expect(document.querySelector('.featured')?.textContent).toContain('Partida 2');
 expect(history.querySelector('.match-card')?.textContent).toContain('Partida 1');
});

it('opens and saves a match when randomUUID is unavailable on local HTTP',async()=>{
 const original=Object.getOwnPropertyDescriptor(crypto,'randomUUID');
 Object.defineProperty(crypto,'randomUUID',{configurable:true,value:undefined});
 try{
  await click('Criar partida');
  const editor=document.querySelector('.match-editor')!;
  expect(editor).not.toBeNull();expect(document.activeElement).toBe(document.querySelector('.ds-screen-header h2'));
  await click('Criar partida',editor);
  expect(game.matches).toHaveLength(1);
  expect(game.matches[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 }finally{if(original)Object.defineProperty(crypto,'randomUUID',original);else delete (crypto as Partial<Crypto>).randomUUID;}
});
it('shows small empty-state messages instead of leader names before any goals',async()=>{
 await click('Resumo');
 expect(document.querySelectorAll('.summary-empty')).toHaveLength(3);
 expect(document.querySelectorAll('.leader-name')).toHaveLength(0);
});
it('uses a dedicated editing screen and returns without changing the match',async()=>{
 await click('Criar partida');await click('Criar partida',document.querySelector('.match-editor')!);await click('Editar');
 expect(document.querySelector('.ds-editor-page')).not.toBeNull();
 expect(document.querySelector('.match-list')).toBeNull();
 expect(document.querySelector('[aria-label="Página da pelada"]')).toBeNull();
 await click('Voltar');await click('Confirmar');
 expect(document.querySelector('.ds-editor-page')).toBeNull();expect(game.matches).toHaveLength(1);
 expect(document.querySelector('.match-card')).not.toBeNull();
});
