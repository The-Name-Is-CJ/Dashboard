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
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';

// Search bar styles
const searchStyles = {
  container: { position: 'relative', width: '500px' },
  input: {
    width: '100%',
    padding: '10px 40px 10px 15px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease-in-out',
  },
  icon: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#888' },
};

const Cancelled = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const cancelledRef = collection(db, 'cancelled');
    const q = query(cancelledRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedOrders = [];
      const userIds = new Set();

      snapshot.forEach(docSnap => {
        const orderData = { id: docSnap.id, ...docSnap.data() };
        fetchedOrders.push(orderData);
        if (orderData.userId) userIds.add(orderData.userId);
      });

      if (userIds.size === 0) {
        setOrders(fetchedOrders);
        return;
      }

      // Fetch customer names from shippingLocations
      const userIdArray = Array.from(userIds);
      const userMap = {};

      await Promise.all(
        userIdArray.map(async (uid) => {
          try {
            const userDocRef = collection(db, 'users');
            const userQuery = query(userDocRef, where('userId', '==', uid));
            const userSnap = await getDocs(userQuery);

            if (!userSnap.empty) {
              const userData = userSnap.docs[0].data();
              const shippingName =
                userData.shippingLocations?.[0]?.name || uid; // fallback
              userMap[uid] = shippingName;
            } else {
              userMap[uid] = uid;
            }
          } catch (err) {
            console.error("Error fetching shipping location:", err);
            userMap[uid] = uid;
          }
        })
      );

      const ordersWithNames = fetchedOrders.map(order => ({
        ...order,
        name: userMap[order.userId] || order.userId,
      }));

      setOrders(ordersWithNames);
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
        <h2 style={{ margin: 0 }}>Cancelled Orders</h2>

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
          <span style={searchStyles.icon}>🔍</span>
        </div>
      </OrdersHeader>

      <OrdersTabs>
        {tabs.map(tab => (
          <TabItem key={tab.name} active={location.pathname === tab.path}>
            <Link to={tab.path} style={{ color: 'inherit', textDecoration: 'none' }}>
              {tab.name}
            </Link>
          </TabItem>
        ))}
      </OrdersTabs>

      <OrdersTable>
        <TableHead>
          <TableRow>
            <TableHeader>Customer</TableHeader>
            <TableHeader>Address</TableHeader>
            <TableHeader>Cancelled Date</TableHeader>
            <TableHeader>Product</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader>Sizes</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredOrders.length > 0 ? (
            filteredOrders.flatMap(order =>
              order.items.map(item => (
                <TableRow key={`${order.id}-${item.id}`}>
                  <TableData>{order.name}</TableData>
                  <TableData>{order.address || '-'}</TableData>
                  <TableData>{order.cancelledAt?.toDate().toLocaleString() || '-'}</TableData>
                  <TableData>{item.productName}</TableData>
                  <TableData>{item.quantity}</TableData>
                  <TableData>₱{item.price}</TableData>
                  <TableData>{item.size || '-'}</TableData>
                  <TableData>
                    <button
                      style={{
                        backgroundColor: '#ff6600',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        display: 'inline-block',
                        border: 'none',
                        cursor: 'default',
                      }}
                      disabled
                    >
                      Cancelled
                    </button>
                  </TableData>
                </TableRow>
              ))
            )
          ) : (
            <TableRow>
              <TableData colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                ❌ No cancelled orders found
              </TableData>
            </TableRow>
          )}
        </tbody>
      </OrdersTable>
    </OrdersContainer>
  );
};

export default Cancelled;
