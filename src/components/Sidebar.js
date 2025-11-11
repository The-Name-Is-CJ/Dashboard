import React from 'react';
import styled from 'styled-components';
import { Colors } from './dashboardstyles';
import {
  FaBoxes,
  FaComments,
  FaStar,
  FaUser,
  FaSignOutAlt,
  FaTachometerAlt
} from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

const { secondary, white, gray } = Colors;

// Sidebar container
const SidebarContainer = styled.div`
  width: 250px;
  background-color: ${white};
  height: 100vh;
  box-shadow: 2px 0 5px rgba(0,0,0,0.1);
  padding: 20px;
  position: fixed;
`;

// Logo with Krona One font
const Logo = styled.h2`
  color: ${secondary};
  font-family: 'Krona One', sans-serif; /* ✅ Krona One font */
  font-size: 1.38rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  position: relative;
  padding-bottom: 25px;
  &:after {
    content: '';
    display: block;
    width: 100%;
    height: 1px;
    background-color: #ccc; /* subtle line */
    position: absolute;
    bottom: 0;
    left: 0;
  }
`;

// Navigation items
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

const Sidebar = () => {
  return (
    <SidebarContainer>
      <Logo>TryFit Admin</Logo>

      <NavItem to="/dashboard">
        <FaTachometerAlt /> Dashboard
      </NavItem>

      <NavItem to="/inventory">
        <FaBoxes /> Product List
      </NavItem>

      <NavItem to="/orders">
        <FaBoxes /> Orders
      </NavItem>

      <NavItem to="/chat">
        <FaComments /> Chat Support
      </NavItem>

      <NavItem to="/reviews">
        <FaStar /> Reviews
      </NavItem>

      <NavItem to="/profile">
        <FaUser /> Admin Management
      </NavItem>

      <NavItem to="/logout">
        <FaSignOutAlt /> Logout
      </NavItem>
    </SidebarContainer>
  );
};

export default Sidebar;
