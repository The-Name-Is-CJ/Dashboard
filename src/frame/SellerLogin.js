import { signInWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

const DashLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [allowedEmail, setAllowedEmail] = useState("");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSellerEmail = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "seller"));
        if (!querySnapshot.empty) {
          const sellerDoc = querySnapshot.docs[0].data();
          setAllowedEmail(sellerDoc.email.toLowerCase());
        }
      } catch (err) {
        console.error("Error fetching seller email:", err);
      }
    };

    fetchSellerEmail();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (
        user.email.trim().toLowerCase() !== allowedEmail.trim().toLowerCase()
      ) {
        setErrorMsg("Unauthorized user.");
        setIsLoading(false);
        return;
      }

      const logID = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await addDoc(collection(db, "recentActivityLogs"), {
        logID,
        action: "Seller logged in",
        userEmail: user.email,
        role: "Seller",
        timestamp: serverTimestamp(),
      });

      navigate("/seller/sellerdashboard");
    } catch (error) {
      console.error("Login error:", error);

      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setErrorMsg("Invalid email or password.");
      } else if (error.code === "auth/invalid-email") {
        setErrorMsg("Email format is invalid.");
      } else {
        setErrorMsg("Login failed. Check console for details.");
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="login-page">
      <div className="curve-bg"></div>
      <h1 className="welcome-text">Welcome Seller!</h1>
      <div className="login-card">
        {errorMsg && <p className="error-msg">{errorMsg}</p>}

        <form onSubmit={handleLogin}>
          <h2 className="login-title">Login</h2>
          <p className="login-subtext">Please login to access your account</p>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group password-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                className="toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate("/")}
          >
            Back
          </button>
        </form>
      </div>

      <style>{`
        .login-page {
          position: relative;
          min-height: 100vh;
          background-color: #fff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Poppins', sans-serif;
          padding: 20px;
        }

        .curve-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 65vh;
          background: linear-gradient(145deg, #7C4DFF 0%, #9C6BFF 50%, #B39DDB 100%);
          clip-path: polygon(0 0, 100% 0, 100% 55%, 50% 85%, 0 55%);
          z-index: 0;
        }

        .welcome-text {
          position: relative;
          color: #fff;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 30px;
          text-align: center;
          z-index: 1;
        }

        .login-card {
          position: relative;
          z-index: 1;
          background: #fff;
          padding: 2.8rem;
          border-radius: 20px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          width: 420px;
          text-align: left;
        }

        .login-title {
          color: #6f42c1;
          font-size: 1.6rem;
          margin-bottom: 0.3rem;
          font-family: 'Krona One', sans-serif;
        }

        .login-subtext {
          color: #777;
          font-size: 0.95rem;
          margin-bottom: 1.8rem;
        }

        .form-group {
          margin-bottom: 1.4rem;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          color: #444;
          margin-bottom: 5px;
        }

        .form-group input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 30px;
          border: 1px solid #ccc;
          outline: none;
          font-size: 0.95rem;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .form-group input:focus {
          border-color: #7C4DFF;
          box-shadow: 0 0 0 2px rgba(124, 77, 255, 0.15);
        }

        .password-wrapper {
          position: relative;
        }

        .toggle-eye {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          color: #6f42c1;
          font-size: 1.1rem;
        }

        .login-btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 30px;
          background: linear-gradient(90deg, #6f42c1, #9b7bff);
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s ease, transform 0.2s ease;
        }

        .login-btn:hover {
          background: linear-gradient(90deg, #5e35b1, #8660ff);
          transform: translateY(-2px);
        }

        .error-msg {
          color: red;
          margin-bottom: 1rem;
          text-align: center;
        }
        .back-btn {
          width: 100%;
          padding: 12px;
          border: 2px solid #6f42c1;
          border-radius: 30px;
          background: #fff;
          color: #6f42c1;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 12px;
          transition: background 0.3s ease, color 0.3s ease, transform 0.2s ease;
        }

        .back-btn:hover {
          background: #f3e9ff;
          color: #5e35b1;
          transform: translateY(-2px);
        }
        
        @media (max-width: 768px) {
          .login-card {
            width: 90%;
            padding: 2rem;
          }

          .welcome-text {
            font-size: 1.6rem;
            margin-bottom: 25px;
          }

          .curve-bg {
            height: 50vh;
            clip-path: polygon(0 0, 100% 0, 100% 65%, 50% 95%, 0 65%);
          }
        }

        @media (max-width: 480px) {
          .login-card {
            width: 95%;
            padding: 1.8rem;
          }

          .welcome-text {
            font-size: 1.4rem;
          }

          .login-btn {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DashLogin;
