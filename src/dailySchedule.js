// Täglicher Messplan: zufällige Zeiten innerhalb der Fenster (morgens 9–12, abends 20–23)

const MORNING_WINDOW = { start: 9, end: 12 };
const EVENING_WINDOW = { start: 20, end: 23 };
const UPLOAD_MINUTES = 60;

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function storageKey(userId) {
  return `modus_schedule_${userId}_${todayKey()}`;
}

function randomTimeInWindow(startHour, endHour) {
  const hour = Math.floor(Math.random() * (endHour - startHour)) + startHour;
  const minute = Math.floor(Math.random() * 60);
  return { hour, minute };
}

function toDate(hour, minute, baseDate = new Date()) {
  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function formatTime(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Liest oder erzeugt den Tagesplan (persistiert pro Nutzer/Tag) */
export function getOrCreateDailySchedule(userId) {
  if (!userId) return null;

  const key = storageKey(userId);
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch {
      localStorage.removeItem(key);
    }
  }

  const schedule = {
    date: todayKey(),
    morning: randomTimeInWindow(MORNING_WINDOW.start, MORNING_WINDOW.end),
    evening: randomTimeInWindow(EVENING_WINDOW.start, EVENING_WINDOW.end)
  };
  localStorage.setItem(key, JSON.stringify(schedule));
  return schedule;
}

/** Ist das Aufnahme-Fenster offen? (ab geplanter Zeit, 60 Minuten) */
export function isMeasurementWindowOpen(type, schedule, now = new Date(), demoMode = false) {
  if (demoMode) return true;
  if (!schedule) return false;

  const slot = type === 'morning' ? schedule.morning : schedule.evening;
  const start = toDate(slot.hour, slot.minute, now);
  const end = new Date(start.getTime() + UPLOAD_MINUTES * 60 * 1000);

  return now >= start && now < end;
}

export function getWindowStatus(schedule, demoMode = false) {
  const now = new Date();
  return {
    morning: isMeasurementWindowOpen('morning', schedule, now, demoMode),
    evening: isMeasurementWindowOpen('evening', schedule, now, demoMode)
  };
}

export function getMinutesRemaining(type, schedule, now = new Date()) {
  if (!schedule) return 0;
  const slot = type === 'morning' ? schedule.morning : schedule.evening;
  const end = new Date(toDate(slot.hour, slot.minute, now).getTime() + UPLOAD_MINUTES * 60 * 1000);
  return Math.max(0, Math.ceil((end - now) / 60000));
}

export function getScheduleForNotifications(schedule) {
  if (!schedule) return null;
  return {
    morningTime: schedule.morning,
    eveningTime: schedule.evening
  };
}

export { MORNING_WINDOW, EVENING_WINDOW, UPLOAD_MINUTES };
