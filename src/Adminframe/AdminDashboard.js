import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { FaCheckCircle, FaCog } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { db } from "../firebase";

ChartJS.register(ArcElement, Tooltip, Legend);

const Container = styled.div`
  width: 100%;
  padding: 20px;
`;

const CardRow = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 25px;
  margin-top: 30px;
`;

const SmallCard = styled.div`
  flex: 1;
  padding: 15px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, #8a2be2, #6a5acd);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-3px);
  }
`;

const CardLabel = styled.span`
  font-size: 14px;
  opacity: 0.8;
`;

const CardValue = styled.span`
  font-size: 24px;
  font-weight: 700;
  margin-top: 5px;
`;

const MainContent = styled.div`
  padding: 20px;
  background: #f8f7fc;
  border-radius: 14px;
  min-height: 300px;
`;

const LogItem = styled.div`
  padding: 8px 0;
  border-bottom: 1px solid #ddd;
  font-size: 14px;
`;

function formatTimestamp(ts) {
  if (ts?.toDate) return ts.toDate().toLocaleString();
  if (ts?._seconds) return new Date(ts._seconds * 1000).toLocaleString();
  if (typeof ts === "number") return new Date(ts).toLocaleString();
  if (typeof ts === "string") return ts;
  return "Invalid timestamp";
}

export default function AdminDashboard() {
  const [userCounts, setUserCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    blocked: 0,
  });
  const [sellerLogs, setSellerLogs] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [activeScreen, setActiveScreen] = useState("users");
  const [sellers, setSellers] = useState([]);
  const [selectedSellerEmail, setSelectedSellerEmail] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "seller"), (snap) => {
      const sellerArr = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSellers(sellerArr);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (activeScreen !== "seller") return;

    const fetchSellerLogs = async () => {
      try {
        const sellerEmail = selectedSellerEmail?.toLowerCase();

        if (!sellerEmail) {
          console.error("No seller email selected");
          setSellerLogs([]);
          return;
        }

        const logsQuery = query(
          collection(db, "recentActivityLogs"),
          where("userEmail", "==", sellerEmail),
          orderBy("timestamp", "desc"),
          limit(5)
        );

        const logsSnapshot = await getDocs(logsQuery);
        const logs = logsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setSellerLogs(logs);
      } catch (err) {
        console.error("Error fetching seller logs:", err);
        setSellerLogs([]);
      }
    };

    fetchSellerLogs();
  }, [activeScreen, selectedSellerEmail]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      let active = 0,
        inactive = 0,
        blocked = 0;

      snap.forEach((doc) => {
        const u = doc.data();
        if (u.blockStatus) {
          blocked++;
        } else {
          if (u.status === "Active") active++;
          else if (u.status === "Inactive") inactive++;
        }
      });

      setUserCounts({
        total: snap.size,
        active,
        inactive,
        blocked,
      });
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const logsRef = collection(db, "recentActivityLogs");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => d.data());
      setAdminLogs(arr);
    });
    return () => unsub();
  }, []);

  const chartData = {
    labels: ["Active", "Inactive"],
    datasets: [
      {
        data: [userCounts.active, userCounts.inactive],
        backgroundColor: ["#8A2BE2", "#BDA0F2"],
        borderWidth: 2,
      },
    ],
  };
  const navigate = useNavigate();

  const renderMainScreen = () => {
    switch (activeScreen) {
      case "users":
        return (
          <>
            <h3>User Distribution</h3>
            <div
              style={{
                maxWidth: "600px",
                margin: "40px auto 0 auto",
              }}
            >
              <Pie
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "left",
                      labels: {
                        boxWidth: 30,
                        padding: 15,
                        font: {
                          size: 16,
                        },
                      },
                    },
                  },
                }}
                height={350}
                width={350}
              />
            </div>
          </>
        );

      case "seller":
        return (
          <>
            <h3>Seller Logs</h3>

            {sellerLogs.length === 0 ? (
              <p>No logs found for this seller.</p>
            ) : (
              sellerLogs.map((log, i) => (
                <LogItem key={i}>
                  {log.action} —{" "}
                  {log.timestamp ? formatTimestamp(log.timestamp) : ""}
                </LogItem>
              ))
            )}

            <button
              onClick={() => navigate("/admin/activity-logs")}
              style={{
                marginTop: "20px",
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                background: "#6a5acd",
                color: "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              View All Logs
            </button>
          </>
        );

      case "admin":
        return (
          <>
            <h3>Admin Logs</h3>

            {adminLogs.length === 0 ? (
              <p>No admin logs.</p>
            ) : (
              adminLogs.map((log, i) => (
                <LogItem key={i}>
                  {log.action} —{" "}
                  {log.timestamp ? formatTimestamp(log.timestamp) : ""}
                </LogItem>
              ))
            )}

            <button
              onClick={() => navigate("/admin/activity-logs")}
              style={{
                marginTop: "20px",
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                background: "#6a5acd",
                color: "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              View All Logs
            </button>
          </>
        );

      case "system":
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              height: "100%",
              paddingTop: "80px",
            }}
          >
            <FaCog
              style={{
                fontSize: "140px",
                color: "#6a5acd",
                marginBottom: "25px",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "20px",
                color: "#333",
              }}
            >
              <FaCheckCircle style={{ color: "green", fontSize: "24px" }} />{" "}
              <span>All systems running normally</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <CardRow>
        <SmallCard onClick={() => setActiveScreen("users")}>
          <CardLabel>Total Users</CardLabel>
          <CardValue>{userCounts.total}</CardValue>
          <CardLabel>Active: {userCounts.active}</CardLabel>
          <CardLabel>Inactive: {userCounts.inactive}</CardLabel>
          <CardLabel>Blocked: {userCounts.blocked}</CardLabel>
        </SmallCard>

        {sellers.map((seller) => (
          <SmallCard
            key={seller.id}
            onClick={() => {
              setSelectedSellerEmail(seller.email);
              setActiveScreen("seller");
            }}
          >
            <CardLabel>Seller Logs</CardLabel>
            <CardValue>{seller.email}</CardValue>
            <CardValue>{seller.name}</CardValue>
          </SmallCard>
        ))}

        <SmallCard onClick={() => setActiveScreen("admin")}>
          <CardLabel>Admin Logs</CardLabel>
          <CardValue>View Logs</CardValue>
        </SmallCard>

        <SmallCard onClick={() => setActiveScreen("system")}>
          <CardLabel>System Status</CardLabel>
          <CardValue>Running</CardValue>
        </SmallCard>
      </CardRow>

      <MainContent>{renderMainScreen()}</MainContent>
    </Container>
  );
}
