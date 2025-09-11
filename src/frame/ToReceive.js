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

const ToReceive = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const toReceiveRef = collection(db, 'toReceive'); // ✅ Use toReceive collection
    const q = query(toReceiveRef);

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

      // Fetch customer names
      const userIdArray = Array.from(userIds);
      const userMap = {};

      await Promise.all(
        userIdArray.map(async (uid) => {
          try {
            const usersQuery = query(collection(db, 'users'), where('userId', '==', uid));
            const usersSnap = await getDocs(usersQuery);
            if (!usersSnap.empty) {
              const uData = usersSnap.docs[0].data();
              const name =
                uData.name ||
                uData.displayName ||
                uData.fullName ||
                ((uData.firstName || uData.lastName)
                  ? `${uData.firstName || ''} ${uData.lastName || ''}`.trim()
                  : null) ||
                uid;
              userMap[uid] = name;
            } else {
              userMap[uid] = uid;
            }
          } catch (err) {
            console.error("Error fetching user:", err);
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

  const tabs = [
    { name: 'Orders', path: '/orders' },
    { name: 'To Ship', path: '/orders/toship' },
    { name: 'To Receive', path: '/orders/toreceive' },
    { name: 'Cancelled', path: '/orders/cancelled' },
    { name: 'Completed', path: '/orders/complete' },
  ];

  return (
    <OrdersContainer>
      <OrdersHeader>Orders</OrdersHeader>

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
            <TableHeader>Order Date</TableHeader>
            <TableHeader>Product</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader>Colors</TableHeader>
            <TableHeader>Sizes</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
       <tbody>
        {orders.length > 0 ? (
          orders.flatMap(order =>
            order.items.map(item => (
              <TableRow key={`${order.id}-${item.id}`}>
                <TableData>{order.name}</TableData>
                <TableData>{order.address || '-'}</TableData>
                <TableData>{order.createdAt?.toDate().toLocaleString() || '-'}</TableData>
                <TableData>{item.productName}</TableData>
                <TableData>{item.quantity}</TableData>
                <TableData>₱{item.price}</TableData>
                <TableData>{item.color || '-'}</TableData>
                <TableData>{item.size || '-'}</TableData>
                <TableData>
                  <button
                    style={{
                      backgroundColor: '#007bff', // bright blue
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      display: 'inline-block',
                      border: 'none',
                      cursor: 'default', // not clickable
                    }}
                    disabled
                  >
                    To Receive
                  </button>
                </TableData>

              </TableRow>
            ))
          )
        ) : (
          <TableRow>
            <TableData colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
              📦 No "To Receive" orders found
            </TableData>
          </TableRow>
        )}
      </tbody>

      </OrdersTable>
    </OrdersContainer>
  );
};

export default ToReceive;
