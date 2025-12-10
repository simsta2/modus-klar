# 🚀 Schritt-für-Schritt Anleitung: Modus-Klar App zum Laufen bringen

## 📋 Übersicht

Diese Anleitung führt Sie durch alle Schritte, um Ihre "Modus-Klar" App zum Laufen zu bringen. Sie benötigen:
- Node.js (JavaScript-Laufzeitumgebung)
- Ein Supabase-Konto (kostenlos)
- Einen Code-Editor (z.B. VS Code)

---

## SCHRITT 1: Node.js installieren

1. Gehen Sie zu: https://nodejs.org/
2. Laden Sie die LTS-Version (empfohlen) herunter
3. Installieren Sie Node.js (Standard-Einstellungen sind OK)
4. Öffnen Sie PowerShell oder Command Prompt
5. Prüfen Sie die Installation:
   ```bash
   node --version
   npm --version
   ```
   Beide Befehle sollten Versionsnummern anzeigen.

---

## SCHRITT 2: Supabase-Datenbank einrichten

### 2.1 Supabase-Konto erstellen
1. Gehen Sie zu: https://supabase.com/
2. Klicken Sie auf "Start your project"
3. Erstellen Sie ein kostenloses Konto (mit GitHub oder Email)
4. Erstellen Sie ein neues Projekt:
   - Name: "modus-klar" (oder wie Sie möchten)
   - Datenbank-Passwort: **WICHTIG: Notieren Sie sich dieses Passwort!**
   - Region: Wählen Sie die nächstgelegene Region (z.B. "West EU")

### 2.2 Supabase-Datenbank-Tabellen erstellen
1. In Ihrem Supabase-Dashboard, klicken Sie auf **"SQL Editor"** (links im Menü)
2. Klicken Sie auf **"New query"**
3. Öffnen Sie die Datei `supabase-setup.sql` in diesem Projekt
4. Kopieren Sie den **gesamten Inhalt** der Datei
5. Fügen Sie ihn in den SQL Editor ein
6. **WICHTIG:** Ersetzen Sie in der letzten Zeile `'admin@example.com'` mit Ihrer eigenen Email-Adresse
7. Klicken Sie auf **"Run"** (oder drücken Sie Strg+Enter)
8. Sie sollten "Success. No rows returned" sehen

### 2.3 Storage Bucket erstellen (für Videos)
1. Klicken Sie im Supabase-Dashboard auf **"Storage"** (links im Menü)
2. Klicken Sie auf **"New bucket"**
3. Geben Sie ein:
   - **Name:** `videos`
   - **Public bucket:** ✅ **JA** (ankreuzen)
   - **File size limit:** 50 MB (oder mehr, je nach Bedarf)
4. Klicken Sie auf **"Create bucket"**
5. Klicken Sie auf den Bucket "videos"
6. Gehen Sie zu **"Policies"**
7. Erstellen Sie folgende Policies:

   **INSERT Policy:**
   - Policy name: "Allow authenticated uploads"
   - Allowed operation: INSERT
   - Policy definition: `true` (oder `bucket_id = 'videos'`)

   **SELECT Policy:**
   - Policy name: "Allow public reads"
   - Allowed operation: SELECT
   - Policy definition: `true`

### 2.4 Supabase-Zugangsdaten kopieren
1. Im Supabase-Dashboard, klicken Sie auf **"Settings"** (Zahnrad-Symbol)
2. Klicken Sie auf **"API"**
3. Sie sehen:
   - **Project URL:** (z.B. `https://xxxxx.supabase.co`)
   - **anon public key:** (lange Zeichenkette)
4. Diese Werte sind bereits in `src/supabaseClient.js` eingetragen
5. **Prüfen Sie**, ob die Werte in der Datei mit Ihren Supabase-Werten übereinstimmen

---

## SCHRITT 3: Projekt-Abhängigkeiten installieren

1. Öffnen Sie PowerShell oder Command Prompt
2. Navigieren Sie zum Projektordner:
   ```bash
   cd C:\Users\simon\Desktop\modus-klar-app-main
   ```
3. Installieren Sie alle benötigten Pakete:
   ```bash
   npm install
   ```
   Dies kann einige Minuten dauern. Sie sehen viele Zeilen mit Paketnamen.

---

## SCHRITT 4: App lokal starten (zum Testen)

1. Im Projektordner, führen Sie aus:
   ```bash
   npm start
   ```
2. Der Browser öffnet sich automatisch auf `http://localhost:3000`
3. Wenn nicht, öffnen Sie manuell: http://localhost:3000
4. Sie sollten jetzt die "Modus-Klar" App sehen!

### 🧪 Testen Sie die App:
1. **Registrierung:** Klicken Sie auf "Neue Registrierung starten"
2. Füllen Sie das Formular aus
3. **WICHTIG:** Aktivieren Sie das Häkchen für "Push-Benachrichtigungen"
4. Klicken Sie auf "Challenge starten"
5. Sie sollten zum Dashboard weitergeleitet werden

---

## SCHRITT 5: App online veröffentlichen (Deployment)

Es gibt mehrere Möglichkeiten. Die einfachste ist **Vercel** (kostenlos):

### Option A: Vercel (Empfohlen - einfachste Methode)

1. Gehen Sie zu: https://vercel.com/
2. Erstellen Sie ein Konto (mit GitHub)
3. Klicken Sie auf **"New Project"**
4. Verbinden Sie Ihr GitHub-Repository (oder laden Sie den Code hoch)
5. Vercel erkennt automatisch React-Projekte
6. Klicken Sie auf **"Deploy"**
7. Nach 2-3 Minuten ist Ihre App online!

**WICHTIG:** Nach dem Deployment müssen Sie:
- Die Supabase-URL und den API-Key in den Umgebungsvariablen prüfen
- Die App-URL in Supabase unter "Settings > API > Site URL" eintragen

### Option B: Netlify

1. Gehen Sie zu: https://www.netlify.com/
2. Erstellen Sie ein Konto
3. Ziehen Sie den Projektordner in das Netlify-Dashboard
4. Die App wird automatisch deployed

### Option C: GitHub Pages

1. Erstellen Sie ein GitHub-Repository
2. Laden Sie den Code hoch
3. Aktivieren Sie GitHub Pages in den Repository-Einstellungen

---

## SCHRITT 6: Admin-Dashboard verwenden

1. Öffnen Sie die App
2. Fügen Sie am Ende der URL hinzu: `?admin=true`
   Beispiel: `http://localhost:3000?admin=true`
3. Melden Sie sich mit der Email an, die Sie in `supabase-setup.sql` eingetragen haben
4. Sie können jetzt:
   - Alle Benutzer sehen
   - Videos prüfen und verifizieren
   - Statistiken einsehen

---

## 🔧 Häufige Probleme und Lösungen

### Problem: "Cannot connect to Supabase"
**Lösung:** 
- Prüfen Sie die Supabase-URL und den API-Key in `src/supabaseClient.js`
- Stellen Sie sicher, dass Ihr Supabase-Projekt aktiv ist

### Problem: "Table does not exist"
**Lösung:**
- Führen Sie die `supabase-setup.sql` Datei nochmal aus
- Prüfen Sie, ob alle Tabellen in Supabase unter "Table Editor" sichtbar sind

### Problem: "Storage bucket not found"
**Lösung:**
- Erstellen Sie den "videos" Bucket in Supabase Storage
- Stellen Sie sicher, dass der Bucket "public" ist

### Problem: "Benachrichtigungen funktionieren nicht"
**Lösung:**
- Benachrichtigungen funktionieren nur über HTTPS (nicht auf localhost)
- Nach dem Deployment auf Vercel/Netlify sollten sie funktionieren
- Der Browser muss Benachrichtigungen erlauben

### Problem: "Videos werden nicht hochgeladen"
**Lösung:**
- Prüfen Sie die Storage-Policies in Supabase
- Stellen Sie sicher, dass der "videos" Bucket existiert und public ist

---

## 📱 App-Funktionen im Überblick

✅ **Benutzer-Registrierung** mit Email und Name
✅ **Login-System** für bestehende Benutzer
✅ **Video-Aufnahme** mit Kamera (2x täglich)
✅ **Automatische Push-Benachrichtigungen** (9-12 Uhr und 20-23 Uhr)
✅ **Admin-Dashboard** zur Video-Verifikation
✅ **Fortschritts-Tracking** über 30 Tage
✅ **Streak-System** (Neustart bei Ablehnung)

---

## 🎯 Nächste Schritte

1. ✅ App lokal testen
2. ✅ Supabase-Datenbank einrichten
3. ✅ App online deployen
4. ✅ Admin-Account erstellen
5. ✅ Erste Test-Benutzer registrieren
6. ✅ Videos testen und verifizieren

---

## 📞 Hilfe benötigt?

Wenn Sie Probleme haben:
1. Prüfen Sie die Browser-Konsole (F12) auf Fehlermeldungen
2. Prüfen Sie die Supabase-Logs unter "Logs" im Dashboard
3. Stellen Sie sicher, dass alle Schritte korrekt ausgeführt wurden

---

**Viel Erfolg mit Ihrer Modus-Klar App! 🎉**


