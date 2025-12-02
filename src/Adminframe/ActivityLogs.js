import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";
  if (timestamp.toDate) return timestamp.toDate().toLocaleString();
  return new Date(timestamp).toLocaleString();
};

const ActivityLogs = () => {
  const [activeTab, setActiveTab] = useState("user");
  const [userLogs, setUserLogs] = useState([]);
  const [sellerLogs, setSellerLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [adminLogs, setAdminLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const rewriteMessage = (notif) => {
    const {
      message,
      userId,
      product,
      selectedSize,
      order,
      orderId,
      total,
      item,
    } = notif;

    if (!userId) return message || "Unknown action";

    if (message.includes("added to your cart")) {
      return `User ${userId} added ${
        product?.productName || "a product"
      } to their cart.`;
    }
    if (
      message.includes("has been placed") ||
      message.includes("placed order")
    ) {
      const orderTotal = total ? `₱${Number(total).toLocaleString()}` : "N/A";
      const orderNumber = orderId || order?.orderId || "N/A";
      return `User ${userId} placed order ${orderNumber} with total ${orderTotal}.`;
    }
    if (
      message.includes("has been cancelled") ||
      message.includes("cancelled")
    ) {
      return `User ${userId} cancelled their order.`;
    }
    if (message.includes("has been packed")) {
      return `User ${userId} order has been packed and is waiting to be shipped.`;
    }
    if (message.includes("has been shipped")) {
      return `User ${userId} order for ${
        item?.productName || "a product"
      } has been shipped.`;
    }
    if (message.includes("is now ready to receive")) {
      return `User ${userId} order for ${
        item?.productName || "a product"
      } is now ready to receive.`;
    }
    if (
      message.includes("Orders is received") ||
      message.includes("received")
    ) {
      return `User ${userId} orders is received.`;
    }
    return message;
  };

  const rewriteSellerMessage = (notif) => {
    const { action, productName, order } = notif;

    if (!action) return "Seller action";

    if (action.includes("is packed")) {
      return "Seller packed an order";
    }

    if (action.includes("is shipped")) {
      return `Seller "${order?.orderId || ""}" shipped an order`;
    }

    if (action === "Add product") {
      return `Seller added product "${productName || ""}"`;
    }

    if (action === "deleted product") {
      return `Seller deleted product "${productName || ""}"`;
    }

    if (action.startsWith("Edited product")) {
      return `Seller Edited product "${productName || ""}" ${action.slice(14)}`;
    }

    if (action === "Seller logged in") return "Seller logged in";
    if (action === "Seller logged out") return "Seller logged out";

    return notif.message || "Seller action";
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "notifications"),
      (snapshot) => {
        const logs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            rewritten: rewriteMessage(data),
          };
        });
        setUserLogs(logs);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading logs:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab !== "seller") return;

    const fetchSellerLogs = async () => {
      try {
        const q = query(
          collection(db, "recentActivityLogs"),
          where("role", "==", "Seller")
        );

        const logsSnapshot = await getDocs(q);

        if (logsSnapshot.empty) {
          console.log("No Seller logs found");
          setSellerLogs([]);
          return;
        }

        const logs = logsSnapshot.docs.map((logDoc) => {
          const data = logDoc.data();
          return {
            id: logDoc.id,
            ...data,
            rewritten: rewriteSellerMessage(data),
          };
        });

        console.log("Fetched Seller logs:", logs);
        setSellerLogs(logs);
      } catch (err) {
        console.error("Error fetching seller logs:", err);
        setSellerLogs([]);
      }
    };

    fetchSellerLogs();
  }, [activeTab]);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!selectedLog?.userId) {
        setSelectedUserName("");
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("userId", "==", selectedLog.userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setSelectedUserName(userData.username || "Unknown user");
        } else {
          setSelectedUserName("Unknown user");
        }
      } catch (err) {
        console.error("Error fetching username:", err);
        setSelectedUserName("Unknown user");
      }
    };

    fetchUsername();
  }, [selectedLog]);

  useEffect(() => {
    if (activeTab !== "admin") return;

    const fetchAdminLogs = async () => {
      try {
        const adminRoles = ["Main Admin", "Sub Admin", "Sub Admin 2"];

        const logsSnapshot = await getDocs(
          collection(db, "recentActivityLogs")
        );

        if (logsSnapshot.empty) {
          console.log("No activity logs found");
          setAdminLogs([]);
          return;
        }

        const logs = logsSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((log) => adminRoles.includes(log.role));

        console.log("Fetched Admin logs:", logs);

        setAdminLogs(logs);
      } catch (err) {
        console.error("Error fetching admin logs:", err);
        setAdminLogs([]);
      }
    };

    fetchAdminLogs();
  }, [activeTab]);

  if (loading) return <p style={{ padding: "20px" }}>Loading logs...</p>;

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Activity Logs</h1>

      <div style={styles.tabContainer} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => {
            setActiveTab("user");
            setSelectedLog(null);
          }}
          style={{
            ...styles.tab,
            ...(activeTab === "user" ? styles.activeTab : {}),
          }}
        >
          Users
        </button>
        <button
          onClick={() => {
            setActiveTab("seller");
            setSelectedLog(null);
          }}
          style={{
            ...styles.tab,
            ...(activeTab === "seller" ? styles.activeTab : {}),
          }}
        >
          Sellers
        </button>
        <button
          onClick={() => {
            setActiveTab("admin");
            setSelectedLog(null);
          }}
          style={{
            ...styles.tab,
            ...(activeTab === "admin" ? styles.activeTab : {}),
          }}
        >
          Admin
        </button>
      </div>

      <div style={styles.mainContent} onClick={() => setSelectedLog(null)}>
        <div style={styles.logsContainer}>
          {activeTab === "user" && (
            <>
              {userLogs.length === 0 ? (
                <p style={styles.noLogs}>No user logs found.</p>
              ) : (
                userLogs
                  .sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds)
                  .map((log) => (
                    <div
                      key={log.id}
                      style={{
                        ...styles.logCard,
                        ...(selectedLog?.id === log.id
                          ? styles.selectedLogCard
                          : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                    >
                      <p style={styles.logMessage}>{log.rewritten}</p>
                      <span style={styles.logTimestamp}>
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  ))
              )}
            </>
          )}
          {activeTab === "seller" && (
            <>
              {sellerLogs.length === 0 ? (
                <p style={styles.noLogs}>No seller logs found.</p>
              ) : (
                sellerLogs
                  .sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds)
                  .map((log) => (
                    <div
                      key={log.id}
                      style={{
                        ...styles.logCard,
                        ...(selectedLog?.id === log.id
                          ? styles.selectedLogCard
                          : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                    >
                      <p style={styles.logMessage}>{log.rewritten}</p>
                      <span style={styles.logTimestamp}>
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  ))
              )}
            </>
          )}
          {activeTab === "admin" && (
            <>
              {adminLogs.length === 0 ? (
                <p style={styles.noLogs}>No admin logs found.</p>
              ) : (
                adminLogs
                  .sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds)
                  .map((log) => (
                    <div
                      key={log.id}
                      style={{
                        ...styles.logCard,
                        ...(selectedLog?.id === log.id
                          ? styles.selectedLogCard
                          : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                    >
                      <p style={styles.logMessage}>{log.action}</p>{" "}
                      <span style={styles.logTimestamp}>
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  ))
              )}
            </>
          )}
        </div>

        <div style={styles.detailsPanel}>
          {selectedLog ? (
            <>
              <div style={styles.detailsHeader}>
                <h3>
                  {activeTab === "user"
                    ? "Users Activity Details"
                    : activeTab === "seller"
                    ? "Seller Activity Details"
                    : "Admin Activity Details"}
                </h3>
              </div>
              <div style={styles.detailsContent}>
                {activeTab === "user" && (
                  <>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>User ID:</span>
                      <span style={styles.detailValue}>
                        {selectedLog.userId}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Username:</span>
                      <span style={styles.detailValue}>{selectedUserName}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Activity:</span>
                      <span style={styles.detailValue}>
                        {selectedLog.rewritten}
                      </span>
                    </div>
                    {selectedLog.product?.productName && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Product:</span>
                        <span style={styles.detailValue}>
                          {selectedLog.product.productName}
                        </span>
                      </div>
                    )}
                    {selectedLog.orderId && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Order ID:</span>
                        <span style={styles.detailValue}>
                          {selectedLog.orderId}
                        </span>
                      </div>
                    )}
                    {selectedLog.total && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Total:</span>
                        <span style={styles.detailValue}>
                          ₱{Number(selectedLog.total).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {(activeTab === "seller" || activeTab === "admin") && (
                  <>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Log ID:</span>
                      <span style={styles.detailValue}>
                        {selectedLog.logID || selectedLog.id}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>
                        {activeTab === "seller"
                          ? "Seller Email:"
                          : activeTab === "admin"
                          ? "Admin Email:"
                          : "User Email:"}
                      </span>
                      <span style={styles.detailValue}>
                        {selectedLog.userEmail}
                      </span>
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Role:</span>
                      <span style={styles.detailValue}>{selectedLog.role}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Action:</span>
                      <span style={styles.detailValue}>
                        {activeTab === "seller"
                          ? selectedLog.rewritten
                          : selectedLog.action}{" "}
                      </span>
                    </div>
                  </>
                )}

                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Timestamp:</span>
                  <span style={styles.detailValue}>
                    {formatTimestamp(selectedLog.timestamp)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div style={styles.emptyDetails}>Click a log to see details</div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "30px",
    width: "100%",
    fontFamily: "Arial, sans-serif",
    textAlign: "left",
  },
  header: {
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "25px",
    color: "#333",
    textAlign: "left",
  },
  tabContainer: {
    display: "flex",
    gap: "15px",
    marginBottom: "30px",
  },
  tab: {
    padding: "10px 25px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    backgroundColor: "#eee",
    color: "#333",
    transition: "all 0.2s",
  },
  activeTab: {
    backgroundColor: "#7C4DFF",
    color: "#fff",
    boxShadow: "0px 4px 12px rgba(124, 77, 255, 0.3)",
  },
  mainContent: {
    display: "flex",
    gap: "30px",
    alignItems: "flex-start",
    height: "calc(100vh - 150px)",
  },
  logsContainer: {
    flex: "1 1 50%",
    overflowY: "auto",
    maxHeight: "90%",
    paddingRight: "10px",
  },
  logCard: {
    padding: "15px 20px",
    borderRadius: "10px",
    backgroundColor: "#f8f8f8",
    borderLeft: "4px solid #7C4DFF",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    cursor: "pointer",
  },
  selectedLogCard: {
    backgroundColor: "#e6dcff",
  },
  logMessage: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "500",
    color: "#333",
  },
  logTimestamp: {
    display: "block",
    fontSize: "12px",
    color: "#777",
    marginTop: "5px",
  },
  detailsPanel: {
    flex: "1 1 50%",
    padding: "20px",
    borderRadius: "10px",
    backgroundColor: "#fafafa",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    minHeight: "200px",
  },
  noLogs: {
    color: "#999",
    fontStyle: "italic",
    fontSize: "15px",
  },
  scrollableLogs: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  detailsPanel: {
    flex: "1 1 50%",
    borderRadius: "12px",
    background: "#ffffff",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    minHeight: "90%",
    position: "sticky",
    top: "0",
    alignSelf: "flex-start",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  detailsHeader: {
    backgroundColor: "#7C4DFF",
    color: "#fff",
    padding: "15px 20px",
  },
  detailsContent: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  detailRow: {
    borderBottom: "1px solid #eee",
    paddingBottom: "6px",
    marginBottom: "6px",
  },
  detailLabel: {
    fontWeight: "600",
    color: "#555",
  },
  detailValue: {
    color: "#333",
    fontWeight: "500",
    marginLeft: "15px",
  },
  emptyDetails: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#777",
    fontStyle: "italic",
    fontSize: "20px",
    textAlign: "center",
  },
};

export default ActivityLogs;
