import { describe,it,expect } from 'vitest';
import { parseWhatsAppList,matchPlayer,sortTeams,teamQuality,validStars } from '../lib/logic';
import { rankingToCsv,peladaToCsv,readCsv } from '../lib/csv';
import { starterPlayers } from '../lib/models';

describe('Listas de WhatsApp',()=>{
  it('remove numeração, marcas e lista de espera',()=>{
    expect(parseWhatsAppList('Peladamas quarta 21h:\n01.Jogador Á✅\n02. Jogador 02 ✅\n03. Jogador 08\nEspera:\nPaulinho')).toEqual(['Jogador Á','Jogador 02','Jogador 08']);
  });
  it('reconhece acentos e apelidos',()=>{
    expect(matchPlayer('jogador a',starterPlayers)?.name).toBe('Jogador Á');
    expect(matchPlayer('desconhecido',starterPlayers)).toBeNull();
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
  it.each(['balanced','tiers'] as const)('%s distribui níveis e mantém médias iguais',mode=>{
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
  it.each(['balanced','tiers'] as const)('%s preserva todos em tamanhos diferentes',mode=>{
    const teams=sortTeams(players.slice(0,11),4,mode);
    expect(teams.map(t=>t.length).sort()).toEqual([3,4,4]);
    expect(new Set(teams.flat().map(p=>p.id)).size).toBe(11);
  });
});

describe('Cinco estrelas no equilíbrio geral',()=>{
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
      const teams=sortTeams(players,size,'balanced');
      const counts=teams.map(t=>t.filter(p=>p.stars===5).length);
      expect(Math.max(...counts)-Math.min(...counts)).toBeLessThanOrEqual(1);
      expect(counts.reduce((a,b)=>a+b,0)).toBe(fives);
      expect(teams.flat().map(p=>p.id).sort()).toEqual(players.map(p=>p.id).sort());
      expect(Math.max(...teams.map(t=>t.length))-Math.min(...teams.map(t=>t.length))).toBeLessThanOrEqual(1);
    }
    expect(players).toEqual(before);
  });
});
