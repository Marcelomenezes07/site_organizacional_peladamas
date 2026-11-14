import PublicPeladaPage from './PublicPelada';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Admin from './Admin';
import './styles.css';
import './design.css';
import './design-system.css';

const publicMatch=window.location.pathname.match(/^\/pelada\/(\d+)\/?$/);
if(publicMatch)createRoot(document.getElementById('root')!).render(<StrictMode><PublicPeladaPage number={Number(publicMatch[1])}/></StrictMode>);
else if(window.location.pathname!=='/adm'&&window.location.pathname!=='/adm/')window.location.replace('/adm');
else createRoot(document.getElementById('root')!).render(<StrictMode><Admin /></StrictMode>);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{}));
}
