// Email-Verifizierung Utilities

// Generiere Verifizierungs-Token
export function generateVerificationToken() {
  // Erstelle einen zufälligen, sicheren Token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Erstelle Verifizierungs-URL
export function createVerificationUrl(token) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/verify-email?token=${token}`;
}

// Prüfe ob Token abgelaufen ist
export function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date();
}

// Email-Format validieren
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Passwort-Reset-Token generieren (gleiche Funktion wie Email-Verifizierung)
export function generatePasswordResetToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Erstelle Passwort-Reset-URL
export function createPasswordResetUrl(token) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/reset-password?token=${token}`;
}

