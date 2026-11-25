import { describe,it,expect } from 'vitest';
import { parseWhatsAppList,matchPlayer,suggestPlayers,sortTeams,teamQuality,validStars } from '../lib/logic';
import { rankingToCsv,peladaToCsv,readCsv } from '../lib/csv';
import { starterPlayers } from '../lib/models';

describe('Listas de WhatsApp',()=>{
  it('remove numeração, marcas e lista de espera',()=>{
    expect(parseWhatsAppList('Peladamas quarta 21h:\n01.Jogador Á✅\n02. Jogador 02 ✅\n03. Jogador 08\nEspera:\nPaulinho')).toEqual(['Jogador Á','Jogador 02','Jogador 08']);
  });
  it('reconhece acentos e apelidos',()=>{
    expect(matchPlayer('jogador a',starterPlayers)?.name).toBe('Jogador Á');
    expect(matchPlayer('desconhecido',starterPlayers)).toBeNull();
    // O WhatsApp copia marcas invisíveis de direção, espaços de largura zero e "~" de contatos não salvos.
    const pasted='1. \u2068Jogador Á\u2069\n2.\u00A0~ Jogador\u200B 02\n3\uFE0F\u20E3 Jogador 08 ⚽\n4. \u200EJogador 08';
    const names=parseWhatsAppList(pasted);
    expect(names).toEqual(['Jogador Á','Jogador 02','Jogador 08']);
    expect(names.map(n=>matchPlayer(n,starterPlayers)?.name)).toEqual(['Jogador Á','Jogador 02','Jogador 08']);
    expect(matchPlayer('Jogador\u200E 02',starterPlayers)?.name).toBe('Jogador 02');
  });
  it('sugere quem do ranking é o nome com uma palavra a mais ou a menos, nos dois sentidos',()=>{
    const ranking=[{id:'1',name:'Paulo',aliases:'',stars:3},{id:'2',name:'Lucas',aliases:'',stars:3},{id:'3',name:'Godoy',aliases:'',stars:3},
      {id:'4',name:'Thiago Saraiva',aliases:'',stars:3},{id:'5',name:'Paulo Silva',aliases:'',stars:3},{id:'6',name:'Roberto',aliases:'Bob Braz',stars:3}];
    const names=(text:string)=>suggestPlayers(text,ranking).map(p=>p.name);
    expect(names('Paulo Braz')).toEqual(['Paulo']);
    // Lista com "Paulo" e dois Paulos no ranking: mostra os dois para quem organiza escolher.
    expect(names('paulo')).toEqual(['Paulo','Paulo Silva']);
    expect(names('Thiago')).toEqual(['Thiago Saraiva']);
    expect(names('Bob')).toEqual(['Roberto']);
    expect(names('Lucas Godoy')).toEqual(['Godoy','Lucas']);
    expect(names('Pires')).toEqual([]);
  });
  it('em lista numerada ignora data, local e avisos do cabeçalho',()=>{
    // Formato real do grupo: dois tipos de ✅ (um com seletor de variação invisível) e cabeçalho sem número.
    const pasted=['Peladamas','','\u{1F5D3}\uFE0F 25/11 - 21h - 23h','\u{1F4CD}Quadra Central','','R$20,00','PIX: 000','',
      '*Se não pagar até 18h30 do dia, entra alguém na espera*','','1. Jogador Á\u2705','2. Jogador 02 \u2705\uFE0F','3. Jogador 08 ','4. Novato\u2705\uFE0F'].join('\n');
    expect(parseWhatsAppList(pasted)).toEqual(['Jogador Á','Jogador 02','Jogador 08','Novato']);
    expect(parseWhatsAppList('Ana\nBia\nCaio')).toEqual(['Ana','Bia','Caio']);
  });
});
describe('CSV e estrelas',()=>{
  it('preserva pontuação e aspas',()=>{
    const row={id:'t',name:'Jogador 05 "Cacá"; Filho',aliases:'Cacá',stars:3.5};
    const read=readCsv(rankingToCsv([row]));expect(read.players).toEqual([row]);
    expect(readCsv(peladaToCsv({players:[row],createdAt:'2026-11-04T20:00:00Z'})).createdAt).toBe('2026-11-04T20:00:00Z');
  });
  it('permite apenas intervalo de 0,5',()=>{
    expect(validStars(4.5)).toBe(true);expect(validStars(3.7)).toBe(false);expect(validStars(0)).toBe(false);
  });
});
describe('Sorteio',()=>{
  it('não repete jogadores e mantém times equilibrados',()=>{
    const list=starterPlayers.slice(0,20);
    const teams=sortTeams(list,5);
    expect(teams).toHaveLength(4);
    expect(teams.every(t=>t.length===5)).toBe(true);
    expect(new Set(teams.flat().map(p=>p.id)).size).toBe(20);
    const avg=teams.map(t=>t.reduce((s,p)=>s+p.stars,0)/t.length);
    expect(Math.max(...avg)-Math.min(...avg)).toBeLessThanOrEqual(1);
  });
  it('inclui todos mesmo quando o total não é múltiplo de 5',()=>{
    const teams=sortTeams(starterPlayers.slice(0,17),5);
    expect(teams.flat()).toHaveLength(17);
    expect(Math.max(...teams.map(t=>t.length))-Math.min(...teams.map(t=>t.length))).toBeLessThanOrEqual(1);
  });
});

describe('Modos de equilíbrio',()=>{
  const players=[5,5,5,5,3,3,3,3,1,1,1,1].map((stars,i)=>({id:`p${i}`,name:`Pessoa ${i}`,aliases:'',stars}));
  it.each(['balanced','tiers','balanced-five-stars'] as const)('%s distribui níveis e mantém médias iguais',mode=>{
    const teams=sortTeams(players,3,mode);
    expect(teams).toHaveLength(4);
    for(const team of teams){
      expect(team.map(p=>p.stars).sort()).toEqual([1,3,5]);
    }
    expect(new Set(teams.flat().map(p=>p.id)).size).toBe(players.length);
    expect(players.map(p=>p.stars)).toEqual([5,5,5,5,3,3,3,3,1,1,1,1]);
  });
  it('distingue médias iguais com distribuições desiguais',()=>{
    const p=(stars:number)=>({id:String(stars),name:'Teste',aliases:'',stars});
    expect(teamQuality([[p(5),p(1)],[p(3),p(3)]],'tiers')).toBeGreaterThan(teamQuality([[p(5),p(1)],[p(3),p(3)]],'balanced'));
  });
  it.each(['balanced','tiers','balanced-five-stars'] as const)('%s preserva todos em tamanhos diferentes',mode=>{
    const teams=sortTeams(players.slice(0,11),4,mode);
    expect(teams.map(t=>t.length).sort()).toEqual([3,4,4]);
    expect(new Set(teams.flat().map(p=>p.id)).size).toBe(11);
  });
});

describe('Método opcional: equilíbrio geral + separação dos cinco estrelas',()=>{
  it.each([
    {total:12,fives:3,size:4},
    {total:12,fives:2,size:4},
    {total:12,fives:4,size:4},
    {total:17,fives:9,size:5},
    {total:17,fives:17,size:5},
    {total:17,fives:0,size:5},
    {total:4,fives:3,size:15},
  ])('distribui $fives cinco estrelas entre $total jogadores',({total,fives,size})=>{
    const players=Array.from({length:total},(_,i)=>({id:`five-${i}`,name:`Pessoa ${i}`,aliases:'',stars:i<fives?5:[0.5,1,2.5,3,4,4.5][i%6]}));
    const before=structuredClone(players);
    for(let run=0;run<8;run++){
      const teams=sortTeams(players,size,'balanced-five-stars');
      const counts=teams.map(t=>t.filter(p=>p.stars===5).length);
      expect(Math.max(...counts)-Math.min(...counts)).toBeLessThanOrEqual(1);
      expect(counts.reduce((a,b)=>a+b,0)).toBe(fives);
      expect(teams.flat().map(p=>p.id).sort()).toEqual(players.map(p=>p.id).sort());
      expect(Math.max(...teams.map(t=>t.length))-Math.min(...teams.map(t=>t.length))).toBeLessThanOrEqual(1);
    }
    expect(players).toEqual(before);
  });
});
