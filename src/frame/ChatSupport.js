import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { FaPaperPlane } from "react-icons/fa";
import styled from "styled-components";
import { auth } from "../firebase";

const COLORS = {
  primary: "#a166ff",
  secondary: "#bb93fcff",
  bgLight: "#ebdfff",
  textDark: "#2e2e3f",
  textLight: "#fff",
  hoverBg: "#c8befaff",
  sentMsgBg: "#a166ff",
  receivedMsgBg: "#e1dbff",
  highlightBg: "#f5e6ff",
};

const Container = styled.div`
  display: flex;
  height: 100vh;
  max-height: 900px;
  background: ${COLORS.bgLight};
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(161, 102, 255, 0.3);
  overflow: hidden;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
`;

const ChatList = styled.div`
  width: 500px;
  background: #c9b8ff44;
  color: #3b2a6b;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  overflow-x: hidden;
`;

const ChatListHeaderContainer = styled.div`
  padding: 10px 10px;
  border-bottom: 1px solid #beaaff78;
  background: #c9b8ffff;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const ChatListHeader = styled.div`
  font-weight: 650;
  font-size: 1.5rem;
  color: #3b2a6b;
  background: #c9b8ff44;
`;

const ChatListItem = styled.div`
  background: ${({ selected, highlight }) =>
    selected
      ? COLORS.secondary
      : highlight
      ? COLORS.highlightBg
      : "transparent"};
  padding: 8px 12px;
  border-radius: 5px;
  border: 1px solid
    ${({ selected }) => (selected ? COLORS.primary : "#c9b8ff88")};/
  cursor: pointer;
  font-weight: 400;
  font-size: 1.15rem;
  box-shadow: ${({ selected }) => (selected ? "0 0 10px #dac4fdcc" : "none")};
  transition: background-color 0.3s ease, border-color 0.3s ease;
  position: relative;

  &:hover {
    background: ${COLORS.hoverBg};
    box-shadow: 0 0 10px #8e71f7aa;
    border-color: ${COLORS.primary}; 
  }
`;

const Username = styled.div`
  font-weight: 600;
  font-size: 1.2rem;
  color: #3b2a6b;
`;

const MessageSnippet = styled.div`
  font-size: 0.85rem;
  font-weight: 350;
  color: #3b2a6b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
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
  align-items: ${({ isSender }) => (isSender ? "flex-end" : "flex-start")};
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
    isSender ? "0 4px 10px #9d73ffcc" : "0 4px 10px #d3cbffcc"};
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
  align-self: ${({ isSender }) => (isSender ? "flex-end" : "flex-start")};
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
    content: "";
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

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${({ bgColor }) => bgColor || "#ccc"};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  text-transform: uppercase;
  flex-shrink: 0;
`;

const RedDot = styled.span`
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 10px;
`;

function groupMessagesByUser(messages) {
  const grouped = {};
  messages.forEach((msg) => {
    if (!grouped[msg.userId]) {
      grouped[msg.userId] = {
        userId: msg.userId,
        username: msg.username || "Unknown",
        messages: [],
      };
    }
    grouped[msg.userId].messages.push(msg);
  });
  return Object.values(grouped);
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return { date: "", time: "", shortDate: "" };
  const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const longDate = dateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
  const shortDate = dateObj.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
  const time = dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date: longDate, shortDate, time };
};

const ChatSupport = () => {
  const db = getFirestore();
  const adminId = auth.currentUser?.uid || "admin";

  const [allMessages, setAllMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [lastReadTimestamps, setLastReadTimestamps] = useState({});
  const [highlighted, setHighlighted] = useState({});
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, "chatMessages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() }));
      setAllMessages(msgs);
    });
    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    const grouped = groupMessagesByUser(allMessages);
    setConversations(grouped);
    if (!selectedConvId && grouped.length > 0) {
      setSelectedConvId(grouped[0].userId);
      setLastReadTimestamps((prev) => ({
        ...prev,
        [grouped[0].userId]:
          grouped[0].messages.slice(-1)[0]?.timestamp?.toMillis() || 0,
      }));
    }
  }, [allMessages, selectedConvId]);

  const selectedConversation = conversations.find(
    (c) => c.userId === selectedConvId
  );

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [selectedConversation, allMessages]);

  const messageId = `MID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvId) return;
    await addDoc(collection(db, "chatMessages"), {
      messageId: messageId,
      userId: selectedConvId,
      username: selectedConversation.username,
      text: newMessage.trim(),
      sender: "admin",
      timestamp: serverTimestamp(),
    });
    setNewMessage("");
    setLastReadTimestamps((prev) => ({
      ...prev,
      [selectedConvId]: Date.now(),
    }));
  };

  const hasNewMessage = (conv) => {
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (!lastMsg) return false;
    return lastMsg.sender !== "admin" && lastMsg.read === false;
  };

  const handleSelectConv = async (userId) => {
    setSelectedConvId(userId);

    const conv = conversations.find((c) => c.userId === userId);

    if (conv) {
      const unreadUserMessages = conv.messages.filter(
        (msg) => msg.sender !== "admin" && msg.read !== true
      );

      for (const msg of unreadUserMessages) {
        const msgRef = doc(db, "chatMessages", msg.id);
        await updateDoc(msgRef, { read: true });
      }
    }

    const lastMsg = conv?.messages[conv.messages.length - 1];
    if (lastMsg) {
      const ts = lastMsg.timestamp?.toMillis
        ? lastMsg.timestamp.toMillis()
        : lastMsg.timestamp;

      setLastReadTimestamps((prev) => ({
        ...prev,
        [userId]: ts,
      }));

      setHighlighted((prev) => ({ ...prev, [userId]: true }));
      setTimeout(
        () => setHighlighted((prev) => ({ ...prev, [userId]: false })),
        1200
      );
    }
  };

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
          <MessageWrapper isSender={msg.sender === "admin"}>
            <MessageBubble isSender={msg.sender === "admin"}>
              {msg.text}
            </MessageBubble>
            <HoverTimestamp
              className="hover-time"
              isSender={msg.sender === "admin"}
            >
              {shortDate} - {time}
            </HoverTimestamp>
          </MessageWrapper>
        </React.Fragment>
      );
    });
  };

  const getRandomColor = (username) => {
    const colors = [
      "#f44336",
      "#e91e63",
      "#9c27b0",
      "#673ab7",
      "#3f51b5",
      "#2196f3",
      "#03a9f4",
      "#009688",
      "#4caf50",
      "#ff9800",
      "#ff5722",
      "#795548",
    ];
    let index = 0;
    if (username) {
      index = username.charCodeAt(0) % colors.length;
    }
    return colors[index];
  };

  return (
    <Container>
      <ChatList>
        <ChatListHeaderContainer>
          <ChatListHeader>Recent Messages</ChatListHeader>
        </ChatListHeaderContainer>

        {[...conversations]
          .sort((a, b) => {
            const lastA = a.messages[a.messages.length - 1];
            const lastB = b.messages[b.messages.length - 1];
            const timeA = lastA?.timestamp?.toMillis
              ? lastA.timestamp.toMillis()
              : new Date(lastA?.timestamp || 0).getTime();
            const timeB = lastB?.timestamp?.toMillis
              ? lastB.timestamp.toMillis()
              : new Date(lastB?.timestamp || 0).getTime();
            return timeB - timeA;
          })
          .map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const { shortDate, time } = formatTimestamp(lastMsg?.timestamp);
            const isUnread = hasNewMessage(conv);
            const lastMsgText =
              lastMsg?.sender === "admin"
                ? `You: ${lastMsg?.text}`
                : lastMsg?.text;

            const dateObj = lastMsg?.timestamp?.toDate
              ? lastMsg.timestamp.toDate()
              : new Date(lastMsg?.timestamp || 0);
            const monthDay = dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            return (
              <ChatListItem
                key={conv.userId}
                selected={conv.userId === selectedConvId}
                highlight={false}
                onClick={() => handleSelectConv(conv.userId)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "6px 0",
                    overflow: "hidden",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "50px",
                      height: "50px",
                      flexShrink: 0,
                    }}
                  >
                    <Avatar
                      bgColor={getRandomColor(conv.username)}
                      style={{
                        width: "50px",
                        height: "50px",
                        fontSize: "1.3rem",
                      }}
                    >
                      {conv.username?.charAt(0)}
                    </Avatar>

                    {isUnread && (
                      <RedDot
                        style={{
                          position: "absolute",
                          top: "4px",
                          left: "8px",
                          width: "14px",
                          height: "14px",
                          margin: 0,
                          transform: "translate(-50%, -30%)",
                          zIndex: 20,
                        }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Username
                      style={{
                        fontWeight: isUnread ? "700" : "600",
                        fontSize: "1.2rem",
                      }}
                    >
                      {conv.username}
                    </Username>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "2px",
                        overflow: "hidden",
                        gap: "8px",
                      }}
                    >
                      <MessageSnippet
                        style={{
                          fontWeight: isUnread ? "600" : "400",
                          fontSize: "1rem",
                          flex: 1,
                          color: "grey",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          minWidth: 0,
                        }}
                      >
                        {lastMsgText}
                      </MessageSnippet>

                      <MessageTime
                        style={{
                          whiteSpace: "nowrap",
                          fontSize: "0.85rem",
                          color: "grey",
                          flexShrink: 0,
                        }}
                      >
                        {time && monthDay ? `${time} • ${monthDay}` : ""}
                      </MessageTime>
                    </div>
                  </div>
                </div>
              </ChatListItem>
            );
          })}
      </ChatList>

      <ChatWindow>
        <ChatHeader>
          {selectedConversation?.username || "Select a conversation"}
        </ChatHeader>
        <MessagesContainer ref={chatContainerRef}>
          {renderMessages()}
        </MessagesContainer>
        <InputContainer onSubmit={handleSend}>
          <TextInput
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
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
