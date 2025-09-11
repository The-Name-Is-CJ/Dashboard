import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import DashLogin from './frame/DashLogin';
import Products from './frame/Products';
import Sidebar from './components/Sidebar';
import SplashScreen from './frame/SplashScreen';
import Logout from './frame/Logout';
import Profile from './frame/Profile';
import Dashboard from './frame/Dashboard';
import ChatSupport from './frame/ChatSupport';
import Reviews from './frame/Reviews';

// Import your five order screens
import Orders from './frame/Orders';
import ToShip from './frame/ToShip';
import ToReceive from './frame/ToReceive'; // ✅ Added
import Cancelled from './frame/Cancelled';
import Complete from './frame/Complete';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const allowedAdminEmail = 'angakingkasaguatanayyy@hindipoate.com';

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading || showSplash) {
    return <SplashScreen />;
  }

  return (
    <Router>
      {user && user.email === allowedAdminEmail ? (
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <div style={{ marginLeft: '250px', padding: '20px', flex: 1 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory" element={<Products />} />

              {/* Orders and its screens */}
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/toship" element={<ToShip />} />
              <Route path="/orders/toreceive" element={<ToReceive />} /> {/* ✅ Added */}
              <Route path="/orders/cancelled" element={<Cancelled />} />
              <Route path="/orders/complete" element={<Complete />} />

              <Route path="/chat" element={<ChatSupport />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/logout" element={<Logout />} />
            </Routes>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="*" element={<DashLogin />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
