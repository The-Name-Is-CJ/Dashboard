import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom"; // <-- import Link

const Colors = {
  secondary: "#fff",
  primary: "#6f42c1",
  accent: "#9b7bff",
  white: "#fff",
  gray: "#777",
};

const DashboardContainer = styled.div`
  padding: 30px;
  background: ${Colors.primary};
  min-height: 100vh;
  width: 100%;
  color: ${Colors.white};
  font-family: "Poppins", sans-serif;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 25px;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 25px;
`;

const Card = styled.div`
  background: ${Colors.secondary};
  padding: 25px;
  border-radius: 18px;
  box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease, box-shadow 0.3s ease, background 0.3s ease;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0px 8px 20px rgba(0, 0, 0, 0.45);
    background: ${Colors.accent};
  }
`;

const CardTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: black;
`;

const CardText = styled.p`
  font-size: 0.95rem;
  color: ${Colors.gray};
`;

const AdminDashboard = () => {
  const [usersCount, setUsersCount] = useState(0);
  const [sellersCount, setSellersCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        setUsersCount(usersSnapshot.size);

        const sellersSnapshot = await getDocs(collection(db, "seller"));
        setSellersCount(sellersSnapshot.size);
      } catch (err) {
        console.error("Error fetching dashboard counts:", err);
      }
    };

    fetchCounts();
  }, []);

  return (
    <DashboardContainer>
      <Title>Admin Dashboard</Title>

      <CardGrid>
        <Link to="/admin/users" style={{ textDecoration: "none" }}>
          <Card>
            <CardTitle>Users</CardTitle>
            <CardText>Number of registered users: {usersCount}</CardText>
          </Card>
        </Link>

        <Link to="/admin/seller" style={{ textDecoration: "none" }}>
          <Card>
            <CardTitle>Sellers</CardTitle>
            <CardText>Number of sellers: {sellersCount}</CardText>
          </Card>
        </Link>

        <Link to="/admin/activity-logs" style={{ textDecoration: "none" }}>
          <Card>
            <CardTitle>Recent Activity</CardTitle>
            <CardText>View latest activity logs</CardText>
          </Card>
        </Link>

        <Link to="/admin/system-monitoring" style={{ textDecoration: "none" }}>
          <Card>
            <CardTitle>System Status</CardTitle>
            <CardText>All systems operational</CardText>
          </Card>
        </Link>
      </CardGrid>
    </DashboardContainer>
  );
};

export default AdminDashboard;
