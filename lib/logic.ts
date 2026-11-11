import type { Player } from './models.js';

export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
export const formatStars = (value: number) => value.toLocaleString('pt-BR', {maximumFractionDigits:1});
export const validStars = (v: number) => Number.isFinite(v) && v>=0.5 && v<=5 && Number.isInteger(v*2);
export const starOptions = Array.from({length:10},(_,i)=>(i+1)/2);

export function parseWhatsAppList(input: string): string[] {
  const result:string[]=[];
  for (const raw of input.split(/\r?\n/)) {
    let s=raw.trim();
    if (/^\s*(espera|lista de espera|reservas|suplentes)\s*:/i.test(s)) break;
    if (!s || /^(pix|valor|r\$|quadra|data|hora|local|pelada|total|confirmados|pagos)\b/i.test(s)) continue;
    // Descarta prefácio textual de WhatsApp; aceita itens numerados ou linhas de nomes puros.
    s=s.replace(/^\s*(?:\d{1,3}\s*[.)\-:]\s*|[•*-]\s*)/,'');
    s=s.replace(/[✅✔☑☒⚽⭐🌟🔥💪❌✖]+/gu,'').trim();
    s=s.replace(/^@/,'').replace(/\s*\((?:pago|confirmado|pendente)\)\s*$/i,'').trim();
    if (!s || /^\d+$/.test(s) || /^https?:\/\//i.test(s) || /[:=]/.test(s)) continue;
    if (!/[\p{L}]/u.test(s)||s.length>64)continue;
    if (!result.some(r=>normalize(r)===normalize(s))) result.push(s);
  }
  return result;
}

export function matchPlayer(text: string, ranking: Player[]): Player | null {
  const name=normalize(text);
  if(!name)return null;
  const matches=ranking.filter(p=>[p.name,...p.aliases.split('|')].some(alias=>alias.trim() && normalize(alias)===name));
  return matches.length===1?matches[0]:null;
}

export type Team = Player[];
export type DrawMode = 'balanced' | 'tiers';
export function teamQuality(teams: Team[], mode:DrawMode='balanced'): number {
  if (!teams.length)return Infinity;
  const means=teams.map(t=>t.reduce((n,p)=>n+p.stars,0)/t.length);
  const avg=means.reduce((s,n)=>s+n,0)/means.length;
  const diff=Math.max(...means)-Math.min(...means);
  let distribution=0;
  // Compare proportions so a smaller team is not penalized for having fewer players.
  for(const band of [(s:number)=>s>=4,(s:number)=>s>=2.5&&s<4,(s:number)=>s<2.5]){
    const proportions=teams.map(t=>t.filter(p=>band(p.stars)).length/t.length);
    const mean=proportions.reduce((s,n)=>s+n,0)/teams.length;
    distribution+=proportions.reduce((s,n)=>s+(n-mean)**2,0);
  }
  return means.reduce((s,n)=>s+(n-avg)**2,0)*40+diff*12+distribution*(mode==='tiers'?80:4);
}

function shuffle<T>(data:T[]):T[] {
  const a=[...data];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}

export function sortTeams(players:Player[], perTeam:number, mode:DrawMode='balanced'):Team[] {
  if(players.length<4)throw new Error('É preciso ter pelo menos quatro jogadores.');
  if(!Number.isInteger(perTeam)||perTeam<2||perTeam>15)throw new Error('Tamanho inválido de time.');
  if(new Set(players.map(p=>p.id)).size!==players.length)throw new Error('Há jogadores repetidos.');
  if(players.some(p=>!validStars(p.stars)))throw new Error('Estrelas inválidas.');
  const count=Math.max(2,Math.ceil(players.length/perTeam));
  const capacity=Array.from({length:count},(_,i)=>Math.floor(players.length/count)+(i<players.length%count?1:0));
  const fiveStarCount=players.filter(p=>p.stars===5).length;
  const minFives=Math.floor(fiveStarCount/count),maxFives=Math.ceil(fiveStarCount/count);
  let best:Team[]=[];let bestQuality=Infinity;
  for(let round=0;round<24;round++) {
    const teams:Team[]=capacity.map(()=>[]);
    // Balanced mode makes five-star distribution a constraint, not a scoring preference.
    const fiveCounts=capacity.map(()=>0);
    if(mode==='balanced'){
      for(const player of shuffle(players.filter(p=>p.stars===5))){
        const available=shuffle(teams.map((_,i)=>i).filter(i=>teams[i].length<capacity[i]));
        available.sort((a,b)=>fiveCounts[a]-fiveCounts[b]);
        const target=available[0];teams[target].push(player);fiveCounts[target]++;
      }
    }
    const remaining=mode==='balanced'?players.filter(p=>p.stars!==5):players;
    if(round<12){
      // Randomize ties, then distribute strongest to weakest across available teams.
      for(const player of shuffle(remaining).sort((a,b)=>b.stars-a.stars)){
        const available=shuffle(teams.map((_,i)=>i).filter(i=>teams[i].length<capacity[i]));
        available.sort((a,b)=>teams[a].reduce((s,p)=>s+p.stars,0)/capacity[a]-teams[b].reduce((s,p)=>s+p.stars,0)/capacity[b]);
        teams[available[0]].push(player);
      }
    }else{
      const slots=shuffle(capacity.flatMap((n,i)=>Array(n-teams[i].length).fill(i) as number[]));
      shuffle(remaining).forEach((p,i)=>teams[slots[i]].push(p));
    }
    let current=teamQuality(teams,mode);
    for(let it=0;it<600;it++){
      const i=Math.floor(Math.random()*count); let j=Math.floor(Math.random()*(count-1)); if(j>=i)j++;
      const a=Math.floor(Math.random()*teams[i].length), b=Math.floor(Math.random()*teams[j].length);
      const delta=Number(teams[j][b].stars===5)-Number(teams[i][a].stars===5);
      if(mode==='balanced'&&(fiveCounts[i]+delta<minFives||fiveCounts[i]+delta>maxFives||fiveCounts[j]-delta<minFives||fiveCounts[j]-delta>maxFives))continue;
      [teams[i][a],teams[j][b]]=[teams[j][b],teams[i][a]];
      const next=teamQuality(teams,mode);
      if(next<current-1e-8||(Math.abs(next-current)<1e-8&&Math.random()<.35)){current=next;fiveCounts[i]+=delta;fiveCounts[j]-=delta;}
      else [teams[i][a],teams[j][b]]=[teams[j][b],teams[i][a]];
    }
    if(current<bestQuality-1e-8||(Math.abs(current-bestQuality)<1e-8&&Math.random()<.25)){
      best=teams.map(t=>[...t]);bestQuality=current;
    }
  }
  return best;
}
