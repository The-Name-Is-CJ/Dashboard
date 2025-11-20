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
import { collection, query, onSnapshot, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FiSearch } from 'react-icons/fi'; 


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

const Cancelled = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [weeklyCancelledCount, setWeeklyCancelledCount] = useState(0);


  useEffect(() => {
    const cancelledRef = collection(db, 'cancelled');
    const q = query(cancelledRef, orderBy('cancelledAt', 'desc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      try {
        const fetchedOrders = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Update orders state
        setOrders(fetchedOrders);

        // 🗓️ Compute total cancelled this week (Sunday → today)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const startOfWeek = new Date(today);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(today.getDate() - dayOfWeek);

        const weeklyCount = fetchedOrders.filter(order => {
          if (!order.cancelledAt) return false;

          const cancelledDate = order.cancelledAt.toDate();
          return cancelledDate >= startOfWeek && cancelledDate <= today;
        }).length;

        setWeeklyCancelledCount(weeklyCount);

      } catch (err) {
        console.error('Error fetching cancelled orders:', err);
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
           <FiSearch style={searchStyles.icon} /> 
           
           
        </div>


      </OrdersHeader>
      <OrdersTabs style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        
        {/* LEFT SIDE */}
        <div style={{ display: "flex", gap: "15px" }}>
          {tabs.map(tab => (
            <TabItem key={tab.name} active={location.pathname === tab.path}>
              <Link to={tab.path} style={{ color: 'inherit', textDecoration: 'none' }}>
                {tab.name}
              </Link>
            </TabItem>
          ))}
        </div>

        {/* RIGHT SIDE */}
        <div style={{ fontSize: "25px", fontWeight: "500", color: "#444" }}>
          Total cancelled orders this week: 
          <span style={{ fontWeight: "500", color: "#ff6600" }}>{weeklyCancelledCount}</span>
        </div>

      </OrdersTabs>


      <OrdersTable>
        
        <TableHead>
        
          <TableRow>
            <TableHeader width="150px" style={{ textAlign: 'center' }}>Customer</TableHeader>
            <TableHeader width="325px" style={{ textAlign: 'center' }}>Address</TableHeader>
            <TableHeader width="125px" style={{ textAlign: 'center' }}>Cancelled Date</TableHeader>
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
                  <TableData style={{ textAlign: 'center' }}>{order.cancelledAt?.toDate().toLocaleString() || '-'}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{item.productName}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{item.quantity}</TableData>
                  <TableData style={{ textAlign: 'center' }}>₱{item.price}</TableData>
                  <TableData style={{ textAlign: 'center' }}>{item.size || '-'}</TableData>
                  <TableData style={{ textAlign: 'center' }}>
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
