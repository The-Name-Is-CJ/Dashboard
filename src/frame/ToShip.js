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
} from 'firebase/firestore';
import { db, auth } from '../firebase';
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
  const [role, setRole] = useState('Unknown');
  const user = auth.currentUser;

  // 🔹 Fetch admin role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'admins'));
        let foundRole = 'Unknown';

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.mainAdmin === user?.email) foundRole = 'Main Admin';
          else if (data.subAdmin1 === user?.email) foundRole = 'Admin 1';
          else if (data.subAdmin2 === user?.email) foundRole = 'Admin 2';
          else if (data.subAdmin3 === user?.email) foundRole = 'Admin 3';
        });

        setRole(foundRole);
      } catch (err) {
        console.error('Error fetching role:', err);
      }
    };

    if (user?.email) fetchRole();
  }, [user]);

  // Filter orders and their items
  const filteredOrders = orders
    .map((order) => ({
      ...order,
      items: order.items.filter((item) =>
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((order) => order.items.length > 0);

  // 🔥 Fetch toShip
  useEffect(() => {
    const toShipRef = collection(db, 'toShip');
    const q = query(toShipRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedOrders = [];
      const userIds = new Set();

      snapshot.forEach((docSnap) => {
        const orderData = { ...docSnap.data() };
        fetchedOrders.push(orderData);
        if (orderData.userId) userIds.add(orderData.userId);
      });

      if (userIds.size === 0) {
        setOrders(fetchedOrders);
        return;
      }

      const userIdArray = Array.from(userIds);
      const userMap = {};

      await Promise.all(
        userIdArray.map(async (uid) => {
          try {
            const locQuery = query(
              collection(db, 'shippingLocations'),
              where('userId', '==', uid)
            );
            const locSnap = await getDocs(locQuery);
            if (!locSnap.empty) {
              const locData = locSnap.docs[0].data();
              userMap[uid] = locData.name || 'Unknown';
            } else {
              userMap[uid] = 'Unknown';
            }
          } catch (err) {
            console.error('Error fetching shipping location for userId=', uid, err);
            userMap[uid] = 'Unknown';
          }
        })
      );

      const ordersWithNames = fetchedOrders.map((order) => ({
        ...order,
        name: userMap[order.userId] || 'Unknown',
      }));

      setOrders(ordersWithNames);
    });

    return () => unsubscribe();
  }, []);

  const handleConfirmYes = async (order, item) => {
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

      const logID = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await addDoc(collection(db, 'recentActivityLogs'), {
        logID,
        action: `Order ${order.orderId} is shipped`,
        userEmail: user?.email || 'Unknown',
        role,
        timestamp: serverTimestamp(),
      });

      setConfirmOrder(null);
      console.log(`Order ${order.orderId} moved to "toReceive"`);
    } catch (err) {
      console.error('Error moving to toReceive:', err);
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

      {/* Tabs */}
      <OrdersTabs>
        {tabs.map((tab) => (
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
            <TableHeader>Packed Date</TableHeader>
            <TableHeader>Product</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader>Sizes</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredOrders.length > 0 ? (
            filteredOrders.flatMap((order) =>
              order.items.map((item) => (
                <TableRow key={`${order.id}-${item.id}`}>
                  <TableData>{order.name}</TableData>
                  <TableData>{order.address || '-'}</TableData>
                  <TableData>{order.packedAt?.toDate().toLocaleString()}</TableData>
                  <TableData>{item.productName}</TableData>
                  <TableData>{item.quantity}</TableData>
                  <TableData>₱{order.total}</TableData>
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
            >
              Yes
            </button>
            <button style={noButtonStyle} onClick={handleConfirmNo}>
              No
            </button>
          </div>
        </div>
      )}
    </OrdersContainer>
  );
};

export default ToShip;
