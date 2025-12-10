// Push-Benachrichtigungen für Modus-Klar

// Service Worker registrieren
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registriert:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker Registrierung fehlgeschlagen:', error);
      return null;
    }
  }
  return null;
}

// Benachrichtigungsberechtigung anfordern
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Dieser Browser unterstützt keine Benachrichtigungen');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Zufällige Zeit zwischen minHour und maxHour generieren
function getRandomTimeInWindow(minHour, maxHour) {
  const hour = Math.floor(Math.random() * (maxHour - minHour)) + minHour;
  const minute = Math.floor(Math.random() * 60);
  return { hour, minute };
}

// Nächste Benachrichtigungszeiten berechnen
export function calculateNextNotificationTimes() {
  const now = new Date();
  const currentHour = now.getHours();
  
  let morningTime = null;
  let eveningTime = null;
  
  // Morgen-Zeitfenster: 9-12 Uhr
  if (currentHour < 9) {
    // Noch nicht im Morgen-Fenster, berechne für heute
    morningTime = getRandomTimeInWindow(9, 12);
  } else if (currentHour < 12) {
    // Im Morgen-Fenster, benachrichtige in nächsten Minuten (mindestens 1 Minute später)
    const minHour = currentHour;
    const maxHour = 12;
    morningTime = getRandomTimeInWindow(minHour, maxHour);
    // Stelle sicher, dass es nicht in der Vergangenheit liegt
    const testTime = new Date();
    testTime.setHours(morningTime.hour, morningTime.minute, 0, 0);
    if (testTime <= now) {
      // Wenn Zeit bereits vorbei, nimm nächste Stunde oder morgen
      if (currentHour < 11) {
        morningTime = getRandomTimeInWindow(currentHour + 1, 12);
      } else {
        // Morgen
        morningTime = getRandomTimeInWindow(9, 12);
      }
    }
  } else {
    // Morgen-Fenster vorbei, berechne für morgen
    morningTime = getRandomTimeInWindow(9, 12);
  }
  
  // Abend-Zeitfenster: 20-23 Uhr
  if (currentHour < 20) {
    // Noch nicht im Abend-Fenster, berechne für heute
    eveningTime = getRandomTimeInWindow(20, 23);
  } else if (currentHour < 23) {
    // Im Abend-Fenster, benachrichtige in nächsten Minuten
    const minHour = currentHour;
    const maxHour = 23;
    eveningTime = getRandomTimeInWindow(minHour, maxHour);
    // Stelle sicher, dass es nicht in der Vergangenheit liegt
    const testTime = new Date();
    testTime.setHours(eveningTime.hour, eveningTime.minute, 0, 0);
    if (testTime <= now) {
      // Wenn Zeit bereits vorbei, nimm nächste Stunde oder morgen
      if (currentHour < 22) {
        eveningTime = getRandomTimeInWindow(currentHour + 1, 23);
      } else {
        // Morgen
        eveningTime = getRandomTimeInWindow(20, 23);
      }
    }
  } else {
    // Abend-Fenster vorbei, berechne für morgen
    eveningTime = getRandomTimeInWindow(20, 23);
  }
  
  return { morningTime, eveningTime };
}

// Timeout-IDs speichern für spätere Bereinigung
const notificationTimeouts = {
  morning: null,
  evening: null
};

// Benachrichtigung planen
export function scheduleNotification(time, type, userId) {
  // Alten Timeout löschen falls vorhanden
  if (notificationTimeouts[type]) {
    clearTimeout(notificationTimeouts[type]);
  }
  
  const now = new Date();
  const notificationTime = new Date();
  notificationTime.setHours(time.hour, time.minute, 0, 0);
  
  // Wenn die Zeit bereits vorbei ist, auf morgen verschieben
  if (notificationTime <= now) {
    notificationTime.setDate(notificationTime.getDate() + 1);
  }
  
  const delay = notificationTime.getTime() - now.getTime();
  
  const timeoutId = setTimeout(() => {
    const title = type === 'morning' ? '🌅 Morgen-Messung' : '🌙 Abend-Messung';
    const body = type === 'morning' 
      ? 'Zeit für Ihre morgendliche Alkoholmessung! Öffnen Sie die App für die Videoaufnahme.'
      : 'Zeit für Ihre abendliche Alkoholmessung! Öffnen Sie die App für die Videoaufnahme.';
    
    // Prüfe ob Benutzer noch eingeloggt ist
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId === userId) {
      showNotification(title, body);
      
      // Nächste Benachrichtigung planen (für morgen)
      const nextTimes = calculateNextNotificationTimes();
      if (type === 'morning') {
        scheduleNotification(nextTimes.morningTime, 'morning', userId);
      } else {
        scheduleNotification(nextTimes.eveningTime, 'evening', userId);
      }
    }
    notificationTimeouts[type] = null;
  }, delay);
  
  notificationTimeouts[type] = timeoutId;
  console.log(`${type} Benachrichtigung geplant für:`, notificationTime);
}

// Benachrichtigung anzeigen
async function showNotification(title, body) {
  if (Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body: body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'modus-klar-notification',
      requireInteraction: false,
      data: {
        url: window.location.origin
      }
    });
  }
}

// Benachrichtigungen initialisieren
export async function initializeNotifications(userId) {
  // Service Worker registrieren
  await registerServiceWorker();
  
  // Berechtigung anfordern
  const hasPermission = await requestNotificationPermission();
  
  if (!hasPermission) {
    console.log('Benachrichtigungsberechtigung nicht erteilt');
    return false;
  }
  
  // Nächste Zeiten berechnen
  const times = calculateNextNotificationTimes();
  
  // Benachrichtigungen planen
  scheduleNotification(times.morningTime, 'morning', userId);
  scheduleNotification(times.eveningTime, 'evening', userId);
  
  return true;
}

// Benachrichtigungen stoppen
export function stopNotifications() {
  if (notificationTimeouts.morning) {
    clearTimeout(notificationTimeouts.morning);
    notificationTimeouts.morning = null;
  }
  if (notificationTimeouts.evening) {
    clearTimeout(notificationTimeouts.evening);
    notificationTimeouts.evening = null;
  }
  console.log('Benachrichtigungen gestoppt');
}

