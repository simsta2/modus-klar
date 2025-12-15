// Install Prompt Component für PWA
import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Prüfe ob App bereits installiert ist
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // App ist bereits installiert
    }

    // Event Listener für Install-Prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Zeige Install-Prompt
    deferredPrompt.prompt();
    
    // Warte auf Benutzer-Antwort
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Benutzer hat App installiert');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Speichere in localStorage, dass Prompt abgelehnt wurde
    localStorage.setItem('installPromptDismissed', 'true');
  };

  // Zeige Prompt nicht, wenn bereits abgelehnt
  if (!showPrompt || localStorage.getItem('installPromptDismissed') === 'true') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '1rem',
      right: '1rem',
      maxWidth: '28rem',
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: '1rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      padding: '1rem',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
          App installieren
        </p>
        <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>
          Installieren Sie Modus-Klar für besseren Zugriff
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleInstall}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Installieren
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: '#6B7280'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
