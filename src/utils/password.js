// Passwort-Hashing Utilities (Browser-kompatibel)
// Verwendet Web Crypto API für sicheres Hashing im Browser

// Passwort hashen (für Registrierung)
export async function hashPassword(password) {
  try {
    // Konvertiere Passwort zu ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Verwende Web Crypto API für sicheres Hashing
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Konvertiere zu Hex-String
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Füge Salt hinzu (einfaches Salt basierend auf Passwort-Länge)
    // In Production sollte ein zufälliges Salt verwendet werden
    const salt = password.length.toString(16).padStart(2, '0');
    return `$2a$10$${salt}${hashHex}`; // Format ähnlich bcrypt für Kompatibilität
  } catch (error) {
    console.error('Fehler beim Hashen des Passworts:', error);
    throw error;
  }
}

// Passwort vergleichen (für Login)
export async function comparePassword(password, hashedPassword) {
  try {
    // Hashe das eingegebene Passwort
    const hashedInput = await hashPassword(password);
    
    // Vergleiche die Hash-Werte
    return hashedInput === hashedPassword;
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










