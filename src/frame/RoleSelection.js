import React from "react";
import { useNavigate } from "react-router-dom";

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="role-page">
      <div className="curve-bg"></div>

      <h1 className="welcome-text">Welcome!</h1>
      <div className="login-card">
        <h2 className="login-title">Sign in as:</h2>
        <p className="login-subtext">Choose your role to continue</p>

        <div className="role-buttons">
          <button className="role-btn" onClick={() => navigate("/sellerLogin")}>
            Seller
          </button>
          <button className="role-btn" onClick={() => navigate("/admin-login")}>
            Admin
          </button>
        </div>
      </div>

      <style>{`
        .role-page {
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
          text-align: center;
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

        .role-buttons {
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
        }

        .role-btn {
          width: 100%;
          padding: 12px 0;
          border: none;
          border-radius: 30px;
          background: linear-gradient(90deg, #6f42c1, #9b7bff);
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s ease, transform 0.2s ease;
        }

        .role-btn:hover {
          background: linear-gradient(90deg, #5e35b1, #8660ff);
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

          .role-btn {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
};

export default RoleSelection;
