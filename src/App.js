import React, { useState, useRef, useEffect, useContext } from 'react';
import { registerUser, saveVideoRecord, loadUserProgress, loginUser, uploadVideo, requestPasswordReset, resetPassword } from './api';
import AdminDashboard from './AdminDashboard';
// Ganz oben in App.js, nach den imports
import { supabase } from './supabaseClient';
import { initializeNotifications, requestNotificationPermission } from './notifications';
import InstallPrompt from './components/InstallPrompt';
import { ToastContext } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';

// Debug: Mache supabase global verfügbar (nur für Testing!)
window.supabase = supabase;

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
  const [currentScreen, setCurrentScreen] = useState('welcome');
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
    idNumber: '', // Optional, nicht mehr benötigt
    agreed: false,
    challengeStartDate: null,
    notificationsEnabled: false
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [timeWindow, setTimeWindow] = useState({ morning: false, evening: false });
  
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

  // Initial Load - Check für bestehenden User und Email-Verifizierung
useEffect(() => {
  const checkExistingUser = async () => {
    const savedUserId = localStorage.getItem('userId');
    const savedUserName = localStorage.getItem('userName');
    
    // Prüfe ob Verifizierungs-Token oder Reset-Token in URL ist
    const urlParams = new URLSearchParams(window.location.search);
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
    console.error('Fehler beim Laden des Fortschritts:', error);
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
      idNumber: '',
      idVerified: false,
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
      console.error('Kamera-Zugriff verweigert:', err);
      if (toast) {
        toast.error('Bitte erlauben Sie den Kamera-Zugriff für diese App.');
      } else {
        alert('Bitte erlauben Sie den Kamera-Zugriff für diese App.');
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
  console.log('1. Aufnahme beendet, Blob-Größe:', blob.size);
  console.log('2. User ID:', userId);
  console.log('3. Video Type:', currentVideoType);
  console.log('4. Current Day:', currentDay);
  
  if (userId && blob.size > 0) {
    setTodayVideos(prev => {
      console.log('5. Setting upload status for:', currentVideoType);
      return {
        ...prev,
        [currentVideoType]: 'uploading'
      };
    });
    
    console.log('6. Calling uploadVideo function...');
    const uploadResult = await uploadVideo(blob, userId, currentVideoType, currentDay);
    
    console.log('7. Upload Result:', uploadResult);
    
    if (uploadResult.success) {
      setTodayVideos(prev => ({
        ...prev,
        [currentVideoType]: 'pending'
      }));
      if (toast) {
        toast.success('Video erfolgreich hochgeladen! Es wird nun geprüft.');
      } else {
        alert('Video erfolgreich hochgeladen! Es wird nun geprüft.');
      }
      await loadProgress(userId);
    } else {
      if (toast) {
        toast.error('Upload fehlgeschlagen: ' + uploadResult.error);
      } else {
        alert('Upload fehlgeschlagen: ' + uploadResult.error);
      }
      console.error('8. Upload Error:', uploadResult.error);
      setTodayVideos(prev => ({
        ...prev,
        [currentVideoType]: null
      }));
    }
  } else {
    console.log('9. Upload blocked - userId:', userId, 'blob.size:', blob.size);
    if (toast) {
      toast.error('Kein Video zum Hochladen oder kein User eingeloggt');
    } else {
      alert('Kein Video zum Hochladen oder kein User eingeloggt');
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
      console.error('Fehler beim Starten der Aufnahme:', error);
      if (toast) {
        toast.error('Fehler beim Starten der Aufnahme. Bitte versuchen Sie es erneut.');
      } else {
        alert('Fehler beim Starten der Aufnahme. Bitte versuchen Sie es erneut.');
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
          <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
            30 Tage alkoholfrei - Ein Präventionsprogramm unterstützt von Krankenkassen
          </p>
          
          <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '1rem' }}>
              <CheckCircle />
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Eigenes Alkoholmessgerät erforderlich</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '1rem' }}>
              <CheckCircle />
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>2x täglich Messung per Video dokumentieren</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '1rem' }}>
              <CheckCircle />
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Verifizierung durch geschultes Personal</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
              <CheckCircle />
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Prämie nach erfolgreicher Teilnahme</p>
            </div>
          </div>
          
          <div style={{ backgroundColor: '#DBEAFE', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
              Gefördert durch die gesetzlichen Krankenkassen als Präventionsmaßnahme nach § 20 SGB V
            </p>
          </div>
          
          <button
            onClick={() => setCurrentScreen('requirements')}
            style={styles.button}
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
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '16px'
              }}
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <input
              type="password"
              placeholder="Ihr Passwort"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '16px'
              }}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
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
                  <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Alkoholmessgerät erforderlich</p>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    Sie benötigen ein eigenes, geprüftes Alkoholmessgerät. 
                    Empfohlene Modelle finden Sie in der App.
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
                    Erinnerungen für Ihre Messzeiten:<br/>
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
                <li>30 Tage tägliche Messungen</li>
                <li>2 Videos täglich in den Zeitfenstern</li>
                <li>Messung innerhalb 1 Stunde nach Benachrichtigung</li>
                <li>0,0 Promille bei allen Messungen</li>
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
                Ich erlaube Push-Benachrichtigungen für Messzeiten
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
                <p style={{ marginBottom: '0.75rem' }}><strong>2. Messzeiten:</strong></p>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                  <li>Morgens: 9:00 - 12:00 Uhr</li>
                  <li>Abends: 20:00 - 23:00 Uhr</li>
                  <li>Video innerhalb 60 Minuten nach Benachrichtigung</li>
                </ul>
                <p style={{ marginBottom: '0.75rem' }}><strong>3. Anforderungen:</strong></p>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                  <li>Eigenes, geprüftes Alkoholmessgerät</li>
                  <li>Deutlich sichtbare Messung im Video</li>
                  <li>Ergebnis: 0,0 Promille</li>
                </ul>
                <p style={{ marginBottom: '0.75rem' }}><strong>4. Ablehnung erfolgt bei:</strong></p>
                <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                  <li>Promille über 0,0</li>
                  <li>Undeutlicher Aufnahme</li>
                  <li>Manipulation</li>
                  <li>Verpasster Messung</li>
                </ul>
                <p style={{ marginBottom: '0.75rem' }}><strong>5. Neustart:</strong> Bei Ablehnung oder verpasster Messung startet das Programm von Tag 1</p>
                <p style={{ marginBottom: '0.75rem' }}><strong>6. Datenschutz:</strong> Videos werden nur zur Verifikation verwendet und nach Programmende gelöscht</p>
                <p style={{ marginBottom: '0.75rem' }}><strong>7. Prämie:</strong> Nach erfolgreicher Teilnahme gemäß Vereinbarung mit Ihrer Krankenkasse</p>
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
                  padding: 0
                }}
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div style={styles.container}>
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
              Messzeit aktiv! Sie haben noch 60 Minuten
            </p>
          </div>
        )}
        
        <div style={{ ...styles.card, marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Heutige Messungen</h2>
          
          <div>
            {/* Morgen-Messung */}
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
                  <p style={{ fontWeight: '500' }}>Morgen-Messung</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>9:00 - 12:00 Uhr</p>
                </div>
              </div>
              {todayVideos.morning === 'verified' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle />
                  <span style={{ fontSize: '0.75rem', color: '#059669' }}>Verifiziert</span>
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
                      setCurrentScreen('recording');
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: timeWindow.morning ? 'pointer' : 'not-allowed',
                    backgroundColor: timeWindow.morning ? '#3B82F6' : '#D1D5DB',
                    color: timeWindow.morning ? 'white' : '#9CA3AF'
                  }}
                  disabled={!timeWindow.morning}
                >
                  {timeWindow.morning ? 'Jetzt messen' : 'Zeitfenster geschlossen'}
                </button>
              )}
            </div>
            
            {/* Abend-Messung */}
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
                  <p style={{ fontWeight: '500' }}>Abend-Messung</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>20:00 - 23:00 Uhr</p>
                </div>
              </div>
              {todayVideos.evening === 'verified' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle />
                  <span style={{ fontSize: '0.75rem', color: '#059669' }}>Verifiziert</span>
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
                      setCurrentScreen('recording');
                    }
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: timeWindow.evening ? 'pointer' : 'not-allowed',
                    backgroundColor: timeWindow.evening ? '#9333EA' : '#D1D5DB',
                    color: timeWindow.evening ? 'white' : '#9CA3AF'
                  }}
                  disabled={!timeWindow.evening}
                >
                  {timeWindow.evening ? 'Jetzt messen' : 'Zeitfenster geschlossen'}
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
                    ? `Tag ${day.day}: Beide Messungen verifiziert`
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
                width: `${Math.round((currentDay / 30) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(to right, #3B82F6, #9333EA)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              {Math.round((currentDay / 30) * 100)}% abgeschlossen
            </p>
          </div>
        </div>
        
        <div style={{
          ...styles.card,
          background: 'linear-gradient(to right, #10B981, #059669)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Ihre Prämie bei Erfolg</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Krankenkassen-Bonus</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', opacity: 0.9 }}>+ Gesundheitsvorsorge</p>
            </div>
            <div style={{ fontSize: '3rem', opacity: 0.5 }}>
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
      
    </div>
    );
  };

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
              <h3 style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem' }}>Anleitung für die Messung:</h3>
              <ol style={{ fontSize: '0.875rem', color: '#4B5563', paddingLeft: '1.5rem', margin: 0 }}>
                <li>Halten Sie Ihr Messgerät bereit</li>
                <li>Starten Sie die Aufnahme</li>
                <li>Zeigen Sie das Gerät deutlich (Marke/Modell sichtbar)</li>
                <li>Führen Sie die Messung durch</li>
                <li>Zeigen Sie das Ergebnis (0,0) mindestens 5 Sekunden</li>
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
                  position: 'relative'
                }}
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
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem'
                }}
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
        } else {
          alert('Falls diese Email registriert ist, wurde ein Passwort-Reset-Link gesendet. Prüfen Sie Ihr Postfach.\n\nFür Testing: Die Reset-URL wurde in der Konsole ausgegeben.');
        }
        console.log('Passwort-Reset-URL:', result.resetUrl);
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
    
    {/* Install Prompt für PWA */}
    {currentScreen === 'dashboard' && <InstallPrompt />}
  </div>
);
};

export default ModusKlarApp;
