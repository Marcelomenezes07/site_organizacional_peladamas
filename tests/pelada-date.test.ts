import {expect,it} from 'vitest';
import {validPeladaDate,formatPeladaDate} from '../lib/pelada-date';
import {readCsv} from '../lib/csv';
it('valida calendário e formata sem conversão de fuso',()=>{
  expect(validPeladaDate('2028-02-29')).toBe(true);
  for(const value of ['2026-02-29','2026-13-01','2026-04-31','',null])expect(validPeladaDate(value)).toBe(false);
  expect(formatPeladaDate('2026-12-05')).toBe('05/12/2026');
});
it('mantém CSV antigo sem inventar data da pelada',()=>{
  expect(readCsv('id;nome;estrelas;criada_em\np1;Jogador;3;2026-11-11\n').date).toBeUndefined();
});
