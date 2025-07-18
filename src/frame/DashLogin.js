import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DashLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.email !== 'angakingkasaguatanayyy@hindipoate.com') {
        setErrorMsg('Unauthorized user.');
        return;
      }

      // Log login activity
      await addDoc(collection(db, 'recentActivityLogs'), {
        action: 'logged in',
        userEmail: user.email,
        timestamp: serverTimestamp(),
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setErrorMsg('Invalid email or password.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #a166ff, #ebdfff)',
    }}>
      <form
        onSubmit={handleLogin}
        style={{
          padding: '2rem',
          border: '1px solid #ccc',
          borderRadius: '12px',
          background: '#fff',
          width: '400px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Admin Login</h2>
        {errorMsg && <p style={{ color: 'red', marginBottom: '1rem' }}>{errorMsg}</p>}

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '1rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            background: 'rgb(227, 210, 254)',
          }}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #ccc',
            background: 'rgb(227, 210, 254)',
          }}
        />

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#5C427E',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default DashLogin;
