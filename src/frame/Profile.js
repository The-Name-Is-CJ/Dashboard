import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  deleteUser, 
  fetchSignInMethodsForEmail, 
} from 'firebase/auth';
import {
  doc,
  updateDoc,
  collection,
  getDocs
} from 'firebase/firestore';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Profile = () => {
  const [admins, setAdmins] = useState({
    mainAdminName: '',
    mainAdmin: '',
    subAdmin1Name: '',
    subAdmin1: '',
    subAdmin2Name: '',
    subAdmin2: '',
    subAdmin3Name: '',
    subAdmin3: ''
  });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentAdminKey, setCurrentAdminKey] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [adminDocId, setAdminDocId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAdminKey, setPendingAdminKey] = useState('');
  const [confirmAction, setConfirmAction] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const adminMap = {
    mainAdmin: { nameField: 'mainAdminName', emailField: 'mainAdmin' },
    subAdmin1: { nameField: 'subAdmin1Name', emailField: 'subAdmin1' },
    subAdmin2: { nameField: 'subAdmin2Name', emailField: 'subAdmin2' },
    subAdmin3: { nameField: 'subAdmin3Name', emailField: 'subAdmin3' }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const adminsRef = collection(db, "admins");
        const snapshot = await getDocs(adminsRef);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            data.mainAdmin === user.email ||
            data.subAdmin1 === user.email ||
            data.subAdmin2 === user.email ||
            data.subAdmin3 === user.email
          ) {
            setAdmins(prev => ({ ...prev, ...data }));
            setAdminDocId(docSnap.id);
          }
        });
        setLoading(false);
      } catch (err) {
        console.error("Error fetching admins:", err);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = (key, action = 'add') => {
    setPendingAdminKey(key);
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
  };

  const handleConfirmYes = () => {
    const key = pendingAdminKey;
    if (confirmAction === 'add') {
      const { nameField, emailField } = adminMap[key];
      setCurrentAdminKey(key);
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setModalOpen(true);
    } else if (confirmAction === 'remove') {
      handleRemove(key);
    }
    setConfirmModalOpen(false);
    setPendingAdminKey('');
  };

  const handleConfirmNo = () => {
    setConfirmModalOpen(false);
    setPendingAdminKey('');
  };

  const handleAddAdmin = async (email, password, name, key) => {
    const { nameField, emailField } = adminMap[key];
    const adminRef = doc(db, "admins", adminDocId);

    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);

      if (signInMethods.length > 0) {
        alert("This email already exists. Please use a new one.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateDoc(adminRef, {
        [nameField]: name,
        [emailField]: email,
      });

      setAdmins((prev) => ({
        ...prev,
        [nameField]: name,
        [emailField]: email,
      }));

      alert(`✅ New admin account created successfully for: ${email}`);
      handleCloseModal();
    } catch (error) {
      console.error("Error adding admin:", error);
      if (error.code === "auth/weak-password") {
        alert("The password is too weak.");
      } else if (error.code === "auth/invalid-email") {
        alert("Invalid email address.");
      } else if (error.code === "auth/email-already-in-use") {
        alert("This email already exists.");
      } else {
        alert("Something went wrong. Please try again.");
      }
    }
  };

  const handleSubmit = async () => {
    const { email, password, confirmPassword, name } = formData;

    if (!email || !password || !name || !confirmPassword) {
      alert("Please fill out all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match. Please retype them correctly.");
      return;
    }

    await handleAddAdmin(email, password, name, currentAdminKey);
  };

  const handleRemove = async (key) => {
    const { nameField, emailField } = adminMap[key];
    const confirm = window.confirm(`Remove ${admins[nameField]}?`);
    if (!confirm) return;
    try {
      const adminRef = doc(db, "admins", adminDocId);
      const removedEmail = admins[emailField];
      await updateDoc(adminRef, { [nameField]: '', [emailField]: '' });
      if (removedEmail && auth.currentUser?.email === removedEmail) {
        await deleteUser(auth.currentUser);
      }
      setAdmins(prev => ({ ...prev, [nameField]: '', [emailField]: '' }));
    } catch (err) {
      console.error(err);
      alert('Failed to remove admin.');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>Admin Management</h2>
      <div style={{ display: "grid", gap: "1rem" }}>
        {Object.keys(adminMap).map((key) => {
          const { nameField } = adminMap[key];
          const adminName = admins[nameField]?.trim();
          const label =
            key === "mainAdmin"
              ? "MAIN ADMIN"
              : `ADMIN ${key.replace("subAdmin", "")}`;
          return (
            <div key={key} style={cardStyle}>
              <h3 style={{ marginBottom: "0.8rem" }}>{label}</h3>
              <p><strong>Name:</strong> {adminName || "— No Admin —"}</p>

              {!adminName && (
                <button style={{ ...buttonStyle, backgroundColor: '#7C4DFF' }} onClick={() => handleOpenModal(key, 'add')}>
                  Add
                </button>
              )}

              {key !== "mainAdmin" && adminName && (
                <button
                  style={removeBtn}
                  onClick={() => handleOpenModal(key, 'remove')}
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3>Warning ⚠️</h3>
            <p>
              {confirmAction === 'remove' ? (
                <>
                  Are you sure you want to remove{' '}
                  <strong>{admins[adminMap[pendingAdminKey]?.nameField]}</strong>{' '}
                  as admin?
                </>
              ) : (
                "Are you sure you want to add a new admin?"
              )}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              <button
                style={{ ...buttonStyle, backgroundColor: '#7C4DFF', color: '#fff' }}
                onClick={handleConfirmYes}
              >
                Yes
              </button>
              <button
                style={{ ...buttonStyle, backgroundColor: '#6c6c6c', color: '#fff' }}
                onClick={handleConfirmNo}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {modalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3>Add Admin</h3>

            <label>Name:</label>
            <input
              style={{ ...inputStyle, borderColor: focusedField === 'name' ? '#7C4DFF' : '#ccc' }}
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField('')}
            />

            <label>Email:</label>
            <input
              style={{ ...inputStyle, borderColor: focusedField === 'email' ? '#7C4DFF' : '#ccc' }}
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
            />

            <label>Password:</label>
            <div style={passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                style={{ ...inputStyleWithIcon, borderColor: focusedField === 'password' ? '#7C4DFF' : '#ccc' }}
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
              />
              <button
                type="button"
                style={eyeBtn}
                onClick={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <label>Confirm Password:</label>
            <div style={passwordContainer}>
              <input
                type={showConfirm ? "text" : "password"}
                style={{ ...inputStyleWithIcon, borderColor: focusedField === 'confirmPassword' ? '#7C4DFF' : '#ccc' }}
                value={formData.confirmPassword}
                onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField('')}
              />
              <button
                type="button"
                style={eyeBtn}
                onClick={() => setShowConfirm(prev => !prev)}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button style={{ ...buttonStyle, backgroundColor: '#7C4DFF', color: '#fff' }} onClick={handleSubmit}>
                Submit
              </button>
              <button style={{ ...buttonStyle, backgroundColor: '#aaa', color: '#fff' }} onClick={handleCloseModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{
        marginTop: '1.5rem',
        fontSize: '0.9rem',
        color: '#333',
        backgroundColor: '#f9f9f9',
        padding: '0.8rem',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        💡 <strong>Note:</strong> Removing another admin here will only delete their admin record from the dashboard.
        <br />
        To permanently delete an admin account from the system (Firebase Authentication), that admin must
        log in with their account and remove it themselves.
      </p>
    </div>
  );
};

// ---------- STYLES ----------
const containerStyle = {
  maxWidth: '600px',
  margin: '2rem auto',
  background: 'linear-gradient(135deg, #a166ff, #ebdfff)',
  padding: '2rem',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  fontFamily: 'Arial, sans-serif'
};

const inputStyle = {
  marginBottom: '0.8rem',
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
  outline: 'none',
  fontSize: '0.95rem',
  transition: 'border 0.2s'
};

const inputStyleWithIcon = {
  ...inputStyle,
  width: '100%',
  paddingRight: '2.5rem',
  MozAppearance: 'textfield',
};

const passwordContainer = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
};

const eyeBtn = {
  position: 'absolute',
  paddingTop: '0.01rem',
  gap: '200px',  
  right: '0.8rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1.2rem',
  color: '#555'
};

const headingStyle = {
  textAlign: 'center',
  marginBottom: '1.5rem'
};

const buttonStyle = {
  padding: '0.6rem 1.2rem',
  border: 'none',
  borderRadius: '6px',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '0.95rem',
  fontWeight: '500',
  transition: 'background 0.2s'
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

const modalStyle = {
  backgroundColor: '#fff',
  padding: '2rem',
  borderRadius: '12px',
  width: '400px',
  display: 'flex',
  flexDirection: 'column'
};

const cardStyle = {
  background: '#fff',
  padding: '1rem',
  borderRadius: '10px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem'
};

const removeBtn = {
  padding: '0.6rem 1.2rem',
  marginTop: '0.4rem',
  fontSize: '0.95rem',
  border: 'none',
  borderRadius: '6px',
  backgroundColor: '#d9534f',
  color: '#fff',
  cursor: 'pointer'
};

export default Profile;
