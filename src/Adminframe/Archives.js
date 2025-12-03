import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { FaUser } from "react-icons/fa";
import styled from "styled-components";
import { db } from "../firebase";

const PersonIcon = FaUser;

const Colors = {
  secondary: "#fff",
  primary: "#6f42c1",
  accent: "#9b7bff",
  white: "#fff",
  black: "#fff",
  gray: "#777",
};

const PageContainer = styled.div`
  padding: 30px;
  background: linear-gradient(135deg, #a349f7ff, #b8b3d7ff);
  min-height: 100vh;
  width: 100%;
  color: ${Colors.black};
  font-family: "Poppins", sans-serif;
`;

const NavBar = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  background: ${Colors.accent};
  padding: 12px 18px;
  border-radius: 12px;
`;

const NavItem = styled.div`
  padding: 8px 14px;
  background: ${(props) => (props.active ? Colors.white : "transparent")};
  color: ${(props) => (props.active ? Colors.primary : Colors.white)};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: ${Colors.white};
    color: ${Colors.primary};
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 10px;
`;

const SectionTitle = styled.h2`
  margin-top: 20px;
  font-size: 1.4rem;
  font-weight: 600;
  color: ${Colors.white};
`;

const FieldLabel = styled.span`
  font-weight: 600;
  color: black;
`;

const ListContainer = styled.div`
  margin-top: 25px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ListItem = styled.div`
  width: 100%;
  background: ${Colors.secondary};
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.25);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: 0.2s;
  color: black;

  &:hover {
    background: ${Colors.accent};
    transform: translateX(5px);
    color: white;
  }
`;

const ItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const tabList = [
  "Users",
  "Seller",
  "Admin",
  "Orders",
  "To Ship",
  "To Receive",
  "Return/Refund",
  "Completed",
  "Cancelled",
  "Products",
];

const Archives = () => {
  const [activeTab, setActiveTab] = useState("Users");
  const [userArchives, setUserArchives] = useState([]);
  const [adminArchives, setAdminArchives] = useState([]);
  const [sellerArchives, setSellerArchives] = useState([]);
  const [removedProducts, setRemovedProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [toShip, setToShip] = useState([]);
  const [toReceive, setToReceive] = useState([]);
  const [refund, setRefund] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [cancelled, setCancelled] = useState([]);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreItem, setRestoreItem] = useState(null);
  const [restoreType, setRestoreType] = useState("");
  const [restoreUserModalOpen, setRestoreUserModalOpen] = useState(false);
  const [restoreUserItem, setRestoreUserItem] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        const fetchCollection = async (collectionName) => {
          const snap = await getDocs(collection(db, collectionName));
          return snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        };

        const usersArr = await fetchCollection("usersArchive");
        const ordersArr = await fetchCollection("ordersArchive");
        const toShipArr = await fetchCollection("toshipArchive");
        const toReceiveArr = await fetchCollection("toreceiveArchive");
        const refundArr = await fetchCollection("return_refundArchive");
        const completedArr = await fetchCollection("completedArchive");
        const cancelledArr = await fetchCollection("cancelledArchive");

        setUserArchives(usersArr);
        setOrders(ordersArr);
        setToShip(toShipArr);
        setToReceive(toReceiveArr);
        setRefund(refundArr);
        setCompleted(completedArr);
        setCancelled(cancelledArr);

        const adminSnap = await getDocs(collection(db, "adminArchive"));
        const adminArr = adminSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAdminArchives(adminArr);

        const sellerSnap = await getDocs(collection(db, "sellerArchive"));
        const sellerArr = sellerSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSellerArchives(sellerArr);

        const removedSnap = await getDocs(collection(db, "removedProducts"));
        const removedArr = removedSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRemovedProducts(removedArr);
      } catch (error) {
        console.error("Error fetching archives:", error);
      }
    };

    fetchArchives();
  }, []);

  const logAdminAction = async ({ actionDescription, userIdAffected }) => {
    try {
      const adminSnapshot = await getDocs(collection(db, "admins"));
      const currentAdminDoc = adminSnapshot.docs[0];
      if (!currentAdminDoc) return;

      const adminData = currentAdminDoc.data();
      const adminEmail = adminData.email || "unknown";
      const adminRole = adminData.role || "Admin";

      const logId =
        "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

      const logEntry = {
        logID: logId,
        action: actionDescription,
        userId: userIdAffected,
        userEmail: adminEmail,
        role: adminRole,
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(db, "recentActivityLogs"), logEntry);
    } catch (err) {
      console.error("Error logging admin action:", err);
    }
  };

  const collectionMap = {
    usersArchive: "users",
    ordersArchive: "orders",
    toshipArchive: "toShip",
    toreceiveArchive: "toReceive",
    return_refundArchive: "return_refund",
    completedArchive: "completed",
    cancelledArchive: "cancelled",
    adminArchive: "admins",
    sellerArchive: "seller",
    removedProducts: "products",
  };

  const handleConfirmRestore = async () => {
    if (!restoreItem) return;

    try {
      const archiveId = restoreItem.id;
      const archiveCollection = restoreItem.archiveCollection;
      const originalCollection = collectionMap[archiveCollection];

      if (!originalCollection) {
        console.error("Unknown archive collection:", archiveCollection);
        return;
      }

      const { id, archiveCollection: _, ...archivedData } = restoreItem;

      if (!archivedData || Object.keys(archivedData).length === 0) {
        console.error("Archived data missing.");
        return;
      }

      const originalDocId = archivedData.originalDocId || archivedData.userId;

      const restoredData = { ...archivedData };
      delete restoredData.archivedAt;
      delete restoredData.originalDocId;

      await setDoc(doc(db, originalCollection, originalDocId), restoredData);

      console.log(
        `Restored document from ${archiveCollection} to ${originalCollection}.`
      );

      await deleteDoc(doc(db, archiveCollection, archiveId));
      console.log(
        `Deleted archived document ${archiveId} from ${archiveCollection}.`
      );

      await logAdminAction({
        actionDescription: `Restored document from ${archiveCollection} to ${originalCollection}`,
        userIdAffected: archiveId,
      });

      switch (archiveCollection) {
        case "usersArchive":
          setUserArchives((prev) =>
            prev.filter((item) => item.id !== archiveId)
          );
          break;
        case "ordersArchive":
          setOrders((prev) => prev.filter((item) => item.id !== archiveId));
          break;
        case "toshipArchive":
          setToShip((prev) => prev.filter((item) => item.id !== archiveId));
          break;
        case "toreceiveArchive":
          setToReceive((prev) => prev.filter((item) => item.id !== archiveId));
          break;
        case "return_refundArchive":
          setRefund((prev) => prev.filter((item) => item.id !== archiveId));
          break;
        case "completedArchive":
          setCompleted((prev) => prev.filter((item) => item.id !== archiveId));
          break;
        case "cancelledArchive":
          setCancelled((prev) => prev.filter((item) => item.id !== archiveId));
          break;
        case "adminArchive":
          setAdminArchives((prev) =>
            prev.filter((item) => item.id !== archiveId)
          );
          break;
        case "sellerArchive":
          setSellerArchives((prev) =>
            prev.filter((item) => item.id !== archiveId)
          );
          break;
        case "removedProducts":
          setRemovedProducts((prev) =>
            prev.filter((item) => item.id !== archiveId)
          );
          break;
      }
    } catch (err) {
      console.error("Error restoring archived document:", err);
    } finally {
      setRestoreModalOpen(false);
      setRestoreItem(null);
      setRestoreType("");
    }
  };

  const handleRestoreUserWithAllData = async (userId) => {
    try {
      setRestoreLoading(true);
      const batch = writeBatch(db);

      const collectionsMap = {
        usersArchive: "users",
        shippingLocationsArchive: "shippingLocations",
        chatMessagesArchive: "chatMessages",
        completedArchive: "completed",
        cancelledArchive: "cancelled",
        cartItemsArchive: "cartItems",
        measurementsArchive: "measurements",
        notificationsArchive: "notifications",
        ordersArchive: "orders",
        return_refundArchive: "return_refund",
        toreceiveArchive: "toReceive",
        toshipArchive: "toShip",
      };

      const userSnap = await getDocs(collection(db, "usersArchive"));
      const userDoc = userSnap.docs.find((doc) => doc.data().userId === userId);
      if (!userDoc) return console.error("Archived user not found.");

      const userData = userDoc.data();
      const userRef = doc(
        db,
        "users",
        userData.originalDocId || userData.userId
      );
      const restoredUserData = { ...userData };
      delete restoredUserData.archivedAt;
      delete restoredUserData.originalDocId;

      batch.set(userRef, restoredUserData);

      batch.delete(doc(db, "usersArchive", userDoc.id));

      for (const [archiveCol, originalCol] of Object.entries(collectionsMap)) {
        if (archiveCol === "usersArchive") continue;

        const q = query(
          collection(db, archiveCol),
          where("userId", "==", userId)
        );
        const colSnap = await getDocs(q);

        colSnap.docs.forEach((docItem) => {
          const originalRef = doc(collection(db, originalCol));
          batch.set(originalRef, docItem.data());
          batch.delete(doc(db, archiveCol, docItem.id));
        });
      }

      await batch.commit();

      console.log(`User ${userId} and all related data restored successfully.`);

      setUserArchives((prev) => prev.filter((u) => u.userId !== userId));
      setOrders((prev) => prev.filter((o) => o.userId !== userId));
      setToShip((prev) => prev.filter((o) => o.userId !== userId));
      setToReceive((prev) => prev.filter((o) => o.userId !== userId));
      setRefund((prev) => prev.filter((o) => o.userId !== userId));
      setCompleted((prev) => prev.filter((o) => o.userId !== userId));
      setCancelled((prev) => prev.filter((o) => o.userId !== userId));

      await logAdminAction({
        actionDescription: `Restored user ${userId} and all related data`,
        userIdAffected: userId,
      });
    } catch (err) {
      console.error("Error restoring user and related data:", err);
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleRestoreClick = (item, type) => {
    let archiveCollection = "";

    switch (type) {
      case "Users":
        archiveCollection = "usersArchive";
        break;
      case "Orders":
        archiveCollection = "ordersArchive";
        break;
      case "To Ship":
        archiveCollection = "toshipArchive";
        break;
      case "To Receive":
        archiveCollection = "toreceiveArchive";
        break;
      case "Return/Refund":
        archiveCollection = "return_refundArchive";
        break;
      case "Completed":
        archiveCollection = "completedArchive";
        break;
      case "Cancelled":
        archiveCollection = "cancelledArchive";
        break;
      case "Admin":
        archiveCollection = "adminArchive";
        break;
      case "Seller":
        archiveCollection = "sellerArchive";
        break;
      case "Products":
        archiveCollection = "removedProducts";
        break;
      default:
        console.error("Unknown type:", type);
        return;
    }

    setRestoreItem({ ...item, archiveCollection });
    setRestoreType(type);
    setRestoreModalOpen(true);
  };

  const handleRestoreClickForUser = (item) => {
    if (!item || !item.userId) return;

    setRestoreUserItem(item);
    setRestoreUserModalOpen(true);
  };

  const RestoreIcon = ({ onClick }) => (
    <svg
      onClick={onClick}
      xmlns="http://www.w3.org/2000/svg"
      height="40"
      width="40"
      viewBox="0 0 48 48"
      style={{ cursor: "pointer" }}
    >
      <path d="M24 44q-4.2 0-7.85-1.6-3.65-1.6-6.325-4.3Q7.15 35.4 5.55 31.75 3.95 28.1 3.95 23.9q0-4.3 1.525-8.025 1.525-3.725 4.25-6.475Q12.45 6.65 16.2 5.1 19.95 3.55 24.3 3.55q5.6 0 10.05 2.65 4.45 2.65 7.15 7.15h-4.1q-2.25-3.4-5.75-5.225T24.3 6.3q-7.4 0-12.5 5.125T6.7 23.9q0 7.4 5.1 12.5t12.5 5.1q5.85 0 10.325-3.575Q38.1 34.35 39.7 28.9h3.95q-1.75 7.15-7.275 11.65Q30.85 45 24 45Zm2.1-10.65-8.4-8.4 8.4-8.4 2.15 2.1-5.05 5h14.2v3h-14.2l5.05 5.05Z" />
    </svg>
  );
  const ProductIcon = () => <span style={{ fontSize: "50px" }}>📦</span>;

  return (
    <PageContainer>
      <Title>Archives</Title>

      <NavBar>
        {tabList.map((tab) => (
          <NavItem
            key={tab}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </NavItem>
        ))}
      </NavBar>

      {activeTab === "Users" && (
        <ListContainer>
          {userArchives.map((item, index) => (
            <ListItem
              key={index}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div style={{ fontSize: "36px", color: "#555" }}>
                <PersonIcon />
              </div>

              <ItemInfo style={{ flex: 1 }}>
                <div>
                  <FieldLabel>User ID:</FieldLabel> {item.userId}
                </div>
                <div>
                  <FieldLabel>Username:</FieldLabel> {item.username}
                </div>
                <div>
                  <FieldLabel>Email:</FieldLabel> {item.email}
                </div>
              </ItemInfo>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => handleRestoreClickForUser(item)}
              >
                <RestoreIcon />
                <span
                  style={{
                    marginTop: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                    color: "black",
                  }}
                >
                  Restore
                </span>
              </div>

              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "12px",
                  fontSize: "12px",
                  opacity: 0.7,
                }}
              >
                {item.archivedAt
                  ? item.archivedAt.toDate?.()?.toLocaleString() ||
                    item.archivedAt.toLocaleString?.() ||
                    "N/A"
                  : "N/A"}
              </div>
            </ListItem>
          ))}
        </ListContainer>
      )}

      {activeTab === "Seller" && (
        <>
          <ListContainer>
            {sellerArchives.map((item) => (
              <ListItem
                key={item.id}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "36px", color: "#555" }}>
                  <PersonIcon />
                </div>

                <ItemInfo style={{ flex: 1 }}>
                  <div>
                    <FieldLabel>Name:</FieldLabel> {item.name}
                  </div>
                  <div>
                    <FieldLabel>Email:</FieldLabel> {item.email}
                  </div>
                  <div>
                    <FieldLabel>Role:</FieldLabel> {item.role}
                  </div>
                </ItemInfo>

                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "12px",
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  {item.archivedAt?.toDate().toLocaleString() || "N/A"}
                </div>
              </ListItem>
            ))}
          </ListContainer>
        </>
      )}

      {activeTab === "Admin" && (
        <>
          <ListContainer>
            {adminArchives.length === 0 ? (
              <p>No archived admins found.</p>
            ) : (
              adminArchives.map((item) => (
                <ListItem
                  key={item.id}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div style={{ fontSize: "36px", color: "#555" }}>
                    <PersonIcon />
                  </div>

                  <ItemInfo style={{ flex: 1 }}>
                    <div>
                      <FieldLabel>Name:</FieldLabel> {item.name || "N/A"}
                    </div>
                    <div>
                      <FieldLabel>Email:</FieldLabel> {item.email || "N/A"}
                    </div>
                    <div>
                      <FieldLabel>Role:</FieldLabel> {item.role || "Admin"}
                    </div>
                  </ItemInfo>

                  <div
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      right: "12px",
                      fontSize: "12px",
                      opacity: 0.7,
                    }}
                  >
                    {item.archivedAt?.toDate().toLocaleString() || "N/A"}
                  </div>
                </ListItem>
              ))
            )}
          </ListContainer>
        </>
      )}

      {activeTab === "Orders" && (
        <ListContainer>
          {orders.length === 0 ? (
            <p>No archived orders found.</p>
          ) : (
            orders.map((item, index) => (
              <ListItem
                key={index}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "36px", color: "#555" }}>
                  <ProductIcon />
                </div>

                <ItemInfo style={{ flex: 1 }}>
                  <div>
                    <FieldLabel>Order ID:</FieldLabel> {item.orderId}
                  </div>
                  <div>
                    <FieldLabel>Total:</FieldLabel> {item.total}
                  </div>
                  <div>
                    <FieldLabel>Product name:</FieldLabel>{" "}
                    {Array.isArray(item.items) && item.items.length > 0
                      ? item.items[0].productName
                      : "N/A"}
                  </div>
                </ItemInfo>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => handleRestoreClick(item, activeTab)}
                >
                  <RestoreIcon />
                  <span
                    style={{
                      marginTop: "4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    Restore
                  </span>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "12px",
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  {item.archivedAt
                    ? item.archivedAt.toDate?.()?.toLocaleString() ||
                      item.archivedAt.toLocaleString?.() ||
                      "N/A"
                    : "N/A"}
                </div>
              </ListItem>
            ))
          )}
        </ListContainer>
      )}

      {activeTab === "To Ship" && (
        <ListContainer>
          {toShip.length === 0 ? (
            <p>No items in To Ship.</p>
          ) : (
            toShip.map((item, index) => (
              <ListItem
                key={index}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "36px", color: "#555" }}>
                  <ProductIcon />
                </div>

                <ItemInfo style={{ flex: 1 }}>
                  <div>
                    <FieldLabel>To Ship ID:</FieldLabel> {item.toshipID}
                  </div>
                  <div>
                    <FieldLabel>Name:</FieldLabel> {item.name}
                  </div>
                  <div>
                    <FieldLabel>Product name:</FieldLabel>{" "}
                    {Array.isArray(item.items) && item.items.length > 0
                      ? item.items[0].productName
                      : "N/A"}
                  </div>
                </ItemInfo>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => handleRestoreClick(item, activeTab)}
                >
                  <RestoreIcon />
                  <span
                    style={{
                      marginTop: "4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    Restore
                  </span>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "12px",
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  {item.archivedAt
                    ? item.archivedAt.toDate?.()?.toLocaleString() ||
                      item.archivedAt.toLocaleString?.() ||
                      "N/A"
                    : "N/A"}
                </div>
              </ListItem>
            ))
          )}
        </ListContainer>
      )}

      {activeTab === "To Receive" && (
        <ListContainer>
          {toReceive.length === 0 ? (
            <p>No items in To Receive.</p>
          ) : (
            toReceive.map((item, index) => (
              <ListItem
                key={index}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "36px", color: "#555" }}>
                  <ProductIcon />{" "}
                </div>

                <ItemInfo style={{ flex: 1 }}>
                  <div>
                    <FieldLabel>To Receive ID:</FieldLabel> {item.toreceiveID}
                  </div>
                  <div>
                    <FieldLabel>Name:</FieldLabel> {item.name}
                  </div>
                  <div>
                    <FieldLabel>Product name:</FieldLabel>{" "}
                    {Array.isArray(item.items) && item.items.length > 0
                      ? item.items[0].productName
                      : "N/A"}
                  </div>
                </ItemInfo>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => handleRestoreClick(item, activeTab)}
                >
                  <RestoreIcon />
                  <span
                    style={{
                      marginTop: "4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    Restore
                  </span>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "12px",
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  {item.archivedAt
                    ? item.archivedAt.toDate?.()?.toLocaleString() ||
                      item.archivedAt.toLocaleString?.() ||
                      "N/A"
                    : "N/A"}
                </div>
              </ListItem>
            ))
          )}
        </ListContainer>
      )}

      {activeTab === "Return/Refund" && (
        <ListContainer>
          {refund.length === 0 ? (
            <p>No return/refund data.</p>
          ) : (
            refund.map((item, index) => (
              <ListItem
                key={index}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "36px", color: "#555" }}>
                  <ProductIcon />
                </div>

                <ItemInfo style={{ flex: 1 }}>
                  <div>
                    <FieldLabel>Return/Refund ID:</FieldLabel> {item.orderId}
                  </div>
                  <div>
                    <FieldLabel>Reason:</FieldLabel> {item.reason}
                  </div>
                  <div>
                    <FieldLabel>Product name:</FieldLabel>{" "}
                    {Array.isArray(item.items) && item.items.length > 0
                      ? item.items[0].productName
                      : "N/A"}
                  </div>
                </ItemInfo>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => handleRestoreClick(item, activeTab)}
                >
                  <RestoreIcon />
                  <span
                    style={{
                      marginTop: "4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    Restore
                  </span>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "12px",
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  {item.archivedAt
                    ? item.archivedAt.toDate?.()?.toLocaleString() ||
                      item.archivedAt.toLocaleString?.() ||
                      "N/A"
                    : "N/A"}
                </div>
              </ListItem>
            ))
          )}
        </ListContainer>
      )}

      {activeTab === "Completed" && (
        <ListContainer>
          {completed.length === 0 ? (
            <p>No completed orders.</p>
          ) : (
            completed.map((item, index) => (
              <ListItem
                key={index}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "36px", color: "#555" }}>
                  <ProductIcon />{" "}
                </div>

                <ItemInfo style={{ flex: 1 }}>
                  <div>
                    <FieldLabel>Completed ID:</FieldLabel> {item.completedID}
                  </div>
                  <div>
                    <FieldLabel>Name:</FieldLabel> {item.name}
                  </div>
                  <div>
                    <FieldLabel>Product name:</FieldLabel>{" "}
                    {Array.isArray(item.items) && item.items.length > 0
                      ? item.items[0].productName
                      : "N/A"}
                  </div>
                </ItemInfo>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => handleRestoreClick(item, activeTab)}
                >
                  <RestoreIcon />
                  <span
                    style={{
                      marginTop: "4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    Restore
                  </span>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "12px",
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  {item.archivedAt
                    ? item.archivedAt.toDate?.()?.toLocaleString() ||
                      item.archivedAt.toLocaleString?.() ||
                      "N/A"
                    : "N/A"}
                </div>
              </ListItem>
            ))
          )}
        </ListContainer>
      )}

      {activeTab === "Cancelled" && (
        <ListContainer>
          {cancelled.length === 0 ? (
            <p>No cancelled orders.</p>
          ) : (
            cancelled.map((item, index) => (
              <ListItem
                key={index}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "36px", color: "#555" }}>
                  <ProductIcon />{" "}
                </div>

                <ItemInfo style={{ flex: 1 }}>
                  <div>
                    <FieldLabel>Cancelled ID:</FieldLabel> {item.cancelledID}
                  </div>
                  <div>
                    <FieldLabel>User's name:</FieldLabel> {item.name}
                  </div>
                  <div>
                    <FieldLabel>Product name:</FieldLabel>{" "}
                    {Array.isArray(item.items) && item.items.length > 0
                      ? item.items[0].productName
                      : "N/A"}
                  </div>
                </ItemInfo>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => handleRestoreClick(item, activeTab)}
                >
                  <RestoreIcon />
                  <span
                    style={{
                      marginTop: "4px",
                      fontSize: "10px",
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    Restore
                  </span>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "12px",
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  {item.archivedAt
                    ? item.archivedAt.toDate?.()?.toLocaleString() ||
                      item.archivedAt.toLocaleString?.() ||
                      "N/A"
                    : "N/A"}
                </div>
              </ListItem>
            ))
          )}
        </ListContainer>
      )}

      {activeTab === "Products" && (
        <>
          <ListContainer>
            {removedProducts.length === 0 ? (
              <p>No removed products found.</p>
            ) : (
              removedProducts.map((item) => (
                <ListItem
                  key={item.id}
                  style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      style={{
                        width: "150px",
                        height: "150px",
                        borderRadius: "8px",
                        objectFit: "cover",
                      }}
                    />

                    <ItemInfo>
                      <div>
                        <FieldLabel>Product ID:</FieldLabel> {item.productID}
                      </div>
                      <div>
                        <FieldLabel>Name:</FieldLabel> {item.productName}
                      </div>
                      <div>
                        <FieldLabel>Category:</FieldLabel> {item.categoryMain} /{" "}
                        {item.categorySub}
                      </div>
                      <div>
                        <FieldLabel>Price:</FieldLabel> ₱{item.price}
                      </div>
                      <div>
                        <FieldLabel>Removed By:</FieldLabel> {item.removedBy}
                      </div>
                    </ItemInfo>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                      marginLeft: "20px",
                    }}
                    onClick={() => handleRestoreClick(item, activeTab)}
                  >
                    <RestoreIcon />
                    <span
                      style={{
                        marginTop: "4px",
                        fontSize: "10px",
                        fontWeight: "600",
                        color: "black",
                      }}
                    >
                      Restore
                    </span>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      right: "12px",
                      fontSize: "12px",
                      opacity: 0.7,
                    }}
                  >
                    {item.removedAt?.toDate().toLocaleString() || "N/A"}
                  </div>
                </ListItem>
              ))
            )}
          </ListContainer>
        </>
      )}
      {restoreModalOpen && (
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
              padding: "20px 30px",
              borderRadius: "12px",
              maxWidth: "400px",
              textAlign: "center",
              color: "#000",
            }}
          >
            <h3>Confirm Restore</h3>
            <p>
              Are you sure you want to restore this {restoreType.toLowerCase()}{" "}
              archive data?
            </p>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                gap: "20px",
              }}
            >
              <button
                onClick={() => setRestoreModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                No
              </button>
              <button
                onClick={handleConfirmRestore}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: "#6f42c1",
                  color: "#fff",
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {restoreUserModalOpen && (
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
            pointerEvents: restoreLoading ? "none" : "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px 30px",
              borderRadius: "12px",
              maxWidth: "400px",
              textAlign: "center",
              color: "#000",
              position: "relative",
            }}
          >
            <h3>Confirm Restore User</h3>
            <p>
              Do you want to restore this user{" "}
              <strong>{restoreUserItem?.username}</strong>?
              <br />
              You can choose to restore just the main user doc or all related
              data.
            </p>

            {restoreLoading && (
              <p
                style={{
                  color: "#6f42c1",
                  fontWeight: "600",
                  marginTop: "10px",
                }}
              >
                Restoring data, please wait...
              </p>
            )}

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <button
                onClick={async () => {
                  setRestoreLoading(true);
                  await handleRestoreUserOnly(restoreUserItem?.userId);
                  setRestoreLoading(false);
                  setRestoreUserModalOpen(false);
                  setRestoreUserItem(null);
                }}
                disabled={restoreLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: restoreLoading ? "not-allowed" : "pointer",
                  width: "80%",
                  backgroundColor: "#0d6efd",
                  color: "#fff",
                }}
              >
                Restore User Only
              </button>

              <button
                onClick={async () => {
                  setRestoreLoading(true);
                  await handleRestoreUserWithAllData(restoreUserItem?.userId);
                  setRestoreLoading(false);
                  setRestoreUserModalOpen(false);
                  setRestoreUserItem(null);
                }}
                disabled={restoreLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: restoreLoading ? "not-allowed" : "pointer",
                  width: "80%",
                  backgroundColor: "#6f42c1",
                  color: "#fff",
                }}
              >
                Restore User with All Data
              </button>

              <button
                onClick={() => {
                  if (restoreLoading) return;
                  setRestoreUserModalOpen(false);
                  setRestoreUserItem(null);
                }}
                disabled={restoreLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: restoreLoading ? "not-allowed" : "pointer",
                  width: "80%",
                  backgroundColor: "#dc3545",
                  color: "#fff",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {restoreLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 10000,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingTop: "150px",
            color: "#fff",
            fontSize: "18px",
            fontWeight: "600",
          }}
        >
          Please wait, user data is being restored...
        </div>
      )}
    </PageContainer>
  );
};

export default Archives;
