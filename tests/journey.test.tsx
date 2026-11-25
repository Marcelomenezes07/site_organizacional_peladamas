// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import App from '../src/App';
import type {AppState} from '../lib/models';
let root:Root,host:HTMLDivElement,state:AppState,info:Record<string,unknown>;
const posts:Record<string,unknown>[]=[];
const button=(name:string)=>Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')===name||b.textContent?.trim()===name||b.textContent?.trim().startsWith(name));
const click=async(name:string)=>{const b=button(name);expect(b,name).toBeTruthy();await act(async()=>b!.click());};
const input=async(el:HTMLInputElement|HTMLTextAreaElement,value:string)=>{await act(async()=>{Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});};
const newcomers=()=>Array.from(document.querySelectorAll<HTMLButtonElement>('.row.newcomer'));
const inSheet=async(name:string)=>{const b=Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find(b=>b.textContent?.trim().startsWith(name));expect(b,name).toBeTruthy();await act(async()=>b!.click());};
const players=Array.from({length:4},(_,i)=>({id:String(i),name:`Jogador${i}`,aliases:'',stars:3}));
beforeEach(async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.stubGlobal('scrollTo',()=>{});
  posts.length=0;state={ranking:{players:[],etag:null},peladas:[]};info={teams:[],matches:[],players:[],etag:'p1'};
  vi.stubGlobal('fetch',vi.fn(async(url:string,options?:RequestInit)=>{
    if(String(url).includes('/api/pelada'))return Response.json({pelada:info});
    if(options?.method==='POST'){const body=JSON.parse(String(options.body));posts.push(body);return Response.json(body.action==='createPelada'?{ok:true,number:9}:{ok:true});}
    return Response.json({state});
  }));
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(<App onLogout={async()=>{}}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});

it('starts on Peladas with bottom tabs and keeps the review when going back to the list',async()=>{
  expect(document.querySelector('h1')?.textContent).toBe('Peladas');
  expect(document.querySelector('nav[aria-label="Áreas do organizador"]')?.textContent).toBe('PeladasRanking');
  await click('Nova pelada');
  expect(document.querySelector('nav[aria-label="Áreas do organizador"]')).toBeNull();
  await input(document.querySelector('#whatslist')!,'Peladamas quarta 21h\n1. Alfa\n2. Beta\n3. Gama\n4. Delta\n5. Epsilon\n6. Zeta\n7. Eta');
  await click('Revisar 7 jogadores');
  expect(document.querySelector('#whatslist')).toBeNull();
  expect(newcomers()).toHaveLength(7);
  await click('Alfa');
  await input(document.querySelector<HTMLInputElement>('#newcomer-name')!,'Alfa corrigido');
  await inSheet('Confirmar');
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await click('Voltar');expect((document.querySelector('#whatslist') as HTMLTextAreaElement).value).toContain('Alfa');
  await click('Revisar 7 jogadores');
  expect(newcomers()[0].textContent).toContain('Alfa corrigido');
  expect(newcomers()[0].textContent).toContain('Na lista: Alfa');
  await click('Beta');await inSheet('Tirar da lista');
  expect(newcomers()).toHaveLength(6);
});
it('does not advance with fewer than four names',async()=>{
  await click('Nova pelada');await input(document.querySelector('#whatslist')!,'1. Alfa\n2. Beta');await click('Revisar jogadores');
  expect(document.querySelector('#whatslist')).not.toBeNull();expect(document.querySelector('[role="alert"]')?.textContent).toContain('pelo menos quatro');
});
it('creates with the match time and the ranking switch, then waits for the new pelada',async()=>{
  state.ranking={players,etag:'r1'};
  await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));});
  await click('Nova pelada');
  await click('Aumentar tempo de cada partida');
  await input(document.querySelector('#whatslist')!,'1. Jogador0\n2. Jogador1\n3. Jogador2\n4. Novo');
  await click('Revisar 4 jogadores');
  expect(newcomers()).toHaveLength(1);
  await click('Adicionar os novos ao ranking');
  await click('Criar pelada com 4');
  expect(posts.at(-1)).toMatchObject({action:'createPelada',duration:11,addToRankingIds:[]});
  expect(document.body.textContent).toContain('Carregando a pelada');
});
it('reviews new names on a phone opening the dev server over http (no crypto.randomUUID)',async()=>{
  const original=Object.getOwnPropertyDescriptor(crypto,'randomUUID');
  Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true});
  try{
    await click('Nova pelada');
    await input(document.querySelector('#whatslist')!,'1. Alfa\n2. Beta\n3. Gama\n4. Delta');
    await click('Revisar 4 jogadores');
    expect(newcomers()).toHaveLength(4);
  }finally{if(original)Object.defineProperty(crypto,'randomUUID',original);else Reflect.deleteProperty(crypto,'randomUUID');}
});
it('links a new name to a ranking player by suggestion or search, and can undo',async()=>{
  state.ranking={players:[...players,{id:'p',name:'Paulo',aliases:'',stars:4}],etag:'r1'};
  await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));});
  await click('Nova pelada');
  await input(document.querySelector('#whatslist')!,'1. Jogador0\n2. Jogador1\n3. Jogador2\n4. Paulo Braz\n5. Jogador Três');
  await click('Revisar 5 jogadores');
  expect(newcomers()).toHaveLength(2);
  expect(newcomers()[0].textContent).toContain('Talvez seja Paulo');
  await click('Paulo Braz');await inSheet('Paulo');
  expect(newcomers()).toHaveLength(1);
  expect(document.body.textContent).toContain('Na lista: Paulo Braz · vira apelido');
  // Tocar no associado reabre o painel com ele marcado; "É novo" e "Confirmar" desfazem.
  await click('Paulo');
  expect(document.querySelector('[role="dialog"] [aria-pressed="true"]')?.textContent).toContain('Paulo');
  await inSheet('É novo');await inSheet('Confirmar');
  expect(newcomers()).toHaveLength(2);
  await click('Paulo Braz');await inSheet('Paulo');
  // "Jogador Três" não tem sugestão: abre direto em "é novo"; o Jogador3 é escolhido pela busca.
  await click('Jogador Três');
  expect(document.querySelector('[role="dialog"] h2')?.textContent).toBe('Jogador Três é novo');
  await inSheet('Buscar no ranking');
  await input(document.querySelector<HTMLInputElement>('[aria-label="Buscar no ranking"]')!,'jogador3');
  await inSheet('Jogador3');
  expect(newcomers()).toHaveLength(0);
  await click('Criar pelada com 5');
  expect(posts.at(-1)).toMatchObject({action:'createPelada',aliasLinks:[{id:'p',alias:'Paulo Braz'},{id:'3',alias:'Jogador Três'}]});
  expect((posts.at(-1)!.players as {id:string}[]).map(p=>p.id)).toEqual(['0','1','2','p','3']);
});
it('shows one main action per step: draw, then send to the group',async()=>{
  state={ranking:{players,etag:null},peladas:[{number:1,players,date:'2026-11-14',createdAt:'2026',etag:'v1',duration:10}]};
  await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));});
  expect(button('Sáb, 14 nov')?.textContent).toContain('Sem times');
  await click('Sáb, 14 nov');
  expect(document.querySelector('h1')?.textContent).toBe('Sáb, 14 nov');
  expect(button('Enviar no grupo')).toBeUndefined();
  await click('Sortear times');
  expect(document.querySelector('[role="dialog"] [role="radiogroup"]')).not.toBeNull();
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('2 times de 2');
  await click('Fechar');
  info={teams:[{id:'time-1',name:'Time 1',playerIds:['0','1'],leaderId:'0'},{id:'time-2',name:'Time 2',playerIds:['2','3'],leaderId:'2'}],matches:[],players:players.map(p=>({...p,goals:0,assists:0})),etag:'p2'};
  await click('Voltar');await click('Sáb, 14 nov');
  expect(button('Sortear times')).toBeUndefined();
  expect(document.body.textContent).toContain('Time de Jogador0');
  await click('Enviar no grupo');
  expect(document.querySelector('.wa-preview')?.textContent).toContain('TIME DE JOGADOR0');
});
it('changes the match time of a pelada',async()=>{
  state={ranking:{players,etag:null},peladas:[{number:1,players,createdAt:'2026',etag:'v1',duration:10}]};
  await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));});
  await click('Pelada 1');await click('Tempo de cada partida');await click('Aumentar tempo de cada partida');await click('Salvar');
  expect(posts.at(-1)).toEqual({action:'setPeladaDuration',number:1,duration:11,etag:'v1'});
});
it('opens the pelada page in the same window and comes back to the same pelada',async()=>{
  state={ranking:{players,etag:null},peladas:[{number:1,players,createdAt:'2026',etag:'v1',duration:10}]};
  info={teams:[{id:'time-1',name:'Time 1',playerIds:['0','1'],leaderId:'0'},{id:'time-2',name:'Time 2',playerIds:['2','3'],leaderId:'2'}],matches:[],players:players.map(p=>({...p,goals:0,assists:0})),etag:'p2'};
  await act(async()=>root.unmount());
  window.history.pushState(null,'','/adm?pelada=1');
  root=createRoot(host);await act(async()=>root.render(<App onLogout={async()=>{}}/>));
  expect(window.location.pathname+window.location.search).toBe('/adm');
  expect(document.querySelector('h1')?.textContent).toBe('Pelada 1');
  const links=Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/pelada/1"]'));
  expect(links.length).toBeGreaterThan(0);
  for(const a of links){expect(a.getAttribute('href')).toBe('/pelada/1?org=1');expect(a.target).toBe('');}
  window.history.pushState(null,'','/');
});
