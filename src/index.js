import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Service Worker registrieren für PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registriert:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker Registrierung fehlgeschlagen:', error);
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
