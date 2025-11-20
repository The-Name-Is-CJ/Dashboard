import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { addDoc, collection, serverTimestamp, getDoc, doc, } from "firebase/firestore";
import { db } from "../firebase";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const DashLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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



  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

     
      const matchedAdmin = adminEmails.find(a => a.email === user.email.toLowerCase());


      if (!matchedAdmin) {
        setErrorMsg("Unauthorized user.");
        return;
      }

      // Log activity
      const logID = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await addDoc(collection(db, "recentActivityLogs"), {
        logID,
        action: "logged in",
        userEmail: user.email,
        role: matchedAdmin.role,
        timestamp: serverTimestamp(),
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        setErrorMsg("Invalid email or password.");
      } else if (error.code === "auth/invalid-email") {
        setErrorMsg("Email format is invalid.");
      } else {
        setErrorMsg("Login failed. Check console for details.");
      }
    }
  };


  return (
    <div className="login-page">
      {/* Background */}
      <div className="curve-bg"></div>

      {/* Welcome Text */}
      <h1 className="welcome-text">Welcome to Admin Dashboard!</h1>

      {/* Login Card */}
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

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
      </div>

      {/* Internal Styles */}
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

        /* Responsive */
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
