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
  getDocs,
  where,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  getDoc,
  updateDoc,
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

const ToShip = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [removeId, setRemoveId] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [weeklyToShipCount, setWeeklyToShipCount] = useState(0);
  const [role, setRole] = useState("Unknown");
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  const filteredOrders = orders
    .map((order) => ({
      ...order,
      items: order.items.filter((item) =>
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((order) => order.items.length > 0);

  useEffect(() => {
    const toShipRef = collection(db, "toShip");
    const q = query(toShipRef, orderBy("packedAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const fetchedOrders = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setOrders(fetchedOrders);
      } catch (err) {
        console.error("Error fetching toShip orders:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const collectionsToWatch = ["toReceive", "completed", "cancelled"];
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
          if (data.shippedAt) {
            const shippedDate = data.shippedAt.toDate();
            if (shippedDate >= startOfWeek && shippedDate <= today) total += 1;
          }
        });
      });

      setWeeklyToShipCount(total);
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

  const handleConfirmYes = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (selectedItems && selectedItems.length > 0) {
        for (const entry of selectedItems) {
          const order = entry.order;
          const item = entry.item;

          const { id, ...orderDataWithoutId } = order;

          await addDoc(collection(db, "toReceive"), {
            ...orderDataWithoutId,
            items: [item],
            status: "To Receive",
            shippedAt: new Date(),
            toreceiveID: `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          });

          const q = query(
            collection(db, "toShip"),
            where("orderId", "==", order.orderId)
          );

          const snap = await getDocs(q);
          snap.forEach(async (docSnap) => {
            await deleteDoc(doc(db, "toShip", docSnap.id));
          });

          await addDoc(collection(db, "notifications"), {
            notifID: `NTS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId: order.userId,
            title: "Order Shipped",
            message: `Your order for ${item.productName} has been shipped.`,
            orderId: order.orderId,
            timestamp: new Date(),
            read: false,
          });

          await addDoc(collection(db, "notifications"), {
            notifID: `NTR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId: order.userId,
            title: "Order Ready to Receive",
            message: `Your order for ${item.productName} is now ready to receive.`,
            orderId: order.orderId,
            timestamp: new Date(),
            read: false,
          });

          await addDoc(collection(db, "recentActivityLogs"), {
            logID: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            action: `Order (${order.orderId}) is shipped`,
            role: role,
            userEmail: auth.currentUser?.email || "Unknown user",
            timestamp: serverTimestamp(),
          });
        }
      } else {
        if (!selectedOrder || !selectedItem) return;

        const order = selectedOrder;
        const item = selectedItem;

        const { id, ...orderDataWithoutId } = order;

        await addDoc(collection(db, "toReceive"), {
          ...orderDataWithoutId,
          items: [item],
          status: "To Receive",
          shippedAt: new Date(),
          toreceiveID: `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        });

        const q = query(
          collection(db, "toShip"),
          where("orderId", "==", order.orderId)
        );

        const snap = await getDocs(q);
        snap.forEach(async (docSnap) => {
          await deleteDoc(doc(db, "toShip", docSnap.id));
        });

        await addDoc(collection(db, "notifications"), {
          notifID: `NTS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: order.userId,
          title: "Order Shipped",
          message: `Your order for ${item.productName} has been shipped.`,
          orderId: order.orderId,
          timestamp: new Date(),
          read: false,
        });

        await addDoc(collection(db, "notifications"), {
          notifID: `NTR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: order.userId,
          title: "Order Ready to Receive",
          message: `Your order for ${item.productName} is now ready to receive.`,
          orderId: order.orderId,
          timestamp: new Date(),
          read: false,
        });

        await addDoc(collection(db, "recentActivityLogs"), {
          logID: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          action: `Order (${order.orderId}) is shipped`,
          role: role,
          userEmail: auth.currentUser?.email || "Unknown user",
          timestamp: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Error moving item(s) to toReceive:", err);
    } finally {
      setPopupVisible(false);
      setLoading(false);
      setSelectedItem(null);
      setSelectedOrder(null);
      setSelectedItems([]);
    }
  };

  const openConfirmPopup = (order, item) => {
    setSelectedOrder(order);
    setSelectedItem(item);

    setSelectedItems([{ key: `${order.id}-${item.id}`, order, item }]);

    setPopupMessage(`Mark ${item.productName} as shipped?`);
    setPopupVisible(true);
  };

  const handleConfirmNo = () => setConfirmOrder(null);

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
        <h2 style={{ margin: 0 }}>To Ship</h2>

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

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            style={{
              background: selectedItems.length === 0 ? "#ccc" : "#9747FF",
              color: "white",
              padding: "10px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: selectedItems.length === 0 ? "not-allowed" : "pointer",
            }}
            disabled={selectedItems.length === 0}
            onClick={() => {
              setPopupMessage(`Ship ${selectedItems.length} selected item(s)?`);
              setPopupVisible(true);
            }}
          >
            Ship Selected ({selectedItems.length})
          </button>
          <div
            style={{
              fontSize: "25px",
              fontWeight: "500",
              color: "#444",
            }}
          >
            Total shipped orders this week:{" "}
            <span style={{ fontWeight: "500", color: "#ff6600" }}>
              {weeklyToShipCount}
            </span>
          </div>
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
              Packed Date
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
              order.items.map((item) => {
                const key = `${order.id}-${item.id}`;

                const isSelected = selectedItems.some((x) => x.key === key);

                const isRemovable =
                  !order.name ||
                  order.name.trim() === "" ||
                  order.name === "Unknown" ||
                  order.name === "User not found" ||
                  !order.userId;

                return (
                  <TableRow
                    key={key}
                    onClick={() => {
                      if (isRemovable) return;

                      if (isSelected) {
                        setSelectedItems((prev) =>
                          prev.filter((x) => x.key !== key)
                        );
                      } else {
                        setSelectedItems((prev) => [
                          ...prev,
                          { key, order, item },
                        ]);
                      }
                    }}
                    style={{
                      backgroundColor: isSelected ? "#f0f0ff" : "transparent",
                    }}
                  >
                    <TableData style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        disabled={isRemovable}
                      />
                    </TableData>

                    <TableData>{order.name}</TableData>
                    <TableData>{order.address || "-"}</TableData>
                    <TableData style={{ textAlign: "center" }}>
                      {order.packedAt?.toDate().toLocaleString()}
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

                    <TableData>
                      {!isRemovable ? (
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
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
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
                      )}
                    </TableData>
                  </TableRow>
                );
              })
            )
          ) : (
            <TableRow>
              <TableData
                colSpan="8"
                style={{ textAlign: "center", padding: "20px" }}
              >
                🚚 No "To Ship" orders found
              </TableData>
            </TableRow>
          )}
        </tbody>
      </OrdersTable>

      <TopPopup
        visible={popupVisible}
        message={popupMessage}
        selectedOrdersList={selectedItems.map((entry) => entry.order)}
        onConfirm={handleConfirmYes}
        onCancel={() => {
          setPopupVisible(false);
          setSelectedOrder(null);
          setSelectedItem(null);
          setSelectedItems([]);
        }}
        loading={loading}
      />

      {confirmOrder && (
        <div style={topPopupStyle}>
          <h2
            style={{
              marginBottom: "10px",
              fontWeight: "bold",
              fontSize: "18px",
            }}
          >
            Confirm Shipment
          </h2>
          <p>
            Mark <b>{confirmOrder.item.productName}</b> as shipped?
          </p>
          <div style={buttonContainerStyle}>
            <button
              style={yesButtonStyle}
              onClick={() =>
                handleConfirmYes(confirmOrder.order, confirmOrder.item)
              }
              disabled={loading}
            >
              {loading ? "Processing..." : "Yes"}
            </button>

            <button style={noButtonStyle} onClick={handleConfirmNo}>
              No
            </button>
          </div>
        </div>
      )}
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
              textAlign: "center",
            }}
          >
            <h3>Delete Record?</h3>
            <p>Are you sure you want to remove this item?</p>

            <button
              onClick={async () => {
                if (loading) return;
                setLoading(true);

                try {
                  const toShipDoc = await getDoc(doc(db, "toShip", removeId));
                  if (!toShipDoc.exists()) throw new Error("Order not found.");

                  const orderData = toShipDoc.data();

                  const items = orderData.items || [];

                  for (const item of items) {
                    const productID = item.productId;
                    const size = item.size;
                    const qtyToRestore = item.quantity;

                    if (!productID || !size || !qtyToRestore) {
                      console.warn(
                        "Missing product data, skipping stock restore."
                      );
                      continue;
                    }

                    const productRef = doc(db, "products", productID);
                    const productSnap = await getDoc(productRef);

                    if (!productSnap.exists()) {
                      console.warn(`Product ${productID} not found. Skipping.`);
                      continue;
                    }

                    const productData = productSnap.data();
                    const currentStock = productData.stock || {};
                    const currentSizeStock = currentStock[size] || 0;

                    const updatedSizeStock = currentSizeStock + qtyToRestore;

                    let updatedTotalStock = 0;
                    Object.keys(currentStock).forEach((sz) => {
                      if (sz === size) {
                        updatedTotalStock += updatedSizeStock;
                      } else {
                        updatedTotalStock += currentStock[sz];
                      }
                    });

                    await updateDoc(productRef, {
                      stock: {
                        ...currentStock,
                        [size]: updatedSizeStock,
                      },
                      totalStock: updatedTotalStock,
                    });

                    console.log(
                      `Restored ${qtyToRestore} pcs of size ${size} for product ${productID}.`
                    );
                  }

                  await addDoc(collection(db, "recentActivityLogs"), {
                    logID: `LOG-${Date.now()}-${Math.floor(
                      Math.random() * 1000
                    )}`,
                    action: `Order (${orderData.orderId}) is deleted`,
                    role: role,
                    userEmail: auth.currentUser?.email || "Unknown user",
                    timestamp: serverTimestamp(),
                  });

                  await deleteDoc(doc(db, "toShip", removeId));

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

export default ToShip;
