import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FaBoxes,
  FaComments,
  FaSignOutAlt,
  FaStar,
  FaTachometerAlt,
  FaUser,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import styled from "styled-components";
import { db } from "../firebase";
import { Colors } from "./dashboardstyles";

const { secondary, white, gray } = Colors;

const SidebarContainer = styled.div`
  width: 250px;
  background-color: ${white};
  height: 100vh;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  padding: 20px;
  position: fixed;
`;

const Logo = styled.h2`
  color: ${secondary};
  font-family: "Krona One", sans-serif;
  font-size: 1.38rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  position: relative;
  padding-bottom: 25px;
  &:after {
    content: "";
    display: block;
    width: 100%;
    height: 1px;
    background-color: #ccc;
    position: absolute;
    bottom: 0;
    left: 0;
  }
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 14px 12px;
  margin-bottom: 1rem;
  text-decoration: none;
  color: ${gray};
  border-radius: 10px;
  font-size: 1.05rem;
  transition: 0.3s ease;

  &.active {
    background-color: ${secondary};
    color: ${white};
  }

  &:hover {
    background-color: ${secondary};
    color: ${white};
  }
`;

const RedDot = styled.span`
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  margin-left: auto;
`;

const Sidebar = () => {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "chatMessages"),
      where("sender", "==", "user"),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnread(snapshot.size > 0);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SidebarContainer>
      <Logo>TryFit Admin</Logo>

      <NavItem to="/seller/sellerdashboard">
        <FaTachometerAlt /> Dashboard
      </NavItem>

      <NavItem to="/seller/inventory">
        <FaBoxes /> Product List
      </NavItem>

      <NavItem to="/seller/orders">
        <FaBoxes /> Orders
      </NavItem>

      <NavItem to="/seller/chat">
        <FaComments /> Chat Support
        {hasUnread && <RedDot />}
      </NavItem>

      <NavItem to="/seller/reviews">
        <FaStar /> Reviews
      </NavItem>

      <NavItem to="/seller/logout">
        <FaSignOutAlt /> Logout
      </NavItem>
    </SidebarContainer>
  );
};

export default Sidebar;
