import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  FaBoxes,
  FaStar,
  FaShoppingCart,
  FaFrown,
  FaMeh,
  FaSmile,
  FaLaugh,
  FaGrinStars,
  FaExclamationTriangle,
  FaTrash,
} from 'react-icons/fa';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const Container = styled.div`
  padding: 2rem;
`;

const Header = styled.h2`
  color: rgb(85, 91, 199);
  margin-bottom: 1.5rem;
`;

const CardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #a166ff, #ebdfff);
  padding: 1.2rem;
  border-radius: 16px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const IconBox = styled.div`
  font-size: 1.8rem;
`;

const LabelBox = styled.div`
  line-height: 1.4;
`;

const Label = styled.div`
  font-size: 1rem;
  font-weight: bold;
`;

const Value = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
`;

const LowStockList = styled.div`
  max-height: 160px;
  overflow-y: auto;
  padding-right: 0.5rem;
  font-size: 0.95rem;
`;

const LowStockItem = styled.div`
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 180px;
`;

const GraphTitle = styled.div`
  font-weight: bold;
  color: #000;
  margin-bottom: 0.5rem;
  font-size: 1rem;
`;

const LogsContainer = styled.div`
  background: #fff;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  position: relative;
`;

const LogsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LogsTitle = styled.h3`
  margin-bottom: 1rem;
  color: rgb(85, 91, 199);
`;

const DeleteAllButton = styled.button`
  background: #888888;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background: #666666;
  }
`;

const LogItem = styled.div`
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
  font-size: 0.95rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LogLeft = styled.div`
  cursor: pointer;
  flex: 1;
`;

const DropdownButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: #555;
  padding: 4px;
`;

const LogDetails = styled.div`
  padding: 0.3rem 1rem 0.6rem;
  font-size: 0.85rem;
  color: #555;
`;

const ToggleLogsButton = styled.button`
  display: block;          /* makes it center with margin auto */
  margin: 1rem auto 0;     /* top 1rem, auto left/right, 0 bottom */
  background: rgb(85, 91, 199);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: bold;

  &:hover {
    background: #6b6ed9;
  }
`;


const RatingScale = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 5px;
`;

const ScaleBox = styled.div`
  flex: 1;
  text-align: center;
  padding: 8px 0;
  background-color: ${props => props.bg || '#ccc'};
  color: #fff;
  border-radius: 8px;
  font-size: 1.2rem;
  margin: 0 3px;
  position: relative;
  z-index: ${props => (props.highlighted ? 2 : 1)};
  transform: ${props => (props.highlighted ? 'scale(1.25)' : 'scale(1)')};
  box-shadow: ${props => (props.highlighted ? '0 0 10px #fff' : 'none')};
  transition: transform 0.2s ease, box-shadow 0.2s ease;
`;



const Dashboard = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [soldSum, setSoldSum] = useState(0);
  const [logs, setLogs] = useState([]);
  const [soldData, setSoldData] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [showAllLogs, setShowAllLogs] = useState(false); 
  const [logSearchTerm, setLogSearchTerm] = useState('');

  const getTotalStock = (stock) => {
  if (!stock) return 0;

  // If your Firestore data already has totalStock saved, just use it directly
  if (stock.totalStock !== undefined) return Number(stock.totalStock) || 0;

  // Otherwise, sum all sizes manually
  let total = 0;
  Object.entries(stock).forEach(([size, qty]) => {
    if (typeof qty === 'number') total += qty;
  });

  return total;
}

  useEffect(() => {
    const fetchProductStats = async () => {
      const snapshot = await getDocs(collection(db, 'products'));
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Low stock calculation with color & size
      const lowStocks = products.filter(prod => getTotalStock(prod.stock) <= 10);
      setLowStockItems(lowStocks);

      const totalSold = products.reduce((sum, prod) => sum + (Number(prod.sold) || 0), 0);
      setSoldSum(totalSold);

      const chartData = products
        .map(prod => ({
          name: prod.productID || prod.name,
          sold: Number(prod.sold) || 0,
          fullName: prod.name,
        }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);

      setSoldData(chartData);

      let totalRating = 0;
      let ratedItems = 0;
      products.forEach(prod => {
        const rating = Number(prod.rating);
        if (rating >= 1 && rating <= 5) {
          totalRating += rating;
          ratedItems++;
        }
      });
      setAverageRating(ratedItems ? (totalRating / ratedItems).toFixed(1) : 0);
    };

    const fetchLogs = async () => {
      const q = query(collection(db, 'recentActivityLogs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expanded: false,
      }));
      setLogs(logsData);
    };

    fetchProductStats();
    fetchLogs();
  }, []);

// Filter logs based on search term (case-insensitive, supports month names)
  const filteredLogs = logs.filter(log => {
    if (!logSearchTerm) return true;

    const term = logSearchTerm.toLowerCase();

    // Check action or productName
    const actionMatch = log.action?.toLowerCase().includes(term);
    const productMatch = log.productName?.toLowerCase().includes(term);

    // Convert timestamp to string with month names (e.g., "Sep 2, 2025, 10:15:00 AM")
    let timestampStr = '';
    if (log.timestamp?.toDate) {
      const date = new Date(log.timestamp.toDate());
      timestampStr = date.toLocaleString('en-US', {
        month: 'long',    // full month name: "September"
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      }).toLowerCase();
    }

    const dateMatch = timestampStr.includes(term);

    return actionMatch || productMatch || dateMatch;
  });

  // Already in your code:
  const logDates = [...new Set(logs.map(log => {
    if (!log.timestamp?.toDate) return null;
    const date = new Date(log.timestamp.toDate());
    return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
  }).filter(Boolean))];


  // 2. Filter suggestions based on search term
  const dateSuggestions = logDates.filter(d => d.includes(logSearchTerm));

  // 3. Filter logs by selected date if a valid date is chosen
  const displayedLogs = logSearchTerm && dateSuggestions.includes(logSearchTerm)
    ? logs.filter(log => {
        if (!log.timestamp?.toDate) return false;
        const logDate = new Date(log.timestamp.toDate()).toISOString().split('T')[0];
        return logDate === logSearchTerm;
      })
    : filteredLogs; // fallback to original filtered logs



  const toggleLog = id => {
    setLogs(prev =>
      prev.map(log =>
        log.id === id ? { ...log, expanded: !log.expanded } : log
      )
    );
  };

  const handleDeleteLog = async id => {
    await deleteDoc(doc(db, 'recentActivityLogs', id));
    setLogs(prev => prev.filter(log => log.id !== id));
  };

  const handleDeleteAllLogs = async () => {
    const snapshot = await getDocs(collection(db, 'recentActivityLogs'));
    const deletions = snapshot.docs.map(d => deleteDoc(doc(db, 'recentActivityLogs', d.id)));
    await Promise.all(deletions);
    setLogs([]);
  };

  const avg = parseFloat(averageRating);

  return (
    <Container>
      <Header>Welcome back, Admin!</Header>

      <CardContainer>
        <StatCard>
          <IconBox><FaBoxes /></IconBox>
          <LabelBox>
            <Label>Low Stock Warnings</Label>
          </LabelBox>
          <LowStockList>
            {lowStockItems.length > 0 ? (
              lowStockItems.map((item, i) => (
                <LowStockItem key={i}>
                  <FaExclamationTriangle /> {item.name} - {getTotalStock(item.stock)} left
                </LowStockItem>
              ))
            ) : (
              <div>All stocks are sufficient.</div>
            )}
          </LowStockList>
        </StatCard>

        <StatCard>
          <IconBox><FaStar /></IconBox>
          <LabelBox>
            <Label>Average Rating</Label>
            <Value>{averageRating} ★</Value>
          </LabelBox>
          <RatingScale>
            <ScaleBox bg="#FF4D4D" highlighted={avg <= 1}><FaFrown /></ScaleBox>
            <ScaleBox bg="#FF8042" highlighted={avg > 1 && avg <= 2}><FaMeh /></ScaleBox>
            <ScaleBox bg="#FFBB28" highlighted={avg > 2 && avg <= 3}><FaSmile /></ScaleBox>
            <ScaleBox bg="#00C49F" highlighted={avg > 3 && avg <= 4}><FaLaugh /></ScaleBox>
            <ScaleBox bg="#4CAF50" highlighted={avg > 4}><FaGrinStars /></ScaleBox>
          </RatingScale>
        </StatCard>

        <StatCard>
          <IconBox><FaShoppingCart /></IconBox>
          <LabelBox>
            <Label>Total Sold</Label>
            <Value>{soldSum}</Value>
          </LabelBox>
          <ChartContainer>
            <GraphTitle>Most Sold Products</GraphTitle>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={soldData}>
                <XAxis dataKey="name" tick={{ fill: '#000' }} />
                <YAxis tick={{ fill: '#000' }} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload && payload.length ? (
                      <div style={{
                        backgroundColor: '#000',
                        color: '#fff',
                        padding: '8px',
                        borderRadius: '6px'
                      }}>
                        <strong>{payload[0].payload.fullName}</strong><br />
                        Sold: {payload[0].payload.sold}
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="sold" barSize={24} fill="#000" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </StatCard>
      </CardContainer>

      <LogsContainer>
        <LogsHeader>
          <LogsTitle>Activity Logs</LogsTitle>
          
          <div style={{ position: 'relative', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search the log data..."
              value={logSearchTerm}
              onChange={e => setLogSearchTerm(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                outline: 'none',
                fontSize: '0.9rem',
                minWidth: '200px',
              }}
            />
            <DeleteAllButton onClick={handleDeleteAllLogs}>Delete All Logs</DeleteAllButton>

            {/* Auto-complete dropdown for dates */}
            {logSearchTerm && dateSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '38px',
                left: 0,
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: '8px',
                zIndex: 10,
                width: '100%',
                maxHeight: '180px',
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {dateSuggestions.map(date => (
                  <div
                    key={date}
                    onClick={() => setLogSearchTerm(date)}
                    style={{
                      padding: '6px 10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    {date}
                  </div>
                ))}
              </div>
            )}
          </div>

        </LogsHeader>

          {logs.length === 0 ? (
            <p>No recent activity yet.</p>
          ) : (
            <>
              {displayedLogs.length === 0 ? (
                <p>No logs found for this search.</p>
              ) : (
                <>
                  {(showAllLogs || logSearchTerm ? displayedLogs : displayedLogs.slice(0, 5)).map(log => (
                    <div key={log.id}>
                      <LogItem>
                        <LogLeft onClick={() => toggleLog(log.id)}>
                          [{log.timestamp?.toDate
                            ? new Date(log.timestamp.toDate()).toLocaleString()
                            : 'Unknown Time'}] {log.action} <strong>{log.productName}</strong>
                        </LogLeft>
                        <DropdownButton onClick={() => handleDeleteLog(log.id)}>
                          <FaTrash />
                        </DropdownButton>
                      </LogItem>
                      {log.expanded && log.details && (
                        <LogDetails>➤ {log.details}</LogDetails>
                      )}
                    </div>
                  ))}

                  {displayedLogs.length > 5 && (
                    <ToggleLogsButton onClick={() => setShowAllLogs(prev => !prev)}>
                      {showAllLogs ? 'Show Less ▲' : 'Show More ▼'}
                    </ToggleLogsButton>
                  )}
                </>
              )}
            </>
          )}

      </LogsContainer>
    </Container>
  );
};

export default Dashboard;
