import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import ActivityLogs from "./Adminframe/ActivityLogs";
import Admin from "./Adminframe/Admin";
import AdminDashboard from "./Adminframe/AdminDashboard";
import AdminLogin from "./Adminframe/AdminLogin";
import AdminLogout from "./Adminframe/AdminLogout";
import Archives from "./Adminframe/Archives";
import Seller from "./Adminframe/Seller";
import Users from "./Adminframe/Users";
import "./App.css";
import AdminSidebar from "./components/AdminSidebar";
import Sidebar from "./components/Sidebar";
import Cancelled from "./frame/Cancelled";
import ChatSupport from "./frame/ChatSupport";
import Complete from "./frame/Complete";
import Logout from "./frame/Logout";
import Orders from "./frame/Orders";
import Products from "./frame/Products";
import Return_Refund from "./frame/Return_Refund";
import Reviews from "./frame/Reviews";
import RoleSelection from "./frame/RoleSelection";
import SellerDashboard from "./frame/SellerDashboard";
import SellerLogin from "./frame/SellerLogin";
import SplashScreen from "./frame/SplashScreen";
import ToReceive from "./frame/ToReceive";
import ToShip from "./frame/ToShip";

const SellerLayout = () => (
  <div style={{ display: "flex" }}>
    <Sidebar />
    <div style={{ marginLeft: "250px", padding: "20px", flex: 1 }}>
      <Outlet />
    </div>
  </div>
);

const AdminLayout = () => (
  <div style={{ display: "flex" }}>
    <AdminSidebar />
    <div style={{ marginLeft: "250px", flex: 1 }}>
      <Outlet />
    </div>
  </div>
);

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/sellerLogin" element={<SellerLogin />} />
        <Route path="/adminLogin" element={<AdminLogin />} />
        <Route path="/seller" element={<SellerLayout />}>
          <Route index element={<Navigate to="sellerdashboard" replace />} />
          <Route path="sellerdashboard" element={<SellerDashboard />} />
          <Route path="inventory" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/toship" element={<ToShip />} />
          <Route path="orders/toreceive" element={<ToReceive />} />
          <Route path="orders/return_refund" element={<Return_Refund />} />
          <Route path="orders/cancelled" element={<Cancelled />} />
          <Route path="orders/complete" element={<Complete />} />
          <Route path="chat" element={<ChatSupport />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="logout" element={<Logout />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="admindashboard" replace />} />
          <Route path="admindashboard" element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="seller" element={<Seller />} />
          <Route path="admins" element={<Admin />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="archives" element={<Archives />} />
          <Route path="adminlogout" element={<AdminLogout />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
