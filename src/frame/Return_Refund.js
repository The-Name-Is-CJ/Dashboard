import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
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

const ReturnRefund = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [weeklyReturnCount, setWeeklyReturnCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState(null);

  useEffect(() => {
    const returnRef = collection(db, "return_refund");
    const q = query(returnRef, orderBy("requestDate", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const fetchedOrders = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setOrders(fetchedOrders);
      } catch (err) {
        console.error("Error fetching return/refund orders:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const collectionsToWatch = ["return_refund"];
    const unsubscribes = [];

    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const updateWeeklyReturnCount = () => {
      let total = 0;

      unsubscribes.forEach((u) => {
        if (!u.latestSnapshot) return;
        u.latestSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.requestDate) {
            const date = data.requestDate.toDate();

            if (date >= startOfWeek && date <= today) total += 1;
          }
        });
      });

      setWeeklyReturnCount(total);
    };

    collectionsToWatch.forEach((col) => {
      const q = query(collection(db, col));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        unsubscribe.latestSnapshot = snapshot;
        updateWeeklyReturnCount();
      });
      unsubscribe.latestSnapshot = null;
      unsubscribes.push(unsubscribe);
    });

    return () => unsubscribes.forEach((u) => u());
  }, []);

  const filteredOrders =
    searchTerm.trim() === ""
      ? orders
      : orders.filter((order) =>
          order.toreceiveID?.toLowerCase().includes(searchTerm.toLowerCase())
        );

  const tabs = [
    { name: "Orders", path: "/seller/orders" },
    { name: "To Ship", path: "/seller/orders/toship" },
    { name: "To Receive", path: "/seller/orders/toreceive" },
    { name: "Cancelled", path: "/seller/orders/cancelled" },
    { name: "Completed", path: "/seller/orders/complete" },
    { name: "Return/Refund", path: "/seller/orders/return_refund" },
  ];

  const RefundModal = () => {
    if (!modalOpen || !selectedOrder) return null;

    const handleRefund = async () => {
      try {
        await updateDoc(doc(db, "return_refund", selectedOrder.id), {
          status: "Approved",
        });

        setModalOpen(false);
        setSelectedOrder(null);
      } catch (error) {
        console.error("Error approving refund:", error);
      }
    };

    const handleDisapprove = async () => {
      try {
        await updateDoc(doc(db, "return_refund", selectedOrder.id), {
          status: "Disapproved",
        });

        setModalOpen(false);
        setSelectedOrder(null);
      } catch (error) {
        console.error("Error disapproving refund:", error);
      }
    };

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: "550px",
            background: "#fff",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            animation: "fadeDown 0.2s ease",
          }}
        >
          <h2 style={{ marginBottom: "10px" }}>Refund Request Details</h2>

          <img
            src={selectedOrder.imageUrl}
            alt="Product"
            style={{
              width: "140px",
              height: "140px",
              objectFit: "cover",
              borderRadius: "10px",
              marginBottom: "15px",
              border: "1px solid #ddd",
            }}
          />

          <div style={{ marginBottom: "15px", lineHeight: "1.6" }}>
            <p>
              <strong>Customer:</strong> {selectedOrder.name}
            </p>
            <p>
              <strong>Contact:</strong> {selectedOrder.contact}
            </p>
            <p>
              <strong>Address:</strong> {selectedOrder.street},{" "}
              {selectedOrder.barangay}, {selectedOrder.municipality}
            </p>
            <p>
              <strong>Product:</strong> {selectedOrder.productName}
            </p>
            <p>
              <strong>Size:</strong> {selectedOrder.size}
            </p>
            <p>
              <strong>Quantity:</strong> {selectedOrder.quantity}
            </p>
            <p>
              <strong>Price:</strong> ₱{selectedOrder.price}
            </p>
            <p>
              <strong>Refund Amount:</strong> ₱{selectedOrder.refund}
            </p>
            <p>
              <strong>Reason:</strong> {selectedOrder.reason}
            </p>
            <p>
              <strong>Description:</strong> {selectedOrder.description}
            </p>
            <p>
              <strong>Return Method:</strong> {selectedOrder.returnMethod}
            </p>
            <p>
              <strong>Requested At:</strong>{" "}
              {selectedOrder.requestDate?.toDate().toLocaleString()}
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "25px",
            }}
          >
            <button
              onClick={handleRefund}
              style={{
                backgroundColor: "#28a745",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                flex: 1,
                marginRight: "10px",
              }}
            >
              Refund
            </button>

            <button
              onClick={handleDisapprove}
              style={{
                backgroundColor: "#dc3545",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                flex: 1,
              }}
            >
              Disapprove
            </button>
          </div>

          <button
            onClick={() => {
              setModalOpen(false);
              setSelectedOrder(null);
            }}
            style={{
              marginTop: "15px",
              width: "100%",
              padding: "10px",
              backgroundColor: "#777",
              color: "#fff",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
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
        <h2 style={{ margin: 0 }}>Return / Refund Orders</h2>

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
          Total requested this week:{" "}
          <span style={{ fontWeight: "500", color: "#dc3545" }}>
            {weeklyReturnCount}
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
              Requested Date
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
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableData>{order.name || order.userId}</TableData>
                <TableData>
                  {order.address ||
                    `${order.street}, ${order.barangay}, ${
                      order.municipality
                    }, ${order.province || ""}`}
                </TableData>

                <TableData style={{ textAlign: "center" }}>
                  {order.requestDate?.toDate().toLocaleString() || "-"}
                </TableData>

                <TableData style={{ textAlign: "center" }}>
                  {order.productName}
                </TableData>

                <TableData style={{ textAlign: "center" }}>
                  {order.delivery}
                </TableData>

                <TableData style={{ textAlign: "center" }}>
                  {order.quantity}
                </TableData>

                <TableData style={{ textAlign: "center" }}>
                  ₱{order.price}
                </TableData>

                <TableData style={{ textAlign: "center" }}>
                  {order.size || "-"}
                </TableData>

                <TableData style={{ textAlign: "center" }}>
                  <button
                    onClick={() => {
                      if (order.status === "Pending" || !order.status) {
                        setSelectedOrder(order);
                        setModalOpen(true);
                      }
                    }}
                    style={{
                      backgroundColor:
                        order.status === "Approved"
                          ? "green"
                          : order.status === "Disapproved"
                          ? "red"
                          : "#9747FF",
                      color: "#fff",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "none",
                      fontWeight: "bold",
                      cursor:
                        order.status === "Pending" || !order.status
                          ? "pointer"
                          : "default",
                    }}
                    disabled={
                      order.status === "Approved" ||
                      order.status === "Disapproved"
                    }
                  >
                    {order.status === "Approved"
                      ? "Refunded"
                      : order.status === "Disapproved"
                      ? "Disapproved"
                      : "View"}
                  </button>
                </TableData>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableData
                colSpan="9"
                style={{ textAlign: "center", padding: "20px" }}
              >
                ✅ No return/refund requests found
              </TableData>
            </TableRow>
          )}
        </tbody>
      </OrdersTable>
      {modalOpen && (
        <RefundModal
          order={selectedOrder}
          onClose={() => setModalOpen(false)}
        />
      )}
    </OrdersContainer>
  );
};

export default ReturnRefund;
