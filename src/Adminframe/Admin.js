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
// eye icons removed since password fields are now auto-generated
import { auth, db } from "../firebase";
import { sendEmailVerification } from "firebase/auth";
import { setDoc, doc as firestoreDoc } from "firebase/firestore";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentDocId, setCurrentDocId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    // passwords removed from UI — will be auto-generated
  });
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingDocId, setPendingDocId] = useState("");
  const [confirmAction, setConfirmAction] = useState("");
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
      setFormData({ name: "", email: "" });
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
    setFormData({ name: "", email: "" });
  };

  const handleAddAdmin = async (docId, name, email, password) => {
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0) {
        alert("This email already exists. Use a different one.");
        return;
      }

      await createUserWithEmailAndPassword(auth, email, password);

      // If the created user is the new auth currentUser, capture it
      const newUser = auth.currentUser;

      // === Send verification email unless this is the special admin account ===
      const skipVerificationFor = "admin@gmail.com";
      let verificationSent = false;
      if (email !== skipVerificationFor) {
        try {
          // send default firebase verification (backend can send custom HTML using Admin SDK)
          await sendEmailVerification(newUser);
          verificationSent = true;
        } catch (err) {
          console.warn("Failed to send verification email:", err);
        }
      }

      // === Save an invite document so a backend/cloud-function can send a custom-styled email ===
      try {
        const inviteRef = firestoreDoc(db, "adminInvites", email);
        await setDoc(inviteRef, {
          email,
          password,
          name,
          createdBy: auth.currentUser?.email || "Unknown",
          createdAt: new Date().toISOString(),
          verificationRequested: email !== skipVerificationFor,
          verificationSent,
          colorPalette: {
            primary: "#7C4DFF",
            gradientStart: "#a166ff",
            gradientEnd: "#ebdfff",
          },
        });
      } catch (err) {
        console.warn("Failed to create invite record:", err);
      }

      // 📝 Save admin in Firestore
      const docRef = doc(db, "admins", docId);
      await updateDoc(docRef, { name, email });

      const logID =
        "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

      const currentAdminEmail = auth.currentUser?.email || "Unknown Admin";

      await addDoc(collection(db, "recentActivityLogs"), {
        logID,
        action: `Admin "${currentAdminEmail}" added "${email}" as new admin`,
        userEmail: currentAdminEmail,
        timestamp: new Date().toISOString(),
      });

      setAdmins((prev) => ({ ...prev, [docId]: { name, email } }));

      // === Try to copy the generated password to clipboard ===
      let copiedToClipboard = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(password);
          copiedToClipboard = true;
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = password;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textarea);
          copiedToClipboard = !!successful;
        }
      } catch (err) {
        console.warn("Clipboard copy failed:", err);
        copiedToClipboard = false;
      }
      // Show the generated password to the creating admin so they can copy/send if needed
      alert(`✅ Admin added successfully: ${email}\n\nPassword: ${password}\n\nA verification email was ${
        verificationSent ? "sent" : email === "admin@gmail.com" ? "skipped for this account" : "not sent (check logs)"
      }.${copiedToClipboard ? "\n\nThe password was copied to your clipboard." : "\n\n(Unable to copy password to clipboard automatically)"}`);
      handleCloseModal();
    } catch (error) {
      console.error(error);
      alert("Failed to add admin. Check console.");
    }
  };

  const handleSubmit = async () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    // generate a strong random password for the new admin
    const generatePassword = (length = 12) => {
      const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const lower = "abcdefghijklmnopqrstuvwxyz";
      const digits = "0123456789";
      const symbols = "!@#$%^&*-_";
      const all = upper + lower + digits + symbols;
      let pwd = "";
      // ensure at least one of each
      pwd += upper[Math.floor(Math.random() * upper.length)];
      pwd += lower[Math.floor(Math.random() * lower.length)];
      pwd += digits[Math.floor(Math.random() * digits.length)];
      pwd += symbols[Math.floor(Math.random() * symbols.length)];
      for (let i = 4; i < length; i++) {
        pwd += all[Math.floor(Math.random() * all.length)];
      }
      return pwd
        .split("")
        .sort(() => 0.5 - Math.random())
        .join("");
    };

    if (!name || !email) {
      alert("Please fill out name and email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    const password = generatePassword(12);
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

      const generateRemoveId = () => {
        const randomHex = Math.floor(Math.random() * 0xffffff)
          .toString(16)
          .padStart(6, "0")
          .toUpperCase();
        return `R-${randomHex}`;
      };
      const removeId = generateRemoveId();

      // Get the admin logs
      const logsQuery = query(
        collection(db, "recentActivityLogs"),
        where("userEmail", "==", adminEmail)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const adminLogs = logsSnapshot.docs.map((doc) => doc.data());

      // Archive admin info (without logs)
      await addDoc(collection(db, "adminArchive"), {
        removeId,
        name: removedAdmin.name,
        email: removedAdmin.email,
        archiveFrom: docId,
        archivedAt: new Date(),
      });

      // Remove admin info
      const docRef = doc(db, "admins", docId);
      await updateDoc(docRef, { name: "", email: "" });

      setAdmins((prev) => ({
        ...prev,
        [docId]: { name: "", email: "" },
      }));

      // Add logs to recentActivityLogs collection
      for (const log of adminLogs) {
        await addDoc(collection(db, "recentActivityLogs"), {
          ...log,
          archivedAdminRemoveId: removeId, // optional: track which admin removal this belongs to
        });
      }

      // Add action log for this removal
      const currentAdminId = Object.keys(admins).find(
        (key) => admins[key].email === auth.currentUser?.email
      );
      await addDoc(collection(db, "recentActivityLogs"), {
        logID: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        action: `Admin (${
          admins[currentAdminId]?.email || "Unknown"
        }) removed admin ${removedAdmin.email}`,
        timestamp: new Date(),
        userEmail: admins[currentAdminId]?.email || "Unknown",
        role: admins[currentAdminId]?.role || "Unknown",
        archivedAdminRemoveId: removeId,
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
            <p style={{ marginTop: "0.5rem", marginBottom: "0.5rem", color: "#333" }}>
              A password will be generated automatically and emailed to the new admin.
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
