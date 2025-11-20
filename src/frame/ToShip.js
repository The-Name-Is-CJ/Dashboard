import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
} from '../components/orderstyle';
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
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FiSearch } from 'react-icons/fi'; 

// Search bar styles
const searchStyles = {
  container: { position: 'relative', width: '500px' },
  input: {
    width: '100%',
    padding: '10px 40px 10px 15px', // extra padding for icon
    borderRadius: '10px',
    border: '1px solid #ccc',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease-in-out',
  },
  icon: {
    position: 'absolute',
    right: '12px',
    top: '80%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    color: '#888',
    pointerEvents: 'none', // allows typing through icon
  },
};


// ✅ Top-centered popup style
const topPopupStyle = {
  position: 'fixed',
  top: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
  padding: '20px 30px',
  textAlign: 'center',
  zIndex: 9999,
  width: '350px',
  animation: 'fadeDown 0.3s ease-in-out',
};

const buttonContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '15px',
  marginTop: '15px',
};

const yesButtonStyle = {
  backgroundColor: '#9747FF',
  color: 'white',
  padding: '8px 20px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
};

const noButtonStyle = {
  backgroundColor: '#bbb',
  color: 'white',
  padding: '8px 20px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
};

const ToShip = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');  
  const [loading, setLoading] = useState(false);
  const [removeId, setRemoveId] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [weeklyToShipCount, setWeeklyToShipCount] = useState(0);


  // Filter orders and their items
  const filteredOrders = orders
    .map((order) => ({
      ...order,
      items: order.items.filter((item) =>
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((order) => order.items.length > 0);

  useEffect(() => {
    const toShipRef = collection(db, 'toShip');
    const q = query(toShipRef, orderBy('packedAt', 'asc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      try {
        const fetchedOrders = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setOrders(fetchedOrders);

        // 🗓️ Compute total toShip orders this week (Sunday → today)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const startOfWeek = new Date(today);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(today.getDate() - dayOfWeek);

        const weeklyCount = fetchedOrders.filter(order => {
          if (!order.packedAt) return false;
          const packedDate = order.packedAt.toDate();
          return packedDate >= startOfWeek && packedDate <= today;
        }).length;

        setWeeklyToShipCount(weeklyCount); // <-- make sure you have this state
      } catch (err) {
        console.error('Error fetching toShip orders:', err);
      }
    });

    return () => unsubscribe();
  }, []);

   const getUserRole = async (email) => {
      try {
        const adminsRef = collection(db, "admins");
        const q = query(adminsRef, where("email", "==", email));
        const snapshot = await getDocs(q);
  
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          return data.role || "Admin";
        }
      } catch (err) {
        console.error("Error fetching role:", err);
      }
      return "Unknown";
    };

  const handleConfirmYes = async (order, item) => {

    if (loading) return; 
    setLoading(true);

    try {
      await addDoc(collection(db, 'toReceive'), {
        ...order,
        items: [item],
        status: 'To Receive',
        shippedAt: new Date(),
        toreceiveID: `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      });

      const toShipRef = collection(db, 'toShip');
      const q = query(toShipRef, where('orderId', '==', order.orderId));
      const snapshot = await getDocs(q);

      snapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, 'toShip', docSnap.id));
      });

      const notificationsRef = collection(db, 'notifications');

      await addDoc(notificationsRef, {
        notifID: `NTS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: order.userId,
        title: 'Order Shipped',
        message: `Your order for ${item.productName} has been shipped.`,
        orderId: order.orderId,
        timestamp: new Date(),
        read: false,
      });

      await addDoc(notificationsRef, {
        notifID: `NTR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: order.userId,
        title: 'Order Ready to Receive',
        message: `Your order for ${item.productName} is now ready to receive.`,
        orderId: order.orderId,
        timestamp: new Date(),
        read: false,
      });

      const userRole = await getUserRole(user?.email);
      const logID = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await addDoc(collection(db, 'recentActivityLogs'), {
        logID,
        action: `Order ${order.orderId} is shipped`,
        role: userRole,
        userEmail: user?.email || 'Unknown',
        role,
        timestamp: serverTimestamp(),
      });

      setConfirmOrder(null);
      console.log(`Order ${order.orderId} moved to "toReceive"`);
    } catch (err) {
      console.error('Error moving to toReceive:', err);
    } finally {
    setLoading(false); // reset loading
  }
  };

  const handleConfirmNo = () => setConfirmOrder(null);

  const tabs = [
    { name: 'Orders', path: '/orders' },
    { name: 'To Ship', path: '/orders/toship' },
    { name: 'To Receive', path: '/orders/toreceive' },
    { name: 'Cancelled', path: '/orders/cancelled' },
    { name: 'Completed', path: '/orders/complete' },
  ];

  return (
    <OrdersContainer>
      <OrdersHeader
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h2 style={{ margin: 0 }}>To Ship</h2>

        <div style={searchStyles.container}>
          <span style={{ fontSize: '18px', color: '#666' }}>Use the orderID:</span>
          <input
            type="text"
            placeholder="Find order"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchStyles.input}
            onFocus={(e) => (e.target.style.borderColor = '#9747FF')}
            onBlur={(e) => (e.target.style.borderColor = '#ccc')}
          />
           <FiSearch style={searchStyles.icon} /> 
        </div>
      </OrdersHeader>

      <OrdersTabs style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}> 
        <div style={{ display: "flex", gap: "15px" }}>
          {tabs.map(tab => (
            <TabItem key={tab.name} active={location.pathname === tab.path}>
              <Link to={tab.path} style={{ color: 'inherit', textDecoration: 'none' }}>
                {tab.name}
              </Link>
            </TabItem>
          ))}
        </div>

        <div style={{ marginTop: "10px", fontSize: "25px", fontWeight: "500", color: "#444" }}>
          Total to-ship orders this week:{" "}
          <span style={{ fontWeight: "500", color: "#ff6600" }}>
            {weeklyToShipCount}
          </span>
        </div>
      </OrdersTabs>

      <OrdersTable>
        <TableHead>
          <TableRow>
            <TableHeader width="150px" style={{ textAlign: 'center' }}>Customer</TableHeader>
            <TableHeader width="325px" style={{ textAlign: 'center' }}>Address</TableHeader>
            <TableHeader width="125px" style={{ textAlign: 'center' }}>Packed Date</TableHeader>
            <TableHeader width="225px" style={{ textAlign: 'center' }}>Product</TableHeader>
            <TableHeader width="30px" style={{ textAlign: 'center' }}>Quantity</TableHeader>
            <TableHeader width="50px" style={{ textAlign: 'center' }}>Amount</TableHeader>
            <TableHeader width="50px" style={{ textAlign: 'center' }}>Sizes</TableHeader>
            <TableHeader width="100px" style={{ textAlign: 'center' }}>Status</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredOrders.length > 0 ? (
            filteredOrders.flatMap((order) =>
              order.items.map((item) => (
                <TableRow key={`${order.id}-${item.id}`}>
                  <TableData>{order.name}</TableData>
                  <TableData>{order.address || '-'}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{order.packedAt?.toDate().toLocaleString()}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{item.productName}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{item.quantity}</TableData>
                  <TableData style={{ textAlign: 'center' }}>₱{order.total}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{item.size || '-'}</TableData>
                  <TableData >
                    {order.name &&
                    order.name.trim() !== "" &&
                    order.name !== "Unknown" &&
                    order.name !== "User not found" &&
                    order.userId &&
                    order.userId !== "" &&
                    order.userId !== null ? (
                        // Normal TO SHIP button
                        <StatusButton onClick={() => setConfirmOrder({ order, item })}>
                          To Ship
                        </StatusButton>
                      ) : (
                        // REMOVE button for invalid/missing user
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
                      )}

                  </TableData>
                </TableRow>
              ))
            )
          ) : (
            <TableRow>
              <TableData colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                🚚 No "To Ship" orders found
              </TableData>
            </TableRow>
          )}
        </tbody>
      </OrdersTable>

      {/* ✅ Top-centered confirmation popup */}
      {confirmOrder && (
        <div style={topPopupStyle}>
          <h2 style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '18px' }}>
            Confirm Shipment
          </h2>
          <p>
            Mark <b>{confirmOrder.item.productName}</b> as shipped?
          </p>
          <div style={buttonContainerStyle}>
            <button
              style={yesButtonStyle}
              onClick={() => handleConfirmYes(confirmOrder.order, confirmOrder.item)}
              disabled={loading} // disables while loading
            >
              {loading ? 'Processing...' : 'Yes'}
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
                  // 1️⃣ Get the order you're deleting
                  const toShipDoc = await getDoc(doc(db, "toShip", removeId));
                  if (!toShipDoc.exists()) throw new Error("Order not found.");

                  const orderData = toShipDoc.data();

  
                  const items = orderData.items || [];

                  for (const item of items) {
                    const productID = item.productId;
                    const size = item.size;
                    const qtyToRestore = item.quantity;

                    if (!productID || !size || !qtyToRestore) {
                      console.warn("Missing product data, skipping stock restore.");
                      continue;
                    }

                    // 2️⃣ Fetch the product document
                    const productRef = doc(db, "products", productID);
                    const productSnap = await getDoc(productRef);

                    if (!productSnap.exists()) {
                      console.warn(`Product ${productID} not found. Skipping.`);
                      continue;
                    }

                    const productData = productSnap.data();
                    const currentStock = productData.stock || {};
                    const currentSizeStock = currentStock[size] || 0;

                    // 3️⃣ Update stock values
                    const updatedSizeStock = currentSizeStock + qtyToRestore;

                    // Recompute total stock
                    let updatedTotalStock = 0;
                    Object.keys(currentStock).forEach((sz) => {
                      if (sz === size) {
                        updatedTotalStock += updatedSizeStock;
                      } else {
                        updatedTotalStock += currentStock[sz];
                      }
                    });

                    // 4️⃣ Apply the update in Firestore
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

                  // 5️⃣ Finally delete the toShip document
                  await deleteDoc(doc(db, "toShip", removeId));

                  setShowRemoveModal(false);
                  setRemoveId(null);

                } catch (error) {
                  console.error("Error deleting record:", error);
                }finally {
                setLoading(false); // reset loading
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
