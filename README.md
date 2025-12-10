# Modus-Klar App

Eine digitale Plattform, die Menschen dabei hilft, alkoholfrei zu bleiben, indem Abstinenz objektiv kontrolliert und belohnt wird.

## 🎯 Funktionen

- **Zweimal tägliche Push-Benachrichtigungen** (9-12 Uhr morgens, 20-23 Uhr abends)
- **Video-Aufnahme** mit Atemalkoholtest
- **Manuelle Verifikation** durch Administratoren
- **30-Tage Challenge** (60 erfolgreiche Tests = Prämie)
- **Automatisches Streak-Tracking**

## 🚀 Schnellstart

**WICHTIG:** Lesen Sie die vollständige Anleitung in `ANLEITUNG.md` für detaillierte Schritte!

### 1. Voraussetzungen
- Node.js installiert (https://nodejs.org/)
- Supabase-Konto (kostenlos: https://supabase.com/)

### 2. Installation
```bash
npm install
```

### 3. Supabase einrichten
1. Führen Sie `supabase-setup.sql` in Supabase SQL Editor aus
2. Erstellen Sie einen "videos" Storage Bucket
3. Prüfen Sie die Zugangsdaten in `src/supabaseClient.js`

### 4. App starten
```bash
npm start
```

Die App öffnet sich automatisch auf http://localhost:3000

## 📁 Projektstruktur

```
modus-klar-app-main/
├── public/
│   ├── service-worker.js    # Push-Benachrichtigungen
│   ├── manifest.json         # PWA Manifest
│   └── index.html
├── src/
│   ├── App.js               # Haupt-App-Komponente
│   ├── AdminDashboard.js    # Admin-Interface
│   ├── SimpleAdmin.js        # Vereinfachtes Admin-Interface
│   ├── api.js               # Supabase API-Funktionen
│   ├── supabaseClient.js    # Supabase-Verbindung
│   ├── notifications.js     # Benachrichtigungslogik
│   └── index.js             # App-Einstiegspunkt
├── supabase-setup.sql       # Datenbank-Setup
├── ANLEITUNG.md             # Vollständige Anleitung
└── package.json
```

## 🔐 Admin-Zugriff

Fügen Sie `?admin=true` zur URL hinzu:
- Lokal: `http://localhost:3000?admin=true`
- Online: `https://ihre-app.vercel.app?admin=true`

## 📚 Dokumentation

- **Vollständige Anleitung:** Siehe `ANLEITUNG.md`
- **Datenbank-Setup:** Siehe `supabase-setup.sql`

## 🛠️ Technologien

- React 18
- Supabase (Datenbank + Storage)
- Service Workers (Push-Benachrichtigungen)
- WebRTC (Video-Aufnahme)

## 📝 Lizenz

Dieses Projekt ist für den privaten Gebrauch bestimmt.


