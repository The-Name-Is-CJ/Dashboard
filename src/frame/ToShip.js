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
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';

const ToShip = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [confirmOrder, setConfirmOrder] = useState(null);

  // 🔥 Fetch toShip
  useEffect(() => {
    const toShipRef = collection(db, 'toShip');
    const q = query(toShipRef);

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

      // 🔍 Fetch matching users
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

  const handleConfirmYes = async (order, item) => {
    try {
      // ✅ Step 1: Directly add to "toReceive"
      await addDoc(collection(db, 'toReceive'), {
        ...order,
        items: [item],
        status: "To Receive",
        receivedAt: new Date(), // the time admin marked it
      });

      // ✅ Step 2: Remove from "toShip"
      await deleteDoc(doc(db, 'toShip', order.id));

      setConfirmOrder(null);
      console.log(`Order ${order.id} moved to "toReceive"`);
    } catch (err) {
      console.error("Error moving to toReceive:", err);
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
      <OrdersHeader>Orders</OrdersHeader>

      {/* Tabs */}
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
          {/* To Ship orders */}
          {orders.length > 0 ? (
            orders.flatMap(order =>
              order.items.map(item => (
                <TableRow key={`${order.id}-${item.id}`}>
                  <TableData>{order.name}</TableData>
                  <TableData>{order.address || '-'}</TableData>
                  <TableData>
                    {order.createdAt ? order.createdAt.toDate().toLocaleString() : '-'}
                  </TableData>
                  <TableData>{item.productName}</TableData>
                  <TableData>{item.quantity}</TableData>
                  <TableData>₱{order.total}</TableData>
                  <TableData>{item.color || '-'}</TableData>
                  <TableData>{item.size || '-'}</TableData>
                  <TableData>
                    <StatusButton onClick={() => setConfirmOrder({ order, item })}>
                      To Ship
                    </StatusButton>
                  </TableData>
                </TableRow>
              ))
            )
          ) : (
            <TableRow>
              <TableData colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                🚚 No "To Ship" orders found
              </TableData>
            </TableRow>
          )}
        </tbody>
      </OrdersTable>

      {/* Confirmation Popup */}
      {confirmOrder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-lg font-bold mb-4">Confirm Shipment</h2>
            <p>Mark <b>{confirmOrder.item.productName}</b> as shipped?</p>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={() => handleConfirmYes(confirmOrder.order, confirmOrder.item)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Yes
              </button>
              <button
                onClick={handleConfirmNo}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </OrdersContainer>
  );
};

export default ToShip;
