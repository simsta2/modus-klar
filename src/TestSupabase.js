import React, { useState } from 'react';
import { registerUser } from './api';

function TestSupabase() {
  const [status, setStatus] = useState('');
  
  const testRegistration = async () => {
    setStatus('Teste Verbindung...');
    
    const result = await registerUser({
      email: 'test' + Date.now() + '@example.com',
      name: 'Test User',
      idNumber: 'KK' + Date.now(),
      notificationsEnabled: true
    });
    
    if (result.success) {
      setStatus('✅ Erfolg! User ID: ' + result.user.id);
    } else {
      setStatus('❌ Fehler: ' + result.error);
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h2>Supabase Verbindungstest</h2>
      <button onClick={testRegistration}>Test Registrierung</button>
      <p>{status}</p>
    </div>
  );
}

export default TestSupabase;
