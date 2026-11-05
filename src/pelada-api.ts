import type {PublicPelada} from '../lib/matches';
export class PeladaError extends Error{constructor(message:string,public status:number){super(message);}}
export async function getPelada(number:number):Promise<PublicPelada>{
  const r=await fetch(`/api/pelada?number=${number}`,{cache:'no-store'});const result=await r.json();
  if(!r.ok)throw new PeladaError(result.error||'Não foi possível carregar a pelada.',r.status);return result.pelada;
}
export async function changePelada(number:number,body:unknown){
  const r=await fetch(`/api/pelada?number=${number}`,{method:'POST',headers:{'Content-Type':'application/json','X-Peladamas-Request':'1'},body:JSON.stringify(body)});
  const result=await r.json();if(!r.ok)throw new Error(result.error||'Não foi possível salvar.');
}
