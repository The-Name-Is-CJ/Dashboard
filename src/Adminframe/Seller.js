import React, { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  ModalOverlay,
  ModalContent,
  ModalTitle,
  Label,
  Input,
  SaveButton,
  CancelButton,
} from "../components/dashboardstyles";
import { FaUserCircle } from "react-icons/fa";

const SIZE_OPTIONS = ["S", "M", "L", "XL"];
const Colors = {
  secondary: "#fff",
  primary: "#6f42c1",
  accent: "#9b7bff",
  white: "#ffffffff",
  black: "#000000ff",
  gray: "#777",
};

const Seller = () => {
  const [activeTab, setActiveTab] = useState("Sellers");
  const [sellers, setSellers] = useState([]);
  const [requestProducts, setRequestProducts] = useState([]);
  const [editProduct, setEditProduct] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [successModal, setSuccessModal] = useState(false);

  const subCategoryMap = {
    Top: ["T-Shirt", "Longsleeves"],
    Bottom: ["Pants", "Shorts"],
  };

  const generateLogID = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `LOG-${timestamp}-${random}`;
  };

  // Fetch sellers (assume there is one doc in the seller collection)
  const fetchSellers = async () => {
    const snap = await getDocs(collection(db, "seller"));
    const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setSellers(list);
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  // Open Change Email/Name Modal
  const openChangeModal = (seller) => {
    setSelectedSeller(seller);
    setNewEmail(seller.email || "");
    setNewName(seller.name || "");
    setShowChangeModal(true);
  };

  const handleSaveChange = async () => {
    if (!selectedSeller) return;

    try {
      // 1️⃣ Update seller info
      const sellerRef = doc(db, "seller", selectedSeller.id);
      await updateDoc(sellerRef, { email: newEmail, name: newName });

      // 2️⃣ Create activity log BEFORE showing success modal
      let adminData = null;
      try {
        const adminSnap = await getDocs(collection(db, "admins"));
        if (!adminSnap.empty) {
          adminData = adminSnap.docs[0].data();
        }
      } catch (err) {
        console.error("Error fetching admin info:", err);
      }

      const role = adminData?.role || "Admin";
      const userEmail = adminData?.email || "Unknown admin";
      const logID = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await addDoc(collection(db, "recentActivityLogs"), {
        logID: logID,
        action: `Updated seller ${newEmail} information`,
        role: role,
        userEmail: userEmail,
        timestamp: serverTimestamp(),
      });

      setSuccessModal(true);
      fetchSellers();

      // 4️⃣ Close modal
      setShowChangeModal(false);
      setSelectedSeller(null);

      setTimeout(() => {
        setSuccessModal(false);
      }, 2000);
    } catch (error) {
      console.error("Error updating seller:", error);
      alert("Failed to update seller info.");
    }
  };

  // Open Remove Modal
  const openRemoveModal = (seller) => {
    setSelectedSeller(seller);
    setShowRemoveModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedSeller) return;

    try {
      // 1️⃣ Move seller data to sellerArchive
      const archiveRef = doc(db, "sellerArchive", selectedSeller.id);
      await setDoc(archiveRef, {
        ...selectedSeller,
        archivedAt: serverTimestamp(),
      });

      // 2️⃣ Delete seller from original collection
      await deleteDoc(doc(db, "seller", selectedSeller.id));

      // 3️⃣ Fetch updated sellers
      fetchSellers();

      // 4️⃣ Create activity log
      // Fetch admin info if needed
      let adminData = null;
      try {
        const adminSnap = await getDocs(collection(db, "admins"));
        if (!adminSnap.empty) {
          adminData = adminSnap.docs[0].data();
        }
      } catch (err) {
        console.error("Error fetching admin info:", err);
      }

      const role = adminData?.role || "Admin";
      const userEmail = adminData?.email || "Unknown admin";
      const logID = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await addDoc(collection(db, "recentActivityLogs"), {
        logID: logID,
        action: `Removed seller ${selectedSeller.email}`,
        role: role,
        userEmail: userEmail,
        timestamp: serverTimestamp(),
      });

      // 5️⃣ Close modal and reset state
      setShowRemoveModal(false);
      setSelectedSeller(null);
    } catch (error) {
      console.error("Error removing seller:", error);
      alert("Failed to remove seller.");
    }
  };

  useEffect(() => {
    const fetchRequestProducts = async () => {
      try {
        const snap = await getDocs(collection(db, "sellerRequest"));
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRequestProducts(list);
      } catch (err) {
        console.error("Error fetching request products:", err);
      }
    };

    fetchRequestProducts();
  }, []);

  const initializeFullStock = (stock) => {
    return {
      S: Number(stock.S) || 0,
      M: Number(stock.M) || 0,
      L: Number(stock.L) || 0,
      XL: Number(stock.XL) || 0,
    };
  };
  const formatDelivery = (value) => {
    return value ? value.toString().trim() : "";
  };

  const generateNextProductID = () => {
    if (requestProducts.length === 0) return "CP001";

    const ids = requestProducts
      .map((p) => p.productID)
      .filter(
        (id) =>
          typeof id === "string" &&
          id.startsWith("CP") &&
          /^\d{3}$/.test(id.slice(2))
      )
      .map((id) => parseInt(id.slice(2), 10));

    if (ids.length === 0) return "CP001";

    const nextNumber = Math.max(...ids) + 1;
    return "CP" + nextNumber.toString().padStart(3, "0");
  };

  const handleModalClick = (e) => {
    if (e.target.dataset.overlay === "true") {
      setAddProduct(false);
      setEditProduct(null);
      setDeleteConfirm({ show: false, id: null });
      setProductToDelete(null);
    }
  };

  const handleSaveEdit = async () => {
    try {
      // 1. Generate Product ID
      const newProductID = generateNextProductID();

      // 2. Firestore references
      const productRef = doc(db, "products", newProductID);
      const requestRef = doc(db, "sellerRequest", editProduct.id);

      // 3. Compute stock
      const updatedStock = initializeFullStock(editProduct.stock || {});
      const totalStock = Object.values(updatedStock).reduce(
        (sum, val) => sum + val,
        0
      );

      // 4. SAVE into products (complete data)
      await setDoc(productRef, {
        productID: newProductID,
        productName: editProduct.productName,
        price: Number(editProduct.price),
        delivery: formatDelivery(editProduct.delivery),
        description: editProduct.description || "",
        stock: updatedStock,
        totalStock,
        sizes: SIZE_OPTIONS,
        categoryMain: editProduct.categoryMain,
        categorySub: editProduct.categorySub,
        imageUrl: editProduct.imageUrl || "",
        arUrl: editProduct.arUrl || "",
        createdAt: serverTimestamp(),
        editedAt: serverTimestamp(),
      });

      // 5. Delete original seller request
      await deleteDoc(requestRef);

      let adminEmail = "Unknown admin";
      let adminRole = "Admin"; // fallback
      try {
        const adminSnap = await getDocs(collection(db, "admins"));
        if (!adminSnap.empty) {
          const adminDoc = adminSnap.docs[0].data();
          adminEmail = adminDoc.email || "Unknown admin";
          adminRole = adminDoc.role || "Admin"; // get role from the doc
        }
      } catch (err) {
        console.error("Error fetching admin info:", err);
      }

      // 7. Log the approval
      await addDoc(collection(db, "recentActivityLogs"), {
        logID: generateLogID(),
        userEmail: adminEmail,
        role: adminRole, // dynamic role
        action: `Approved and moved product "${editProduct.productName}"`,
        productID: newProductID,
        timestamp: serverTimestamp(),
      });

      const snap = await getDocs(collection(db, "sellerRequest"));
      setRequestProducts(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      // 9. Close modal
      setEditProduct(null);
      setOriginalData(null);
    } catch (error) {
      console.error("Error approving product:", error);
      alert("Failed to approve and move product.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        background: "linear-gradient(135deg, #a349f7ff, #b8b3d7ff)",
        color: Colors.white,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          marginBottom: "30px",
          textAlign: "center",
          fontWeight: "700",
          textShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        Seller Management
      </h1>

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "30px",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => setActiveTab("Sellers")}
          style={{
            padding: "14px 28px",
            fontSize: "1.1rem",
            cursor: "pointer",
            backgroundColor:
              activeTab === "Sellers" ? Colors.secondary : Colors.accent,
            color: activeTab === "Sellers" ? Colors.black : Colors.white,
            border: "none",
            borderRadius: "8px",
            fontWeight: "700",
            transition: "all 0.2s ease-in-out",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "Sellers") {
              e.currentTarget.style.backgroundColor = "#b892ff"; // hover background
              e.currentTarget.style.color = Colors.black; // hover text
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "Sellers") {
              e.currentTarget.style.backgroundColor = Colors.accent; // original background
              e.currentTarget.style.color = Colors.white; // original text
            }
          }}
        >
          Sellers
        </button>

        <button
          onClick={() => setActiveTab("Requests")}
          style={{
            padding: "14px 28px",
            fontSize: "1.1rem",
            cursor: "pointer",
            backgroundColor:
              activeTab === "Requests" ? Colors.secondary : Colors.accent,
            color: activeTab === "Requests" ? Colors.black : Colors.white,
            border: "none",
            borderRadius: "8px",
            fontWeight: "700",
            transition: "all 0.2s ease-in-out",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "Requests") {
              e.currentTarget.style.backgroundColor = "#b892ff"; // hover background
              e.currentTarget.style.color = Colors.black; // hover text
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "Requests") {
              e.currentTarget.style.backgroundColor = Colors.accent; // original background
              e.currentTarget.style.color = Colors.white; // original text
            }
          }}
        >
          Product to Review
        </button>
      </div>

      {activeTab === "Sellers" && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "30px", // more gap
            justifyContent: "center",
            maxWidth: "1200px", // wider container
            margin: "0 auto",
          }}
        >
          {sellers.length === 0 ? (
            <p style={{ color: Colors.gray }}>No sellers found.</p>
          ) : (
            sellers.map((seller) => (
              <div
                key={seller.id}
                style={{
                  border: `1px solid ${Colors.gray}`,
                  borderRadius: "10px",
                  padding: "20px",
                  width: "550px",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                  backgroundColor: Colors.secondary,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
                  color: Colors.black,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.03)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <FaUserCircle
                  style={{
                    fontSize: "100px", // bigger icon
                    marginBottom: "20px", // more spacing below
                    color: Colors.accent,
                  }}
                />

                <h3 style={{ marginBottom: "10px", textAlign: "center" }}>
                  {seller.name}
                </h3>
                <div
                  style={{
                    width: "100%",
                    backgroundColor: Colors.accent,
                    padding: "10px 15px",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    color: Colors.white,
                    fontWeight: "500",
                    marginBottom: "10px",
                    textAlign: "left",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  Email: {seller.email}
                </div>

                <div
                  style={{
                    width: "100%",
                    backgroundColor: Colors.accent,
                    padding: "10px 15px",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    color: Colors.white,
                    fontWeight: "500",
                    marginBottom: "10px",
                    textAlign: "left",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  Name: {seller.name}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "15px",
                    marginTop: "20px",
                    justifyContent: "center",
                  }}
                >
                  <button
                    style={{
                      width: "140px",
                      padding: "8px 12px",
                      backgroundColor: Colors.accent,
                      color: Colors.white,
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                      transition: "all 0.2s",
                    }}
                    onClick={() => openChangeModal(seller)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#b892ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = Colors.accent)
                    }
                  >
                    Change Email/Name
                  </button>

                  <button
                    style={{
                      width: "110px",
                      padding: "8px 12px",
                      backgroundColor: "#b30021",
                      color: Colors.white,
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                      transition: "all 0.2s",
                    }}
                    onClick={() => openRemoveModal(seller)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#d10030")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#b30021")
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "Requests" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {requestProducts.length === 0 ? (
            <p>No products to review.</p>
          ) : (
            requestProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "25px",
                  borderRadius: "10px", // match seller card
                  backdropFilter: "blur(8px)", // glass effect
                  backgroundColor: Colors.secondary,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.3)", // match seller card
                  color: Colors.black,
                  fontSize: "1.05rem",
                  width: "500px",
                  maxWidth: "700px",
                  margin: "0 auto", // center in container
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 25px rgba(0,0,0,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(0,0,0,0.3)";
                }}
              >
                <div>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Product Name:</strong> {product.productName}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Product ID:</strong> {product.productID}
                  </p>
                </div>

                <button
                  style={{
                    padding: "8px 14px",
                    backgroundColor: Colors.accent,
                    color: Colors.white,
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                  onClick={() => {
                    setEditProduct({
                      ...product,
                      stock: product.stock || { S: 0, M: 0, L: 0, XL: 0 },
                    });
                  }}
                >
                  Pending Products
                </button>
              </div>
            ))
          )}
        </div>
      )}
      {editProduct && (
        <ModalOverlay onClick={handleModalClick} data-overlay="true">
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "95vw",
              width: "1400px", // wider
              maxHeight: "90vh", // taller
              overflowY: "auto",
              padding: "2rem",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2rem",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "1rem",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                color: "#000",
                width: "500px",
              }}
            >
              <ModalTitle>Review Product</ModalTitle>

              <Label>Name</Label>
              <Input
                maxLength={50}
                value={editProduct.productName}
                placeholder="Enter Product Name"
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    productName: e.target.value,
                  })
                }
              />

              <Label>Price</Label>
              <Input
                type="number"
                value={editProduct.price}
                placeholder="Enter Product Price"
                onChange={(e) => {
                  let val = e.target.value;
                  if (val.length > 5) val = val.slice(0, 5);
                  setEditProduct({ ...editProduct, price: val });
                }}
              />

              <Label>Delivery</Label>
              <Input
                maxLength={10}
                value={editProduct.delivery}
                placeholder="Enter the Delivery Days"
                onChange={(e) =>
                  setEditProduct({ ...editProduct, delivery: e.target.value })
                }
              />

              <Label>Description</Label>
              <textarea
                maxLength={250}
                value={editProduct.description || ""}
                placeholder="Enter product description"
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    description: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "0.5rem",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  resize: "vertical",
                  marginBottom: "1rem",
                }}
              />
              <div style={{ marginBottom: "1rem" }}>
                <Label style={{ color: "#000" }}>Main Category</Label>
                {["Top", "Bottom"].map((main) => (
                  <label
                    key={main}
                    style={{ marginRight: "1rem", color: "#000" }}
                  >
                    <input
                      type="radio"
                      name="mainCategoryEdit"
                      value={main}
                      checked={editProduct.categoryMain === main}
                      onChange={() =>
                        setEditProduct({
                          ...editProduct,
                          categoryMain: main,
                          categorySub: "",
                        })
                      }
                    />
                    {main.toUpperCase()}
                  </label>
                ))}

                {editProduct.categoryMain && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <Label style={{ color: "#000" }}>Sub Category</Label>
                    {subCategoryMap[editProduct.categoryMain].map((sub) => (
                      <label
                        key={sub}
                        style={{ marginRight: "1rem", color: "#000" }}
                      >
                        <input
                          type="radio"
                          name="subCategoryEdit"
                          value={sub}
                          checked={editProduct.categorySub === sub}
                          onChange={() =>
                            setEditProduct({
                              ...editProduct,
                              categorySub: sub,
                            })
                          }
                        />
                        {sub}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                padding: "1rem",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                color: "#000",
                width: "800px",
              }}
            >
              <Label style={{ color: "#a166ff" }}>Stocks</Label>

              <div>
                <Label style={{ color: "#000" }}>Stock</Label>
                <table
                  border="1"
                  style={{
                    marginTop: "5px",
                    borderCollapse: "collapse",
                    width: "100%", // full width
                    tableLayout: "fixed", // uniform column widths
                    background: "#fff",
                    color: "#000",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: "12%" }}>Size</th>
                      {editProduct.categoryMain === "Top" ? (
                        <>
                          <th style={{ width: "12%" }}>Height (cm)</th>
                          <th style={{ width: "12%" }}>Weight (kg)</th>
                          <th style={{ width: "12%" }}>Shoulder (cm)</th>
                          <th style={{ width: "12%" }}>Chest (cm)</th>
                          <th style={{ width: "12%" }}>Stock</th>
                        </>
                      ) : editProduct.categoryMain === "Bottom" ? (
                        <>
                          <th style={{ width: "12%" }}>Waist (cm)</th>
                          <th style={{ width: "12%" }}>Hip (cm)</th>
                          <th style={{ width: "12%" }}>Height (cm)</th>
                          <th style={{ width: "12%" }}>Weight (kg)</th>
                          <th style={{ width: "12%" }}>Stock</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {SIZE_OPTIONS.map((size) => {
                      const sizeDataTop = {
                        S: {
                          height: "150–165",
                          weight: "45–60",
                          shoulder: "37–44",
                          chest: "81–92",
                        },
                        M: {
                          height: "155–170",
                          weight: "50–68",
                          shoulder: "39–46",
                          chest: "86–96",
                        },
                        L: {
                          height: "160–175",
                          weight: "55–75",
                          shoulder: "41–48",
                          chest: "91–100",
                        },
                        XL: {
                          height: "165–180",
                          weight: "62–85",
                          shoulder: "43–50",
                          chest: "97–106",
                        },
                      };
                      const sizeDataBottom = {
                        S: {
                          waist: "63–76",
                          hip: "87–92",
                          height: "150–165",
                          weight: "45–60",
                        },
                        M: {
                          waist: "67–82",
                          hip: "91–96",
                          height: "155–170",
                          weight: "50–68",
                        },
                        L: {
                          waist: "71–88",
                          hip: "95–100",
                          height: "160–175",
                          weight: "55–75",
                        },
                        XL: {
                          waist: "77–94",
                          hip: "99–105",
                          height: "165–180",
                          weight: "62–85",
                        },
                      };

                      const data =
                        editProduct.categoryMain === "Top"
                          ? sizeDataTop[size]
                          : editProduct.categoryMain === "Bottom"
                          ? sizeDataBottom[size]
                          : null;

                      return (
                        <tr key={size}>
                          <td style={{ textAlign: "center" }}>{size}</td>
                          {data
                            ? Object.values(data).map((val, i) => (
                                <td key={i} style={{ textAlign: "center" }}>
                                  {val}
                                </td>
                              ))
                            : null}
                          <td>
                            <Input
                              type="number"
                              value={editProduct.stock[size]}
                              onChange={(e) =>
                                setEditProduct({
                                  ...editProduct,
                                  stock: {
                                    ...editProduct.stock,
                                    [size]: e.target.value,
                                  },
                                })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  justifyContent: "center",
                  gap: "4rem", // space between buttons
                }}
              >
                <SaveButton onClick={handleSaveEdit}>Save</SaveButton>
                <CancelButton onClick={() => setEditProduct(null)}>
                  Cancel
                </CancelButton>
              </div>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Change Email/Name Modal */}
      {showChangeModal && (
        <ModalOverlay onClick={() => setShowChangeModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h2>Update Seller Info</h2>
            <Label>New Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Label>New Email</Label>
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
              <SaveButton onClick={handleSaveChange}>Save</SaveButton>
              <CancelButton onClick={() => setShowChangeModal(false)}>
                Cancel
              </CancelButton>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Remove Seller Modal */}
      {showRemoveModal && (
        <ModalOverlay
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)", // dim overlay
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowRemoveModal(false)}
        >
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "400px",
              width: "90%",
              padding: "20px", // equal padding
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxSizing: "border-box",
              color: "#000", // black text
              backgroundColor: "#fff",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}
          >
            <h2 style={{ margin: 0, textAlign: "center" }}>Confirm Removal</h2>
            <p style={{ textAlign: "center" }}>
              Are you sure you want to remove {selectedSeller?.email}?
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              <SaveButton
                style={{ backgroundColor: "#b30021", color: "#fff" }}
                onClick={handleConfirmRemove}
              >
                Remove
              </SaveButton>
              <CancelButton onClick={() => setShowRemoveModal(false)}>
                Cancel
              </CancelButton>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {successModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)", // semi-transparent overlay
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999, // ensure it’s on top
            pointerEvents: "auto", // blocks interaction
          }}
        >
          <div
            style={{
              backgroundColor: "#4BB543", // green success
              color: "#fff",
              padding: "30px 50px",
              borderRadius: "12px",
              fontSize: "1.2rem",
              fontWeight: "600",
              textAlign: "center",
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              pointerEvents: "none", // allow clicks to be blocked only on overlay
            }}
          >
            Changes in seller account are successful!
          </div>
        </div>
      )}
    </div>
  );
};

export default Seller;
