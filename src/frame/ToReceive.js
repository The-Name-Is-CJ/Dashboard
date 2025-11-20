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
import { collection, query, onSnapshot, getDocs, where, orderBy, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FiSearch } from 'react-icons/fi'; // ✅ Imported search icon



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

  const ToReceive = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [removeId, setRemoveId] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [weeklyToReceiveCount, setWeeklyToReceiveCount] = useState(0);


  // 🔥 Fetch toReceive with weekly count
  useEffect(() => {
    const toReceiveRef = collection(db, 'toReceive');
    const q = query(toReceiveRef, orderBy('shippedAt', 'desc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      try {
        const fetchedOrders = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setOrders(fetchedOrders);

        // 🗓️ Compute total toReceive orders this week (Sunday → today)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const startOfWeek = new Date(today);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(today.getDate() - dayOfWeek);

        const weeklyCount = fetchedOrders.filter(order => {
          if (!order.shippedAt) return false;
          const shippedDate = order.shippedAt.toDate();
          return shippedDate >= startOfWeek && shippedDate <= today;
        }).length;

        setWeeklyToReceiveCount(weeklyCount); // <-- make sure you have this state
      } catch (err) {
        console.error('Error fetching toReceive orders:', err);
      }
    });

    return () => unsubscribe();
  }, []);


 // Filter orders by search term
  const filteredOrders = orders
    .map(order => ({
      ...order,
      items: order.items.filter(item =>
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter(order => order.items.length > 0);

  const tabs = [
    { name: 'Orders', path: '/orders' },
    { name: 'To Ship', path: '/orders/toship' },
    { name: 'To Receive', path: '/orders/toreceive' },
    { name: 'Cancelled', path: '/orders/cancelled' },
    { name: 'Completed', path: '/orders/complete' },
  ];

  return (
    <OrdersContainer>
      <OrdersHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>To Receive</h2>

        {/* Search bar */}
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
          Total to-receive orders this week:{" "}
          <span style={{ fontWeight: "500", color: "#007bff" }}>
            {weeklyToReceiveCount}
          </span>
        </div>
      </OrdersTabs>


      <OrdersTable>
        <TableHead>
          <TableRow>
            <TableHeader width="150px" style={{ textAlign: 'center' }}>Customer</TableHeader>
            <TableHeader width="325px" style={{ textAlign: 'center' }}>Address</TableHeader>
            <TableHeader width="125px" style={{ textAlign: 'center' }}>Shipped Date</TableHeader>
            <TableHeader width="225px" style={{ textAlign: 'center' }}>Product</TableHeader>
            <TableHeader width="30px" style={{ textAlign: 'center' }}>Quantity</TableHeader>
            <TableHeader width="50px" style={{ textAlign: 'center' }}>Amount</TableHeader>
            <TableHeader width="50px" style={{ textAlign: 'center' }}>Sizes</TableHeader>
            <TableHeader width="100px" style={{ textAlign: 'center' }}>Status</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredOrders.length > 0 ? (
            filteredOrders.flatMap(order =>
              order.items.map(item => (
                <TableRow key={`${order.id}-${item.id}`}>
                  <TableData>{order.name}</TableData>
                  <TableData>{order.address || '-'}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{order.shippedAt?.toDate().toLocaleString() || '-'}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{item.productName}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{item.quantity}</TableData>
                  <TableData style={{ textAlign: 'center' }}>₱{item.price}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{item.size || '-'}</TableData>
                  <TableData style={{ textAlign: 'center' }}>        
                    {order.name &&
                    order.name.trim() !== "" &&
                    order.name !== "Unknown" &&
                    order.name !== "User not found" &&
                    order.userId &&
                    order.userId !== "" &&
                    order.userId !== null ? (

                      // Normal To Receive button
                      <button
                        style={{
                          backgroundColor: "#007bff",
                          color: "#fff",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontWeight: "bold",
                          fontSize: "0.9rem",
                          cursor: "default",
                          border: "none",
                        }}
                        disabled
                      >
                        To Receive
                      </button>
                    ) : (
                    
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
                📦 No "To Receive" orders found
              </TableData>
            </TableRow>
          )}
        </tbody>

      </OrdersTable>
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
                if (isLoading) return; // prevent double click
                setIsLoading(true);

                try {
                  // 1️⃣ Get the order you're deleting
                  const toReceiveDoc = await getDoc(doc(db, "toReceive", removeId));
                  if (!toReceiveDoc.exists()) throw new Error("Order not found.");

                  const orderData = toReceiveDoc.data();
                  const items = orderData.items || [];

                  // 2️⃣ Restore stock for every item inside the order
                  for (const item of items) {
                    const productID = item.productId;
                    const size = item.size;
                    const qtyToRestore = item.quantity;

                    if (!productID || !size || !qtyToRestore) {
                      console.warn("Missing product data. Skipping restore.");
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

                    // Updated stock for this size
                    const updatedSizeStock = currentSizeStock + qtyToRestore;

                    // Recompute totalStock
                    let updatedTotalStock = 0;
                    Object.keys(currentStock).forEach((sz) => {
                      updatedTotalStock += sz === size ? updatedSizeStock : currentStock[sz];
                    });

                    // Apply update
                    await updateDoc(productRef, {
                      stock: {
                        ...currentStock,
                        [size]: updatedSizeStock,
                      },
                      totalStock: updatedTotalStock,
                    });
                  }

                  // 3️⃣ Delete the toReceive entry
                  await deleteDoc(doc(db, "toReceive", removeId));

                  setShowRemoveModal(false);
                  setRemoveId(null);

                } catch (error) {
                  console.error("Error deleting record:", error);
                }finally {
                  setIsLoading(false);
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
            > {isLoading ? "Deleting…" : "Yes, Delete"}
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

export default ToReceive;
