import React, { useState, useRef, useEffect, useContext } from 'react';
import { registerUser, saveVideoRecord, loadUserProgress, loginUser, uploadVideo, requestPasswordReset, resetPassword, deleteUserAccount } from './api';
import AdminDashboard from './AdminDashboard';
// Ganz oben in App.js, nach den imports
import { supabase } from './supabaseClient';
import { initializeNotifications, requestNotificationPermission } from './notifications';
import InstallPrompt from './components/InstallPrompt';
import { ToastContext } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';

// Debug-Code entfernt für Production

// Einfache Icon-Komponenten mit Emojis
const Icon = ({ children, className, onClick }) => (
  <span className={className} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    {children}
  </span>
);

const Camera = (props) => <Icon {...props}>📷</Icon>;
const CheckCircle = (props) => <Icon {...props}>✅</Icon>;
const XCircle = (props) => <Icon {...props}>❌</Icon>;
const Calendar = (props) => <Icon {...props}>📅</Icon>;
const Euro = (props) => <Icon {...props}>💶</Icon>;
const Shield = (props) => <Icon {...props}>🛡️</Icon>;
const Clock = (props) => <Icon {...props}>⏰</Icon>;
const Play = (props) => <Icon {...props}>▶️</Icon>;
const Square = (props) => <Icon {...props}>⏹️</Icon>;
const Home = (props) => <Icon {...props}>🏠</Icon>;
const FileText = (props) => <Icon {...props}>📄</Icon>;
const HelpCircle = (props) => <Icon {...props}>❓</Icon>;
const Bell = (props) => <Icon {...props}>🔔</Icon>;
const AlertCircle = (props) => <Icon {...props}>⚠️</Icon>;
const CreditCard = (props) => <Icon {...props}>💳</Icon>;

// Haupt-App Komponente
const ModusKlarApp = () => {
  // Toast Context für Benachrichtigungen
  const toast = useContext(ToastContext);
  
  // Prüfe ob Admin-Modus über URL-Parameter
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminMode = urlParams.get('admin') === 'true';
  
  if (isAdminMode) {
    return <AdminDashboard />;
  }
  
  // Prüfe ob Simple Admin
if (urlParams.get('simple-admin') === 'true') {
  const SimpleAdmin = React.lazy(() => import('./SimpleAdmin'));
  return (
    <React.Suspense fallback={<div>Lade Admin...</div>}>
      <SimpleAdmin />
    </React.Suspense>
  );
}
  
  // State Management
  // Prüfe URL-Parameter für direkten Zugriff auf Seiten (z.B. Datenschutz)
  const screenParam = urlParams.get('screen');
  const initialScreen = screenParam || 'welcome';
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [resetToken, setResetToken] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [currentDay, setCurrentDay] = useState(1);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [successfulDays, setSuccessfulDays] = useState(0);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [todayVideos, setTodayVideos] = useState({ morning: null, evening: null });
  const [monthProgress, setMonthProgress] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentVideoType, setCurrentVideoType] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    agreed: false,
    challengeStartDate: null,
    notificationsEnabled: false
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [timeWindow, setTimeWindow] = useState({ morning: false, evening: false });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [adWatched, setAdWatched] = useState(false);
  const [adContainerId] = useState(`ad-container-${Date.now()}`);
  
  // Refs
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Styles
  const styles = {
    minHeight: { minHeight: '100vh' },
    gradient: { background: 'linear-gradient(to bottom right, #EBF8FF, #E9D8FD)' },
    container: { 
      maxWidth: '28rem', 
      margin: '0 auto', 
      padding: '1rem',
      width: '100%',
      boxSizing: 'border-box'
    },
    card: { 
      backgroundColor: 'white', 
      borderRadius: '1rem', 
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
      padding: '2rem',
      width: '100%',
      boxSizing: 'border-box'
    },
    button: { 
      background: 'linear-gradient(to right, #3B82F6, #9333EA)', 
      color: 'white', 
      padding: '0.75rem', 
      borderRadius: '0.5rem', 
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      width: '100%',
      boxSizing: 'border-box',
      touchAction: 'manipulation' // Bessere Touch-Performance
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #D1D5DB',
      borderRadius: '0.5rem',
      marginBottom: '1rem',
      fontSize: '16px', // Verhindert Zoom auf iOS
      boxSizing: 'border-box',
      WebkitAppearance: 'none', // Entfernt iOS-Stil
      appearance: 'none'
    }
  };

  // Offline-Erkennung
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      if (toast) {
        toast.warning('Keine Internetverbindung. Bitte überprüfen Sie Ihre Verbindung.');
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Offline-Erkennung
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      if (toast) {
        toast.warning('Keine Internetverbindung. Bitte überprüfen Sie Ihre Verbindung.');
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Initial Load - Check für bestehenden User und Email-Verifizierung
useEffect(() => {
  const checkExistingUser = async () => {
    // Prüfe URL-Parameter für direkten Zugriff auf Seiten (z.B. Datenschutz, Impressum)
    const urlParams = new URLSearchParams(window.location.search);
    const screenParam = urlParams.get('screen');
    
    // Wenn screen-Parameter gesetzt ist (z.B. ?screen=datenschutz), zeige diese Seite direkt an
    if (screenParam && ['datenschutz', 'impressum', 'app-info', 'delete-account'].includes(screenParam)) {
      setCurrentScreen(screenParam);
      // Für delete-account muss der Nutzer angemeldet sein
      if (screenParam === 'delete-account') {
        const savedUserId = localStorage.getItem('userId');
        if (!savedUserId) {
          setCurrentScreen('welcome');
          if (toast) {
            toast.error('Bitte melden Sie sich an, um Ihr Konto zu löschen.');
          }
          return;
        }
        setUserId(savedUserId);
      }
      return; // Früh beenden, damit Login-Check übersprungen wird
    }
    
    const savedUserId = localStorage.getItem('userId');
    const savedUserName = localStorage.getItem('userName');
    
    // Prüfe ob Verifizierungs-Token oder Reset-Token in URL ist
    const token = urlParams.get('token');
    const isResetPassword = window.location.pathname.includes('reset-password') || window.location.href.includes('reset-password');
    
    if (token && isResetPassword) {
      // Passwort-Reset
      setResetToken(token);
      setCurrentScreen('reset-password');
      return;
    }
    
    // Email-Verifizierung entfernt - nicht mehr nötig
    
    if (savedUserId && savedUserName) {
      setUserId(savedUserId);
      setUserData(prev => ({ ...prev, name: savedUserName }));
      setCurrentScreen('dashboard');
      
      // Lade Fortschritt
      await loadProgress(savedUserId);
      
      // Benachrichtigungen initialisieren
      await requestNotificationPermission();
      await initializeNotifications(savedUserId);
    }
  };
  
  checkExistingUser();
}, []);

  // Zeitfenster-Check
useEffect(() => {
  const checkTimeWindows = () => {
    const now = new Date();
    const hour = now.getHours();
    
    setTimeWindow({
      morning: hour >= 9 && hour < 12,
      evening: hour >= 20 && hour < 23
    });
  };
  
  checkTimeWindows();
  const interval = setInterval(checkTimeWindows, 60000); // Jede Minute prüfen
  return () => clearInterval(interval);
}, []);

// Fortschritts-Array generieren
useEffect(() => {
  const progress = Array(30).fill(null).map((_, i) => {
    if (i < currentDay - 1) {
      return { day: i + 1, morning: 'verified', evening: 'verified' };
    } else if (i === currentDay - 1) {
      return { day: currentDay, morning: todayVideos.morning, evening: todayVideos.evening };
    }
    return { day: i + 1, morning: null, evening: null };
  });
  setMonthProgress(progress);
}, [currentDay, todayVideos]);

// Auto-Refresh Statistik alle 30 Sekunden wenn auf Dashboard
useEffect(() => {
  if (currentScreen === 'dashboard' && userId) {
    // Lade sofort beim Dashboard-Öffnen
    loadProgress(userId);
    
    // Dann alle 30 Sekunden aktualisieren
    const interval = setInterval(() => {
      if (userId) {
        loadProgress(userId);
      }
    }, 30000); // 30 Sekunden
    
    return () => clearInterval(interval);
  }
}, [currentScreen, userId]);

// Recording Screen Effect
useEffect(() => {
  if (currentScreen === 'recording') {
    startCamera();
    return () => {
      stopCamera();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }
}, [currentScreen]);

// Lade Nutzer-Fortschritt aus Datenbank - NUR EINMAL DEFINIERT!
const loadProgress = async (userId) => {
  if (!userId) return;
  try {
    const result = await loadUserProgress(userId);
    if (result.success) {
      // Wenn Reset oder Neustart durchgeführt wurde, zeige Toast
      if (result.wasReset) {
        if (toast) {
          toast.warning('Challenge wurde zurückgesetzt. Ein Tag wurde verpasst oder ein Video abgelehnt.');
        }
      } else if (result.wasRestarted) {
        if (toast) {
          toast.success('Herzlichen Glückwunsch! 30 Tage erfolgreich abgeschlossen. Challenge startet neu!');
        }
      }
      
      // Verwende die berechnete Streak und aktuellen Tag
      setCurrentDay(result.currentDay || 1);
      setCurrentStreak(result.currentStreak || 0);
      
      // Berechne erfolgreiche Tage
      const successful = result.progress.filter(p => 
        p.morning_status === 'verified' && p.evening_status === 'verified'
      ).length;
      setSuccessfulDays(successful);
      
      // Finde den Status für heute
      const todayProgress = result.progress.find(p => p.day_number === result.currentDay);
      if (todayProgress) {
        setTodayVideos({
          morning: todayProgress.morning_status,
          evening: todayProgress.evening_status
        });
      } else {
        setTodayVideos({ morning: null, evening: null });
      }
    }
  } catch (error) {
      // Fehler beim Laden des Fortschritts - wird stillschweigend behandelt
  }
};

  // Registrierung Handler
  const handleRegistration = async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    // Validierung
    if (!userData.name || userData.name.trim().length < 2) {
      const errorMsg = 'Bitte geben Sie einen gültigen Namen ein (mindestens 2 Zeichen).';
      setErrorMessage(errorMsg);
      if (toast) toast.error(errorMsg);
      setIsLoading(false);
      return;
    }
    
    if (!userData.email || !userData.email.includes('@')) {
      const errorMsg = 'Bitte geben Sie eine gültige Email-Adresse ein.';
      setErrorMessage(errorMsg);
      if (toast) toast.error(errorMsg);
      setIsLoading(false);
      return;
    }
    
    if (!userData.password || userData.password.length < 6) {
      const errorMsg = 'Passwort muss mindestens 6 Zeichen lang sein.';
      setErrorMessage(errorMsg);
      if (toast) toast.error(errorMsg);
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await registerUser(userData);
      
      if (result.success) {
        if (toast) {
          toast.success('Registrierung erfolgreich! Sie werden zum Dashboard weitergeleitet.');
        }
        setUserId(result.user.id);
        localStorage.setItem('userId', result.user.id);
        localStorage.setItem('userName', result.user.name);
        setCurrentScreen('dashboard');
        
        // Lade Fortschritt
        await loadProgress(result.user.id);
        
        // Benachrichtigungen initialisieren wenn aktiviert
        if (userData.notificationsEnabled) {
          await requestNotificationPermission();
          await initializeNotifications(result.user.id);
        }
      } else {
        const errorMsg = 'Registrierung fehlgeschlagen: ' + result.error;
        setErrorMessage(errorMsg);
        if (toast) toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
      setErrorMessage(errorMsg);
      if (toast) toast.error(errorMsg);
    }
    
    setIsLoading(false);
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    setUserId(null);
    setUserData({ 
      name: '', 
      email: '', 
      password: '',
      agreed: false,
      challengeStartDate: null,
      notificationsEnabled: false
    });
    setLoginPassword('');
    setCurrentDay(1);
    setTodayVideos({ morning: null, evening: null });
    setCurrentScreen('welcome');
  };

  // Kamera-Funktionen
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      if (toast) {
        toast.error('Kamera-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Einstellungen.');
      }
      setCurrentScreen('dashboard');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    setIsRecording(true);
    setRecordingTime(0);
    
    const chunks = [];
    
    try {
      const options = { mimeType: 'video/webm' };
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
   mediaRecorderRef.current.onstop = async () => {
  const blob = new Blob(chunks, { type: 'video/webm' });
  
  if (userId && blob.size > 0) {
    setTodayVideos(prev => ({
      ...prev,
      [currentVideoType]: 'uploading'
    }));
    
    try {
      const uploadResult = await uploadVideo(blob, userId, currentVideoType, currentDay);
      
      if (uploadResult.success) {
        setTodayVideos(prev => ({
          ...prev,
          [currentVideoType]: 'pending'
        }));
        if (toast) {
          toast.success('Video erfolgreich hochgeladen! Es wird nun geprüft.');
        }
        await loadProgress(userId);
      } else {
        if (toast) {
          toast.error('Upload fehlgeschlagen: ' + (uploadResult.error || 'Unbekannter Fehler'));
        }
        setTodayVideos(prev => ({
          ...prev,
          [currentVideoType]: null
        }));
      }
    } catch (error) {
      if (toast) {
        toast.error('Fehler beim Hochladen. Bitte überprüfen Sie Ihre Internetverbindung.');
      }
      setTodayVideos(prev => ({
        ...prev,
        [currentVideoType]: null
      }));
    }
  } else {
    if (toast) {
      toast.error('Upload konnte nicht durchgeführt werden. Bitte versuchen Sie es erneut.');
    }
  }
};
      
      mediaRecorderRef.current.start();
      
      // Timer für Aufnahmedauer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      if (toast) {
        toast.error('Fehler beim Starten der Aufnahme. Bitte versuchen Sie es erneut.');
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    stopCamera();
    setCurrentScreen('dashboard');
  };

  // RENDER FUNCTIONS

  const renderWelcomeScreen = () => (
    <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
      <div style={styles.container}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <div style={{ 
            width: '5rem', 
            height: '5rem', 
            background: 'linear-gradient(to right, #3B82F6, #9333EA)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '2.5rem'
          }}>
            <Shield />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Modus-Klar</h1>
          <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
            30 Tage persönliche Challenge – bleib am Ball
          </p>

          <div style={{ backgroundColor: '#F3F4F6', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.7rem', color: '#6B7280', lineHeight: 1.4 }}>
              Freiwillige Lifestyle-App für persönliche Ziele. Dokumentiere deinen Fortschritt – ohne medizinische Bewertung.
            </p>
          </div>
          
          <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '1rem' }}>
              <CheckCircle />
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Tägliche Erinnerungen für dein Check-ins</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '1rem' }}>
              <CheckCircle />
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>2x täglich Fortschritt per Video festhalten</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '1rem' }}>
              <CheckCircle />
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Videos werden auf Vollständigkeit geprüft</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
              <CheckCircle />
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Bestätigung bei erfolgreichem Abschluss der Challenge</p>
            </div>
          </div>
          
          <div style={{ backgroundColor: '#DBEAFE', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
              Modus-Klar hilft dir, ein persönliches Ziel strukturiert umzusetzen – freiwillig und in deinem Tempo.
            </p>
          </div>
          
          <button
            onClick={() => setCurrentScreen('requirements')}
            style={styles.button}
            aria-label="Neue Registrierung starten"
          >
            Neue Registrierung starten
          </button>
          <button
            onClick={() => setCurrentScreen('login')}
            style={{
              ...styles.button,
              marginTop: '1rem',
              background: '#6B7280'
            }}
            aria-label="Bereits registriert? Anmelden"
          >
            Bereits registriert? Anmelden
          </button>
        </div>
      </div>
    </div>
  );
const renderLoginScreen = () => {

    const handleLogin = async () => {
      setIsLoading(true);
      setLoginError('');
      
      if (!loginPassword) {
        setLoginError('Bitte geben Sie Ihr Passwort ein.');
        setIsLoading(false);
        return;
      }
      
      const result = await loginUser(loginEmail, loginPassword);
      
      if (result.success) {
        setUserId(result.user.id);
        setUserData(result.user);
        setCurrentScreen('dashboard');
        loadProgress(result.user.id);
        setLoginPassword(''); // Passwort-Feld leeren
        
        // Benachrichtigungen initialisieren wenn aktiviert
        if (result.user.notifications_enabled) {
          await requestNotificationPermission();
          await initializeNotifications(result.user.id);
        }
      } else {
        setLoginError(result.error);
        setLoginPassword(''); // Passwort-Feld leeren bei Fehler
      }
      
      setIsLoading(false);
    };

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #EBF8FF, #E9D8FD)', padding: '1rem' }}>
        <div style={{ maxWidth: '28rem', margin: '0 auto', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '2rem' }}>
            <button 
              onClick={() => setCurrentScreen('welcome')}
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              ←
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Anmelden</h2>
            
            {loginError && (
              <div style={{ 
                backgroundColor: '#FEE2E2', 
                color: '#DC2626', 
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {loginError}
              </div>
            )}
            
            <input
              type="email"
              placeholder="Ihre Email-Adresse"
              style={styles.input}
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loginLoading && handleLogin()}
              aria-label="Email-Adresse für Anmeldung"
              autoComplete="email"
              autoCapitalize="none"
              disabled={loginLoading}
            />
            <input
              type="password"
              placeholder="Ihr Passwort"
              style={styles.input}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loginLoading && handleLogin()}
              aria-label="Passwort für Anmeldung"
              autoComplete="current-password"
              disabled={loginLoading}
            />
            
            <button
              onClick={handleLogin}
              style={{
                background: loginEmail && loginPassword && !isLoading ? 'linear-gradient(to right, #3B82F6, #9333EA)' : '#D1D5DB',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                border: 'none',
                cursor: loginEmail && loginPassword && !isLoading ? 'pointer' : 'not-allowed',
                width: '100%',
                marginBottom: '1rem'
              }}
              disabled={!loginEmail || !loginPassword || isLoading}
            >
              {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
            
            <button
              onClick={() => setCurrentScreen('forgot-password')}
              style={{
                background: 'none',
                border: 'none',
                color: '#3B82F6',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.875rem',
                width: '100%',
                padding: '0.5rem'
              }}
            >
              Passwort vergessen?
            </button>
          </div>
        </div>
      </div>
    );
  };
  const renderRequirementsScreen = () => (
    <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
      <div style={styles.container}>
        <div style={styles.card}>
          <button 
            onClick={() => setCurrentScreen('welcome')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.5rem', 
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ←
          </button>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Voraussetzungen</h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#FEF3C7', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                <AlertCircle />
                <div>
                  <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Video-Tagebuch</p>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    Für deine tägliche Dokumentation nimmst du kurze Videos auf.
                    Tipps findest du direkt in der App.
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{ backgroundColor: '#D1FAE5', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                <Bell />
                <div>
                  <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Tägliche Benachrichtigungen</p>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    Erinnerungen für Ihre Check-in-Zeiten:<br/>
                    Morgens: 9-12 Uhr<br/>
                    Abends: 20-23 Uhr
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setCurrentScreen('registration')}
            style={styles.button}
          >
            Verstanden, weiter zur Registrierung
          </button>
        </div>
      </div>
    </div>
  );

  const renderRegistrationScreen = () => (
    <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
      <div style={styles.container}>
        <div style={styles.card}>
          <button 
            onClick={() => setCurrentScreen('requirements')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.5rem', 
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ←
          </button>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Registrierung</h2>
          
          {errorMessage && (
            <div style={{ 
              backgroundColor: '#FEE2E2', 
              color: '#DC2626', 
              padding: '0.75rem', 
              borderRadius: '0.5rem', 
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {errorMessage}
            </div>
          )}
          
          <div>
            <div>
              <input
                type="text"
                placeholder="Vollständiger Name"
                style={{
                  ...styles.input,
                  borderColor: userData.name && userData.name.trim().length < 2 ? '#DC2626' : styles.input.border,
                  marginBottom: userData.name && userData.name.trim().length > 0 && userData.name.trim().length < 2 ? '0.25rem' : '1rem'
                }}
                value={userData.name}
                onChange={(e) => setUserData({...userData, name: e.target.value})}
                aria-invalid={userData.name && userData.name.trim().length < 2}
                aria-describedby={userData.name && userData.name.trim().length < 2 ? 'name-error' : undefined}
              />
              {userData.name && userData.name.trim().length > 0 && userData.name.trim().length < 2 && (
                <p id="name-error" style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                  Name muss mindestens 2 Zeichen lang sein.
                </p>
              )}
            </div>
            
            <div>
              <input
                type="email"
                placeholder="E-Mail-Adresse"
                style={{
                  ...styles.input,
                  borderColor: userData.email && !userData.email.includes('@') ? '#DC2626' : styles.input.border,
                  marginBottom: userData.email && !userData.email.includes('@') ? '0.25rem' : '1rem'
                }}
                value={userData.email}
                onChange={(e) => setUserData({...userData, email: e.target.value})}
                aria-invalid={userData.email && !userData.email.includes('@')}
                aria-describedby={userData.email && !userData.email.includes('@') ? 'email-error' : undefined}
              />
              {userData.email && !userData.email.includes('@') && (
                <p id="email-error" style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                  Bitte geben Sie eine gültige Email-Adresse ein.
                </p>
              )}
            </div>
            
            <div>
              <input
                type="password"
                placeholder="Passwort (mindestens 6 Zeichen)"
                style={{
                  ...styles.input,
                  borderColor: userData.password && userData.password.length > 0 && userData.password.length < 6 ? '#DC2626' : styles.input.border,
                  marginBottom: userData.password && userData.password.length > 0 && userData.password.length < 6 ? '0.25rem' : '1rem'
                }}
                value={userData.password}
                onChange={(e) => setUserData({...userData, password: e.target.value})}
                aria-invalid={userData.password && userData.password.length > 0 && userData.password.length < 6}
                aria-describedby={userData.password && userData.password.length > 0 && userData.password.length < 6 ? 'password-error' : undefined}
              />
              {userData.password && userData.password.length > 0 && userData.password.length < 6 && (
                <p id="password-error" style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                  Passwort muss mindestens 6 Zeichen lang sein.
                </p>
              )}
            </div>
            
          </div>
          
          <div style={{ backgroundColor: '#DBEAFE', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Teilnahmebedingungen:</h3>
              <ul style={{ fontSize: '0.875rem', color: '#6B7280', paddingLeft: '1.5rem' }}>
                <li>30 Tage tägliche Check-ins</li>
                <li>2 Videos täglich in den Zeitfenstern</li>
                <li>Video innerhalb 1 Stunde nach Erinnerung</li>
                <li>Regelmäßige Teilnahme erforderlich</li>
                <li>Verpasste/abgelehnte Videos = Neustart</li>
              </ul>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={userData.agreed}
                onChange={(e) => setUserData({...userData, agreed: e.target.checked})}
                style={{ marginTop: '0.25rem' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                Ich akzeptiere die{' '}
                <span
                  onClick={(e) => { e.stopPropagation(); setShowTerms(true); }} 
                  style={{ color: '#3B82F6', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Teilnahmebedingungen
                </span>
                .
              </span>
            </label>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={userData.notificationsEnabled}
                onChange={(e) => setUserData({...userData, notificationsEnabled: e.target.checked})}
                style={{ marginTop: '0.25rem' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                Ich erlaube Push-Benachrichtigungen für Check-in-Zeiten
              </span>
            </label>
          </div>
          
          <button
            onClick={handleRegistration}
            style={{
              ...styles.button,
              ...(userData.agreed && userData.name && userData.email && userData.password && userData.password.length >= 6 && userData.notificationsEnabled && !isLoading
                ? {}
                : { background: '#D1D5DB', cursor: 'not-allowed' })
            }}
            disabled={!userData.agreed || !userData.name || !userData.email || !userData.password || userData.password.length < 6 || !userData.notificationsEnabled || isLoading}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <LoadingSpinner size="small" text="" />
                Wird registriert...
              </span>
            ) : (
              'Challenge starten'
            )}
          </button>
        </div>
        
        {showTerms && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50
          }}>
            <div style={{
              ...styles.card,
              maxWidth: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Teilnahmebedingungen</h3>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                <p style={{ marginBottom: '0.75rem' }}><strong>1. Programmdauer:</strong> 30 aufeinanderfolgende Tage</p>
                <p style={{ marginBottom: '0.75rem' }}><strong>2. Check-in-Zeiten:</strong></p>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                  <li>Morgens: 9:00 - 12:00 Uhr</li>
                  <li>Abends: 20:00 - 23:00 Uhr</li>
                  <li>Video innerhalb 60 Minuten nach Benachrichtigung</li>
                </ul>
                <p style={{ marginBottom: '0.75rem' }}><strong>3. Anforderungen:</strong></p>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                  <li>Video zeigt die vereinbarte Dokumentation deutlich</li>
                  <li>Ergebnis am Display mindestens 5 Sekunden sichtbar</li>
                </ul>
                <p style={{ marginBottom: '0.75rem' }}><strong>4. Ablehnung erfolgt bei:</strong></p>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                  <li>Unvollständiger oder undeutlicher Aufnahme</li>
                  <li>Abweichung von den Challenge-Regeln</li>
                  <li>Manipulation</li>
                  <li>Verpasstem Check-in</li>
                </ul>
                <p style={{ marginBottom: '0.75rem' }}><strong>5. Neustart:</strong> Bei Ablehnung oder verpasstem Check-in startet das Programm von Tag 1</p>
                <p style={{ marginBottom: '0.75rem' }}><strong>6. Datenschutz:</strong> Videos werden nur zur internen Prüfung verwendet und nach Programmende gelöscht</p>
                <p style={{ marginBottom: '0.75rem' }}><strong>7. Abschluss:</strong> Nach erfolgreichem Abschluss der Challenge erhältst du eine Bestätigung deiner Teilnahme</p>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                style={{
                  ...styles.button,
                  background: '#1F2937',
                  marginTop: '1.5rem'
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => {
    return (
    <div style={{ ...styles.minHeight, ...styles.gradient, paddingBottom: '2rem', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <div style={{ ...styles.container, padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Modus-Klar</h1>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Tag {currentDay} von 30</p>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{userData.name || 'Nutzer'}</p>
              <button
                onClick={handleLogout}
                style={{ 
                  fontSize: '0.75rem', 
                  color: '#DC2626', 
                  background: 'none', 
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  marginRight: '0.5rem'
                }}
              >
                Abmelden
              </button>
              <button
                onClick={() => setCurrentScreen('delete-account')}
                style={{ 
                  fontSize: '0.75rem', 
                  color: '#DC2626', 
                  background: 'none', 
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
                aria-label="Konto löschen"
              >
                Konto löschen
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div style={styles.container}>
        {!isOnline && (
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle />
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#DC2626' }}>
              Keine Internetverbindung. Bitte überprüfen Sie Ihre Verbindung.
            </p>
          </div>
        )}
        {(timeWindow.morning || timeWindow.evening) && (
          <div style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Bell />
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#92400E' }}>
              Check-in-Zeit aktiv! Du hast noch 60 Minuten
            </p>
          </div>
        )}
        
        <div style={{ ...styles.card, marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Heutige Check-ins</h2>
          
          <div>
            {/* Morgen-Check-in */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock />
                <div>
                  <p style={{ fontWeight: '500' }}>Morgen-Check-in</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>9:00 - 12:00 Uhr</p>
                </div>
              </div>
              {todayVideos.morning === 'verified' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle />
                  <span style={{ fontSize: '0.75rem', color: '#059669' }}>Bestätigt</span>
                </div>
              ) : todayVideos.morning === 'uploading' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LoadingSpinner size="small" text="" />
                  <span style={{ fontSize: '0.75rem', color: '#3B82F6' }}>Wird hochgeladen...</span>
                </div>
              ) : todayVideos.morning === 'pending' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#F59E0B', animation: 'pulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: '0.75rem', color: '#F59E0B' }}>Wird geprüft...</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (timeWindow.morning) {
                      setCurrentVideoType('morning');
                      setAdWatched(false);
                      setCurrentScreen('ad');
                    }
                  }}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: timeWindow.morning ? 'pointer' : 'not-allowed',
                    backgroundColor: timeWindow.morning ? '#3B82F6' : '#D1D5DB',
                    color: timeWindow.morning ? 'white' : '#9CA3AF',
                    minHeight: '44px', // Mindest-Touch-Target für Mobile
                    touchAction: 'manipulation'
                  }}
                  disabled={!timeWindow.morning}
                  aria-label={timeWindow.morning ? 'Morgen-Check-in jetzt durchführen' : 'Morgen-Check-in - Zeitfenster geschlossen'}
                >
                  {timeWindow.morning ? 'Video aufnehmen' : 'Zeitfenster geschlossen'}
                </button>
              )}
            </div>
            
            {/* Abend-Check-in */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock />
                <div>
                  <p style={{ fontWeight: '500' }}>Abend-Check-in</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>20:00 - 23:00 Uhr</p>
                </div>
              </div>
              {todayVideos.evening === 'verified' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle />
                  <span style={{ fontSize: '0.75rem', color: '#059669' }}>Bestätigt</span>
                </div>
              ) : todayVideos.evening === 'uploading' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LoadingSpinner size="small" text="" />
                  <span style={{ fontSize: '0.75rem', color: '#3B82F6' }}>Wird hochgeladen...</span>
                </div>
              ) : todayVideos.evening === 'pending' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#F59E0B', animation: 'pulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: '0.75rem', color: '#F59E0B' }}>Wird geprüft...</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (timeWindow.evening) {
                      setCurrentVideoType('evening');
                      setAdWatched(false);
                      setCurrentScreen('ad');
                    }
                  }}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: timeWindow.evening ? 'pointer' : 'not-allowed',
                    backgroundColor: timeWindow.evening ? '#9333EA' : '#D1D5DB',
                    color: timeWindow.evening ? 'white' : '#9CA3AF',
                    minHeight: '44px', // Mindest-Touch-Target für Mobile
                    touchAction: 'manipulation'
                  }}
                  disabled={!timeWindow.evening}
                  aria-label={timeWindow.evening ? 'Abend-Check-in jetzt durchführen' : 'Abend-Check-in - Zeitfenster geschlossen'}
                >
                  {timeWindow.evening ? 'Video aufnehmen' : 'Zeitfenster geschlossen'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Statistiken */}
        <div style={{ ...styles.card, marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Ihre Statistiken
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem'
          }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#DBEAFE',
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E40AF', margin: 0 }}>
                {currentStreak}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
                Tage Streak
              </p>
            </div>
            <div style={{
              padding: '1rem',
              backgroundColor: '#D1FAE5',
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#065F46', margin: 0 }}>
                {successfulDays}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
                Erfolgreiche Tage
              </p>
            </div>
            <div style={{
              padding: '1rem',
              backgroundColor: '#FEF3C7',
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400E', margin: 0 }}>
                {30 - currentDay + 1}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
                Tage verbleibend
              </p>
            </div>
          </div>
        </div>
        
        <div style={{ ...styles.card, marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Fortschritt (Tag {currentDay} von 30)
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0.5rem'
          }}>
            {monthProgress.map((day) => (
              <div
                key={day.day}
                style={{
                  aspectRatio: '1',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  backgroundColor: 
                    day.morning === 'verified' && day.evening === 'verified'
                      ? '#10B981'
                      : day.day === currentDay
                      ? '#3B82F6'
                      : day.day < currentDay
                      ? '#EF4444'
                      : '#E5E7EB',
                  color: 
                    day.morning === 'verified' && day.evening === 'verified'
                      ? 'white'
                      : day.day === currentDay
                      ? 'white'
                      : day.day < currentDay
                      ? 'white'
                      : '#6B7280'
                }}
                title={
                  day.morning === 'verified' && day.evening === 'verified'
                    ? `Tag ${day.day}: Beide Check-ins bestätigt`
                    : day.day === currentDay
                    ? `Tag ${day.day}: Aktueller Tag`
                    : day.day < currentDay
                    ? `Tag ${day.day}: Nicht vollständig`
                    : `Tag ${day.day}: Noch nicht erreicht`
                }
              >
                {day.day}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <div style={{
              width: '100%',
              height: '0.5rem',
              backgroundColor: '#E5E7EB',
              borderRadius: '9999px',
              overflow: 'hidden',
              marginBottom: '0.5rem'
            }}>
              <div style={{
                width: `${Math.round((successfulDays / 30) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(to right, #3B82F6, #9333EA)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>
              {successfulDays} von 30 Tagen erfolgreich ({Math.round((successfulDays / 30) * 100)}%)
            </p>
          </div>
        </div>
        
        <div style={{
          ...styles.card,
          background: 'linear-gradient(to right, #10B981, #059669)',
          color: 'white',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Dein Ziel bei Erfolg</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem', marginTop: '0.125rem' }}>🏆</span>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Challenge geschafft!</p>
                    <p style={{ fontSize: '0.875rem', opacity: 0.95, margin: '0.25rem 0 0 0' }}>30 Tage durchgehalten</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem', marginTop: '0.125rem' }}>✨</span>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Persönlicher Erfolg</p>
                    <p style={{ fontSize: '0.875rem', opacity: 0.95, margin: '0.25rem 0 0 0' }}>Du hast dein Ziel erreicht</p>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '3rem', opacity: 0.3, marginLeft: '1rem' }}>
              <Shield />
            </div>
          </div>
        </div>
        
        {userId && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem', 
            backgroundColor: 'rgba(255,255,255,0.5)', 
            borderRadius: '0.5rem',
            fontSize: '0.625rem',
            color: '#9CA3AF',
            textAlign: 'center'
          }}>
            ID: {userId}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <Footer setCurrentScreen={setCurrentScreen} />
    </div>
    );
  };

  // AdSense Script laden (einmalig)
  useEffect(() => {
    if (currentScreen === 'ad' && !window.adsbygoogle) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID';
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, [currentScreen]);

  // Werbe-Screen vor Videoaufnahme
  const renderAdScreen = () => {
    const adContainerRef = useRef(null);
    
    useEffect(() => {
      // Initialisiere Ad nach kurzer Verzögerung
      const timer = setTimeout(() => {
        try {
          if (window.adsbygoogle && adContainerRef.current) {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          }
        } catch (e) {
          // AdSense Error - stillschweigend behandeln
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }, []);
    
    const handleSkipAd = () => {
      setAdWatched(true);
      setCurrentScreen('recording');
    };
    
    return (
      <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              📺 Werbung
            </h2>
            
            <div style={{
              backgroundColor: '#F3F4F6',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: '#4B5563',
              lineHeight: '1.6'
            }}>
              <p style={{ marginBottom: '0.75rem' }}>
                <strong>Warum Werbung?</strong>
              </p>
              <p style={{ marginBottom: '0.75rem' }}>
                Die Modus-Klar App ist für dich kostenlos. Um die Kosten für Server, Video-Speicher und Prüfung zu decken, zeigen wir vor jeder Videoaufnahme eine kurze Werbung.
              </p>
              <p style={{ marginBottom: '0.75rem' }}>
                <strong>Ihre Vorteile:</strong>
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li>✅ Kostenlose Nutzung der App</li>
                <li>✅ Keine versteckten Kosten</li>
                <li>✅ Unterstützung eines freiwilligen persönlichen Ziels</li>
              </ul>
              <p style={{ margin: 0 }}>
                <span 
                  onClick={() => setCurrentScreen('why-ads')} 
                  style={{ 
                    color: '#3B82F6', 
                    textDecoration: 'underline', 
                    cursor: 'pointer' 
                  }}
                >
                  Mehr erfahren
                </span>
              </p>
            </div>
            
            {/* AdSense Container */}
            <div 
              ref={adContainerRef}
              id={adContainerId}
              style={{
                minHeight: '250px',
                width: '100%',
                marginBottom: '1.5rem',
                backgroundColor: '#F9FAFB',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #D1D5DB',
                position: 'relative'
              }}
            >
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', height: '250px' }}
                data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
                data-ad-slot="YOUR_AD_SLOT_ID"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
              {/* Placeholder während Ad lädt */}
              <div style={{ 
                position: 'absolute', 
                color: '#9CA3AF', 
                fontSize: '0.875rem',
                pointerEvents: 'none'
              }}>
                Werbung wird geladen...
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setCurrentScreen('dashboard')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #D1D5DB',
                  background: 'white',
                  color: '#4B5563',
                  fontWeight: '600',
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSkipAd}
                style={{
                  flex: 2,
                  ...styles.button,
                  touchAction: 'manipulation'
                }}
              >
                Weiter zur Aufnahme
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Erklärungsseite für Werbung
  const renderWhyAdsScreen = () => (
    <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
      <div style={styles.container}>
        <div style={styles.card}>
          <button
            onClick={() => setCurrentScreen('ad')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ←
          </button>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Warum Werbung?
          </h2>

          <div style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '1rem' }}>
              Die Modus-Klar App ist für Sie vollständig kostenlos. Um diese kostenlose Nutzung zu ermöglichen, finanzieren wir die App durch Werbung.
            </p>

            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
              💰 Was kostet die App?
            </h3>
            <p style={{ marginBottom: '1rem' }}>
              Die App selbst kostet Sie nichts. Wir zeigen lediglich vor jeder Videoaufnahme (2x täglich) eine kurze Werbung.
            </p>

            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
              🎯 Warum ist Werbung nötig?
            </h3>
            <p style={{ marginBottom: '0.75rem' }}>
              Um die App kostenlos anbieten zu können, müssen wir folgende Kosten decken:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Server- und Hosting-Kosten für die App</li>
              <li>Video-Speicherplatz (jedes Video wird sicher gespeichert)</li>
              <li>Prüfung durch geschultes Personal</li>
              <li>Entwicklung und Wartung der App</li>
              <li>Support und Kundenservice</li>
            </ul>

            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
              🚀 Zukünftige Optionen
            </h3>
            <p style={{ marginBottom: '1rem' }}>
              In Zukunft planen wir eine Premium-Version ohne Werbung. Premium-Nutzer können dann eine Einzahlung tätigen und erhalten ihr Geld bei erfolgreichem Abschluss zurück - plus einen Bonus!
            </p>

            <div style={{
              backgroundColor: '#DBEAFE',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginTop: '1.5rem'
            }}>
              <p style={{ margin: 0, fontWeight: '600', color: '#1E40AF' }}>
                💡 Ihre Daten bleiben geschützt: Wir verwenden nur vertrauenswürdige Werbenetzwerke, die Ihre Privatsphäre respektieren.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecordingScreen = () => {
    
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'black', position: 'relative' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />
        
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
          padding: '1rem',
          zIndex: 10
        }}>
          <div style={styles.container}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '0.5rem',
              padding: '1rem'
            }}>
              <h3 style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem' }}>Anleitung für dein Video:</h3>
              <ol style={{ fontSize: '0.875rem', color: '#4B5563', paddingLeft: '1.5rem', margin: 0 }}>
                <li>Halte dein Handy stabil</li>
                <li>Starte die Aufnahme</li>
                <li>Zeige deine Dokumentation deutlich</li>
                <li>Führe den vereinbarten Ablauf durch</li>
                <li>Zeige das Anzeige-Ergebnis mindestens 5 Sekunden</li>
                <li>Gesamtdauer: ca. 30 Sekunden</li>
              </ol>
            </div>
          </div>
        </div>
        
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '2rem',
          zIndex: 10
        }}>
          <div style={styles.container}>
            {isRecording && (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#DC2626',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px'
                }}>
                  <div style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    animation: 'pulse 1s ease-in-out infinite'
                  }} />
                  <span style={{ fontWeight: '500' }}>{recordingTime}s / 30s</span>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                  width: '5rem',
                  height: '5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isRecording ? '#DC2626' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  touchAction: 'manipulation',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
                aria-label={isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}
              >
                {isRecording ? (
                  <Square style={{ fontSize: '2rem', color: 'white' }} />
                ) : (
                  <div style={{
                    width: '4rem',
                    height: '4rem',
                    backgroundColor: '#DC2626',
                    borderRadius: '50%'
                  }} />
                )}
              </button>
            </div>
            
            {!isRecording && (
              <button
                onClick={() => {
                  stopCamera();
                  setCurrentScreen('dashboard');
                }}
                style={{
                  position: 'absolute',
                  top: '-3rem',
                  left: '1rem',
                  color: 'white',
                  background: 'rgba(0,0,0,0.5)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '0.5rem',
                  minHeight: '44px',
                  touchAction: 'manipulation'
                }}
                aria-label="Aufnahme abbrechen und zurück zum Dashboard"
              >
                ← Abbrechen
              </button>
            )}
          </div>
        </div>
        
        <style>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}</style>
        <style>{`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  };

  // Passwort vergessen Screen
  const renderForgotPasswordScreen = () => {
    const handleRequestReset = async () => {
      setIsLoading(true);
      setLoginError('');
      
      if (!resetEmail) {
        setLoginError('Bitte geben Sie Ihre Email-Adresse ein.');
        setIsLoading(false);
        return;
      }
      
      const result = await requestPasswordReset(resetEmail);
      
      if (result.success) {
        if (toast) {
          toast.success('Falls diese Email registriert ist, wurde ein Passwort-Reset-Link gesendet. Prüfen Sie Ihr Postfach.');
        }
        setCurrentScreen('login');
      } else {
        setLoginError(result.error || 'Ein Fehler ist aufgetreten.');
      }
      
      setIsLoading(false);
    };

    return (
      <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
        <div style={styles.container}>
          <div style={styles.card}>
            <button 
              onClick={() => setCurrentScreen('login')}
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              ←
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Passwort zurücksetzen</h2>
            
            {loginError && (
              <div style={{ 
                backgroundColor: '#FEE2E2', 
                color: '#DC2626', 
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {loginError}
              </div>
            )}
            
            <p style={{ color: '#6B7280', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Geben Sie Ihre Email-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
            </p>
            
            <input
              type="email"
              placeholder="Ihre Email-Adresse"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '16px'
              }}
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRequestReset()}
            />
            
            <button
              onClick={handleRequestReset}
              style={{
                background: resetEmail && !isLoading ? 'linear-gradient(to right, #3B82F6, #9333EA)' : '#D1D5DB',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                border: 'none',
                cursor: resetEmail && !isLoading ? 'pointer' : 'not-allowed',
                width: '100%'
              }}
              disabled={!resetEmail || isLoading}
            >
              {isLoading ? 'Wird gesendet...' : 'Reset-Link senden'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Passwort zurücksetzen Screen
  const renderResetPasswordScreen = () => {
    const handleResetPassword = async () => {
      setIsLoading(true);
      setLoginError('');
      
      if (!resetPasswordValue || resetPasswordValue.length < 6) {
        setLoginError('Passwort muss mindestens 6 Zeichen lang sein.');
        setIsLoading(false);
        return;
      }
      
      if (resetPasswordValue !== resetPasswordConfirm) {
        setLoginError('Passwörter stimmen nicht überein.');
        setIsLoading(false);
        return;
      }
      
      const result = await resetPassword(resetToken, resetPasswordValue);
      
      if (result.success) {
        if (toast) {
          toast.success('Passwort wurde erfolgreich zurückgesetzt! Sie können sich jetzt anmelden.');
        } else {
          alert('Passwort wurde erfolgreich zurückgesetzt! Sie können sich jetzt anmelden.');
        }
        setResetToken(null);
        setResetPasswordValue('');
        setResetPasswordConfirm('');
        setCurrentScreen('login');
      } else {
        setLoginError(result.error);
      }
      
      setIsLoading(false);
    };

    return (
      <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Neues Passwort setzen</h2>
            
            {loginError && (
              <div style={{ 
                backgroundColor: '#FEE2E2', 
                color: '#DC2626', 
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {loginError}
              </div>
            )}
            
            <input
              type="password"
              placeholder="Neues Passwort (mindestens 6 Zeichen)"
              style={styles.input}
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
            />
            {resetPasswordValue && resetPasswordValue.length > 0 && resetPasswordValue.length < 6 && (
              <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                Passwort muss mindestens 6 Zeichen lang sein.
              </p>
            )}
            
            <input
              type="password"
              placeholder="Passwort bestätigen"
              style={styles.input}
              value={resetPasswordConfirm}
              onChange={(e) => setResetPasswordConfirm(e.target.value)}
            />
            {resetPasswordConfirm && resetPasswordValue !== resetPasswordConfirm && (
              <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                Passwörter stimmen nicht überein.
              </p>
            )}
            
            <button
              onClick={handleResetPassword}
              style={{
                ...styles.button,
                ...(resetPasswordValue && resetPasswordValue.length >= 6 && resetPasswordValue === resetPasswordConfirm && !isLoading
                  ? {}
                  : { background: '#D1D5DB', cursor: 'not-allowed' })
              }}
              disabled={!resetPasswordValue || resetPasswordValue.length < 6 || resetPasswordValue !== resetPasswordConfirm || isLoading}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <LoadingSpinner size="small" text="" />
                  Wird zurückgesetzt...
                </span>
              ) : (
                'Passwort zurücksetzen'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Email-Verifizierung Screens entfernt - nicht mehr nötig

  // Footer-Komponente
  const Footer = ({ setCurrentScreen }) => (
    <div style={{
      marginTop: '2rem',
      padding: '1.5rem 1rem',
      borderTop: '1px solid rgba(0,0,0,0.1)',
      backgroundColor: 'rgba(255,255,255,0.5)'
    }}>
      <div style={styles.container}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '1rem',
          fontSize: '0.875rem',
          color: '#6B7280'
        }}>
          <button
            onClick={() => setCurrentScreen('app-info')}
            style={{
              background: 'none',
              border: 'none',
              color: '#3B82F6',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.875rem',
              padding: 0
            }}
          >
            Über die App
          </button>
          <span>•</span>
          <button
            onClick={() => setCurrentScreen('impressum')}
            style={{
              background: 'none',
              border: 'none',
              color: '#3B82F6',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.875rem',
              padding: 0
            }}
          >
            Impressum
          </button>
          <span>•</span>
          <button
            onClick={() => setCurrentScreen('datenschutz')}
            style={{
              background: 'none',
              border: 'none',
              color: '#3B82F6',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.875rem',
              padding: 0
            }}
          >
            Datenschutz
          </button>
          {userId && (
            <>
              <span>•</span>
              <button
                onClick={() => setCurrentScreen('delete-account')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.875rem',
                  padding: 0
                }}
              >
                Konto löschen
              </button>
            </>
          )}
        </div>
        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#9CA3AF',
          marginTop: '0.75rem',
          marginBottom: 0
        }}>
          © {new Date().getFullYear()} Modus-Klar. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );

  // Impressum-Seite
  const renderImpressumScreen = () => (
    <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
      <div style={styles.container}>
        <div style={styles.card}>
          <button 
            onClick={() => setCurrentScreen(userId ? 'dashboard' : 'welcome')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.5rem', 
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Zurück
          </button>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Impressum</h2>
          
          <div style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '1rem' }}>
              <strong>Angaben gemäß § 5 TMG:</strong>
            </p>
            
            <p style={{ marginBottom: '1rem' }}>
              <strong>Verantwortlich für den Inhalt:</strong><br />
              Simon Stahl<br />
              Engelhardstr. 14<br />
              30173 Hannover
            </p>
            
            <p style={{ marginBottom: '1rem' }}>
              <strong>Kontakt:</strong><br />
              E-Mail: simonstahl379@gmail.com<br />
              Telefon: 05111694659
            </p>
            
            <p style={{ marginBottom: '1rem' }}>
              <strong>Haftungsausschluss:</strong>
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Haftung für Inhalte:</strong><br />
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Haftung für Links:</strong><br />
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Urheberrecht:</strong><br />
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </div>
          
          <Footer setCurrentScreen={setCurrentScreen} />
        </div>
      </div>
    </div>
  );

  // Datenschutz-Seite
  const renderDatenschutzScreen = () => (
    <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
      <div style={styles.container}>
        <div style={styles.card}>
          <button 
            onClick={() => setCurrentScreen(userId ? 'dashboard' : 'welcome')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.5rem', 
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Zurück
          </button>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Datenschutzerklärung</h2>
          
          <div style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '1rem' }}>
              <strong>1. Datenschutz auf einen Blick</strong>
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Allgemeine Hinweise:</strong><br />
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese App nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>
            
            <p style={{ marginBottom: '1rem' }}>
              <strong>2. Datenerfassung in dieser App</strong>
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Wer ist verantwortlich für die Datenerfassung?</strong><br />
              Die Datenverarbeitung in dieser App erfolgt durch den App-Betreiber. Dessen Kontaktdaten können Sie dem Impressum dieser App entnehmen.
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Wie erfassen wir Ihre Daten?</strong><br />
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z.B. um Daten handeln, die Sie in ein Registrierungsformular eingeben.
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Welche Daten erfassen wir?</strong><br />
              Wir erfassen folgende Daten:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
              <li>Name und E-Mail-Adresse (bei Registrierung)</li>
              <li>Videodateien (zur Prüfung der Check-ins)</li>
              <li>Messdaten und Fortschrittsdaten</li>
              <li>Geräteinformationen (für Push-Benachrichtigungen)</li>
            </ul>
            
            <p style={{ marginBottom: '1rem' }}>
              <strong>3. Speicherung und Verarbeitung</strong>
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Wo werden Ihre Daten gespeichert?</strong><br />
              Ihre Daten werden auf Servern von Supabase (einem Anbieter für Datenbank- und Speicherdienste) gespeichert. Die Datenübertragung erfolgt verschlüsselt.
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Wie lange werden Ihre Daten gespeichert?</strong><br />
              Ihre personenbezogenen Daten werden gelöscht, sobald der Zweck der Speicherung entfällt. Die Videodateien werden nach erfolgreichem Abschluss der Challenge gelöscht.
            </p>
            
            <p style={{ marginBottom: '1rem' }}>
              <strong>4. Ihre Rechte</strong>
            </p>
            
            <p style={{ marginBottom: '0.75rem' }}>
              Sie haben jederzeit das Recht:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
              <li>Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten zu erhalten</li>
              <li>Berichtigung unrichtiger Daten zu verlangen</li>
              <li>Löschung Ihrer bei uns gespeicherten Daten zu verlangen</li>
              <li>Einschränkung der Datenverarbeitung zu verlangen</li>
              <li>Widerspruch gegen die Verarbeitung Ihrer Daten einzulegen</li>
            </ul>
            
            <p style={{ marginBottom: '1rem' }}>
              <strong>5. Kontakt</strong>
            </p>
            
            <p>
              Bei Fragen zum Datenschutz können Sie sich jederzeit an uns wenden. Die Kontaktdaten finden Sie im Impressum.
            </p>
          </div>
          
          <Footer setCurrentScreen={setCurrentScreen} />
        </div>
      </div>
    </div>
  );

  // Konto löschen Seite
  const renderDeleteAccountScreen = () => {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const handleDeleteAccount = async () => {
      if (confirmText.toLowerCase() !== 'löschen') {
        setDeleteError('Bitte geben Sie "LÖSCHEN" ein, um zu bestätigen.');
        return;
      }

      if (!userId) {
        setDeleteError('Sie sind nicht angemeldet.');
        return;
      }

      setIsDeleting(true);
      setDeleteError('');

      try {
        const result = await deleteUserAccount(userId);
        
        if (result.success) {
          // Logout und zur Welcome-Seite
          setUserId(null);
          setUserData({ name: '', email: '', password: '', agreed: false, challengeStartDate: null, notificationsEnabled: false });
          localStorage.removeItem('userId');
          localStorage.removeItem('userName');
          setCurrentScreen('welcome');
          
          if (toast) {
            toast.success('Ihr Konto wurde erfolgreich gelöscht.');
          }
        } else {
          setDeleteError(result.error || 'Fehler beim Löschen des Kontos. Bitte versuchen Sie es erneut.');
          setIsDeleting(false);
        }
      } catch (error) {
        setDeleteError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        setIsDeleting(false);
      }
    };

    return (
      <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
        <div style={styles.container}>
          <div style={styles.card}>
            <button 
              onClick={() => setCurrentScreen('dashboard')}
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              ← Zurück
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#DC2626' }}>
              Konto löschen
            </h2>
            
            <div style={{ backgroundColor: '#FEE2E2', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#991B1B', marginBottom: '0.5rem' }}>
                <strong>⚠️ WICHTIG:</strong> Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <p style={{ fontSize: '0.875rem', color: '#991B1B' }}>
                Wenn Sie Ihr Konto löschen, werden alle Ihre Daten unwiderruflich gelöscht:
              </p>
              <ul style={{ fontSize: '0.875rem', color: '#991B1B', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Ihr Benutzerkonto</li>
                <li>Alle hochgeladenen Videos</li>
                <li>Ihr gesamter Fortschritt</li>
                <li>Alle gespeicherten Daten</li>
              </ul>
            </div>

            {deleteError && (
              <div style={{
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {deleteError}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Geben Sie <strong>"LÖSCHEN"</strong> ein, um zu bestätigen:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="LÖSCHEN"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '16px'
                }}
                disabled={isDeleting}
                aria-label="Bestätigungstext eingeben"
              />
            </div>

            <button
              onClick={handleDeleteAccount}
              disabled={confirmText.toLowerCase() !== 'löschen' || isDeleting}
              style={{
                ...styles.button,
                backgroundColor: confirmText.toLowerCase() === 'löschen' && !isDeleting ? '#DC2626' : '#D1D5DB',
                color: 'white',
                width: '100%',
                cursor: confirmText.toLowerCase() === 'löschen' && !isDeleting ? 'pointer' : 'not-allowed',
                marginBottom: '1rem'
              }}
              aria-label="Konto endgültig löschen"
            >
              {isDeleting ? 'Wird gelöscht...' : 'Konto endgültig löschen'}
            </button>

            <button
              onClick={() => setCurrentScreen('dashboard')}
              style={{
                ...styles.button,
                backgroundColor: '#6B7280',
                color: 'white',
                width: '100%'
              }}
              disabled={isDeleting}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  };

  // App-Info-Seite
  const renderAppInfoScreen = () => (
    <div style={{ ...styles.minHeight, ...styles.gradient, padding: '1rem' }}>
      <div style={styles.container}>
        <div style={styles.card}>
          <button 
            onClick={() => setCurrentScreen(userId ? 'dashboard' : 'welcome')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.5rem', 
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Zurück
          </button>
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Über die App</h2>
          
          <div style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
              Modus-Klar ist eine Lifestyle-App, die dich bei einer freiwilligen 30-Tage-Challenge unterstützt.
            </p>
            <p style={{ marginBottom: '1rem', fontSize: '0.75rem', color: '#6B7280' }}>
              Freiwillige Lifestyle-App für persönliche Ziele – ohne medizinische Bewertung.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
                📱 Wie funktioniert die App?
              </h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Die App begleitet dich durch eine 30-tägige Challenge mit zwei täglichen Video-Check-ins:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li><strong>Morgens:</strong> Zwischen 9:00 und 12:00 Uhr</li>
                <li><strong>Abends:</strong> Zwischen 20:00 und 23:00 Uhr</li>
              </ul>
              <p>
                Du erhältst Push-Benachrichtigungen, wenn es Zeit für einen Check-in ist. Innerhalb von 60 Minuten lädst du ein kurzes Video hoch.
              </p>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
                🎯 Die Challenge
              </h3>
              <p style={{ marginBottom: '0.75rem' }}>
                <strong>Dauer:</strong> 30 aufeinanderfolgende Tage
              </p>
              <p style={{ marginBottom: '0.75rem' }}>
                <strong>Anforderungen:</strong>
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li>2 Videos täglich in den vorgegebenen Zeitfenstern</li>
                <li>Video innerhalb von 60 Minuten nach Erinnerung</li>
                <li>Regelmäßige Teilnahme erforderlich</li>
              </ul>
              <p>
                <strong>Wichtig:</strong> Verpasste Check-ins oder abgelehnte Videos führen zu einem Neustart der Challenge ab Tag 1.
              </p>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
                ✅ Video-Prüfung
              </h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Jedes hochgeladene Video wird von unserem Team auf Vollständigkeit geprüft:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li>Dokumentation muss deutlich sichtbar sein</li>
                <li>Der vereinbarte Ablauf muss vollständig gezeigt werden</li>
                <li>Das Anzeige-Ergebnis muss mindestens 5 Sekunden sichtbar sein</li>
                <li>Gesamtdauer des Videos: ca. 30 Sekunden</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
                📊 Fortschritts-Tracking
              </h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Die App zeigt Ihnen jederzeit:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li>Aktuellen Tag der Challenge</li>
                <li>Erfolgreiche Tage (beide Check-ins bestätigt)</li>
                <li>Ihren aktuellen Streak</li>
                <li>Verbleibende Tage bis zum Ziel</li>
                <li>Visuellen Fortschrittskalender</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
                🔔 Benachrichtigungen
              </h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Die App sendet Ihnen Push-Benachrichtigungen:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li>Wenn es Zeit für einen Check-in ist</li>
                <li>Erinnerungen, falls du einen Check-in noch nicht gemacht hast</li>
                <li>Status-Updates zu deinen Videos (bestätigt/abgelehnt)</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
                🏆 Belohnungen
              </h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Bei erfolgreichem Abschluss der 30-tägigen Challenge erhalten Sie:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li><strong>Challenge geschafft:</strong> Bestätigung deiner erfolgreichen Teilnahme</li>
                <li><strong>Persönlicher Erfolg:</strong> Du hast dein freiwilliges Ziel erreicht</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1F2937' }}>
                🔄 Neustart-Mechanismus
              </h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Die Challenge startet automatisch neu, wenn:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li>Ein Video abgelehnt wird (z.B. undeutliche Aufnahme)</li>
                <li>Ein Check-in verpasst wird</li>
                <li>30 erfolgreiche Tage abgeschlossen wurden (automatischer Neustart für weitere 30 Tage)</li>
              </ul>
            </div>
            
            <div style={{ 
              backgroundColor: '#DBEAFE', 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              marginTop: '1.5rem' 
            }}>
              <p style={{ margin: 0, fontWeight: '600', color: '#1E40AF' }}>
                💡 Tipp: Installieren Sie die App als Progressive Web App (PWA) für eine noch bessere Erfahrung!
              </p>
            </div>
          </div>
          
          <Footer setCurrentScreen={setCurrentScreen} />
        </div>
      </div>
    </div>
  );

 // Main Render
return (
  <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
    {currentScreen === 'welcome' && renderWelcomeScreen()} 
    {currentScreen === 'login' && renderLoginScreen()}
    {currentScreen === 'requirements' && renderRequirementsScreen()}
    {currentScreen === 'registration' && renderRegistrationScreen()}
    {currentScreen === 'dashboard' && renderDashboard()}
    {currentScreen === 'recording' && renderRecordingScreen()}
    {currentScreen === 'forgot-password' && renderForgotPasswordScreen()}
    {currentScreen === 'reset-password' && renderResetPasswordScreen()}
    {currentScreen === 'impressum' && renderImpressumScreen()}
    {currentScreen === 'datenschutz' && renderDatenschutzScreen()}
    {currentScreen === 'app-info' && renderAppInfoScreen()}
    {currentScreen === 'delete-account' && renderDeleteAccountScreen()}
    {currentScreen === 'ad' && renderAdScreen()}
    {currentScreen === 'why-ads' && renderWhyAdsScreen()}
    
    {/* Install Prompt für PWA */}
    {currentScreen === 'dashboard' && <InstallPrompt />}
  </div>
);
};

export default ModusKlarApp;
