// Calendar dates stay as YYYY-MM-DD; never parse them in the browser's timezone.
export function validPeladaDate(value:unknown):value is string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>'9999-12-31')return false;
  const parsed=new Date(value+'T12:00:00Z');
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export function todayLocal(){
  const now=new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function formatPeladaDate(value?:string){
  return validPeladaDate(value)?value.split('-').reverse().join('/'):'';
}
const weekdays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const months=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
/** "Sáb, 15 nov" — calculado sem fuso horário. */
export function formatPeladaDay(value?:string){
  if(!validPeladaDate(value))return '';
  const [y,m,d]=value.split('-').map(Number);
  return `${weekdays[new Date(Date.UTC(y,m-1,d)).getUTCDay()]}, ${d} ${months[m-1]}`;
}
