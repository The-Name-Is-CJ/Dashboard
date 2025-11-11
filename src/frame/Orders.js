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
  doc,
  deleteDoc,
  setDoc,
  orderBy,
  addDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FiSearch } from 'react-icons/fi'; // ✅ Imported search icon

// ✅ Top-centered popup styles
const popupStyles = {
  overlay: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  popupBox: {
    backgroundColor: '#fff',
    padding: '20px 25px',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
    textAlign: 'center',
    minWidth: '320px',
  },
  text: {
    fontSize: '16px',
    marginBottom: '15px',
    color: '#333',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  yesButton: {
    backgroundColor: '#9747FF',
    color: '#fff',
    padding: '8px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
  noButton: {
    backgroundColor: '#ccc',
    color: '#000',
    padding: '8px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
};

// ✅ Top popup component
const TopPopup = ({ visible, message, onConfirm, onCancel }) => {
  if (!visible) return null;

  return (
    <div style={popupStyles.overlay}>
      <div style={popupStyles.popupBox}>
        <p style={popupStyles.text}>{message}</p>
        <div style={popupStyles.buttonContainer}>
          <button onClick={onConfirm} style={popupStyles.yesButton}>Yes</button>
          <button onClick={onCancel} style={popupStyles.noButton}>No</button>
        </div>
      </div>
    </div>
  );
};

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

const Orders = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [role, setRole] = useState('Unknown');
  const user = auth.currentUser;

  // Fetch admin role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'admins'));
        let foundRole = 'Unknown';

        querySnapshot.forEach(docSnap => {
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

  // Fetch orders
  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      try {
        const fetchedOrders = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setOrders(fetchedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
      }
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

  const filterOrders = () => {
    const path = location.pathname;
    switch (path) {
      case '/orders/toship': return orders.filter(o => o.status === 'To Ship');
      case '/orders/toreceive': return orders.filter(o => o.status === 'To Receive');
      case '/orders/cancelled': return orders.filter(o => o.status === 'Cancelled');
      case '/orders/complete': return orders.filter(o => o.status === 'Complete');
      default: return orders;
    }
  };
  const displayedOrders = filterOrders();
  const filteredOrders = displayedOrders
    .filter(order => order.orderId)
    .filter(order =>
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleStatusClick = (orderId) => {
    setSelectedOrderId(orderId);
    setPopupMessage('Is the product packed and ready to ship?');
    setPopupVisible(true);
  };

  const handleConfirm = async () => {
    try {
      const orderToMove = orders.find(o => o.id === selectedOrderId);
      if (!orderToMove) return;

      const { id, ...orderDataWithoutId } = orderToMove;
      const updatedOrder = {
        ...orderDataWithoutId,
        status: 'To Ship',
        packedAt: new Date(),
        toshipID: `TS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        items: orderToMove.items.map(item => ({ ...item })),
      };

      await setDoc(doc(db, 'toShip', orderToMove.id), updatedOrder);
      await deleteDoc(doc(db, 'orders', orderToMove.id));

      await addDoc(collection(db, 'notifications'), {
        notifID: `NTP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: orderToMove.userId,
        title: 'Order Packed',
        message: 'Your order has been packed and is waiting to be shipped.',
        orderId: orderToMove.orderId,
        timestamp: new Date(),
        read: false,
      });

      await addDoc(collection(db, 'recentActivityLogs'), {
        logID: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        action: `Order (${orderToMove.orderId}) is packed`,
        role: role,
        userEmail: user?.email || 'Unknown user',
        timestamp: serverTimestamp(),
      });

      setPopupVisible(false);
      setSelectedOrderId(null);
    } catch (err) {
      console.error('Error moving order to toShip:', err);
      setPopupVisible(false);
    }
  };

  const handleCancel = () => {
    setPopupVisible(false);
    setSelectedOrderId(null);
  };

  return (
    <OrdersContainer>
      <OrdersHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Orders</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <FiSearch style={searchStyles.icon} /> {/* ✅ Search icon inside input */}
          </div>
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
            <TableHeader>Order Date</TableHeader>
            <TableHeader>Product</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Amount</TableHeader>
            <TableHeader>Sizes</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredOrders.map(order =>
            order.items.map(item => (
              <TableRow key={item.id}>
                <TableData>{order.name}</TableData>
                <TableData>{order.address || '-'}</TableData>
                <TableData>{order.createdAt?.toDate().toLocaleString()}</TableData>
                <TableData>{item.productName}</TableData>
                <TableData>{item.quantity}</TableData>
                <TableData>₱{order.total}</TableData>
                <TableData>{item.size || '-'}</TableData>
                <TableData>
                  {(order.status === 'Pending' || order.status === 'To Ship') ? (
                    <StatusButton onClick={() => handleStatusClick(order.id)}>
                      {order.status}
                    </StatusButton>
                  ) : (
                    <StatusButton disabled>{order.status}</StatusButton>
                  )}
                </TableData>
              </TableRow>
            ))
          )}
        </tbody>
      </OrdersTable>

      {/* ✅ Top popup replaces all old modals */}
      <TopPopup
        visible={popupVisible}
        message={popupMessage}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </OrdersContainer>
  );
};

export default Orders;
