import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp, getDocs, doc, getDoc } from 'firebase/firestore';
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
  const [showConfirmModal, setShowConfirmModal] = useState(true);
  const [adminEmails, setAdminEmails] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const adminIds = ["A01", "A02", "A03", "A04"];
        const admins = [];

        for (const id of adminIds) {
          const docRef = doc(db, "admins", id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.email) {
              admins.push({
                name: data.name || "",
                email: data.email,
                role: data.role || "Admin",
              });
            }
          }
        }

        setAdminEmails(admins);
      } catch (err) {
        console.error("Error fetching admins:", err);
      }
    };

    fetchAdmins();
  }, []);

   const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setShowConfirmModal(false);
    try {
      const user = auth.currentUser;

      if (user) {
        // ✅ Find the matching admin role
        const matchedAdmin = adminEmails.find(a => a.email === user.email);
        const role = matchedAdmin ? matchedAdmin.role : 'Unknown Role';

        // ✅ Generate a unique log ID
        const logID = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // ✅ Add detailed log to Firestore
        await addDoc(collection(db, 'recentActivityLogs'), {
          logID: logID,
          action: 'logged out',
          role: role,
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
      setShowConfirmModal(true);
    }
  };

  const handleCancelLogout = () => {
    navigate(-1);
  };

  const handleOverlayClick = (e) => {
    if (e.target.dataset.overlay === 'true') {
      handleCancelLogout();
    }
  };

  if (isLoggingOut) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #a166ff, #ebdfff)',
          color: '#fff',
          fontSize: '1.2rem',
          fontWeight: 'bold',
        }}
      >
        Logging you out...
      </div>
    );
  }

  return (
    <>
      {showConfirmModal && (
        <ModalOverlay onClick={handleOverlayClick} data-overlay="true">
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Confirm Logout</ModalTitle>
            <p>Are you sure you want to log out?</p>
            <ButtonGroup>
              <CancelButton onClick={handleCancelLogout}>Cancel</CancelButton>
              <SaveButton
                onClick={handleConfirmLogout}
                style={{ backgroundColor: '#A94444' }}
              >
                Logout
              </SaveButton>
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};

export default Logout;
