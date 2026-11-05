import type { Pelada, Player } from './models.js';

const quote = (s: string) => /[;\r\n"]/.test(s) ? `"${s.replaceAll('"','""')}"` : s;
const enc = (cols: (string | number)[]) => cols.map(x => quote(String(x))).join(';');
const star = (n: number) => String(n).replace('.', ',');

export function rankingToCsv(players: Player[]): string {
  return '\ufeff' + [enc(['id','nome','apelidos','estrelas']), ...players.map(p=>enc([p.id,p.name,p.aliases,star(p.stars)]))].join('\r\n') + '\r\n';
}
export function peladaToCsv(pelada: Pick<Pelada,'players'|'createdAt'>&{matchFile?:string}): string {
  return '\ufeff' + [enc(['id','nome','apelidos','estrelas','criada_em','gols','assistencias','estado_partidas']), ...pelada.players.map(p=>enc([p.id,p.name,p.aliases,star(p.stars),pelada.createdAt,p.goals??0,p.assists??0,pelada.matchFile??'']))].join('\r\n') + '\r\n';
}

function rows(csv: string): string[][] {
  const data = csv.replace(/^\ufeff/,'');
  let field='', record:string[]=[], result:string[][]=[], inside=false;
  for (let i=0; i<data.length; i++) {
    const ch=data[i];
    if (ch==='"') {
      if (inside && data[i+1]==='"') {field+='"';i++;}
      else inside=!inside;
    } else if (ch===';' && !inside) {record.push(field);field='';}
    else if ((ch==='\n'||ch==='\r')&&!inside) {
      if (ch==='\r' && data[i+1]==='\n') i++;
      record.push(field);field='';
      if(record.some(x=>x.trim()!==''))result.push(record);
      record=[];
    } else field+=ch;
  }
  if (field || record.length) {record.push(field);result.push(record);}
  return result;
}
export function readCsv(csv: string): {players:Player[]; createdAt:string;matchFile?:string} {
  const records=rows(csv);
  if (!records.length) return {players:[],createdAt:''};
  const headers=records[0].map(h=>h.trim().toLowerCase());
  for (const name of ['id','nome','estrelas']) if (!headers.includes(name)) throw new Error('CSV sem coluna '+name);
  const idx=(key:string)=>headers.indexOf(key);
  const players:Player[]=records.slice(1).filter(r=>r.some(c=>c.trim())).map(r=>({
    id:r[idx('id')]?.trim()??'', name:r[idx('nome')]?.trim()??'',
    aliases:idx('apelidos')>=0?r[idx('apelidos')]?.trim()??'':'',
    stars:Number((r[idx('estrelas')]??'').replace(',','.')),
    ...(idx('gols')>=0?{goals:Number(r[idx('gols')]||0),assists:Number(r[idx('assistencias')]||0)}:{})
  }));
  const createdAt=idx('criada_em')>=0?records[1]?.[idx('criada_em')]??'':'';
  return {players,createdAt,matchFile:idx('estado_partidas')>=0?records[1]?.[idx('estado_partidas')]||undefined:undefined};
}
