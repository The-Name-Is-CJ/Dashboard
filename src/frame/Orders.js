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
import { collection, query, onSnapshot, doc, deleteDoc, setDoc, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';

// Modal styles
const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '12px',
    width: '320px',
    textAlign: 'center',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
  },
  text: {
    fontSize: '16px',
    marginBottom: '20px',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-around',
  },
  yesButton: {
    backgroundColor: '#9747FF',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
  noButton: {
    backgroundColor: '#ccc',
    color: '#000',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
};

// Modal component placed right below the style
const ConfirmationModal = ({ visible, onConfirm, onCancel }) => {
  if (!visible) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modalBox}>
        <p style={modalStyles.text}>Is the product packed and ready to ship?</p>
        <div style={modalStyles.buttonContainer}>
          <button onClick={onConfirm} style={modalStyles.yesButton}>Yes</button>
          <button onClick={onCancel} style={modalStyles.noButton}>No</button>
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
  const ordersRef = collection(db, 'orders');

  // Order results by createdAt ascending (oldest first)
  const q = query(ordersRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    try {
      const fetchedOrders = [];
      const userIds = new Set();

      // Collect orders and their userIds
      snapshot.forEach((docSnap) => {
        const orderData = { id: docSnap.id, ...docSnap.data() };
        fetchedOrders.push(orderData);
        if (orderData.userId) userIds.add(orderData.userId);
      });

      // If there are no userIds, just set orders
      if (userIds.size === 0) {
        setOrders(fetchedOrders);
        return;
      }

      // Batch fetch users by querying users where userId == <value>
      // (we do one query per distinct userId; this matches your DB shape)
      const userIdArray = Array.from(userIds);
      const userMap = {}; // userId -> name

      await Promise.all(
        userIdArray.map(async (uid) => {
          try {
            const usersQuery = query(collection(db, 'users'), where('userId', '==', uid));
            const usersSnap = await getDocs(usersQuery);
            if (!usersSnap.empty) {
              const uDoc = usersSnap.docs[0];
              const uData = uDoc.data();
              // robust name detection with fallbacks
              const name =
                uData.name ||
                uData.displayName ||
                uData.fullName ||
                ((uData.firstName || uData.lastName) ? `${uData.firstName || ''} ${uData.lastName || ''}`.trim() : null) ||
                uid;
              userMap[uid] = name;
            } else {
              userMap[uid] = uid; // fallback to uid if not found
            }
          } catch (err) {
            console.error('Error fetching user for userId=', uid, err);
            userMap[uid] = uid;
          }
        })
      );

      // Attach names to orders
      const ordersWithNames = fetchedOrders.map((order) => ({
        ...order,
        name: userMap[order.userId] || order.userId,
      }));

      setOrders(ordersWithNames);
    } catch (err) {
      console.error('Error processing orders snapshot:', err);
      // still set raw orders if something failed earlier
      const fallback = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setOrders(fallback);
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
      case '/orders/toship':
        return orders.filter(order => order.status === 'To Ship');
      case '/orders/toreceive':
        return orders.filter(order => order.status === 'To Receive');
      case '/orders/cancelled':
        return orders.filter(order => order.status === 'Cancelled');
      case '/orders/complete':
        return orders.filter(order => order.status === 'Complete');
      default:
        return orders;
    }
  };

  const displayedOrders = filterOrders();

  const handleStatusClick = (orderId) => {
    setSelectedOrderId(orderId);
    setModalVisible(true);
  };

  const handleConfirm = async () => {
    try { 

      const orderToMove = orders.find(order => order.id === selectedOrderId);
      if (!orderToMove) return;
  
      const updatedOrder = {
        ...orderToMove,
        status: "To Ship",
        items: orderToMove.items.map(item => ({
          ...item,
          status: "To Ship", 
        })),
      };
  
      await setDoc(doc(db, "toShip", updatedOrder.id), updatedOrder); 
      await deleteDoc(doc(db, "orders", updatedOrder.id));

      setModalVisible(false);
      setSelectedOrderId(null);
    } catch (err) {
      console.error("Error moving order to toShip:", err);
      setModalVisible(false);
    }
  };
 
  const handleCancel = () => {
    setModalVisible(false);
    setSelectedOrderId(null);
  };

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
          {displayedOrders.map(order =>
            order.items.map(item => (
              <TableRow key={item.id}>
                <TableData>{order.name}</TableData>
                <TableData>{order.address || '-'}</TableData>
                <TableData>{order.createdAt?.toDate().toLocaleString()}</TableData>
                <TableData>{item.productName}</TableData>
                <TableData>{item.quantity}</TableData>
                <TableData>₱{order.total}</TableData>
                <TableData>{item.color || '-'}</TableData>
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

      <ConfirmationModal
        visible={modalVisible}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </OrdersContainer>
  );
};

export default Orders;
