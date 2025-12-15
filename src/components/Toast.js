// Toast Notification Component
import React, { useState, useEffect } from 'react';

export const ToastContext = React.createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (message, duration) => showToast(message, 'success', duration);
  const error = (message, duration) => showToast(message, 'error', duration);
  const info = (message, duration) => showToast(message, 'info', duration);
  const warning = (message, duration) => showToast(message, 'warning', duration);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, removeToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '90%',
        width: '100%',
        maxWidth: '28rem'
      }}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const Toast = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const getStyles = () => {
    const baseStyles = {
      padding: '1rem',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      backgroundColor: 'white',
      border: '1px solid',
      minWidth: '250px',
      maxWidth: '100%',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'all 0.3s ease-in-out',
      cursor: 'pointer'
    };

    const typeStyles = {
      success: {
        borderColor: '#10B981',
        backgroundColor: '#D1FAE5',
        color: '#065F46'
      },
      error: {
        borderColor: '#EF4444',
        backgroundColor: '#FEE2E2',
        color: '#991B1B'
      },
      warning: {
        borderColor: '#F59E0B',
        backgroundColor: '#FEF3C7',
        color: '#92400E'
      },
      info: {
        borderColor: '#3B82F6',
        backgroundColor: '#DBEAFE',
        color: '#1E40AF'
      }
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  const getIcon = () => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  };

  return (
    <div
      style={getStyles()}
      onClick={onClose}
      role="alert"
      aria-live="polite"
    >
      <span style={{ fontSize: '1.25rem' }}>{getIcon()}</span>
      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', flex: 1 }}>
        {message}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.25rem',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.7,
          padding: 0,
          lineHeight: 1
        }}
        aria-label="Schließen"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;


