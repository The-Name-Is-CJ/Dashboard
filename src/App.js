import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  Outlet,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import Sidebar from "./components/Sidebar";
import ChatSupport from "./frame/ChatSupport";
import Logout from "./frame/Logout";
import Products from "./frame/Products";
import Reviews from "./frame/Reviews";
import SellerLogin from "./frame/SellerLogin";
import SellerDashboard from "./frame/SellerDashboard";
import SplashScreen from "./frame/SplashScreen";

import Cancelled from "./frame/Cancelled";
import Complete from "./frame/Complete";
import Orders from "./frame/Orders";
import RoleSelection from "./frame/RoleSelection";
import ToReceive from "./frame/ToReceive";
import Return_Refund from "./frame/Return_Refund";
import ToShip from "./frame/ToShip";

// Layout component for Seller routes
const SellerLayout = () => (
  <div style={{ display: "flex" }}>
    <Sidebar /> {/* side nav */}
    <div style={{ marginLeft: "250px", padding: "20px", flex: 1 }}>
      <Outlet /> {/* nested routes render here */}
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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
