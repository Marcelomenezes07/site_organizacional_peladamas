export type PublicPlayer={id:string;name:string;goals:number;assists:number};
export type SavedTeam={id:string;name:string;playerIds:string[]};
export type Goal={teamId:string;scorerId:string|null;assistId:string|null;ownGoal:boolean};
export type Match={id:string;homeId:string;awayId:string;status:'scheduled'|'finished';homeScore:number;awayScore:number;goals:Goal[]};
export type MatchState={teams:SavedTeam[];matches:Match[]};
export type PublicPelada=MatchState&{number:number;createdAt:string;players:PublicPlayer[];etag:string};
export function summarize(state:MatchState,players:Pick<PublicPlayer,'id'|'name'>[]){
  const totals=players.map(p=>({...p,goals:0,assists:0}));
  const table=state.teams.map(t=>({...t,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,balance:0,points:0}));
  for(const m of state.matches.filter(m=>m.status==='finished')){
    const home=table.find(t=>t.id===m.homeId),away=table.find(t=>t.id===m.awayId);if(!home||!away)continue;
    home.played++;away.played++;home.goalsFor+=m.homeScore;home.goalsAgainst+=m.awayScore;away.goalsFor+=m.awayScore;away.goalsAgainst+=m.homeScore;
    if(m.homeScore===m.awayScore){home.draws++;away.draws++;home.points++;away.points++;}
    else{const win=m.homeScore>m.awayScore?home:away,lose=win===home?away:home;win.wins++;win.points+=3;lose.losses++;}
    for(const goal of m.goals){if(goal.ownGoal)continue;const scorer=totals.find(p=>p.id===goal.scorerId),assist=totals.find(p=>p.id===goal.assistId);if(scorer)scorer.goals++;if(assist)assist.assists++;}
  }
  table.forEach(t=>{t.balance=t.goalsFor-t.goalsAgainst;});
  table.sort((a,b)=>b.points-a.points||b.balance-a.balance||b.goalsFor-a.goalsFor||a.name.localeCompare(b.name));
  return {table,totals};
}
export function validateMatch(value:unknown,teams:SavedTeam[]):Match{
  const fail=()=>{throw new Error('Partida inválida. Confira times, placar e autores dos gols.');};
  if(!value||typeof value!=='object')return fail();
  const m=value as Match;
  if(typeof m.id!=='string'||!/^[\w-]{1,75}$/.test(m.id))return fail();
  const home=teams.find(t=>t.id===m.homeId),away=teams.find(t=>t.id===m.awayId);
  if(!home||!away||home===away||!['scheduled','finished'].includes(m.status))return fail();
  if(![m.homeScore,m.awayScore].every(n=>Number.isInteger(n)&&n>=0&&n<=30)||!Array.isArray(m.goals)||m.goals.length>60)return fail();
  if(m.status==='scheduled'&&(m.homeScore!==0||m.awayScore!==0||m.goals.length))return fail();
  if(m.goals.filter(g=>g?.teamId===home.id).length!==m.homeScore||m.goals.filter(g=>g?.teamId===away.id).length!==m.awayScore||m.goals.length!==m.homeScore+m.awayScore)return fail();
  const goals=m.goals.map(g=>{
    if(!g||typeof g!=='object'||typeof g.ownGoal!=='boolean')return fail();
    const team=[home,away].find(t=>t.id===g.teamId);if(!team)return fail();
    if(g.ownGoal){if(g.scorerId!==null||g.assistId!==null)return fail();}
    else if(!team.playerIds.includes(g.scorerId??'')||(g.assistId!==null&&(!team.playerIds.includes(g.assistId)||g.assistId===g.scorerId)))return fail();
    return {teamId:g.teamId,scorerId:g.scorerId,assistId:g.assistId,ownGoal:g.ownGoal};
  });
  return {id:m.id,homeId:home.id,awayId:away.id,status:m.status,homeScore:m.homeScore,awayScore:m.awayScore,goals};
}
