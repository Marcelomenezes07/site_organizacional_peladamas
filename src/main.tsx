import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Admin from './Admin';
import './styles.css';

if(window.location.pathname!=='/adm'&&window.location.pathname!=='/adm/')window.location.replace('/adm');
else createRoot(document.getElementById('root')!).render(<StrictMode><Admin /></StrictMode>);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{}));
}
