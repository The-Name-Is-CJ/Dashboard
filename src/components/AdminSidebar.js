import {
  FaArchive,
  FaClipboardList,
  FaSignOutAlt,
  FaTachometerAlt,
  FaUser,
  FaUsers,
  FaUserShield,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import styled from "styled-components";

const Colors = {
  primary: "#fff",
  secondary: "#6f42c1",
  accent: "#9b7bff",
  white: "#fff",
  gray: "#777",
};

const { primary, secondary, white, gray } = Colors;

const SidebarContainer = styled.div`
  width: 250px;
  background-color: ${primary};
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
  margin-bottom: 1.5rem;
  position: relative;
  padding-bottom: 15px;
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
  gap: 0.8rem;
  padding: 12px 14px;
  margin-bottom: 12px;
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

const AdminSidebar = () => {
  return (
    <SidebarContainer>
      <Logo>Admin Panel</Logo>

      <NavItem to="/admin/admindashboard">
        <FaTachometerAlt /> Dashboard
      </NavItem>

      <NavItem to="/admin/users">
        <FaUser /> User Accounts
      </NavItem>

      <NavItem to="/admin/seller">
        <FaUsers /> Seller Accounts
      </NavItem>

      <NavItem to="/admin/admins">
        <FaUserShield /> Admin Management
      </NavItem>

      <NavItem to="/admin/activity-logs">
        <FaClipboardList /> Activity Logs
      </NavItem>

      <NavItem to="/admin/archives">
        <FaArchive /> Archives
      </NavItem>

      <NavItem to="/admin/adminlogout">
        <FaSignOutAlt /> Logout
      </NavItem>
    </SidebarContainer>
  );
};

export default AdminSidebar;
