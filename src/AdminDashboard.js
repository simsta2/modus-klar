import React, { useState, useEffect } from 'react';
import { checkAdminAccess, getAllUsers, getAllVideos, updateVideoStatus, getUserStats } from './api';
import { supabase } from './supabaseClient';

// Icons
const Icon = ({ children, className, onClick }) => (
  <span className={className} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    {children}
  </span>
);

const Users = (props) => <Icon {...props}>👥</Icon>;
const Video = (props) => <Icon {...props}>🎥</Icon>;
const CheckCircle = (props) => <Icon {...props}>✅</Icon>;
const XCircle = (props) => <Icon {...props}>❌</Icon>;
const Clock = (props) => <Icon {...props}>⏰</Icon>;
const Eye = (props) => <Icon {...props}>👁️</Icon>;
const Shield = (props) => <Icon {...props}>🛡️</Icon>;
const LogOut = (props) => <Icon {...props}>🚪</Icon>;
const Refresh = (props) => <Icon {...props}>🔄</Icon>;

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedTab, setSelectedTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoFilter, setVideoFilter] = useState('pending'); // 'pending' oder 'all'

  // Check if already logged in
  useEffect(() => {
    const savedEmail = localStorage.getItem('adminEmail');
    if (savedEmail) {
      setAdminEmail(savedEmail);
      setIsAuthenticated(true);
      loadData();
    }
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    const result = await checkAdminAccess(loginEmail);
    
    if (result.success && result.isAdmin) {
      localStorage.setItem('adminEmail', loginEmail);
      setAdminEmail(loginEmail);
      setIsAuthenticated(true);
      loadData();
    } else {
      setLoginError('Zugriff verweigert. Diese Email ist nicht als Admin registriert.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminEmail');
    setIsAuthenticated(false);
    setAdminEmail('');
    setLoginEmail('');
  };

  const loadData = async () => {
    setIsLoading(true);
    
    // Load users
    const usersResult = await getAllUsers();
    if (usersResult.success) {
      setUsers(usersResult.users);
      
      // Load stats for each user
      const stats = {};
      for (const user of usersResult.users) {
        const statsResult = await getUserStats(user.id);
        if (statsResult.success) {
          stats[user.id] = statsResult.stats;
        }
      }
      setUserStats(stats);
    }
    
    // Load videos
    const videosResult = await getAllVideos();
    if (videosResult.success) {
      setVideos(videosResult.videos);
    }
    
    setIsLoading(false);
  };

  const handleVideoAction = async (videoId, action) => {
    if (action === 'reject' && !rejectionReason) {
      setShowRejectionModal(videoId);
      return;
    }
    
    const result = await updateVideoStatus(
      videoId, 
      action === 'approve' ? 'verified' : 'rejected',
      action === 'reject' ? rejectionReason : null
    );
    
    if (result.success) {
      loadData(); // Reload all data
      setRejectionReason('');
      setShowRejectionModal(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const styles = {
    container: { 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '1rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      padding: '1.5rem',
      marginBottom: '1rem'
    },
    button: {
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '0.75rem',
      borderBottom: '2px solid #e5e7eb',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#6b7280'
    },
    td: {
      padding: '0.75rem',
      borderBottom: '1px solid #e5e7eb'
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh' 
        }}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                <Shield />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Admin Dashboard</h1>
              <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Modus-Klar Verwaltung</p>
            </div>
            
            {loginError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {loginError}
              </div>
            )}
            
            <input
              type="email"
              placeholder="Admin Email-Adresse"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                fontSize: '16px'
              }}
            />
            
            <button
              onClick={handleLogin}
              style={{
                ...styles.button,
                width: '100%',
                backgroundColor: '#3b82f6',
                color: 'white'
              }}
            >
              Anmelden
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Modus-Klar Admin Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem' }}>{adminEmail}</span>
            <button
              onClick={loadData}
              style={{
                ...styles.button,
                backgroundColor: '#4b5563',
                color: 'white',
                fontSize: '1.5rem',
                padding: '0.5rem'
              }}
            >
              <Refresh />
            </button>
            <button
              onClick={handleLogout}
              style={{
                ...styles.button,
                backgroundColor: '#ef4444',
                color: 'white'
              }}
            >
              <LogOut /> Abmelden
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => setSelectedTab('users')}
            style={{
              ...styles.button,
              backgroundColor: selectedTab === 'users' ? '#3b82f6' : '#e5e7eb',
              color: selectedTab === 'users' ? 'white' : '#6b7280'
            }}
          >
            <Users /> Nutzer ({users.length})
          </button>
          <button
            onClick={() => setSelectedTab('videos')}
            style={{
              ...styles.button,
              backgroundColor: selectedTab === 'videos' ? '#3b82f6' : '#e5e7eb',
              color: selectedTab === 'videos' ? 'white' : '#6b7280'
            }}
          >
            <Video /> Videos ({videos.filter(v => v.status === 'pending').length} offen)
          </button>
        </div>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Clock style={{ fontSize: '2rem' }} />
            <p>Lade Daten...</p>
          </div>
        )}

        {/* Users Tab */}
        {selectedTab === 'users' && !isLoading && (
          <div style={styles.card}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Registrierte Nutzer
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Start</th>
                    <th style={styles.th}>Fortschritt</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const stats = userStats[user.id] || { completedDays: 0, successRate: 0 };
                    return (
                      <tr key={user.id}>
                        <td style={styles.td}>{user.name}</td>
                        <td style={styles.td}>{user.email}</td>
                        <td style={styles.td}>{formatDate(user.challenge_start_date || user.created_at)}</td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '100px',
                              height: '8px',
                              backgroundColor: '#e5e7eb',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${stats.successRate}%`,
                                height: '100%',
                                backgroundColor: '#10b981'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.875rem' }}>
                              {stats.completedDays}/30
                            </span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            backgroundColor: user.status === 'active' ? '#d1fae5' : '#fee2e2',
                            color: user.status === 'active' ? '#059669' : '#dc2626'
                          }}>
                            {user.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => setSelectedUser(user)}
                            style={{
                              ...styles.button,
                              backgroundColor: '#6366f1',
                              color: 'white',
                              fontSize: '0.875rem'
                            }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {selectedTab === 'videos' && !isLoading && (
          <div style={styles.card}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Video-Verifikationen
            </h2>
            
            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={() => setVideoFilter('pending')}
                style={{
                  ...styles.button,
                  backgroundColor: videoFilter === 'pending' ? '#fbbf24' : '#e5e7eb',
                  color: videoFilter === 'pending' ? '#78350f' : '#6b7280',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Ausstehend ({videos.filter(v => v.status === 'pending').length})
              </button>
              <button
                onClick={() => setVideoFilter('all')}
                style={{
                  ...styles.button,
                  backgroundColor: videoFilter === 'all' ? '#3b82f6' : '#e5e7eb',
                  color: videoFilter === 'all' ? 'white' : '#6b7280',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Alle ({videos.length})
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nutzer</th>
                    <th style={styles.th}>Tag</th>
                    <th style={styles.th}>Typ</th>
                    <th style={styles.th}>Aufnahme</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {videos
                    .filter(v => videoFilter === 'all' ? true : v.status === 'pending')
                    .map(video => (
                      <tr key={video.id}>
                        <td style={styles.td}>
                          <div>
                            <div style={{ fontWeight: '500' }}>{video.users?.name}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {video.users?.email}
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>Tag {video.day_number}</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            backgroundColor: video.video_type === 'morning' ? '#dbeafe' : '#e9d5ff',
                            color: video.video_type === 'morning' ? '#1e40af' : '#6b21a8'
                          }}>
                            {video.video_type === 'morning' ? 'Morgen' : 'Abend'}
                          </span>
                        </td>
                        <td style={styles.td}>{formatDate(video.recorded_at)}</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            backgroundColor: 
                              video.status === 'pending' ? '#fef3c7' : 
                              video.status === 'verified' ? '#d1fae5' : '#fee2e2',
                            color: 
                              video.status === 'pending' ? '#92400e' : 
                              video.status === 'verified' ? '#059669' : '#dc2626'
                          }}>
                            {video.status === 'pending' ? 'Ausstehend' : 
                             video.status === 'verified' ? 'Verifiziert' : 'Abgelehnt'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => setSelectedVideo(video)}
                              style={{
                                ...styles.button,
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}
                            >
                              <Eye /> Video
                            </button>
                            {(video.status === 'pending' || videoFilter === 'all') && (
                              <>
                                {video.status !== 'verified' && (
                                  <button
                                    onClick={() => handleVideoAction(video.id, 'approve')}
                                    style={{
                                      ...styles.button,
                                      backgroundColor: '#10b981',
                                      color: 'white',
                                      fontSize: '0.875rem'
                                    }}
                                  >
                                    <CheckCircle />
                                  </button>
                                )}
                                {video.status !== 'rejected' && (
                                  <button
                                    onClick={() => handleVideoAction(video.id, 'reject')}
                                    style={{
                                      ...styles.button,
                                      backgroundColor: '#ef4444',
                                      color: 'white',
                                      fontSize: '0.875rem'
                                    }}
                                  >
                                    <XCircle />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {videoFilter === 'pending' && videos.filter(v => v.status === 'pending').length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <CheckCircle style={{ fontSize: '3rem', marginBottom: '1rem' }} />
                <p>Keine ausstehenden Videos zur Verifikation</p>
              </div>
            )}
            {videoFilter === 'all' && videos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <p>Keine Videos vorhanden</p>
              </div>
            )}
          </div>
        )}

        {/* User Detail Modal */}
        {selectedUser && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50
          }}>
            <div style={{
              ...styles.card,
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Nutzer-Details: {selectedUser.name}
              </h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Registriert:</strong> {formatDate(selectedUser.created_at)}</p>
                <p><strong>Challenge Start:</strong> {formatDate(selectedUser.challenge_start_date)}</p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Statistiken</h4>
                {userStats[selectedUser.id] && (
                  <div>
                    <p>Erfolgsrate: {userStats[selectedUser.id].successRate}%</p>
                    <p>Abgeschlossene Tage: {userStats[selectedUser.id].completedDays}/30</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  ...styles.button,
                  backgroundColor: '#6b7280',
                  color: 'white'
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {showRejectionModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50
          }}>
            <div style={{
              ...styles.card,
              maxWidth: '400px',
              width: '100%'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Ablehnungsgrund
              </h3>
              
              <textarea
                placeholder="Bitte geben Sie einen Grund für die Ablehnung an..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  marginBottom: '1rem',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    handleVideoAction(showRejectionModal, 'reject');
                  }}
                  style={{
                    ...styles.button,
                    backgroundColor: '#ef4444',
                    color: 'white',
                    flex: 1
                  }}
                  disabled={!rejectionReason}
                >
                  Ablehnen
                </button>
                <button
                  onClick={() => {
                    setShowRejectionModal(null);
                    setRejectionReason('');
                  }}
                  style={{
                    ...styles.button,
                    backgroundColor: '#6b7280',
                    color: 'white',
                    flex: 1
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Player Modal */}
        {selectedVideo && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 100
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              maxWidth: '90%',
              maxHeight: '90vh',
              width: '100%',
              position: 'relative'
            }}>
              <button
                onClick={() => setSelectedVideo(null)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '2rem',
                  height: '2rem',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
              
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Video: {selectedVideo.users?.name} - Tag {selectedVideo.day_number} ({selectedVideo.video_type === 'morning' ? 'Morgen' : 'Abend'})
              </h3>
              
              {selectedVideo.video_url ? (
                <video 
                  controls 
                  style={{ 
                    width: '100%', 
                    maxHeight: '70vh',
                    borderRadius: '0.5rem'
                  }}
                  src={selectedVideo.video_url}
                />
              ) : (
                <p style={{ color: '#6b7280' }}>Video-URL nicht verfügbar</p>
              )}
              
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                {selectedVideo.status !== 'verified' && (
                  <button
                    onClick={async () => {
                      await handleVideoAction(selectedVideo.id, 'approve');
                      setSelectedVideo(null);
                    }}
                    style={{
                      ...styles.button,
                      backgroundColor: '#10b981',
                      color: 'white',
                      flex: 1
                    }}
                  >
                    <CheckCircle /> {selectedVideo.status === 'pending' ? 'Akzeptieren' : 'Zu Akzeptiert ändern'}
                  </button>
                )}
                {selectedVideo.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setShowRejectionModal(selectedVideo.id);
                      setSelectedVideo(null);
                    }}
                    style={{
                      ...styles.button,
                      backgroundColor: '#ef4444',
                      color: 'white',
                      flex: 1
                    }}
                  >
                    <XCircle /> {selectedVideo.status === 'pending' ? 'Ablehnen' : 'Zu Abgelehnt ändern'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
