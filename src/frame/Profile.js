import React, { useState } from 'react';
import { auth } from '../firebase';
import { updateEmail, updatePassword } from 'firebase/auth';

const Profile = () => {
  const user = auth.currentUser;
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    setMessage('');
    setError('');

    if (!email.trim()) {
      setError('Email cannot be empty.');
      return;
    }

    try {
      if (email !== user.email) {
        await updateEmail(user, email);
        setMessage('Email updated successfully.');
      }

      if (password) {
        await updatePassword(user, password);
        setMessage(prev => `${prev} Password updated successfully.`.trim());
      }
    } catch (error) {
      console.error('Update failed:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('Please re-login to update your email or password.');
      } else {
        setError('Update failed. Please try again.');
      }
    }
  };

  if (!user) return <p style={{ padding: '2rem' }}>No user is logged in.</p>;

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '2rem auto',
        background: 'linear-gradient(135deg, #a166ff, #ebdfff)',
        padding: '2rem',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
      }}
    >
      {/* 🧥 Clothes Icon */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <img
          src="https://cdn-icons-png.flaticon.com/512/892/892458.png" // Clothes icon
          alt="Clothes Icon"
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '16px',
            objectFit: 'cover',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            backgroundColor: '#f0f0ff',
            padding: '10px'
          }}
        />
      </div>

      <h2 
        style={{ color: '#000000ff', 
        marginBottom: '1.5rem', 
        textAlign: 'center' }}> Admin Settings
      </h2>

      <label 
        style={{ 
          fontWeight: 'bold', 
          display: 'block', 
          marginBottom: '0.5rem' }}> Email:
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem',
            marginTop: '0.3rem',
            borderRadius: '8px',
            border: '2px solid #a166ff',

          }}
        />
      </label>

      <label
        style={{
          fontWeight: 'bold',
          display: 'block',
          marginTop: '1.2rem',
          marginBottom: '0.5rem', }}> New Password:
        <input
          type="password"
          placeholder="Leave blank to keep current password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem',
            marginTop: '0.3rem',
            borderRadius: '8px',
            border: '2px solid #a166ff',

          }}
        />
      </label>

      <button
        onClick={handleUpdate}
        style={{
          marginTop: '1.5rem',
          padding: '0.7rem 1.5rem',
          backgroundColor: 'rgb(85, 91, 199)',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold',
        }}
      >
        Save Changes
      </button>

      {message && (
        <p style={{ marginTop: '1rem', color: 'green', fontWeight: 'bold' }}>
          {message}
        </p>
      )}
      {error && (
        <p style={{ marginTop: '1rem', color: '#A94444', fontWeight: 'bold' }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default Profile;
