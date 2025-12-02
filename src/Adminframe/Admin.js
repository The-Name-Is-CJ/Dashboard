import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { auth, db } from "../firebase";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentDocId, setCurrentDocId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingDocId, setPendingDocId] = useState("");
  const [confirmAction, setConfirmAction] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  const adminDocs = {
    A01: "MAIN ADMIN",
    A02: "ADMIN 1",
    A03: "ADMIN 2",
  };

  const [admins, setAdmins] = useState({
    A01: { name: "", email: "" },
    A02: { name: "", email: "" },
    A03: { name: "", email: "" },
  });

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const newAdmins = {};
        for (const docId of Object.keys(adminDocs)) {
          const docRef = doc(db, "admins", docId);
          const docSnap = await getDoc(docRef);
          newAdmins[docId] = docSnap.exists()
            ? {
                name: docSnap.data().name || "",
                email: docSnap.data().email || "",
              }
            : { name: "", email: "" };
        }
        setAdmins(newAdmins);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching admins:", err);
        setLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  const handleOpenModal = (docId, action = "add") => {
    setPendingDocId(docId);
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };

  const handleConfirmYes = () => {
    if (confirmAction === "add") {
      setCurrentDocId(pendingDocId);
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setModalOpen(true);
    } else if (confirmAction === "remove") {
      handleRemoveAdmin(pendingDocId);
    }
    setConfirmModalOpen(false);
    setPendingDocId("");
  };

  const handleConfirmNo = () => {
    setConfirmModalOpen(false);
    setPendingDocId("");
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
  };

  const handleAddAdmin = async (docId, name, email, password) => {
    try {
      // 🔍 Prevent duplicate email
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0) {
        alert("This email already exists. Use a different one.");
        return;
      }

      // 👤 Create Firebase Auth user
      await createUserWithEmailAndPassword(auth, email, password);

      // 📝 Save admin in Firestore
      const docRef = doc(db, "admins", docId);
      await updateDoc(docRef, { name, email });

      // ⭐ NEW: Add activity log
      const logID =
        "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

      const currentAdminEmail = auth.currentUser?.email || "Unknown Admin";

      await addDoc(collection(db, "recentActivityLogs"), {
        logID,
        action: `Admin "${currentAdminEmail}" added "${email}" as new admin`,
        userEmail: currentAdminEmail,
        timestamp: new Date().toISOString(),
      });

      // 🟣 Update UI
      setAdmins((prev) => ({ ...prev, [docId]: { name, email } }));

      alert(`✅ Admin added successfully: ${email}`);
      handleCloseModal();
    } catch (error) {
      console.error(error);
      alert("Failed to add admin. Check console.");
    }
  };

  const handleSubmit = async () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill out all fields.");
      return;
    }

    // email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    await handleAddAdmin(currentDocId, name, email, password);
  };

  const handleRemoveAdmin = async (docId) => {
    const confirmDelete = window.confirm(
      `Remove ${admins[docId].name}? The data will be archived.`
    );
    if (!confirmDelete) return;

    try {
      const removedAdmin = admins[docId];
      const adminEmail = removedAdmin.email;

      // === 1. Generate unique remove ID ===
      const generateRemoveId = () => {
        const randomHex = Math.floor(Math.random() * 0xffffff)
          .toString(16)
          .padStart(6, "0")
          .toUpperCase();
        return `R-${randomHex}`;
      };
      const removeId = generateRemoveId();

      // === 2. Fetch all recentActivityLogs for this admin ===
      const logsQuery = query(
        collection(db, "recentActivityLogs"),
        where("userEmail", "==", adminEmail)
      );

      const logsSnapshot = await getDocs(logsQuery);
      const adminLogs = logsSnapshot.docs.map((doc) => doc.data());

      // === 3. Save archive into adminArchive ===
      await addDoc(collection(db, "adminArchive"), {
        removeId,
        name: removedAdmin.name,
        email: removedAdmin.email,
        archiveFrom: docId,
        archivedAt: new Date().toISOString(),
        recentActivityLogs: adminLogs, // ⬅️ ALL LOGS SAVED HERE
      });

      // === 4. Clear admin slot ===
      const docRef = doc(db, "admins", docId);
      await updateDoc(docRef, { name: "", email: "" });

      // === 5. Update UI ===
      setAdmins((prev) => ({
        ...prev,
        [docId]: { name: "", email: "" },
      }));

      // ⭐⭐⭐ NEW — Create recent activity log
      const currentAdminId = Object.keys(admins).find(
        (key) => admins[key].email === auth.currentUser?.email
      );

      await addDoc(collection(db, "recentActivityLogs"), {
        logID: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        action: `Admin (${
          admins[currentAdminId]?.email || "Unknown"
        }) removed admin ${removedAdmin.email}`,
        timestamp: new Date().toISOString(),
        userEmail: admins[currentAdminId]?.email || "Unknown",
        role: admins[currentAdminId]?.role || "Unknown",
      });

      alert(
        `Admin removed and archived.\nRemove ID: ${removeId}\nLogs Saved: ${adminLogs.length}`
      );
    } catch (err) {
      console.error("Error removing admin:", err);
      alert("Failed to remove admin.");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>Admin Management</h2>
      <div style={{ display: "grid", gap: "1rem" }}>
        {Object.keys(adminDocs).map((docId) => {
          const { name } = admins[docId];
          const label = adminDocs[docId];
          return (
            <div key={docId} style={cardStyle}>
              <h3>{label}</h3>
              <p>
                <strong>Name:</strong> {name || "— No Admin —"}
              </p>
              <p>
                <strong>Email:</strong> {admins[docId].email || "— No Email —"}
              </p>

              {!name && (
                <button
                  style={{ ...buttonStyle, backgroundColor: "#7C4DFF" }}
                  onClick={() => handleOpenModal(docId, "add")}
                >
                  Add
                </button>
              )}
              {name && docId !== "A01" && (
                <button
                  style={removeBtn}
                  onClick={() => handleOpenModal(docId, "remove")}
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>

      {confirmModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3>Warning ⚠️</h3>
            <p>
              {confirmAction === "remove"
                ? `Are you sure you want to remove ${admins[pendingDocId]?.name}?`
                : "Are you sure you want to add a new admin?"}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: "#7C4DFF",
                  color: "#fff",
                }}
                onClick={handleConfirmYes}
              >
                Yes
              </button>
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: "#6c6c6c",
                  color: "#fff",
                }}
                onClick={handleConfirmNo}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3>Add Admin</h3>
            <label>Name:</label>
            <input
              style={{
                ...inputStyle,
                borderColor: focusedField === "name" ? "#7C4DFF" : "#ccc",
              }}
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField("")}
            />
            <label>Email:</label>
            <input
              style={{
                ...inputStyle,
                borderColor: focusedField === "email" ? "#7C4DFF" : "#ccc",
              }}
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField("")}
            />
            <label>Password:</label>
            <div style={passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                style={{
                  ...inputStyleWithIcon,
                  borderColor: focusedField === "password" ? "#7C4DFF" : "#ccc",
                }}
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField("")}
              />
              <button
                type="button"
                style={eyeBtn}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <label>Confirm Password:</label>
            <div style={passwordContainer}>
              <input
                type={showConfirm ? "text" : "password"}
                style={{
                  ...inputStyleWithIcon,
                  borderColor:
                    focusedField === "confirmPassword" ? "#7C4DFF" : "#ccc",
                }}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField("")}
              />
              <button
                type="button"
                style={eyeBtn}
                onClick={() => setShowConfirm((prev) => !prev)}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: "#7C4DFF",
                  color: "#fff",
                }}
                onClick={handleSubmit}
              >
                Submit
              </button>
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: "#aaa",
                  color: "#fff",
                }}
                onClick={handleCloseModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const containerStyle = {
  maxWidth: "600px",
  margin: "2rem auto",
  background: "linear-gradient(135deg, #a166ff, #ebdfff)",
  padding: "2rem",
  borderRadius: "16px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  fontFamily: "Arial, sans-serif",
};

const inputStyle = {
  marginBottom: "0.8rem",
  padding: "0.5rem",
  borderRadius: "6px",
  border: "1px solid #ccc",
  outline: "none",
  fontSize: "0.95rem",
  transition: "border 0.2s",
};

const inputStyleWithIcon = {
  ...inputStyle,
  width: "100%",
  paddingRight: "2.5rem",
  MozAppearance: "textfield",
};

const passwordContainer = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const eyeBtn = {
  position: "absolute",
  paddingTop: "0.01rem",
  gap: "200px",
  right: "0.8rem",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "1.2rem",
  color: "#555",
};

const headingStyle = {
  textAlign: "center",
  marginBottom: "1.5rem",
};

const buttonStyle = {
  padding: "0.6rem 1.2rem",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.95rem",
  fontWeight: "500",
  transition: "background 0.2s",
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle = {
  backgroundColor: "#fff",
  padding: "2rem",
  borderRadius: "12px",
  width: "400px",
  display: "flex",
  flexDirection: "column",
};

const cardStyle = {
  background: "#fff",
  padding: "1rem",
  borderRadius: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
};

const removeBtn = {
  padding: "0.6rem 1.2rem",
  marginTop: "0.4rem",
  fontSize: "0.95rem",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#146a92ff",
  color: "#fff",
  cursor: "pointer",
};

export default Admin;
