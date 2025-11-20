import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db} from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import DashLogin from './frame/DashLogin';
import Products from './frame/Products';
import Sidebar from './components/Sidebar';
import SplashScreen from './frame/SplashScreen';
import Logout from './frame/Logout';
import Profile from './frame/Profile';
import Dashboard from './frame/Dashboard';
import ChatSupport from './frame/ChatSupport';
import Reviews from './frame/Reviews';

// Orders Pages
import Orders from './frame/Orders';
import ToShip from './frame/ToShip';
import ToReceive from './frame/ToReceive';
import Cancelled from './frame/Cancelled';
import Complete from './frame/Complete';


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [adminEmails, setAdminEmails] = useState([]);

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
            if (data.email) admins.push(data.email.toLowerCase());
          }
        }

        setAdminEmails(admins);
      } catch (err) {
        console.error("Error fetching admins:", err);
      }
    };

    fetchAdmins();
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading || showSplash) return <SplashScreen />;

  return (
  <Router>
   
    {user && adminEmails.includes(user.email) ? (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={{ marginLeft: '250px', padding: '20px', flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/toship" element={<ToShip />} />
            <Route path="/orders/toreceive" element={<ToReceive />} />
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
