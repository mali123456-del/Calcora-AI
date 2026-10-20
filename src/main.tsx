import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'katex/dist/katex.min.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const registerOfflineWorker = () => {
    const workerUrl = `${import.meta.env.BASE_URL}sw.js`;
    void navigator.serviceWorker.register(workerUrl).catch(() => {
      // Offline support is progressive; never surface a registration failure as an app error.
      console.warn('Calcora offline support is unavailable in this browser context.');
    });
  };

  if (document.readyState === 'complete') registerOfflineWorker();
  else window.addEventListener('load', registerOfflineWorker, { once: true });
}
