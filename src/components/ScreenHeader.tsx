import {ArrowLeft} from 'lucide-react';
export default function ScreenHeader({title,context,onBack,disabled=false}:{title:string;context?:string;onBack:()=>void;disabled?:boolean}){
  return <header className="ds-screen-header ds-glass"><button type="button" className="button subtle ds-back" aria-label="Voltar" onClick={onBack} disabled={disabled}><ArrowLeft size={18} aria-hidden="true"/><span>Voltar</span></button><div><p>{context}</p><h2 tabIndex={-1}>{title}</h2></div></header>;
}
