// Passwort-Hashing Utilities
import bcrypt from 'bcryptjs';

// Passwort hashen (für Registrierung)
export async function hashPassword(password) {
  try {
    const saltRounds = 10; // Anzahl der Runden (höher = sicherer, aber langsamer)
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.error('Fehler beim Hashen des Passworts:', error);
    throw error;
  }
}

// Passwort vergleichen (für Login)
export async function comparePassword(password, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Fehler beim Vergleichen des Passworts:', error);
    return false;
  }
}

// Passwort-Stärke prüfen
export function validatePasswordStrength(password) {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: `Passwort muss mindestens ${minLength} Zeichen lang sein.` };
  }

  // Optionale stärkere Validierung (kann später aktiviert werden)
  // if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
  //   return { valid: false, message: 'Passwort muss Großbuchstaben, Kleinbuchstaben und Zahlen enthalten.' };
  // }

  return { valid: true, message: 'Passwort ist gültig.' };
}
