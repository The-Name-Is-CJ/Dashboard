import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase'; 

const COLORS = {
  primary: '#a166ff',
  secondary: '#8951e3ff',
  bgLight: '#ebdfff',
  textDark: '#2e2e3f',
  textLight: '#fff',
  hoverBg: '#c3b7ff',
  sentMsgBg: '#a166ff',
  receivedMsgBg: '#e1dbff',
};

const Container = styled.div`
  display: flex;
  height: 80vh;
  max-height: 700px;
  background: ${COLORS.bgLight};
  border-radius: 20px;
  box-shadow: 0 8px 20px rgba(161, 102, 255, 0.3);
  overflow: hidden;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const ChatList = styled.div`
  width: 320px;
  background: ${COLORS.primary};
  color: ${COLORS.textLight};
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 12px;
  overflow-y: auto;
`;

const ChatListItem = styled.div`
  background: ${({ selected }) => (selected ? COLORS.secondary : 'transparent')};
  padding: 12px 16px;
  border-radius: 15px;
  cursor: pointer;
  font-weight: 600;
  box-shadow: ${({ selected }) => (selected ? '0 0 10px #a166ffcc' : 'none')};
  transition: background-color 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: ${COLORS.hoverBg};
    box-shadow: 0 0 10px #b39effaa;
  }
`;

const ChatWindow = styled.div`
  flex: 1;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-radius: 0 20px 20px 0;
  box-shadow: inset 0 0 10px #c9b8ff55;
`;

const ChatHeader = styled.div`
  padding: 1rem 1.5rem;
  background: ${COLORS.secondary};
  color: ${COLORS.textLight};
  font-weight: 700;
  font-size: 1.2rem;
  border-radius: 0 20px 0 0;
  box-shadow: 0 4px 8px #b497ff66;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f7f5ff;
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 10px 16px;
  border-radius: 20px;
  background: ${({ isSender }) =>
    isSender ? COLORS.sentMsgBg : COLORS.receivedMsgBg};
  color: ${({ isSender }) => (isSender ? COLORS.textLight : COLORS.textDark)};
  align-self: ${({ isSender }) => (isSender ? 'flex-end' : 'flex-start')};
  box-shadow: ${({ isSender }) =>
    isSender ? '0 4px 10px #8c59ffcc' : '0 4px 10px #d3cbffcc'};
  font-size: 0.95rem;
  line-height: 1.3;
`;

const InputContainer = styled.form`
  padding: 1rem 1.5rem;
  background: #fff;
  border-top: 1px solid #ddd;
  display: flex;
  gap: 10px;
  border-radius: 0 0 20px 20px;
`;

const TextInput = styled.input`
  flex: 1;
  padding: 0.7rem 1rem;
  border-radius: 20px;
  border: 2px solid ${COLORS.secondary};
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s ease;

  &:focus {
    border-color: ${COLORS.primary};
  }
`;

const SendButton = styled.button`
  background: ${COLORS.primary};
  color: ${COLORS.textLight};
  border: none;
  padding: 0 16px;
  border-radius: 20px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: ${COLORS.secondary};
  }
`;

function groupMessagesByUser(messages) {
  // Group messages by userId
  const grouped = {};
  messages.forEach(msg => {
    if (!grouped[msg.userId]) {
      grouped[msg.userId] = {
        userId: msg.userId,
        username: msg.username || 'Unknown',
        messages: [],
      };
    }
    grouped[msg.userId].messages.push(msg);
  });
  return Object.values(grouped);
}

const ChatSupport = () => {
  const db = getFirestore();
  const adminId = auth.currentUser?.uid || 'admin'; // your admin user id

  const [allMessages, setAllMessages] = useState([]); // all chatMessages from firestore
  const [conversations, setConversations] = useState([]); // grouped by userId
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Subscribe to chatMessages ordered by timestamp ascending
    const q = query(collection(db, 'chatMessages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const msgs = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setAllMessages(msgs);
    });

    return () => unsubscribe();
  }, [db]);

  // Group messages into conversations when allMessages update
  useEffect(() => {
    const grouped = groupMessagesByUser(allMessages);
    setConversations(grouped);
    // If no selected conversation, select first
    if (!selectedConvId && grouped.length > 0) {
      setSelectedConvId(grouped[0].userId);
    }
  }, [allMessages, selectedConvId]);

  const selectedConversation = conversations.find(c => c.userId === selectedConvId);

  const handleSend = async e => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvId) return;

    try {
      await addDoc(collection(db, 'chatMessages'), {
        userId: selectedConvId,
        username: selectedConversation.username,
        text: newMessage.trim(),
        sender: 'admin',
        timestamp: serverTimestamp(),
      });

      setNewMessage('');
    } catch (error) {
      alert('Failed to send message: ' + error.message);
    }
  };

  return (
    <Container>
      <ChatList>
        {conversations.map(conv => (
          <ChatListItem
            key={conv.userId}
            selected={conv.userId === selectedConvId}
            onClick={() => setSelectedConvId(conv.userId)}
            title={conv.username}
          >
            {conv.username}
          </ChatListItem>
        ))}
      </ChatList>

      <ChatWindow>
        <ChatHeader>{selectedConversation?.username || 'Select a conversation'}</ChatHeader>
        <MessagesContainer>
          {selectedConversation?.messages.map(msg => (
            <MessageBubble key={msg.id} isSender={msg.sender === 'admin'}>
              {msg.text}
            </MessageBubble>
          ))}
        </MessagesContainer>
        <InputContainer onSubmit={handleSend}>
          <TextInput
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
          />
          <SendButton type="submit">Send</SendButton>
        </InputContainer>
      </ChatWindow>
    </Container>
  );
};

export default ChatSupport;
