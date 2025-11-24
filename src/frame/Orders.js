import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  OrdersContainer,
  OrdersHeader,
  OrdersTabs,
  TabItem,
  OrdersTable,
  TableHead,
  TableRow,
  TableHeader,
  TableData,
  StatusButton,
} from "../components/orderstyle";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  orderBy,
  addDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { FiSearch } from "react-icons/fi";

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
  const [removeId, setRemoveId] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
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
    const fetchRole = async () => {
      try {
        const userEmail = auth.currentUser?.email;
        if (!userEmail) return;

        const q = query(
          collection(db, "admins"),
          where("email", "==", userEmail)
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
          const data = snap.docs[0].data();
          setRole(data.role || "Admin");
        } else {
          setRole("Customer");
        }
      } catch (err) {
        console.error("Error fetching admin role:", err);
      }
    };

    fetchRole();
  }, []);

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
    { name: "Orders", path: "/orders" },
    { name: "To Ship", path: "/orders/toship" },
    { name: "To Receive", path: "/orders/toreceive" },
    { name: "Cancelled", path: "/orders/cancelled" },
    { name: "Completed", path: "/orders/complete" },
  ];

  const filterOrders = () => {
    const path = location.pathname;
    switch (path) {
      case "/orders/toship":
        return orders.filter((o) => o.status === "To Ship");
      case "/orders/toreceive":
        return orders.filter((o) => o.status === "To Receive");
      case "/orders/cancelled":
        return orders.filter((o) => o.status === "Cancelled");
      case "/orders/complete":
        return orders.filter((o) => o.status === "Complete");
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
            order.items.map((item) => {
              const isRemovable =
                !order.name ||
                order.name.trim() === "" ||
                order.name === "Unknown" ||
                order.name === "User not found" ||
                !order.userId;

              return (
                <TableRow
                  key={item.id}
                  onClick={() => {
                    if (isRemovable) return;
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
                      disabled={isRemovable}
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
                    {item.quantity}
                  </TableData>
                  <TableData style={{ textAlign: "center" }}>
                    ₱{order.total}
                  </TableData>
                  <TableData style={{ textAlign: "center" }}>
                    {item.size || "-"}
                  </TableData>
                  <TableData style={{ textAlign: "center" }}>
                    {isRemovable ? (
                      <button
                        onClick={() => {
                          setRemoveId(order.id);
                          setShowRemoveModal(true);
                        }}
                        style={{
                          backgroundColor: "#ff4444",
                          color: "#fff",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontWeight: "bold",
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          border: "none",
                        }}
                      >
                        Remove
                      </button>
                    ) : (
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
                    )}
                  </TableData>
                </TableRow>
              );
            })
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

      {showRemoveModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              width: "300px",
              height: "180px",
              textAlign: "center",
            }}
          >
            <h3>Delete Record?</h3>
            <p
              style={{
                marginBottom: "20px",
                marginTop: "10px",
              }}
            >
              Are you sure you want to remove this item?
            </p>

            <button
              onClick={async () => {
                if (loading) return;
                setLoading(true);

                try {
                  const orderDoc = await getDoc(doc(db, "orders", removeId));
                  if (!orderDoc.exists()) throw new Error("Order not found.");

                  const orderData = orderDoc.data();
                  const items = orderData.items || [];

                  for (const item of items) {
                    const productID = item.productId;
                    const size = item.size;
                    const qtyToRestore = item.quantity;

                    if (!productID || !size || !qtyToRestore) continue;

                    const productRef = doc(db, "products", productID);
                    const productSnap = await getDoc(productRef);
                    if (!productSnap.exists()) continue;

                    const productData = productSnap.data();
                    const currentStock = productData.stock || {};
                    const existingStock = currentStock[size] || 0;

                    const updatedStock = existingStock + qtyToRestore;

                    let updatedTotalStock = 0;
                    Object.keys(currentStock).forEach((sz) => {
                      updatedTotalStock +=
                        sz === size ? updatedStock : currentStock[sz];
                    });

                    await updateDoc(productRef, {
                      stock: {
                        ...currentStock,
                        [size]: updatedStock,
                      },
                      totalStock: updatedTotalStock,
                    });
                  }

                  await deleteDoc(doc(db, "orders", removeId));

                  setShowRemoveModal(false);
                  setRemoveId(null);
                } catch (error) {
                  console.error("Error deleting record:", error);
                } finally {
                  setLoading(false);
                }
              }}
              style={{
                background: "#ff4444",
                color: "white",
                padding: "8px 15px",
                borderRadius: "6px",
                border: "none",
                marginRight: "10px",
                cursor: "pointer",
                width: "40%",
              }}
            >
              {loading ? "Deleting…" : "Yes, Delete"}
            </button>

            <button
              onClick={() => {
                setShowRemoveModal(false);
                setRemoveId(null);
              }}
              style={{
                background: "#ccc",
                padding: "8px 15px",
                borderRadius: "6px",
                cursor: "pointer",
                border: "none",
                width: "40%",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </OrdersContainer>
  );
};

export default Orders;
