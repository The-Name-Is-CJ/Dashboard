import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import {
  OrdersContainer,
  OrdersHeader,
  OrdersTable,
  OrdersTabs,
  TabItem,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/orderstyle";
import { db } from "../firebase";

const searchStyles = {
  container: { position: "relative", width: "500px" },
  input: {
    width: "100%",
    padding: "10px 40px 10px 15px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease-in-out",
  },
  icon: {
    position: "absolute",
    right: "12px",
    top: "80%",
    transform: "translateY(-50%)",
    fontSize: "18px",
    color: "#888",
    pointerEvents: "none",
  },
};

const Complete = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [weeklyCompletedCount, setWeeklyCompletedCount] = useState(0);

  useEffect(() => {
    const completedRef = collection(db, "completed");
    const q = query(completedRef, orderBy("receivedAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const fetchedOrders = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setOrders(fetchedOrders);
      } catch (err) {
        console.error("Error fetching completed orders:", err);
      }
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const collectionsToWatch = [
      "orders",
      "toShip",
      "toReceive",
      "completed",
      "cancelled",
    ];
    const unsubscribes = [];

    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const updateWeeklyReceivedCount = () => {
      let total = 0;

      unsubscribes.forEach((u) => {
        if (!u.latestSnapshot) return;
        u.latestSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.receivedAt) {
            const receivedDate = data.receivedAt.toDate();
            if (receivedDate >= startOfWeek && receivedDate <= today)
              total += 1;
          }
        });
      });

      setWeeklyCompletedCount(total);
    };

    collectionsToWatch.forEach((col) => {
      const q = query(collection(db, col));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        unsubscribe.latestSnapshot = snapshot;
        updateWeeklyReceivedCount();
      });
      unsubscribe.latestSnapshot = null;
      unsubscribes.push(unsubscribe);
    });

    return () => unsubscribes.forEach((u) => u());
  }, []);

  const filteredOrders = orders
    .map((order) => ({
      ...order,
      items: order.items.filter((item) =>
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((order) => order.items.length > 0);

  const tabs = [
    { name: "Orders", path: "/orders" },
    { name: "To Ship", path: "/orders/toship" },
    { name: "To Receive", path: "/orders/toreceive" },
    { name: "Cancelled", path: "/orders/cancelled" },
    { name: "Completed", path: "/orders/complete" },
  ];

  return (
    <OrdersContainer>
      <OrdersHeader
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Completed Orders</h2>

        <div style={searchStyles.container}>
          <span style={{ fontSize: "18px", color: "#666" }}>
            Use the orderID:
          </span>
          <input
            type="text"
            placeholder="Find order"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchStyles.input}
            onFocus={(e) => (e.target.style.borderColor = "#9747FF")}
            onBlur={(e) => (e.target.style.borderColor = "#ccc")}
          />
          <FiSearch style={searchStyles.icon} />
        </div>
      </OrdersHeader>

      <OrdersTabs
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "15px" }}>
          {tabs.map((tab) => (
            <TabItem key={tab.name} active={location.pathname === tab.path}>
              <Link
                to={tab.path}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {tab.name}
              </Link>
            </TabItem>
          ))}
        </div>

        <div
          style={{
            marginTop: "10px",
            fontSize: "25px",
            fontWeight: "500",
            color: "#444",
          }}
        >
          Total sold this week:{" "}
          <span style={{ fontWeight: "500", color: "#28a745" }}>
            {weeklyCompletedCount}
          </span>
        </div>
      </OrdersTabs>

      <OrdersTable>
        <TableHead>
          <TableRow>
            <TableHeader width="150px" style={{ textAlign: "center" }}>
              Customer
            </TableHeader>
            <TableHeader width="325px" style={{ textAlign: "center" }}>
              Address
            </TableHeader>
            <TableHeader width="125px" style={{ textAlign: "center" }}>
              Completed Date
            </TableHeader>
            <TableHeader width="225px" style={{ textAlign: "center" }}>
              Product
            </TableHeader>
            <TableHeader width="30px" style={{ textAlign: "center" }}>
              Quantity
            </TableHeader>
            <TableHeader width="50px" style={{ textAlign: "center" }}>
              Amount
            </TableHeader>
            <TableHeader width="50px" style={{ textAlign: "center" }}>
              Sizes
            </TableHeader>
            <TableHeader width="100px" style={{ textAlign: "center" }}>
              Status
            </TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredOrders.length > 0 ? (
            filteredOrders.flatMap((order) =>
              order.items.map((item) => (
                <TableRow key={`${order.id}-${item.id}`}>
                  <TableData>{order.name || order.userId}</TableData>
                  <TableData>{order.address || "-"}</TableData>
                  <TableData style={{ textAlign: "center" }}>
                    {order.receivedAt?.toDate().toLocaleString() || "-"}
                  </TableData>
                  <TableData style={{ textAlign: "center" }}>
                    {item.productName}
                  </TableData>
                  <TableData style={{ textAlign: "center" }}>
                    {item.quantity}
                  </TableData>
                  <TableData style={{ textAlign: "center" }}>
                    ₱{item.price}
                  </TableData>
                  <TableData style={{ textAlign: "center" }}>
                    {item.size || "-"}
                  </TableData>
                  <TableData style={{ textAlign: "center" }}>
                    <button
                      style={{
                        backgroundColor: "#28a745",
                        color: "#fff",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        display: "inline-block",
                        border: "none",
                        cursor: "default",
                      }}
                      disabled
                    >
                      Completed
                    </button>
                  </TableData>
                </TableRow>
              ))
            )
          ) : (
            <TableRow>
              <TableData
                colSpan="8"
                style={{ textAlign: "center", padding: "20px" }}
              >
                ✅ No completed orders found
              </TableData>
            </TableRow>
          )}
        </tbody>
      </OrdersTable>
    </OrdersContainer>
  );
};

export default Complete;
