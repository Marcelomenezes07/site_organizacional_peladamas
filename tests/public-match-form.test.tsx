// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import PublicPeladaPage from '../src/PublicPelada';
import type {PublicPelada,Match} from '../lib/matches';
const api=vi.hoisted(()=>({getPelada:vi.fn(),changePelada:vi.fn()}));
vi.mock('../src/pelada-api',()=>({...api,PeladaError:class extends Error{status=500;}}));
let host:HTMLDivElement,root:Root,game:PublicPelada,version=1;
const button=(label:string,scope:ParentNode=document)=>Array.from(scope.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')===label||b.textContent?.trim()===label);
const click=async(label:string,scope:ParentNode=document)=>{const b=button(label,scope);expect(b,label).toBeTruthy();await act(async()=>b!.click());};
const dialog=()=>document.querySelector<HTMLElement>('[role="dialog"]')!;
const bump=()=>{game.etag=`version-${++version}`;};
const startMatch=async()=>{await click('Nova partida');await click('Time de Jogador A',dialog());await click('Time de Jogador C',dialog());await click('Começar partida',dialog());};
beforeEach(async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.stubGlobal('scrollTo',()=>{});version=1;
 game={number:1,createdAt:'2026-11-05',date:'2026-11-14',duration:8,serverNow:Date.now(),etag:'version-1',
  players:['A','B','C','D'].map(n=>({id:n.toLowerCase(),name:`Jogador ${n}`,goals:0,assists:0})),
  teams:[{id:'time-1',name:'Time 1',playerIds:['b','a'],leaderId:'a'},{id:'time-2',name:'Time 2',playerIds:['c'],leaderId:'c'},{id:'time-3',name:'Time 3',playerIds:['d'],leaderId:'d'}],matches:[]};
 vi.clearAllMocks();api.getPelada.mockImplementation(async()=>structuredClone(game));
 api.changePelada.mockImplementation(async(_n:number,body:{action:string;etag?:string;match?:Match;matchId?:string;op?:string;password?:string})=>{
  if(body.action==='clock'){game.matches=game.matches.map(m=>m.id===body.matchId?{...m,clock:{startedAt:body.op==='start'?Date.now():null,elapsed:0}}:m);bump();return;}
  if(body.etag!==game.etag)throw new Error('Esse registro mudou desde que você abriu.');
  if(body.action==='deleteMatch'){if(body.password!=='segredo')throw new Error('Senha da pelada incorreta.');game.matches=game.matches.filter(m=>m.id!==body.matchId);bump();return;}
  const m=structuredClone(body.match!);const old=game.matches.find(x=>x.id===m.id);if(old?.clock)m.clock=old.clock;
  game.matches=old?game.matches.map(x=>x.id===m.id?m:x):[...game.matches,m];bump();
 });
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<PublicPeladaPage number={1}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});

it('names teams by their reference player and keeps navigation at the bottom',async()=>{
 expect(document.querySelector('h1')?.textContent).toBe('Sáb, 14 nov');
 expect(document.querySelector('nav[aria-label="Página da pelada"]')?.textContent).toBe('JogoTimesResumo');
 await click('Times');
 expect(document.querySelector('.team-card h2')?.textContent).toContain('Time de Jogador A');
 expect(document.querySelector('.team-card li')?.innerHTML).toBe('<b>Jogador A</b>');
});
it('creates a match by tapping two teams and shows the organizer time',async()=>{
 await click('Nova partida');
 expect(dialog().textContent).toContain('8 min');
 expect(button('Começar partida',dialog())?.disabled).toBe(true);
 await click('Time de Jogador A',dialog());await click('Time de Jogador C',dialog());await click('Começar partida',dialog());
 expect(game.matches[0]).toMatchObject({homeId:'time-1',awayId:'time-2',status:'finished',homeScore:0,awayScore:0,goals:[]});
 expect(document.querySelector('.match-card')?.textContent).toContain('Partida 1 · agora');
 expect(document.querySelector('[role="timer"] .clock-time')?.textContent).toBe('08:00');
});
it('records a goal in three taps: goal, scorer, assist',async()=>{
 await startMatch();
 await click('Gol para Time de Jogador A');
 expect(dialog().querySelectorAll('select')).toHaveLength(0);
 await click('Jogador A',dialog());await click('Jogador B',dialog());
 expect(game.matches[0]).toMatchObject({homeScore:1,goals:[{teamId:'time-1',scorerId:'a',assistId:'b',ownGoal:false}]});
 expect(document.querySelector('[role="dialog"]')).toBeNull();
 expect(document.querySelector('[role="status"]')?.textContent).toContain('Gol de Jogador A · assistência de Jogador B');
});
it('saves a goal after a clock-only change without bothering the user',async()=>{
 await startMatch();
 await click('Gol para Time de Jogador C');
 game.matches[0].clock={startedAt:Date.now(),elapsed:0};bump();
 await click('Jogador C',dialog());await click('Sem assistência',dialog());
 expect(game.matches[0]).toMatchObject({awayScore:1,goals:[{scorerId:'c',assistId:null}]});
 expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it('warns when someone else changed the score and saves only on request',async()=>{
 await startMatch();
 await click('Gol para Time de Jogador A');
 game.matches[0]={...game.matches[0],homeScore:1,goals:[{teamId:'time-1',scorerId:'b',assistId:null,ownGoal:false}]};bump();
 await click('Jogador A',dialog());await click('Sem assistência',dialog());
 expect(dialog().textContent).toContain('O placar mudou em outro celular');
 expect(game.matches[0].goals).toHaveLength(1);
 await click('Salvar mesmo assim',dialog());
 expect(game.matches[0]).toMatchObject({homeScore:2});expect(game.matches[0].goals.map(g=>g.scorerId)).toEqual(['b','a']);
});
it('starts the shared clock',async()=>{
 await startMatch();
 await click('Iniciar');
 expect(api.changePelada).toHaveBeenLastCalledWith(1,{action:'clock',matchId:game.matches[0].id,op:'start'});
 expect(button('Pausar')).toBeTruthy();
});
it('edits a match on its own screen and asks before discarding changes',async()=>{
 await startMatch();await click('Gol para Time de Jogador A');await click('Jogador A',dialog());await click('Sem assistência',dialog());
 await click('Editar');
 expect(document.querySelector('nav[aria-label="Página da pelada"]')).toBeNull();
 await click('Remover gol 1');
 await click('Voltar');expect(dialog().textContent).toContain('Descartar');
 await click('Cancelar',dialog());
 await click('Salvar partida');
 expect(game.matches[0]).toMatchObject({homeScore:0,goals:[]});
 expect(document.querySelector('.match-card')).not.toBeNull();
});
it('changes the scorer of a goal inside the editor',async()=>{
 await startMatch();await click('Gol para Time de Jogador A');await click('Jogador A',dialog());await click('Sem assistência',dialog());
 await click('Editar');await click('Alterar gol 1');await click('Jogador B',dialog());await click('Jogador A',dialog());
 await click('Salvar partida');
 expect(game.matches[0].goals).toEqual([{teamId:'time-1',scorerId:'b',assistId:'a',ownGoal:false}]);
});
it('deletes a match only with the pelada password',async()=>{
 await startMatch();await click('Editar');await act(async()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.startsWith('Excluir partida'))!.click());
 const field=document.querySelector<HTMLInputElement>('#delete-match-password')!;
 const type=async(v:string)=>act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,v);field.dispatchEvent(new Event('input',{bubbles:true}));});
 await type('errada');await act(async()=>field.form!.requestSubmit());
 expect(dialog().textContent).toContain('Senha da pelada incorreta');expect(game.matches).toHaveLength(1);
 await type('segredo');await act(async()=>field.form!.requestSubmit());
 expect(game.matches).toHaveLength(0);
});
it('lists previous matches below the current one',async()=>{
 await startMatch();await startMatch();
 expect(document.querySelector('.match-card')?.textContent).toContain('Partida 2 · agora');
 expect(document.querySelector('.match-history')?.textContent).toContain('Partida 1');
});
it('shows small empty states in the summary before any goal',async()=>{
 await click('Resumo');
 expect(document.querySelectorAll('.summary-empty')).toHaveLength(3);
 expect(document.querySelectorAll('.leader-name')).toHaveLength(0);
});
it('creates a match when randomUUID is unavailable on local HTTP',async()=>{
 const original=Object.getOwnPropertyDescriptor(crypto,'randomUUID');
 Object.defineProperty(crypto,'randomUUID',{configurable:true,value:undefined});
 try{
  await startMatch();
  expect(game.matches[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 }finally{if(original)Object.defineProperty(crypto,'randomUUID',original);else delete (crypto as Partial<Crypto>).randomUUID;}
});
