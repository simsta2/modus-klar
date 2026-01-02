import { supabase } from './supabaseClient';
import { hashPassword, comparePassword } from './utils/password';
import { generatePasswordResetToken, createPasswordResetUrl } from './utils/emailVerification';

// Nutzer registrieren
export async function registerUser(userData) {
  try {
    // Prüfe ob Email bereits existiert
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      return { success: false, error: 'Diese Email-Adresse ist bereits registriert.' };
    }

    // Passwort hashen vor dem Speichern
    const hashedPassword = await hashPassword(userData.password);

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: userData.email,
          name: userData.name,
          password: hashedPassword, // Gehashtes Passwort wird gespeichert
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
    
    return { 
      success: true, 
      user: data
    };
  } catch (error) {
    console.error('Registrierung fehlgeschlagen:', error);
    return { success: false, error: error.message };
  }
}

// Nutzer Login
export async function loginUser(email, password) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    
    // Prüfe Passwort mit bcrypt
    if (!data.password) {
      return { success: false, error: 'Falsches Passwort oder Email nicht gefunden.' };
    }
    
    const isPasswordValid = await comparePassword(password, data.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Falsches Passwort oder Email nicht gefunden.' };
    }
    
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

// Nutzer-Fortschritt laden mit korrekter Streak-Berechnung und Verpasste-Tage-Prüfung
export async function loadUserProgress(userId) {
  try {
    // Lade User-Daten für challenge_start_date
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('challenge_start_date')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const { data, error } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .order('day_number', { ascending: true });

    if (error) throw error;
    
    // Berechne die aktuelle Streak
    let currentStreak = 0;
    let currentDay = 1;
    let needsReset = false;
    let shouldRestart = false;
    
    if (data && data.length > 0) {
      // Finde den höchsten vollständig verifizierten Tag
      let lastVerifiedDay = 0;
      
      for (const day of data) {
        if (day.morning_status === 'verified' && day.evening_status === 'verified') {
          currentStreak = day.day_number;
          lastVerifiedDay = day.day_number;
          
          // Prüfe auf Lücken: Wenn Tag X verifiziert ist, aber Tag X-1 fehlt → Reset
          if (day.day_number > 1) {
            const previousDay = data.find(d => d.day_number === day.day_number - 1);
            if (!previousDay || 
                previousDay.morning_status !== 'verified' || 
                previousDay.evening_status !== 'verified') {
              // Lücke gefunden → Reset
              needsReset = true;
              break;
            }
          }
        } else if (day.morning_status === 'rejected' || day.evening_status === 'rejected') {
          // Bei Ablehnung → Reset
          needsReset = true;
          currentStreak = 0;
          break;
        } else {
          // Bei pending oder null: Prüfe ob Tag verpasst wurde
          // Wenn ein Tag pending ist, aber der vorherige Tag nicht vollständig verifiziert ist → Reset
          if (day.day_number > 1) {
            const previousDay = data.find(d => d.day_number === day.day_number - 1);
            if (!previousDay || 
                previousDay.morning_status !== 'verified' || 
                previousDay.evening_status !== 'verified') {
              needsReset = true;
              break;
            }
          }
          // Stoppe bei pending, aber prüfe weiter auf Lücken
          break;
        }
      }
      
      // Prüfe ob Tag 30 erfolgreich abgeschlossen wurde → Neustart
      if (currentStreak === 30 && !needsReset) {
        shouldRestart = true;
      }
      
      // Der aktuelle Tag ist der nächste nach der Streak
      currentDay = currentStreak + 1;
      
      // Prüfe auf verpasste Tage basierend auf challenge_start_date
      if (userData && userData.challenge_start_date && !needsReset) {
        const startDate = new Date(userData.challenge_start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        
        const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        
        // Wenn mehr Tage vergangen sind als verifiziert wurden, und es gibt keine pending Einträge → möglicherweise verpasst
        if (daysSinceStart > currentStreak + 1) {
          // Prüfe ob es einen pending Eintrag für den aktuellen Tag gibt
          const hasPendingForCurrentDay = data.some(d => 
            d.day_number === currentDay && 
            (d.morning_status === 'pending' || d.evening_status === 'pending')
          );
          
          // Wenn kein pending Eintrag existiert und der Tag schon vorbei ist → verpasst
          if (!hasPendingForCurrentDay && daysSinceStart >= currentDay) {
            needsReset = true;
          }
        }
      }
    }
    
    // Reset durchführen wenn nötig
    if (needsReset) {
      await supabase
        .from('daily_progress')
        .delete()
        .eq('user_id', userId);
      
      await supabase
        .from('videos')
        .delete()
        .eq('user_id', userId)
        .in('status', ['pending', 'rejected']);
      
      await supabase
        .from('users')
        .update({ 
          challenge_start_date: new Date().toISOString().split('T')[0],
          current_day: 1
        })
        .eq('id', userId);
      
      return { 
        success: true, 
        progress: [],
        currentStreak: 0,
        currentDay: 1,
        wasReset: true
      };
    }
    
    // Neustart nach 30 Tagen
    if (shouldRestart) {
      await supabase
        .from('daily_progress')
        .delete()
        .eq('user_id', userId);
      
      await supabase
        .from('videos')
        .delete()
        .eq('user_id', userId)
        .in('status', ['pending']);
      
      await supabase
        .from('users')
        .update({ 
          challenge_start_date: new Date().toISOString().split('T')[0],
          current_day: 1
        })
        .eq('id', userId);
      
      return { 
        success: true, 
        progress: [],
        currentStreak: 0,
        currentDay: 1,
        wasRestarted: true
      };
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
        
        // Lösche alle Videos (pending und rejected)
        await supabase
          .from('videos')
          .delete()
          .eq('user_id', data.user_id)
          .in('status', ['pending', 'rejected']);
        
        // Reset User auf Tag 1
        await supabase
          .from('users')
          .update({ 
            challenge_start_date: new Date().toISOString().split('T')[0],
            current_day: 1
          })
          .eq('id', data.user_id);
          
        console.log('Challenge reset for user:', data.user_id, '- Reason: Video rejected');
      } else if (status === 'verified') {
        // Normales Update für verified
        await supabase
          .from('daily_progress')
          .update({
            [`${data.video_type}_status`]: status
          })
          .eq('user_id', data.user_id)
          .eq('day_number', data.day_number);
        
        // Prüfe ob Tag 30 vollständig abgeschlossen wurde
        const { data: dayProgress } = await supabase
          .from('daily_progress')
          .select('*')
          .eq('user_id', data.user_id)
          .eq('day_number', data.day_number)
          .single();
        
        // Wenn beide Videos verifiziert sind und es Tag 30 ist → Neustart
        if (dayProgress && 
            dayProgress.morning_status === 'verified' && 
            dayProgress.evening_status === 'verified' &&
            data.day_number === 30) {
          
          // Lösche alle Fortschritte und starte neu
          await supabase
            .from('daily_progress')
            .delete()
            .eq('user_id', data.user_id);
          
          await supabase
            .from('videos')
            .delete()
            .eq('user_id', data.user_id)
            .in('status', ['pending']);
          
          await supabase
            .from('users')
            .update({ 
              challenge_start_date: new Date().toISOString().split('T')[0],
              current_day: 1
            })
            .eq('id', data.user_id);
          
          console.log('Challenge completed and restarted for user:', data.user_id);
        }
      } else {
        // Normales Update für pending
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

// Email-Verifizierung Funktionen entfernt - nicht mehr nötig

// Passwort-Wiederherstellung anfordern
export async function requestPasswordReset(email) {
  try {
    // Finde Benutzer
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      // Aus Sicherheitsgründen geben wir keine Details zurück
      return { success: true, message: 'Falls diese Email registriert ist, wurde ein Reset-Link gesendet.' };
    }

    // Generiere Reset-Token
    const resetToken = generatePasswordResetToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Token gültig für 1 Stunde

    // Speichere Token in Datenbank
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires.toISOString()
      })
      .eq('id', data.id);

    if (updateError) throw updateError;

    const resetUrl = createPasswordResetUrl(resetToken);
    
    // TODO: Hier würde normalerweise eine Email gesendet werden
    console.log('⚠️ WICHTIG: In Produktion sollte diese URL per Email gesendet werden!');
    console.log('Passwort-Reset-URL:', resetUrl);

    return { success: true, message: 'Falls diese Email registriert ist, wurde ein Reset-Link gesendet.', resetUrl: resetUrl };
  } catch (error) {
    console.error('Fehler beim Anfordern des Passwort-Resets:', error);
    return { success: true, message: 'Falls diese Email registriert ist, wurde ein Reset-Link gesendet.' };
  }
}

// Passwort zurücksetzen
export async function resetPassword(token, newPassword) {
  try {
    // Finde Benutzer mit diesem Token
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('password_reset_token', token)
      .single();

    if (error || !data) {
      return { success: false, error: 'Ungültiger oder abgelaufener Reset-Token.' };
    }

    // Prüfe ob Token abgelaufen ist
    if (isTokenExpired(data.password_reset_expires)) {
      return { success: false, error: 'Reset-Token ist abgelaufen. Bitte fordern Sie einen neuen an.' };
    }

    // Hashe neues Passwort
    const hashedPassword = await hashPassword(newPassword);

    // Update Passwort und lösche Token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null
      })
      .eq('id', data.id);

    if (updateError) throw updateError;

    return { success: true, message: 'Passwort wurde erfolgreich zurückgesetzt.' };
  } catch (error) {
    console.error('Passwort-Reset fehlgeschlagen:', error);
    return { success: false, error: error.message };
  }
}

// Video-Metadaten speichern (ALTE VERSION - nur für Backward Compatibility)
// Nutzerkonto löschen (inkl. aller Daten)
export async function deleteUserAccount(userId) {
  try {
    // 1. Lade alle Videos des Nutzers
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('video_url')
      .eq('user_id', userId);

    if (videosError) throw videosError;

    // 2. Lösche alle Videos aus dem Storage
    if (videos && videos.length > 0) {
      const videoPaths = videos
        .map(v => v.video_url)
        .filter(url => url) // Nur URLs die existieren
        .map(url => {
          // Extrahiere den Dateinamen aus der URL
          // URL Format: https://xxx.supabase.co/storage/v1/object/public/videos/filename.webm
          // Oder: https://xxx.supabase.co/storage/v1/object/sign/videos/filename.webm?...
          const match = url.match(/\/videos\/([^\/\?]+)/);
          return match ? match[1] : null;
        })
        .filter(path => path); // Entferne null Werte

      if (videoPaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('videos')
          .remove(videoPaths);

        // Storage-Fehler werden ignoriert (Videos könnten bereits gelöscht sein)
        if (storageError) {
          console.warn('Einige Videos konnten nicht aus dem Storage gelöscht werden:', storageError);
        }
      }
    }

    // 3. Lösche alle Daten des Nutzers
    // Videos und daily_progress werden durch CASCADE automatisch gelöscht
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) throw deleteError;

    // 4. Lösche lokale Daten
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');

    return { success: true };
  } catch (error) {
    console.error('Konto-Löschung fehlgeschlagen:', error);
    return { success: false, error: error.message };
  }
}

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
