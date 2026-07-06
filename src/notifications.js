// Push-/Erinnerungslogik – nutzt täglichen Messplan aus dailySchedule.js

import {
  getOrCreateDailySchedule,
  getScheduleForNotifications,
  formatTime
} from './dailySchedule';

const notificationTimeouts = { morning: null, evening: null };

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      return await navigator.serviceWorker.register('/service-worker.js');
    } catch (error) {
      console.error('Service Worker Registrierung fehlgeschlagen:', error);
      return null;
    }
  }
  return null;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    return (await Notification.requestPermission()) === 'granted';
  }
  return false;
}

function clearScheduled(type) {
  if (notificationTimeouts[type]) {
    clearTimeout(notificationTimeouts[type]);
    notificationTimeouts[type] = null;
  }
}

function scheduleAt(time, type, userId, onFire) {
  clearScheduled(type);

  const now = new Date();
  const fireAt = new Date();
  fireAt.setHours(time.hour, time.minute, 0, 0);

  if (fireAt <= now) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  const delay = fireAt.getTime() - now.getTime();

  notificationTimeouts[type] = setTimeout(() => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId === userId) {
      onFire(type);
      const nextSchedule = getOrCreateDailySchedule(userId);
      const nextTimes = getScheduleForNotifications(nextSchedule);
      if (nextTimes) {
        const t = type === 'morning' ? nextTimes.morningTime : nextTimes.eveningTime;
        scheduleAt(t, type, userId, onFire);
      }
    }
    notificationTimeouts[type] = null;
  }, delay);

  console.log(`${type}-Erinnerung geplant:`, formatTime(time.hour, time.minute));
}

async function showNotification(title, body) {
  if (Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      tag: `modus-klar-${title}`,
      data: { url: window.location.origin }
    });
  } catch {
    new Notification(title, { body, icon: '/icon-192x192.png' });
  }
}

function fireNotification(type) {
  const isMorning = type === 'morning';
  showNotification(
    isMorning ? '🌅 Zeit für deine Morgen-Messung' : '🌙 Zeit für deine Abend-Messung',
    isMorning
      ? 'Du hast 60 Minuten für dein Video mit Atemtest-Gerät (Ergebnis 0,0).'
      : 'Du hast 60 Minuten für dein Video mit Atemtest-Gerät (Ergebnis 0,0).'
  );
}

/** Plant Erinnerungen zur zufälligen Tageszeit aus dailySchedule */
export async function initializeNotifications(userId) {
  if (!userId) return false;

  await registerServiceWorker();
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return false;

  const schedule = getOrCreateDailySchedule(userId);
  const times = getScheduleForNotifications(schedule);
  if (!times) return false;

  scheduleAt(times.morningTime, 'morning', userId, fireNotification);
  scheduleAt(times.eveningTime, 'evening', userId, fireNotification);

  return true;
}

export function stopNotifications() {
  clearScheduled('morning');
  clearScheduled('evening');
}

/** Beim App-Start / Fokus erneut planen (Tab war geschlossen) */
export async function refreshNotifications(userId) {
  if (!userId || Notification.permission !== 'granted') return;
  stopNotifications();
  await initializeNotifications(userId);
}
