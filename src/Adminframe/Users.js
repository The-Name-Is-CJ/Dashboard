import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const Colors = {
  primary: "#fff",
  secondary: "#6f42c1",
  accent: "#9b7bff",
  white: "#fff",
  gray: "#777",
  red: "#FF6B6B",
  green: "#4CAF70",
};

// Styled Components
const Container = styled.div`
  padding: 30px;
  font-family: "Poppins", sans-serif;
  background-color: ${Colors.primary};
  min-height: 100vh;
  color: ${Colors.secondary};
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  margin-bottom: 20px;
  color: ${Colors.gray};
`;

const Nav = styled.div`
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CounterText = styled.span`
  font-size: 1.1rem;
  color: Black;
  font-weight: 500;
  padding-right: 20px; /* adjust value as needed */
`;

const NavButton = styled.button`
  margin-right: 10px;
  padding: 12px 24px; /* bigger height & width */
  border: none;
  border-radius: 30px;
  cursor: pointer;
  background: ${(props) =>
    props.active
      ? `linear-gradient(90deg, ${Colors.secondary}, ${Colors.accent})`
      : Colors.secondary};
  color: ${Colors.white};
  font-weight: 600;
  font-size: 1.2rem; /* increase font size */
  transition: all 0.2s ease;

  /* Pressed/Clicked effect */
  ${(props) =>
    props.active &&
    `
    transform: translateY(2px);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
  `}

  &:hover {
    background: ${(props) =>
      props.active
        ? `linear-gradient(90deg, ${Colors.secondary}, ${Colors.accent})`
        : `linear-gradient(90deg, ${Colors.secondary}, ${Colors.accent})`};
    transform: ${(props) =>
      props.active ? "translateY(2px)" : "translateY(-2px)"};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  table-layout: fixed; /* <-- Add this */
  word-wrap: break-word; /* optional, wrap long text */
`;

const Th = styled.th`
  text-align: center;
  padding: 12px;
  background-color: ${Colors.accent};
  color: ${Colors.white};

  &:nth-child(1) {
    width: 120px;
  }
  &:nth-child(2) {
    width: 180px;
  }
  &:nth-child(3) {
    width: 180px;
  }
  &:nth-child(4) {
    width: 250px;
  }
  &:nth-child(5) {
    width: 120px;
  }
  &:nth-child(6) {
    width: 180px;
  }

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 12px;
  background-color: ${Colors.white};
  color: ${Colors.secondary};
  border-bottom: 1px solid ${Colors.gray};

  &:nth-child(1) {
    width: 120px;
  }
  &:nth-child(2) {
    width: 180px;
  }
  &:nth-child(3) {
    width: 180px;
  }
  &:nth-child(4) {
    width: 250px;
  }
  &:nth-child(5) {
    width: 120px;
  }
  &:nth-child(6) {
    width: 180px;
  }

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusBadge = styled.span`
  display: inline-block;
  width: 80px; /* constant width */
  text-align: center; /* center the text */
  padding: 4px 0; /* vertical padding only */
  border-radius: 20px;
  background-color: ${(props) =>
    props.status === "Active" ? Colors.green : Colors.red};
  color: #fff;
  font-weight: 500;
  font-size: 0.85rem;
`;

const ActionButton = styled.button`
  padding: 6px 12px;
  margin-right: 6px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: #fff;
  transition: all 0.2s ease;

  width: 80px; /* fixed width so Block/Unblock are same size */
  text-align: center; /* center text inside the button */

  background-color: ${(props) =>
    props.type === "block"
      ? Colors.red
      : props.type === "unblock"
      ? Colors.green
      : Colors.gray};

  &:hover {
    opacity: 0.85;
  }
`;
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${Colors.white};
  padding: 30px;
  border-radius: 12px;
  width: 400px;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const ModalTitle = styled.h2`
  margin-bottom: 20px;
  color: ${Colors.secondary};
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
`;

const ConfirmButton = styled.button`
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background-color: ${Colors.green};
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    opacity: 0.85;
  }
`;

const CancelButton = styled.button`
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background-color: ${Colors.red};
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    opacity: 0.85;
  }
`;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null); // "block" or "remove"
  const [selectedUser, setSelectedUser] = useState(null);
  const [blockStatusPending, setBlockStatusPending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersList = usersSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            docId: doc.id, // Firestore doc ID (hidden, for updates/deletes)
            id: data.userId || doc.id, // userId shown in table
            name: data.name?.trim() || "N/A",
            username: data.username?.trim() || "N/A",
            email: data.email?.trim() || "N/A",
            status: data.status || "Active",
            blockStatus: data.blockStatus || false,
          };
        });

        usersList.sort((a, b) => {
          const numA = parseInt(a.id.replace(/^U0*/, ""), 10);
          const numB = parseInt(b.id.replace(/^U0*/, ""), 10);
          return numA - numB;
        });

        setUsers(usersList);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    if (filter === "All") return true;
    if (filter === "Active") return user.status === "Active";
    if (filter === "Inactive") return user.status === "Inactive";
    if (filter === "Blocked") return user.blockStatus === true;
  });
  const handleBlockToggle = async (userId, block) => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const userDoc = usersSnapshot.docs.find(
        (doc) => doc.data().userId === userId
      );
      if (!userDoc) return;

      const userRef = doc(db, "users", userDoc.id);
      await updateDoc(userRef, { blockStatus: block });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, blockStatus: block } : u))
      );

      // Log the admin action
      const actionDescription = block
        ? `User ${userId} is blocked`
        : `User ${userId} is unblocked`;

      await logAdminAction({ actionDescription, userIdAffected: userId });
    } catch (err) {
      console.error("Error updating block status:", err);
    }
  };

  const handleRemove = async (userId) => {
    try {
      // 1. Get user main doc
      const usersSnapshot = await getDocs(collection(db, "users"));
      const userDoc = usersSnapshot.docs.find(
        (doc) => doc.data().userId === userId
      );
      if (!userDoc) return;
      const userData = userDoc.data();

      // 2. Prepare archive object
      const archiveData = {
        userId,
        users: userData,
        archivedAt: serverTimestamp(),
      };

      // 3. List of collections to archive
      const collectionsToArchive = [
        "shippingLocations",
        "adminArchive",
        "chatMessages",
        "completed",
        "measurements",
        "notifications",
        "orders",
        "return_refund",
        "toReceive",
        "toShip",
      ];

      for (const col of collectionsToArchive) {
        const q = query(collection(db, col), where("userId", "==", userId));
        const colSnapshot = await getDocs(q);
        archiveData[col] = colSnapshot.docs.map((d) => d.data());
      }

      await addDoc(collection(db, "usersArchive"), archiveData);

      const userRef = doc(db, "users", userDoc.id);
      await deleteDoc(userRef);

      setUsers((prev) => prev.filter((u) => u.id !== userId));

      console.log(`User ${userId} archived successfully.`);
    } catch (err) {
      console.error("Error archiving user:", err);
    }
  };
  const logAdminAction = async ({ actionDescription, userIdAffected }) => {
    try {
      // Get current admin info (assuming you have admins collection and user is logged in)
      const adminSnapshot = await getDocs(collection(db, "admins"));

      // Assuming you can find the current admin by email/auth
      // For simplicity, we’ll take the first one (replace with your auth logic)
      const currentAdminDoc = adminSnapshot.docs[0];
      if (!currentAdminDoc) return;

      const adminData = currentAdminDoc.data();
      const adminEmail = adminData.email || "unknown";
      const adminRole = adminData.role || "Admin";

      // Generate unique log ID (like LOG-1764314491546-610)
      const logId =
        "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

      const logEntry = {
        logID: logId,
        action: actionDescription,
        userId: userIdAffected,
        userEmail: adminEmail,
        role: adminRole,
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(db, "recentActivityLogs"), logEntry);
      console.log("Admin action logged:", logEntry);
    } catch (err) {
      console.error("Error logging admin action:", err);
    }
  };

  if (loading) return <p style={{ padding: "20px" }}>Loading users...</p>;

  return (
    <Container>
      <Title>Users</Title>

      <Nav>
        <div>
          {["All", "Active", "Inactive", "Blocked"].map((status) => (
            <NavButton
              key={status}
              active={filter === status}
              onClick={() => setFilter(status)}
            >
              {status}
            </NavButton>
          ))}
        </div>

        <CounterText>
          {filter === "All" && `Number of All Users: ${filteredUsers.length}`}
          {filter === "Active" &&
            `Number of Active Users: ${filteredUsers.length}`}
          {filter === "Inactive" &&
            `Number of Inactive Users: ${filteredUsers.length}`}
          {filter === "Blocked" &&
            `Number of Blocked Users: ${filteredUsers.length}`}
        </CounterText>
      </Nav>

      {filteredUsers.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>User ID</Th>
              <Th>Name</Th>
              <Th>Username</Th>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <Td style={{ paddingLeft: "30px" }}>{user.id}</Td>
                <Td style={{ paddingLeft: "30px" }}>{user.name}</Td>
                <Td style={{ paddingLeft: "30px" }}>{user.username}</Td>
                <Td style={{ paddingLeft: "30px" }}>{user.email}</Td>

                <Td>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <StatusBadge status={user.status}>
                      {user.status}
                    </StatusBadge>
                  </div>
                </Td>
                <Td>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <ActionButton
                      type={user.blockStatus ? "unblock" : "block"}
                      onClick={() => {
                        setSelectedUser(user);
                        setBlockStatusPending(!user.blockStatus);
                        setModalAction("block");
                        setModalOpen(true);
                      }}
                    >
                      {user.blockStatus ? "Unblock" : "Block"}
                    </ActionButton>

                    <ActionButton
                      type="remove"
                      onClick={() => {
                        setSelectedUser(user);
                        setModalAction("remove");
                        setModalOpen(true);
                      }}
                    >
                      Remove
                    </ActionButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {modalOpen && (
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>
              {modalAction === "block"
                ? `Are you sure you want to ${
                    blockStatusPending ? "Block" : "Unblock"
                  } this user?`
                : "Are you sure you want to remove this user?"}
            </ModalTitle>

            <ModalButtons>
              <ConfirmButton
                onClick={async () => {
                  if (saving) return;
                  setSaving(true);
                  if (modalAction === "block") {
                    await handleBlockToggle(
                      selectedUser.id,
                      blockStatusPending
                    );
                  } else if (modalAction === "remove") {
                    await handleRemove(selectedUser.id);
                  }
                  setSaving(false);
                  setModalOpen(false);
                  setSelectedUser(null);
                }}
              >
                {saving ? "Saving..." : "Yes"}
              </ConfirmButton>

              <CancelButton
                onClick={() => {
                  setModalOpen(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </CancelButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default Users;
