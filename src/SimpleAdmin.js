import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const SimpleAdmin = () => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setIsLoading(true);
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

    if (data) {
      setVideos(data);
    }
    setIsLoading(false);
  };

  const updateStatus = async (videoId, status) => {
    const { error } = await supabase
      .from('videos')
      .update({ 
        status: status,
        verified_at: new Date().toISOString()
      })
      .eq('id', videoId);

    if (!error) {
      loadVideos();
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Video-Prüfung (Vereinfacht)</h1>
      
      {isLoading ? (
        <p>Lade Videos...</p>
      ) : (
        <div>
          <h2>Ausstehende Videos: {videos.filter(v => v.status === 'pending').length}</h2>
          
          {videos.map(video => (
            <div key={video.id} style={{
              border: '1px solid #ddd',
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              backgroundColor: video.status === 'pending' ? '#fffbeb' : '#f3f4f6'
            }}>
              <p><strong>Nutzer:</strong> {video.users?.name} ({video.users?.email})</p>
              <p><strong>Tag:</strong> {video.day_number} | <strong>Typ:</strong> {video.video_type}</p>
              <p><strong>Status:</strong> {video.status}</p>
              
              {video.video_url && (
                <div style={{ margin: '1rem 0' }}>
                  <video 
                    controls 
                    width="300"
                    src={video.video_url}
                    style={{ borderRadius: '4px' }}
                  />
                </div>
              )}
              
              {video.status === 'pending' && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => updateStatus(video.id, 'verified')}
                    style={{
                      padding: '0.5rem 1rem',
                      marginRight: '0.5rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Akzeptieren
                  </button>
                  <button
                    onClick={() => updateStatus(video.id, 'rejected')}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ❌ Ablehnen
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {videos.length === 0 && <p>Keine Videos vorhanden.</p>}
        </div>
      )}
    </div>
  );
};

export default SimpleAdmin;
