export async function remote<T>(method:'GET'|'POST',body?:unknown):Promise<T>{
  const response=await fetch('/api/data',{method,cache:'no-store',headers:body?{'Content-Type':'application/json','X-Peladamas-Request':'1'}:{},...(body?{body:JSON.stringify(body)}:{})});
  if(response.status===401)window.dispatchEvent(new Event('auth-expired'));
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Erro de conexão com o servidor.');
  return result as T;
}

export function downloadCsv(fileName:string,csv:string){
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=fileName;document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

/** Copia texto; devolve false quando o navegador não permite, para a tela oferecer a cópia manual. */
export async function copyText(text:string){
  try{
    if(!navigator.clipboard?.writeText)return false;
    await navigator.clipboard.writeText(text);return true;
  }catch{return false;}
}

export type Run=<T=unknown>(body:unknown,success?:string)=>Promise<T|null>;
