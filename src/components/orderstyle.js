// components/orderstyle.js
import styled from 'styled-components';

export const OrdersContainer = styled.div`
  padding: 20px;
  font-family: 'Segoe UI', sans-serif;
`;

export const OrdersHeader = styled.h2`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 20px;
`;

export const OrdersTabs = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
`;

export const TabItem = styled.div`
  cursor: pointer;
  padding: 10px 16px;
  border-radius: 20px;
  background-color: ${({ active }) => (active ? '#a166ff' : '#f5f5f5')};
  color: ${({ active }) => (active ? '#fff' : '#000')};
  font-weight: 500;
  transition: background-color 0.3s, color 0.3s;

  &:hover {
    background-color: #c9a8ffff;
    
  }
`;


export const OrdersSummary = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
  flex-wrap: wrap;
`;

export const SummaryBox = styled.div`
  background-color: #f0f0f0;
  padding: 15px 20px;
  border-radius: 10px;
  min-width: 180px;
  text-align: center;
  margin-bottom: 10px;
`;

export const SummaryValue = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: #222;
`;

export const SummaryLabel = styled.div`
  color: #666;
`;

export const OrdersTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const TableHead = styled.thead`
  background-color: #f9f9f9;
`;

export const TableRow = styled.tr``;

export const TableHeader = styled.th`
  padding: 12px 15px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #ddd;
`;

export const TableData = styled.td`
  padding: 12px 15px;
  border-bottom: 1px solid #ddd;
`;

export const StatusButton = styled.button`
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
  border: none;
  cursor: pointer;
  background-color: #a166ff;
  color: white;

  &:hover {
    background-color: #b384ffff;
  }
`;
