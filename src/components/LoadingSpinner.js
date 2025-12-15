// Loading Spinner Component
import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = '', fullScreen = false }) => {
  const sizeMap = {
    small: '1rem',
    medium: '2rem',
    large: '3rem'
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  const spinner = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: fullScreen ? '2rem' : '1rem'
    }}>
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `3px solid #E5E7EB`,
          borderTop: `3px solid #3B82F6`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
        aria-label="Lädt..."
        role="status"
      />
      {text && (
        <p style={{
          fontSize: '0.875rem',
          color: '#6B7280',
          margin: 0,
          textAlign: 'center'
        }}>
          {text}
        </p>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;


