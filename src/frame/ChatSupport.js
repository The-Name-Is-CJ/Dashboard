import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth } from '../firebase';
import { FaPaperPlane } from 'react-icons/fa';

const COLORS = {
  primary: '#a166ff',
  secondary: '#bb93fcff',
  bgLight: '#ebdfff',
  textDark: '#2e2e3f',
  textLight: '#fff',
  hoverBg: '#c8befaff',
  sentMsgBg: '#a166ff',
  receivedMsgBg: '#e1dbff',
  highlightBg: '#f5e6ff',
};

const Container = styled.div`
  display: flex;
  height: 100vh;
  max-height: 790px;
  background: ${COLORS.bgLight};
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(161, 102, 255, 0.3);
  overflow: hidden;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const ChatList = styled.div`
  width: 300px;
  background: #c9b8ff44;
  color: #3b2a6b;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 10px;
  overflow-y: auto;
`;

const ChatListHeaderContainer = styled.div`
  padding: 10px 10px;
  border-bottom: 1px solid #beaaff78;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const ChatListHeader = styled.div`
  font-weight: 650;
  font-size: 1.3rem;
  color: #3b2a6b;
`;

const ChatListItem = styled.div`
  background: ${({ selected, highlight }) =>
    selected ? COLORS.secondary : highlight ? COLORS.highlightBg : 'transparent'};
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 200;
  font-size: 18px;
  box-shadow: ${({ selected }) => (selected ? '0 0 10px #dac4fdcc' : 'none')};
  transition: background-color 1.2s ease;
  position: relative;

  &:hover {
    background: ${COLORS.hoverBg};
    box-shadow: 0 0 10px #8e71f7aa;
  }
`;

const Username = styled.div`
  font-weight: 500;
  color: #3b2a6b;
`;

const MessageSnippetRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MessageSnippet = styled.div`
  font-size: 0.85rem;
  font-weight: 350;
  color: #3b2a6b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const MessageTime = styled.div`
  font-size: 0.75rem;
  color: #5a4d8f;
  margin-left: 8px;
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
  padding: 20px 25px;
  background: ${COLORS.primary};
  color: ${COLORS.textLight};
  font-weight: 400;
  font-size: 1.3rem;
  border-radius: 0 10px 0 0;
  box-shadow: 0 4px 8px #b497ff66;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 25px 30px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f7f5ff;
`;

const MessageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${({ isSender }) => (isSender ? 'flex-end' : 'flex-start')};
  position: relative;
  margin-bottom: 8px;

  &:hover span.hover-time {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;

const MessageBubble = styled.div`
  max-width: 70%;
  padding: 10px 16px;
  border-radius: 10px;
  background: ${({ isSender }) =>
    isSender ? COLORS.sentMsgBg : COLORS.receivedMsgBg};
  color: ${({ isSender }) => (isSender ? COLORS.textLight : COLORS.textDark)};
  box-shadow: ${({ isSender }) =>
    isSender ? '0 4px 10px #9d73ffcc' : '0 4px 10px #d3cbffcc'};
  font-size: 0.95rem;
  line-height: 1.3;
  position: relative;
`;

const HoverTimestamp = styled.span`
  font-size: 0.7rem;
  color: #777;
  margin-top: 3px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-3px);
  transition: all 0.3s ease;
  align-self: ${({ isSender }) => (isSender ? 'flex-end' : 'flex-start')};
`;

const DateDivider = styled.div`
  text-align: center;
  font-size: 0.8rem;
  color: #555;
  margin: 15px 0;
  position: relative;
  font-weight: 500;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background: #ccc;
  }

  &::before {
    left: 0;
  }

  &::after {
    right: 0;
  }
`;

const InputContainer = styled.form`
  padding: 1rem 1.5rem;
  background: #fff;
  border-top: 1px solid #ddd;
  display: flex;
  gap: 10px;
  border-radius: 0 0 10px 10px;
`;

const TextInput = styled.input`
  flex: 1;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  border: 2px solid ${COLORS.secondary};
  font-size: 0.9rem;
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
  padding: 0 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.3s ease;

  &:hover {
    background: ${COLORS.secondary};
  }

  svg {
    color: #fff;
  }
`;

function groupMessagesByUser(messages) {
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

const formatTimestamp = timestamp => {
  if (!timestamp) return { date: '', time: '', shortDate: '' };
  const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const longDate = dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });
  const shortDate = dateObj.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  });
  const time = dateObj.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date: longDate, shortDate, time };
};

const ChatSupport = () => {
  const db = getFirestore();
  const adminId = auth.currentUser?.uid || 'admin';

  const [allMessages, setAllMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [lastReadTimestamps, setLastReadTimestamps] = useState({});
  const [highlighted, setHighlighted] = useState({});
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'chatMessages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const msgs = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      setAllMessages(msgs);
    });
    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    const grouped = groupMessagesByUser(allMessages);
    setConversations(grouped);
    if (!selectedConvId && grouped.length > 0) {
      setSelectedConvId(grouped[0].userId);
      setLastReadTimestamps(prev => ({
        ...prev,
        [grouped[0].userId]:
          grouped[0].messages.slice(-1)[0]?.timestamp?.toMillis() || 0,
      }));
    }
  }, [allMessages, selectedConvId]);

  const selectedConversation = conversations.find(c => c.userId === selectedConvId);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [selectedConversation, allMessages]);

  const handleSend = async e => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvId) return;
    await addDoc(collection(db, 'chatMessages'), {
      userId: selectedConvId,
      username: selectedConversation.username,
      text: newMessage.trim(),
      sender: 'admin',
      timestamp: serverTimestamp(),
    });
    setNewMessage('');
    setLastReadTimestamps(prev => ({
      ...prev,
      [selectedConvId]: Date.now(),
    }));
  };

  const formatLastMessage = conv => {
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (!lastMsg) return '';
    return lastMsg.sender === 'admin' ? `You: ${lastMsg.text}` : lastMsg.text;
  };

  const lastMessageTime = conv => {
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (!lastMsg) return '';
    const { time } = formatTimestamp(lastMsg.timestamp);
    return time;
  };

  const hasNewMessage = conv => {
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (!lastMsg) return false;
    const lastRead = lastReadTimestamps[conv.userId] || 0;
    const lastMsgTime = lastMsg.timestamp?.toMillis
      ? lastMsg.timestamp.toMillis()
      : lastMsg.timestamp;
    return lastMsg.sender !== 'admin' && lastMsgTime > lastRead;
  };

  const handleSelectConv = userId => {
    setSelectedConvId(userId);
    const conv = conversations.find(c => c.userId === userId);
    const lastMsg = conv?.messages[conv.messages.length - 1];
    if (lastMsg) {
      const ts = lastMsg.timestamp?.toMillis
        ? lastMsg.timestamp.toMillis()
        : lastMsg.timestamp;
      setLastReadTimestamps(prev => ({
        ...prev,
        [userId]: ts,
      }));
      setHighlighted(prev => ({ ...prev, [userId]: true }));
      setTimeout(() => setHighlighted(prev => ({ ...prev, [userId]: false })), 1200);
    }
  };

  // ✅ FIXED: Proper chronological message order
  const renderMessages = () => {
    if (!selectedConversation) return null;

    const msgs = [...selectedConversation.messages].sort((a, b) => {
      const tA = a.timestamp?.toMillis
        ? a.timestamp.toMillis()
        : new Date(a.timestamp).getTime();
      const tB = b.timestamp?.toMillis
        ? b.timestamp.toMillis()
        : new Date(b.timestamp).getTime();
      return tA - tB;
    });

    let lastShownTime = 0;

    return msgs.map((msg, idx) => {
      const { date, shortDate, time } = formatTimestamp(msg.timestamp);
      const currentTime = msg.timestamp?.toMillis
        ? msg.timestamp.toMillis()
        : new Date(msg.timestamp).getTime();

      const showDate = idx === 0 || currentTime - lastShownTime > 3600000;
      lastShownTime = currentTime;

      return (
        <React.Fragment key={msg.id}>
          {showDate && <DateDivider>{date}</DateDivider>}
          <MessageWrapper isSender={msg.sender === 'admin'}>
            <MessageBubble isSender={msg.sender === 'admin'}>
              {msg.text}
            </MessageBubble>
            <HoverTimestamp className="hover-time" isSender={msg.sender === 'admin'}>
              {shortDate} - {time}
            </HoverTimestamp>
          </MessageWrapper>
        </React.Fragment>
      );
    });
  };

  return (
    <Container>
<ChatList>
  <ChatListHeaderContainer>
    <ChatListHeader>Recent Messages</ChatListHeader>
  </ChatListHeaderContainer>

  {([...conversations]
    .sort((a, b) => {
      const lastA = a.messages[a.messages.length - 1];
      const lastB = b.messages[b.messages.length - 1];
      const timeA = lastA?.timestamp?.toMillis
        ? lastA.timestamp.toMillis()
        : new Date(lastA?.timestamp || 0).getTime();
      const timeB = lastB?.timestamp?.toMillis
        ? lastB.timestamp.toMillis()
        : new Date(lastB?.timestamp || 0).getTime();
      return timeB - timeA; // 🕓 most recent first
    })
    .map(conv => {
      const lastMsg = conv.messages[conv.messages.length - 1];
      const { shortDate, time } = formatTimestamp(lastMsg?.timestamp);
      const isUnread = hasNewMessage(conv);
      const lastMsgText =
        lastMsg?.sender === 'admin' ? `You: ${lastMsg?.text}` : lastMsg?.text;

      const truncateName = name => {
        if (!name) return '';
        return name.length > 12 ? name.slice(0, 11) + '.....' : name;
      };

      // 🧠 Format "Nov 2" from shortDate
      const dateObj = lastMsg?.timestamp?.toDate
        ? lastMsg.timestamp.toDate()
        : new Date(lastMsg?.timestamp || 0);
      const monthDay = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      return (
        <ChatListItem
          key={conv.userId}
          selected={conv.userId === selectedConvId}
          highlight={false}
          onClick={() => handleSelectConv(conv.userId)}
        >
          <Username style={{ fontWeight: isUnread ? '700' : '500' }}>
            {truncateName(conv.username)}
          </Username>

          <MessageSnippetRow>
            <MessageSnippet style={{ fontWeight: isUnread ? '600' : '350' }}>
              {lastMsgText}
            </MessageSnippet>

            {/* 🕓 Time + Date format like [12:05 PM] [Nov 2] */}
            <MessageTime>
              {time && monthDay ? `${time} • ${monthDay}` : ''}
            </MessageTime>
          </MessageSnippetRow>
        </ChatListItem>
      );
    }))}
</ChatList>

      <ChatWindow>
        <ChatHeader>
          {selectedConversation?.username || 'Select a conversation'}
        </ChatHeader>
        <MessagesContainer ref={chatContainerRef}>{renderMessages()}</MessagesContainer>
        <InputContainer onSubmit={handleSend}>
          <TextInput
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
          />
          <SendButton type="submit">
            Send <FaPaperPlane />
          </SendButton>
        </InputContainer>
      </ChatWindow>
    </Container>
  );
};

export default ChatSupport;
