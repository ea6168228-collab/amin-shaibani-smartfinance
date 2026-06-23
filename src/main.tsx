import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register service worker for offline installation security
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered successfully with scope: ', registration.scope);
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });
}

// Global PWA prompt handler to ensure we catch the event early
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).pwaPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-prompt-available', { detail: e }));
});

window.addEventListener('appinstalled', () => {
  (window as any).pwaInstalled = true;
  window.dispatchEvent(new CustomEvent('pwa-app-installed'));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
