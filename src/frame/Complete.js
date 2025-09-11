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
} from '../components/orderstyle';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const Complete = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Fetch from "completed" collection
    const completedRef = collection(db, 'completed');
    const unsubscribe = onSnapshot(completedRef, snapshot => {
      const fetched = [];
      snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() }));
      setOrders(fetched);
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
            <TableHeader>Received Date</TableHeader>
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
                  <TableData>{order.name || order.userId}</TableData>
                  <TableData>{order.address || '-'}</TableData>
                  <TableData>{order.completedAt?.toDate().toLocaleString() || '-'}</TableData>
                  <TableData>{item.productName}</TableData>
                  <TableData>{item.quantity}</TableData>
                  <TableData>₱{item.price}</TableData>
                  <TableData>{item.color || '-'}</TableData>
                  <TableData>{item.size || '-'}</TableData>
                  <TableData>
                    <button
                      style={{
                        backgroundColor: '#28a745', // green
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
                      Completed
                    </button>
                  </TableData>

                </TableRow>
              ))
            )
          ) : (
            <TableRow>
              <TableData colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                ✅ No completed orders found
              </TableData>
            </TableRow>
          )}
        </tbody>
      </OrdersTable>
    </OrdersContainer>
  );
};

export default Complete;
