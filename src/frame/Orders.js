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
import { collection, query, onSnapshot, doc, deleteDoc, setDoc, orderBy, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db,  auth } from '../firebase';

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
// Search bar styles
const searchStyles = {
  container: {
    position: 'relative',
    width: '500px',
  },
  input: {
    width: '100%',
    padding: '10px 40px 10px 15px', // extra space for icon
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
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '16px',
    color: '#888',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [role, setRole] = useState("Unknown");
  const user = auth.currentUser;

useEffect(() => {
  const fetchRole = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'admins'));
      let foundRole = "Unknown";

      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.mainAdmin === user?.email) foundRole = "Main Admin";
        else if (data.subAdmin1 === user?.email) foundRole = "Admin 1";
        else if (data.subAdmin2 === user?.email) foundRole = "Admin 2";
        else if (data.subAdmin3 === user?.email) foundRole = "Admin 3";
      });

      setRole(foundRole);
    } catch (err) {
      console.error("Error fetching role:", err);
    }
  };

  if (user?.email) fetchRole();
}, [user]);


  useEffect(() => {
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    try {
      const fetchedOrders = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(), // name is already included in the order doc
      }));

      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
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

 const filteredOrders = displayedOrders
  .filter(order => order.orderId) // ✅ skip documents with no orderId
  .filter(order =>
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );



  const handleStatusClick = (orderId) => {
    setSelectedOrderId(orderId);
    setModalVisible(true);
  };

  const handleConfirm = async () => {
    try {
      const orderToMove = orders.find(order => order.id === selectedOrderId);
      if (!orderToMove) return;

      const { id, ...orderDataWithoutId } = orderToMove;

      const updatedOrder = {
        ...orderDataWithoutId,
        status: "To Ship",
        packedAt: new Date(),
        toshipID: `TS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        items: orderToMove.items.map(item => ({
          ...item, 
        })),
      };

      
      await setDoc(doc(db, "toShip", orderToMove.id), updatedOrder);

      // Remove from "orders" collection
      await deleteDoc(doc(db, "orders", orderToMove.id));

      const notificationsRef = collection(db, "notifications");
        await addDoc(notificationsRef, {
          notifID: `NTP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: orderToMove.userId,
          title: "Order Packed",
          message: "Your order has been packed and is waiting to be shipped.",
          orderId: orderToMove.orderId,
          timestamp: new Date(),
          read: false,
        });

      const logsRef = collection(db, "recentActivityLogs");
        await addDoc(logsRef, {
          logID: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          action: `Order (${orderToMove.orderId}) is packed`,
          role: role,
          userEmail: user?.email || "Unknown user",
          timestamp: serverTimestamp(),
        });

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
            <span style={searchStyles.icon}>🔍</span>
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

      <ConfirmationModal
        visible={modalVisible}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </OrdersContainer>
  );
};

export default Orders;
