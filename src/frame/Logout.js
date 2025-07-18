import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  ModalOverlay,
  ModalContent,
  ModalTitle,
  ButtonGroup,
  SaveButton,
  CancelButton
} from '../components/dashboardstyles';

const Logout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    try {
      const user = auth.currentUser;

      if (user) {
        await addDoc(collection(db, 'recentActivityLogs'), {
          action: 'logged out',
          userEmail: user.email,
          timestamp: serverTimestamp(),
        });
      }

      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed. Please try again.');
      setIsLoggingOut(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleOverlayClick = (e) => {
    if (e.target.dataset.overlay === 'true') {
      handleCancel();
    }
  };

  if (isLoggingOut) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #a166ff, #ebdfff)',
        color: '#fff',
        fontSize: '1.2rem',
        fontWeight: 'bold',
      }}>
        Logging you out...
      </div>
    );
  }

  return (
    <ModalOverlay onClick={handleOverlayClick} data-overlay="true">
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalTitle>Confirm Logout</ModalTitle>
        <p>Are you sure you want to log out?</p>
        <ButtonGroup>
          <CancelButton onClick={handleCancel}>Cancel</CancelButton>
          <SaveButton onClick={handleConfirm} style={{ backgroundColor: '#A94444' }}>
            Logout
          </SaveButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default Logout;
