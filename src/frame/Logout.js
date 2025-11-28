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

const Logout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(true);
  const [sellerEmail, setSellerEmail] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSeller = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "seller"));
        if (!querySnapshot.empty) {
          const sellerData = querySnapshot.docs[0].data();
          setSellerEmail({
            email: sellerData.email,
            role: sellerData.role || "Seller",
          });
        }
      } catch (err) {
        console.error("Error fetching seller:", err);
      }
    };

    fetchSeller();
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setShowConfirmModal(false);
    try {
      const user = auth.currentUser;

      if (user) {
        const role =
          sellerEmail?.email?.trim().toLowerCase() ===
          user.email.trim().toLowerCase()
            ? sellerEmail.role
            : "Seller";

        const logID = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        await addDoc(collection(db, "recentActivityLogs"), {
          logID: logID,
          action: "Seller logged out",
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
          background: "linear-gradient(135deg, #a166ff, #ebdfff)",
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

export default Logout;
