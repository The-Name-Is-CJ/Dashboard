import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const Colors = {
  secondary: "#fff",
  primary: "#6f42c1",
  accent: "#9b7bff",
  white: "#fff",
  gray: "#777",
};

// PAGE
const PageContainer = styled.div`
  padding: 30px;
  background: ${Colors.primary};
  min-height: 100vh;
  width: 100%;
  color: ${Colors.white};
  font-family: "Poppins", sans-serif;
`;

// NAVIGATION
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

// GRID
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 25px;
  margin-top: 15px;
`;

// CARDS
const Card = styled.div`
  background: ${Colors.secondary};
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.35);
  transition: 0.2s ease;

  &:hover {
    background: ${Colors.accent};
    transform: translateY(-5px);
    box-shadow: 0px 8px 20px rgba(0, 0, 0, 0.45);
  }
`;

const CardField = styled.p`
  font-size: 0.95rem;
  color: ${Colors.gray};
  margin-bottom: 3px;
`;

const FieldLabel = styled.span`
  font-weight: 600;
  color: black;
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

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        // --- Users + orders + other arrays ---
        const snap = await getDocs(collection(db, "usersArchive"));

        let usersArr = [];
        let ordersArr = [];
        let toShipArr = [];
        let toReceiveArr = [];
        let refundArr = [];
        let completedArr = [];
        let cancelledArr = [];

        snap.forEach((doc) => {
          const data = doc.data();

          if (data.users && typeof data.users === "object") {
            usersArr.push({
              ...data.users,
              archivedAt: data.archivedAt || null,
            });
          }

          if (Array.isArray(data.orders)) ordersArr.push(...data.orders);
          if (Array.isArray(data.toShip)) toShipArr.push(...data.toShip);
          if (Array.isArray(data.toReceive))
            toReceiveArr.push(...data.toReceive);
          if (Array.isArray(data.return_refund))
            refundArr.push(...data.return_refund);
          if (Array.isArray(data.completed))
            completedArr.push(...data.completed);
          if (Array.isArray(data.cancelled))
            cancelledArr.push(...data.cancelled);
        });

        setUserArchives(usersArr);
        setOrders(ordersArr);
        setToShip(toShipArr);
        setToReceive(toReceiveArr);
        setRefund(refundArr);
        setCompleted(completedArr);
        setCancelled(cancelledArr);

        // --- Admin Archive ---
        const adminSnap = await getDocs(collection(db, "adminArchive"));
        const adminArr = adminSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAdminArchives(adminArr);

        // --- Seller Archive ---
        const sellerSnap = await getDocs(collection(db, "sellerArchive"));
        const sellerArr = sellerSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSellerArchives(sellerArr);

        // --- Removed Products ---
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

  return (
    <PageContainer>
      <Title>Archives</Title>

      {/* --- TOP NAVIGATION --- */}
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

      {activeTab === "Users" &&
        userArchives.map((item, index) => (
          <Card key={index}>
            <CardField>
              <FieldLabel>User ID: </FieldLabel> {item.userId || "N/A"}
            </CardField>
            <CardField>
              <FieldLabel>Username: </FieldLabel> {item.username || "N/A"}
            </CardField>
            <CardField>
              <FieldLabel>Email: </FieldLabel> {item.email || "N/A"}
            </CardField>
            <CardField>
              <FieldLabel>Archived At: </FieldLabel>
              {item.archivedAt?.toDate().toLocaleString() || "N/A"}
            </CardField>
          </Card>
        ))}

      {activeTab === "Seller" && (
        <>
          <SectionTitle>Seller Archive</SectionTitle>
          <CardGrid>
            {sellerArchives.length === 0 ? (
              <p>No archived sellers found.</p>
            ) : (
              sellerArchives.map((item) => (
                <Card key={item.id}>
                  <CardField>
                    <FieldLabel>ID: </FieldLabel> {item.id || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Name: </FieldLabel> {item.name || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Email: </FieldLabel> {item.email || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Role: </FieldLabel> {item.role || "Seller"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Archived At: </FieldLabel>{" "}
                    {item.archivedAt?.toDate().toLocaleString() || "N/A"}
                  </CardField>
                </Card>
              ))
            )}
          </CardGrid>
        </>
      )}

      {activeTab === "Admin" && (
        <>
          <SectionTitle>Admin Archive</SectionTitle>
          <CardGrid>
            {adminArchives.length === 0 ? (
              <p>No archived admins found.</p>
            ) : (
              adminArchives.map((item) => (
                <Card key={item.id}>
                  <CardField>
                    <FieldLabel>ID: </FieldLabel> {item.id}
                  </CardField>
                  <CardField>
                    <FieldLabel>Name: </FieldLabel> {item.name || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Email: </FieldLabel> {item.email || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Role: </FieldLabel> {item.role || "Admin"}
                  </CardField>
                </Card>
              ))
            )}
          </CardGrid>
        </>
      )}

      {activeTab === "Orders" && (
        <>
          <SectionTitle>Orders Archive</SectionTitle>
          <CardGrid>
            {orders.length === 0 ? (
              <p>No archived orders found.</p>
            ) : (
              orders.map((item, index) => (
                <Card key={index}>
                  <CardField>
                    <FieldLabel>Order ID: </FieldLabel> {item.orderId || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Total: </FieldLabel> {item.total || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Date: </FieldLabel> {item.date || "N/A"}
                  </CardField>
                </Card>
              ))
            )}
          </CardGrid>
        </>
      )}
      {activeTab === "To Ship" && (
        <>
          <SectionTitle>To Ship Archive</SectionTitle>
          <CardGrid>
            {toShip.length === 0 ? (
              <p>No items in To Ship.</p>
            ) : (
              toShip.map((item, index) => (
                <Card key={index}>
                  <CardField>
                    <FieldLabel>Order ID: </FieldLabel> {item.orderId}
                  </CardField>
                  <CardField>
                    <FieldLabel>Name: </FieldLabel> {item.name}
                  </CardField>
                </Card>
              ))
            )}
          </CardGrid>
        </>
      )}
      {activeTab === "To Receive" && (
        <>
          <SectionTitle>To Receive Archive</SectionTitle>
          <CardGrid>
            {toReceive.length === 0 ? (
              <p>No items in To Receive.</p>
            ) : (
              toReceive.map((item, index) => (
                <Card key={index}>
                  <CardField>
                    <FieldLabel>Order ID: </FieldLabel> {item.orderId}
                  </CardField>
                  <CardField>
                    <FieldLabel>Name: </FieldLabel> {item.name}
                  </CardField>
                </Card>
              ))
            )}
          </CardGrid>
        </>
      )}
      {activeTab === "Return/Refund" && (
        <>
          <SectionTitle>Return / Refund Archive</SectionTitle>
          <CardGrid>
            {refund.length === 0 ? (
              <p>No return/refund data.</p>
            ) : (
              refund.map((item, index) => (
                <Card key={index}>
                  <CardField>
                    <FieldLabel>Order ID: </FieldLabel> {item.orderId}
                  </CardField>
                  <CardField>
                    <FieldLabel>Reason: </FieldLabel> {item.reason}
                  </CardField>
                </Card>
              ))
            )}
          </CardGrid>
        </>
      )}
      {activeTab === "Completed" && (
        <>
          <SectionTitle>Completed Orders</SectionTitle>
          <CardGrid>
            {completed.length === 0 ? (
              <p>No completed orders.</p>
            ) : (
              completed.map((item, index) => (
                <Card key={index}>
                  <CardField>
                    <FieldLabel>Order ID: </FieldLabel> {item.orderId}
                  </CardField>
                  <CardField>
                    <FieldLabel>Name: </FieldLabel> {item.name}
                  </CardField>
                </Card>
              ))
            )}
          </CardGrid>
        </>
      )}
      {activeTab === "Cancelled" && (
        <>
          <SectionTitle>Cancelled Orders</SectionTitle>
          <CardGrid>
            {cancelled.length === 0 ? (
              <p>No cancelled orders.</p>
            ) : (
              cancelled.map((item, index) => (
                <Card key={index}>
                  <CardField>
                    <FieldLabel>Order ID: </FieldLabel> {item.orderId}
                  </CardField>
                  <CardField>
                    <FieldLabel>Name: </FieldLabel> {item.name}
                  </CardField>
                </Card>
              ))
            )}
          </CardGrid>
        </>
      )}

      {activeTab === "Products" && (
        <>
          <SectionTitle>Removed Products</SectionTitle>
          <CardGrid>
            {removedProducts.length === 0 ? (
              <p>No removed products found.</p>
            ) : (
              removedProducts.map((item) => (
                <Card key={item.id}>
                  <CardField>
                    <FieldLabel>Product ID: </FieldLabel>{" "}
                    {item.productID || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Name: </FieldLabel> {item.productName || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Category: </FieldLabel> {item.categoryMain} /{" "}
                    {item.categorySub}
                  </CardField>
                  <CardField>
                    <FieldLabel>Price: </FieldLabel> {item.price || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Total Stock: </FieldLabel>{" "}
                    {item.totalStock || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Removed By: </FieldLabel>{" "}
                    {item.removedBy || "N/A"}
                  </CardField>
                  <CardField>
                    <FieldLabel>Removed At: </FieldLabel>{" "}
                    {item.removedAt?.toDate().toLocaleString() || "N/A"}
                  </CardField>
                  <CardField>
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        marginTop: "10px",
                      }}
                    />
                  </CardField>
                </Card>
              ))
            )}
          </CardGrid>
        </>
      )}
    </PageContainer>
  );
};

export default Archives;
