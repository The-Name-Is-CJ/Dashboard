import React, { useState, useEffect } from 'react';
import {
  OrdersContainer,
  OrdersHeader,
  OrdersTabs,
  TabItem,
  OrdersSummary,
  SummaryBox,
  SummaryValue,
  SummaryLabel,
  OrdersTable,
  TableHead,
  TableRow,
  TableHeader,
  TableData,
  StatusButton,
} from '../components/orderstyle';

import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';  // <-- updated import for Firestore

// Updated nav tabs
const tabRoutes = {
  Order: 'All',
  'To Ship': 'ToShip',
  Cancelled: 'Cancelled',
  Complete: 'Completed',
};

const Orders = () => {
  const [activeTab, setActiveTab] = useState('Order');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let q;
    const ordersRef = collection(db, 'orders');

    if (tabRoutes[activeTab] === 'All') {
      q = query(ordersRef);
    } else {
      q = query(ordersRef, where('status', '==', tabRoutes[activeTab]));
    }

    const unsubscribe = onSnapshot(q, snapshot => {
      const fetchedOrders = [];
      snapshot.forEach(doc => {
        fetchedOrders.push({ id: doc.id, ...doc.data() });
      });
      setOrders(fetchedOrders);
    });

    return () => unsubscribe();
  }, [activeTab]);

  // Calculate summary counts dynamically based on orders state
  const totalOrders = orders.length;
  const toShipCount = orders.filter(o => o.status === 'ToShip').length;
  const completedCount = orders.filter(o => o.status === 'Completed').length;

  return (
    <OrdersContainer>
      <OrdersHeader>Orders</OrdersHeader>

      {/* Tab Navigation */}
      <OrdersTabs>
        {Object.keys(tabRoutes).map(tab => (
          <TabItem
            key={tab}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </TabItem>
        ))}
      </OrdersTabs>

      {/* Order Summary */}
      <OrdersSummary>
        <SummaryBox>
          <SummaryValue>{totalOrders}</SummaryValue>
          <SummaryLabel>Total Orders</SummaryLabel>
        </SummaryBox>
        <SummaryBox>
          <SummaryValue>{toShipCount}</SummaryValue>
          <SummaryLabel>To Ship</SummaryLabel>
        </SummaryBox>
        <SummaryBox>
          <SummaryValue>{completedCount}</SummaryValue>
          <SummaryLabel>Completed</SummaryLabel>
        </SummaryBox>
      </OrdersSummary>

      {/* Order Table */}
      <OrdersTable>
        <TableHead>
          <TableRow>
            <TableHeader>Customer</TableHeader>
            <TableHeader>Address</TableHeader>
            <TableHeader>Order Date</TableHeader>
            <TableHeader>Product</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {orders.map(order => (
            <TableRow key={order.id}>
              <TableData>{order.name}</TableData>
              <TableData>{order.address}</TableData>
              <TableData>{order.orderDate}</TableData>
              <TableData>{order.product}</TableData>
              <TableData>{order.quantity}</TableData>
              <TableData>{order.amount}</TableData>
              <TableData>
                <StatusButton>{order.status || 'Pending'}</StatusButton>
              </TableData>
            </TableRow>
          ))}
        </tbody>
      </OrdersTable>
    </OrdersContainer>
  );
};

export default Orders;
