import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ButtonGroup,
  CancelButton,
  ModalContent,
  ModalOverlay,
  ModalTitle,
  SaveButton,
} from "../components/dashboardstyles";
import { auth, db } from "../firebase";

const AdminLogout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "admins"));
        if (!querySnapshot.empty) {
          // Find the current logged-in admin by email
          const currentUserEmail = auth.currentUser?.email
            ?.trim()
            .toLowerCase();
          const adminDoc = querySnapshot.docs.find(
            (doc) => doc.data().email?.trim().toLowerCase() === currentUserEmail
          );

          if (adminDoc) {
            setAdminData({
              id: adminDoc.id,
              email: adminDoc.data().email,
              role: adminDoc.data().role || "Admin",
            });
          }
        }
      } catch (err) {
        console.error("Error fetching admin:", err);
      }
    };

    fetchAdmin();
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setShowConfirmModal(false);
    try {
      const user = auth.currentUser;

      if (user) {
        const role = adminData?.role || "Admin";

        const logID = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        await addDoc(collection(db, "recentActivityLogs"), {
          logID: logID,
          action: "Admin logged out",
          role: role,
          userEmail: user.email,
          timestamp: serverTimestamp(),
        });
      }

      await signOut(auth);
      auth.currentUser?.reload();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
      setIsLoggingOut(false);
      setShowConfirmModal(true);
    }
  };

  const handleCancelLogout = () => {
    navigate(-1);
  };

  const handleOverlayClick = (e) => {
    if (e.target.dataset.overlay === "true") {
      handleCancelLogout();
    }
  };

  if (isLoggingOut) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6f42c1, #9b7bff)",
          color: "#fff",
          fontSize: "1.2rem",
          fontWeight: "bold",
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
                style={{ backgroundColor: "#A94444" }}
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

export default AdminLogout;
