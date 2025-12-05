import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
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
import { auth, db } from "../firebase";

const popupStyles = {
  overlay: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 1000,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  popupBox: {
    backgroundColor: "#fff",
    padding: "20px 25px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
    textAlign: "center",
    minWidth: "320px",
  },
  text: {
    fontSize: "16px",
    marginBottom: "15px",
    color: "#333",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
  },
  yesButton: {
    backgroundColor: "#9747FF",
    color: "#fff",
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  },
  noButton: {
    backgroundColor: "#ccc",
    color: "#000",
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  },
};

const TopPopup = ({
  visible,
  message,
  onConfirm,
  onCancel,
  loading,
  selectedOrdersList,
}) => {
  if (!visible) return null;

  return (
    <div style={popupStyles.overlay}>
      <div style={popupStyles.popupBox}>
        <p style={popupStyles.text}>{message}</p>

        {selectedOrdersList && selectedOrdersList.length > 0 && (
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              textAlign: "left",
              marginBottom: "15px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "10px",
            }}
          >
            {selectedOrdersList.map((order) =>
              order.items.map((item, idx) => (
                <div key={`${order.id}-${idx}`} style={{ marginBottom: "5px" }}>
                  <strong>Product Name:</strong> {item.productName} <br />
                  <strong>Order ID:</strong> {order.orderId}
                  <br />
                  <br />
                </div>
              ))
            )}
          </div>
        )}

        <div style={popupStyles.buttonContainer}>
          <button
            onClick={onConfirm}
            style={popupStyles.yesButton}
            disabled={loading}
          >
            {loading ? "Processing..." : "Yes"}
          </button>
          <button onClick={onCancel} style={popupStyles.noButton}>
            No
          </button>
        </div>
      </div>
    </div>
  );
};

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

const Orders = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState("Unknown");
  const user = auth.currentUser;
  const [loading, setLoading] = useState(false);
  const [weeklyOrderCount, setWeeklyOrderCount] = useState(0);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkAction, setBulkAction] = useState(false);

  useEffect(() => {
    const collectionsToWatch = [
      "orders",
      "toShip",
      "toReceive",
      "completed",
      "cancelled",
      "return_refund",
    ];
    const unsubscribes = [];

    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const updateWeeklyCount = () => {
      let total = 0;

      unsubscribes.forEach((u) => {
        if (!u.latestSnapshot) return;
        u.latestSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.createdAt) {
            const orderDate = data.createdAt.toDate();
            if (orderDate >= startOfWeek && orderDate <= today) total += 1;
          }
        });
      });

      setWeeklyOrderCount(total);
    };

    collectionsToWatch.forEach((col) => {
      const q = query(collection(db, col));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        unsubscribe.latestSnapshot = snapshot;
        updateWeeklyCount();
      });
      unsubscribe.latestSnapshot = null;
      unsubscribes.push(unsubscribe);
    });

    return () => unsubscribes.forEach((u) => u());
  }, []);

  useEffect(() => {
    const fetchSellerRole = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "seller"));
        if (!querySnapshot.empty) {
          const sellerDoc = querySnapshot.docs[0].data();
          if (sellerDoc.email === user?.email) {
            setRole("Seller");
          } else {
            setRole("Seller");
          }
        } else {
          setRole("Seller");
        }
      } catch (err) {
        console.error("Error fetching seller role:", err);
        setRole("Unknown");
      }
    };

    if (user?.email) {
      fetchSellerRole();
    }
  }, [user]);

  useEffect(() => {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const fetchedOrders = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setOrders(fetchedOrders);
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  const tabs = [
    { name: "Orders", path: "/seller/orders" },
    { name: "To Ship", path: "/seller/orders/toship" },
    { name: "To Receive", path: "/seller/orders/toreceive" },
    { name: "Cancelled", path: "/seller/orders/cancelled" },
    { name: "Completed", path: "/seller/orders/complete" },
    { name: "Return/Refund", path: "/seller/orders/return_refund" },
  ];

  const filterOrders = () => {
    const path = location.pathname;
    switch (path) {
      case "/seller/orders/toship":
        return orders.filter((o) => o.status === "To Ship");
      case "/seller/orders/toreceive":
        return orders.filter((o) => o.status === "To Receive");
      case "/seller/orders/cancelled":
        return orders.filter((o) => o.status === "Cancelled");
      case "/seller/orders/complete":
        return orders.filter((o) => o.status === "Complete");
      case "/seller/orders/return_refund":
        return orders.filter((o) => o.status === "Return/Refund");
      default:
        return orders;
    }
  };

  const displayedOrders = filterOrders();
  const filteredOrders = displayedOrders
    .filter((order) => order.orderId)
    .filter((order) =>
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Helper: compute delivery date by adding delivery-days to createdAt
  const formatDeliveryDate = (order) => {
    const delivery = order.delivery;
    if (!delivery) return "-";
    // format date as MM/DD/YYYY
    const formatDate = (d) => {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };

    // determine base date from createdAt (handles Firestore Timestamp or Date)
    let baseDate = null;
    try {
      if (order.createdAt && typeof order.createdAt.toDate === "function") {
        baseDate = order.createdAt.toDate();
      } else if (order.createdAt) {
        baseDate = new Date(order.createdAt);
      }
    } catch (e) {
      baseDate = null;
    }

    if (!baseDate || isNaN(baseDate.getTime())) {
      baseDate = new Date();
    }

    const s = String(delivery).trim();

    // check for a range like "1-3" or "1 - 3 days"
    const rangeMatch = s.match(/(-?\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      const startDays = parseInt(rangeMatch[1], 10);
      const endDays = parseInt(rangeMatch[2], 10);
      const startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() + startDays);
      const endDate = new Date(baseDate);
      endDate.setDate(endDate.getDate() + endDays);
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    // not a range — try to parse a single number of days
    let days = null;
    if (!isNaN(Number(s))) {
      days = Number(s);
    } else {
      const singleMatch = s.match(/(-?\d+)/);
      if (singleMatch) days = parseInt(singleMatch[1], 10);
    }

    if (days === null) return String(delivery);

    const deliveryDate = new Date(baseDate);
    deliveryDate.setDate(deliveryDate.getDate() + days);
    return formatDate(deliveryDate);
  };

  const handleConfirm = async () => {
    if (loading) return;

    setLoading(true);

    try {
      if (bulkAction) {
        for (const orderId of selectedOrders) {
          const orderToMove = orders.find((o) => o.id === orderId);
          if (!orderToMove) continue;

          const { id, ...orderData } = orderToMove;
          const updatedOrder = {
            ...orderData,
            status: "To Ship",
            packedAt: new Date(),
            toshipID: `TS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          };

          await setDoc(doc(db, "toShip", orderToMove.id), updatedOrder);
          await deleteDoc(doc(db, "orders", orderToMove.id));

          await addDoc(collection(db, "notifications"), {
            notifID: `NTP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId: orderToMove.userId,
            title: "Order Packed",
            message: "Your order has been packed and is waiting to be shipped.",
            orderId: orderToMove.orderId,
            timestamp: new Date(),
            read: false,
          });

          await addDoc(collection(db, "recentActivityLogs"), {
            logID: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            action: `Order (${orderToMove.orderId}) is packed`,
            role: role,
            userEmail: user?.email || "Unknown user",
            timestamp: serverTimestamp(),
          });
        }

        setSelectedOrders([]);
      } else {
        const orderToMove = orders.find((o) => o.id === selectedOrderId);
        if (!orderToMove) return;

        const { id, ...orderData } = orderToMove;
        const updatedOrder = {
          ...orderData,
          status: "To Ship",
          packedAt: new Date(),
          toshipID: `TS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          items: orderToMove.items.map((item) => ({ ...item })),
        };

        await setDoc(doc(db, "toShip", orderToMove.id), updatedOrder);
        await deleteDoc(doc(db, "orders", orderToMove.id));

        await addDoc(collection(db, "notifications"), {
          notifID: `NTP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: orderToMove.userId,
          title: "Order Packed",
          message: "Your order has been packed and is waiting to be shipped.",
          orderId: orderToMove.orderId,
          timestamp: new Date(),
          read: false,
        });

        await addDoc(collection(db, "recentActivityLogs"), {
          logID: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          action: `Order (${orderToMove.orderId}) is packed`,
          role: role,
          userEmail: user?.email || "Unknown user",
          timestamp: serverTimestamp(),
        });

        setSelectedOrderId(null);
      }

      setPopupVisible(false);
      setBulkAction(false);
    } catch (err) {
      console.error("Error packing orders:", err);
      setPopupVisible(false);
      setBulkAction(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPopupVisible(false);
    setSelectedOrderId(null);
  };

  return (
    <OrdersContainer>
      <OrdersHeader
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Orders</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            <FiSearch style={searchStyles.icon} />{" "}
          </div>
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

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            disabled={selectedOrders.length === 0 || loading}
            onClick={() => {
              setPopupMessage(
                `Are you sure you want to mark ${selectedOrders.length} order(s) as packed?`
              );
              setPopupVisible(true);
              setBulkAction(true);
            }}
            style={{
              backgroundColor: selectedOrders.length === 0 ? "#ccc" : "#9747FF",
              color: "#fff",
              padding: "10px 10px",
              borderRadius: "8px",
              border: "none",
              cursor: selectedOrders.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Packed Orders ({selectedOrders.length})
          </button>
          <div
            style={{
              fontSize: "25px",
              fontWeight: "500",
              color: "#444",
            }}
          >
            Total orders this week:{" "}
            <span style={{ fontWeight: "500", color: "#9747FF" }}>
              {weeklyOrderCount}
            </span>
          </div>{" "}
        </div>
      </OrdersTabs>

      <OrdersTable>
        <TableHead>
          <TableRow>
            <TableHeader width="30px" style={{ textAlign: "center" }}>
              Select
            </TableHeader>
            <TableHeader width="150px" style={{ textAlign: "center" }}>
              Customer
            </TableHeader>
            <TableHeader width="325px" style={{ textAlign: "center" }}>
              Address
            </TableHeader>
            <TableHeader width="125px" style={{ textAlign: "center" }}>
              Order Date
            </TableHeader>
            <TableHeader width="225px" style={{ textAlign: "center" }}>
              Product
            </TableHeader>
            <TableHeader width="100px" style={{ textAlign: "center" }}>
              Delivery
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
          {filteredOrders.map((order) =>
            order.items.map((item) => (
              <TableRow
                key={item.id}
                onClick={() => {
                  if (selectedOrders.includes(order.id)) {
                    setSelectedOrders((prev) =>
                      prev.filter((id) => id !== order.id)
                    );
                  } else {
                    setSelectedOrders((prev) => [...prev, order.id]);
                  }
                }}
                style={{
                  backgroundColor: selectedOrders.includes(order.id)
                    ? "#f0f0ff"
                    : "transparent",
                }}
              >
                <TableData style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    readOnly
                  />
                </TableData>

                <TableData>{order.name}</TableData>
                <TableData>{order.address || "-"}</TableData>
                <TableData style={{ textAlign: "center" }}>
                  {order.createdAt?.toDate().toLocaleString()}
                </TableData>
                <TableData style={{ textAlign: "center" }}>
                  {item.productName}
                </TableData>
                <TableData style={{ textAlign: "center" }}>
                  {formatDeliveryDate(order)}
                </TableData>
                <TableData style={{ textAlign: "center" }}>
                  {item.quantity}
                </TableData>
                <TableData style={{ textAlign: "center" }}>
                  ₱{order.total}
                </TableData>
                <TableData style={{ textAlign: "center" }}>
                  {item.size || "-"}
                </TableData>
                <TableData style={{ textAlign: "center" }}>
                  <button
                    disabled
                    style={{
                      backgroundColor: "#9747FF",
                      color: "#fff",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                      border: "none",
                    }}
                  >
                    {order.status || "Packed"}
                  </button>
                </TableData>
              </TableRow>
            ))
          )}
        </tbody>
      </OrdersTable>

      <TopPopup
        visible={popupVisible}
        message={popupMessage}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={loading}
        selectedOrdersList={orders.filter((o) => selectedOrders.includes(o.id))}
      />
    </OrdersContainer>
  );
};

export default Orders;
