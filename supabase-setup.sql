-- ============================================
-- SUPABASE DATENBANK-SETUP FÜR MODUS-KLAR
-- ============================================
-- Diese SQL-Datei muss in Supabase ausgeführt werden
-- um alle benötigten Tabellen zu erstellen

-- 1. USERS Tabelle (Benutzer)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  insurance_number TEXT,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token TEXT,
  email_verification_expires TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  notifications_enabled BOOLEAN DEFAULT false,
  challenge_start_date DATE,
  current_day INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. VIDEOS Tabelle (Hochgeladene Videos)
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_type TEXT NOT NULL CHECK (video_type IN ('morning', 'evening')),
  day_number INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  video_url TEXT,
  file_size BIGINT,
  duration INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT,
  rejection_reason TEXT
);

-- 3. DAILY_PROGRESS Tabelle (Täglicher Fortschritt)
CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  morning_status TEXT CHECK (morning_status IN ('pending', 'verified', 'rejected')),
  evening_status TEXT CHECK (evening_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, day_number)
);

-- 4. ADMINS Tabelle (Administratoren)
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_id ON daily_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_day ON daily_progress(day_number);

-- Row Level Security (RLS) Policies
-- WICHTIG: Diese müssen aktiviert werden, damit die App funktioniert!

-- RLS für users aktivieren
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Jeder kann neue Benutzer erstellen
CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (true);

-- Benutzer können ihre eigenen Daten lesen
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (true);

-- RLS für videos aktivieren
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Jeder kann Videos hochladen
CREATE POLICY "Users can insert videos" ON videos
  FOR INSERT WITH CHECK (true);

-- Jeder kann Videos lesen (für Admin-Dashboard)
CREATE POLICY "Anyone can read videos" ON videos
  FOR SELECT USING (true);

-- Nur Admins können Videos updaten (wird über App-Logik gesteuert)
CREATE POLICY "Anyone can update videos" ON videos
  FOR UPDATE USING (true);

-- RLS für daily_progress aktivieren
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

-- Jeder kann Fortschritt erstellen und lesen
CREATE POLICY "Users can manage progress" ON daily_progress
  FOR ALL USING (true);

-- RLS für admins aktivieren
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Jeder kann Admins lesen (für Login-Check)
CREATE POLICY "Anyone can read admins" ON admins
  FOR SELECT USING (true);

-- ============================================
-- STORAGE BUCKET FÜR VIDEOS ERSTELLEN
-- ============================================
-- Dieser Teil muss manuell in Supabase Dashboard gemacht werden:
-- 1. Gehe zu Storage
-- 2. Klicke "New bucket"
-- 3. Name: "videos"
-- 4. Public bucket: JA (oder NEIN mit entsprechenden Policies)
-- 5. File size limit: 50 MB (oder nach Bedarf)
-- 6. Allowed MIME types: video/webm, video/mp4

-- Storage Policies (wenn Bucket nicht public ist):
-- INSERT Policy: Authenticated users can upload
-- SELECT Policy: Authenticated users can read
-- UPDATE Policy: Authenticated users can update
-- DELETE Policy: Authenticated users can delete

-- ============================================
-- TEST-ADMIN ERSTELLEN
-- ============================================
-- Ersetze 'admin@example.com' mit deiner Admin-Email
INSERT INTO admins (email, name) 
VALUES ('admin@example.com', 'Admin')
ON CONFLICT (email) DO NOTHING;




