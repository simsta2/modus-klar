import { supabase } from './supabaseClient';

// Nutzer registrieren
export async function registerUser(userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: userData.email,
          name: userData.name,
          insurance_number: userData.idNumber,
          notifications_enabled: userData.notificationsEnabled,
          challenge_start_date: new Date().toISOString().split('T')[0]
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    // Speichere User ID im Browser
    localStorage.setItem('userId', data.id);
    localStorage.setItem('userName', data.name);
    
    return { success: true, user: data };
  } catch (error) {
    console.error('Registrierung fehlgeschlagen:', error);
    return { success: false, error: error.message };
  }
}

// Nutzer Login
export async function loginUser(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    
    // Speichere User ID im Browser
    localStorage.setItem('userId', data.id);
    localStorage.setItem('userName', data.name);
    
    return { success: true, user: data };
  } catch (error) {
    console.error('Login fehlgeschlagen:', error);
    return { success: false, error: 'Email nicht gefunden' };
  }
}

// Video hochladen zu Supabase Storage
export async function uploadVideo(videoBlob, userId, videoType, dayNumber) {
  try {
    // Erstelle eindeutigen Dateinamen (ohne Slash am Anfang!)
    const fileName = `${userId}_${dayNumber}_${videoType}_${Date.now()}.webm`;
    
    console.log('Upload Start:', {
      fileName,
      fileSize: videoBlob.size,
      fileType: videoBlob.type,
      userId
    });
    
    // Upload zu Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/webm',
        cacheControl: '3600',
        upsert: false // Ändere zu false für neue Uploads
      });

    if (uploadError) {
      console.error('Storage Error Full Details:', {
        message: uploadError.message,
        error: uploadError.error,
        status: uploadError.status,
        statusCode: uploadError.statusCode,
        name: uploadError.name
      });
      throw uploadError;
    }

    // Hole die öffentliche URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    console.log('Public URL generated:', publicUrl);

    // Speichere Video-Eintrag in Datenbank mit URL
    const { data, error } = await supabase
      .from('videos')
      .insert([
        {
          user_id: userId,
          video_type: videoType,
          day_number: dayNumber,
          status: 'pending',
          video_url: publicUrl,
          file_size: videoBlob.size,
          duration: 30,
          recorded_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database Error:', error);
      // Wenn DB-Insert fehlschlägt, lösche die hochgeladene Datei
      await supabase.storage.from('videos').remove([fileName]);
      throw error;
    }
    
    console.log('Video saved to database:', data);
    
    // Update daily progress
    await updateDailyProgress(userId, dayNumber, videoType, 'pending');
    
    return { success: true, video: data };
  } catch (error) {
    console.error('Video-Upload fehlgeschlagen:', error);
    return { success: false, error: error.message };
  }
}

// Täglichen Fortschritt updaten
export async function updateDailyProgress(userId, dayNumber, videoType, status) {
  const column = videoType === 'morning' ? 'morning_status' : 'evening_status';
  
  try {
    // Prüfe ob Eintrag existiert
    const { data: existing } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('day_number', dayNumber)
      .single();

    if (existing) {
      // Update existierenden Eintrag
      const { error } = await supabase
        .from('daily_progress')
        .update({
          [column]: status,
          date: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', userId)
        .eq('day_number', dayNumber);
        
      if (error) throw error;
    } else {
      // Erstelle neuen Eintrag
      const { error } = await supabase
        .from('daily_progress')
        .insert({
          user_id: userId,
          day_number: dayNumber,
          date: new Date().toISOString().split('T')[0],
          [column]: status
        });
        
      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Progress-Update fehlgeschlagen:', error);
    return { success: false, error: error.message };
  }
}

// Nutzer-Fortschritt laden mit korrekter Streak-Berechnung
export async function loadUserProgress(userId) {
  try {
    const { data, error } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .order('day_number', { ascending: true });

    if (error) throw error;
    
    // Berechne die aktuelle Streak
    let currentStreak = 0;
    let currentDay = 1;
    
    if (data && data.length > 0) {
      // Finde den höchsten vollständig verifizierten Tag
      for (const day of data) {
        if (day.morning_status === 'verified' && day.evening_status === 'verified') {
          currentStreak = day.day_number;
        } else if (day.morning_status === 'rejected' || day.evening_status === 'rejected') {
          // Bei Ablehnung ist Streak = 0
          currentStreak = 0;
          break;
        } else {
          // Bei pending oder null stoppen wir
          break;
        }
      }
      
      // Der aktuelle Tag ist der nächste nach der Streak
      currentDay = currentStreak + 1;
    }
    
    return { 
      success: true, 
      progress: data || [],
      currentStreak: currentStreak,
      currentDay: currentDay
    };
  } catch (error) {
    console.error('Progress-Laden fehlgeschlagen:', error);
    return { success: false, error: error.message };
  }
}

// ADMIN FUNKTIONEN

// Admin Login Check
export async function checkAdminAccess(email) {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) throw error;
    return { success: true, isAdmin: true };
  } catch (error) {
    return { success: false, isAdmin: false };
  }
}

// Alle Nutzer laden
export async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, users: data || [] };
  } catch (error) {
    console.error('Fehler beim Laden der Nutzer:', error);
    return { success: false, error: error.message };
  }
}

// Alle Videos laden
export async function getAllVideos() {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        users (
          name,
          email
        )
      `)
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    return { success: true, videos: data || [] };
  } catch (error) {
    console.error('Fehler beim Laden der Videos:', error);
    return { success: false, error: error.message };
  }
}

// Video-Status aktualisieren mit Streak-Reset bei Ablehnung
export async function updateVideoStatus(videoId, status, rejectionReason = null) {
  try {
    const updateData = {
      status: status,
      verified_at: new Date().toISOString(),
      verified_by: localStorage.getItem('adminEmail')
    };
    
    if (rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { data, error } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId)
      .select()
      .single();

    if (error) throw error;
    
    // Update daily progress
    if (data) {
      // Bei Ablehnung: Reset der gesamten Challenge
      if (status === 'rejected') {
        // Lösche alle bisherigen Fortschritte
        await supabase
          .from('daily_progress')
          .delete()
          .eq('user_id', data.user_id);
        
        // Reset User auf Tag 1
        await supabase
          .from('users')
          .update({ 
            challenge_start_date: new Date().toISOString(),
            current_day: 1
          })
          .eq('id', data.user_id);
          
        console.log('Streak reset for user:', data.user_id);
      } else {
        // Normales Update für verified/pending
        await supabase
          .from('daily_progress')
          .update({
            [`${data.video_type}_status`]: status
          })
          .eq('user_id', data.user_id)
          .eq('day_number', data.day_number);
      }
    }

    return { success: true, video: data };
  } catch (error) {
    console.error('Fehler beim Update:', error);
    return { success: false, error: error.message };
  }
}

// Nutzer-Statistiken mit korrekter Streak-Berechnung
export async function getUserStats(userId) {
  try {
    const { data, error } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .order('day_number', { ascending: true });

    if (error) throw error;
    
    const progress = data || [];
    let completedDays = 0;
    let currentStreak = 0;
    
    // Berechne vollständige Tage (beide Videos verifiziert)
    for (const day of progress) {
      if (day.morning_status === 'verified' && day.evening_status === 'verified') {
        completedDays++;
        currentStreak = day.day_number;
      } else if (day.morning_status === 'rejected' || day.evening_status === 'rejected') {
        // Reset bei Ablehnung
        completedDays = 0;
        currentStreak = 0;
        break;
      } else if (day.morning_status === 'verified' || day.evening_status === 'verified') {
        // Halber Tag wenn nur ein Video verifiziert
        completedDays += 0.5;
      }
    }
    
    return { 
      success: true, 
      stats: {
        totalDays: progress.length,
        completedDays: completedDays,
        currentStreak: currentStreak,
        successRate: progress.length > 0 ? (completedDays / progress.length * 100).toFixed(1) : 0
      }
    };
  } catch (error) {
    console.error('Fehler beim Laden der Statistiken:', error);
    return { success: false, error: error.message };
  }
}

// Video-Metadaten speichern (ALTE VERSION - nur für Backward Compatibility)
export async function saveVideoRecord(userId, videoType, dayNumber) {
  try {
    const { data, error } = await supabase
      .from('videos')
      .insert([
        {
          user_id: userId,
          video_type: videoType,
          day_number: dayNumber,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    // Update daily progress
    await updateDailyProgress(userId, dayNumber, videoType, 'pending');
    
    return { success: true, video: data };
  } catch (error) {
    console.error('Video-Speicherung fehlgeschlagen:', error);
    return { success: false, error: error.message };
  }
}
