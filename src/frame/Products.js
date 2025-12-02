import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { FaCheck } from "react-icons/fa";
import {
  CancelButton,
  Input,
  Label,
  ModalContent,
  ModalOverlay,
  ModalTitle,
  SaveButton,
} from "../components/dashboardstyles";
import { auth, db } from "../firebase";

const SIZE_OPTIONS = ["S", "M", "L", "XL"];

const Products = () => {
  const [products, setProducts] = useState([]);
  const user = auth.currentUser;
  const [role, setRole] = useState(localStorage.getItem("role") || "Seller");

  const generateLogID = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `LOG-${timestamp}-${random}`;
  };

  const [addProduct, setAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    delivery: "",
    imageUrl: "",
    arUrl: "",
    stock: { S: 0, M: 0, L: 0, XL: 0 },
  });
  const [newProductCategory, setNewProductCategory] = useState({
    main: "",
    sub: "",
  });

  const [editProduct, setEditProduct] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [productToDelete, setProductToDelete] = useState(null);
  const [arProducts, setArProducts] = useState([]);
  const [showArModal, setShowArModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingProductName, setPendingProductName] = useState("");

  const subCategoryMap = {
    Top: ["T-Shirt", "Longsleeves"],
    Bottom: ["Pants", "Shorts"],
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "arproducts"), (snapshot) => {
      const available = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((ar) => !ar.inUsed);
      setArProducts(available);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSellerRole = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "seller"));
        if (!querySnapshot.empty) {
          const sellerDoc = querySnapshot.docs[0].data();
          if (sellerDoc.email === user?.email) {
            setRole("Seller");
          } else {
            setRole("Unknown");
          }
        } else {
          setRole("Unknown");
        }
      } catch (err) {
        console.error("Error fetching seller role:", err);
        setRole("Unknown");
      }
    };

    if (user?.email) {
      fetchSellerRole();
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const formatDelivery = (delivery) => {
    if (!delivery) return "";
    return delivery.endsWith(" Days") ? delivery : delivery + " Days";
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return "";
    if (num < 1000) return num.toString();
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  };

  const initializeFullStock = (currentStock = {}) => {
    const stock = {};
    SIZE_OPTIONS.forEach((size) => {
      const val = Number(currentStock[size]) || 0;
      stock[size] = val;
    });
    return stock;
  };

  const getSizesInStock = (stock) => {
    if (!stock) return "No stock";
    return (
      SIZE_OPTIONS.filter((size) => stock[size] > 0).join(", ") || "No stock"
    );
  };

  const handleAddProduct = async () => {
    if (
      !newProduct.name ||
      !newProduct.price ||
      !newProduct.delivery ||
      !newProductCategory.main ||
      !newProductCategory.sub ||
      !newProduct.arUrl
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const stockData = initializeFullStock(newProduct.stock);
      const totalStock = Object.values(stockData).reduce(
        (sum, val) => sum + val,
        0
      );

      await addDoc(collection(db, "sellerRequest"), {
        productName: newProduct.name,
        price: Number(newProduct.price),
        delivery: formatDelivery(newProduct.delivery),
        description: newProduct.description || "",
        rating: 0,
        sold: 0,
        stock: stockData,
        categoryMain: newProductCategory.main,
        categorySub: newProductCategory.sub,
        sizes: SIZE_OPTIONS,
        totalStock: totalStock,
        imageUrl: newProduct.imageUrl || "/asset/icon.png",
        arUrl: newProduct.arUrl,
        createdAt: serverTimestamp(),
        editedAt: null,
      });

      let currentRole = "Seller";
      const querySnapshot = await getDocs(collection(db, "seller"));
      if (!querySnapshot.empty) {
        const sellerDoc = querySnapshot.docs[0].data();
        if (sellerDoc.email === user?.email) currentRole = "Seller";
      }

      await addDoc(collection(db, "recentActivityLogs"), {
        logID: generateLogID(),
        userEmail: user?.email || "Unknown user",
        role: currentRole,
        action: "Add product",
        productName: newProduct.name,
        timestamp: serverTimestamp(),
      });

      setPendingProductName(newProduct.name);
      setShowPendingModal(true);

      fetchProducts();
      setAddProduct(false);
      setNewProduct({
        name: "",
        price: "",
        delivery: "",
        imageUrl: "",
        arUrl: "",
        description: "",
        stock: { S: 0, M: 0, L: 0, XL: 0 },
      });
      setNewProductCategory({ main: "", sub: "" });
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product.");
    }
  };

  const handleSaveEdit = async () => {
    try {
      const productRef = doc(db, "products", editProduct.id);
      const updatedStock = initializeFullStock(editProduct.stock);
      const totalStock = Object.values(updatedStock).reduce(
        (sum, val) => sum + val,
        0
      );

      await updateDoc(productRef, {
        productName: editProduct.productName,
        price: Number(editProduct.price),
        delivery: formatDelivery(editProduct.delivery),
        description: editProduct.description || "",
        stock: updatedStock,
        totalStock: totalStock,
        categoryMain: editProduct.categoryMain,
        categorySub: editProduct.categorySub,
        sizes: SIZE_OPTIONS,
        editedAt: serverTimestamp(),
      });

      const changes = [];
      if (originalData.productName !== editProduct.productName)
        changes.push("Name");
      if (originalData.price !== Number(editProduct.price))
        changes.push("Price");
      if (originalData.delivery !== formatDelivery(editProduct.delivery))
        changes.push("Delivery");
      if (originalData.imageUrl !== editProduct.imageUrl)
        changes.push("Image URL");
      if (originalData.arUrl !== editProduct.arUrl) changes.push("AR URL");
      if (originalData.description !== editProduct.description)
        changes.push("Description");
      if (JSON.stringify(originalData.stock) !== JSON.stringify(updatedStock))
        changes.push("Stock");
      if (originalData.categoryMain !== editProduct.categoryMain)
        changes.push("Main Category");
      if (originalData.categorySub !== editProduct.categorySub)
        changes.push("Sub Category");

      let currentRole = "Seller";
      try {
        const querySnapshot = await getDocs(collection(db, "seller"));
        if (!querySnapshot.empty) {
          const sellerDoc = querySnapshot.docs[0].data();
          if (sellerDoc.email === user?.email) currentRole = "Seller";
        }
      } catch (err) {
        console.error("Error fetching role for log:", err);
      }

      await addDoc(collection(db, "recentActivityLogs"), {
        logID: generateLogID(),
        userEmail: user?.email || "Unknown user",
        role: currentRole,
        action: `Edited product's ${changes.join(", ")}`,
        productId: editProduct.productID,
        productName: editProduct.productName,
        timestamp: serverTimestamp(),
      });

      fetchProducts();
      setEditProduct(null);
      setOriginalData(null);
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product.");
    }
  };

  const confirmDelete = async () => {
    try {
      const productRef = doc(db, "products", deleteConfirm.id);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        alert("Product not found.");
        return;
      }

      const productData = productSnap.data();

      await addDoc(collection(db, "removedProducts"), {
        ...productData,
        originalId: deleteConfirm.id,
        removedAt: serverTimestamp(),
        removedBy: user?.email ?? "Unknown user",
        role: role ?? "Unknown role",
      });

      await deleteDoc(productRef);

      setProducts((prev) =>
        prev.filter((product) => product.id !== deleteConfirm.id)
      );

      let currentRole = "Unknown role";
      try {
        const querySnapshot = await getDocs(collection(db, "seller"));
        if (!querySnapshot.empty) {
          const sellerDoc = querySnapshot.docs[0].data();
          if (sellerDoc.email === user?.email) currentRole = "Seller";
        }
      } catch (err) {
        console.error("Error fetching role for log:", err);
      }

      await addDoc(collection(db, "recentActivityLogs"), {
        logID: generateLogID(),
        userEmail: user?.email ?? "Unknown user",
        role: currentRole,
        action: "removed product",
        productId: deleteConfirm.id,
        productName: productData.productName ?? "Unknown product",
        timestamp: serverTimestamp(),
      });

      setDeleteConfirm({ show: false, id: null });
      setProductToDelete(null);
    } catch (error) {
      console.error("Error moving product:", error);
      alert("Failed to remove product.");
      setDeleteConfirm({ show: false, id: null });
      setProductToDelete(null);
    }
  };

  const handleModalClick = (e) => {
    if (e.target.dataset.overlay === "true") {
      setAddProduct(false);
      setEditProduct(null);
      setDeleteConfirm({ show: false, id: null });
      setProductToDelete(null);
    }
  };

  const closeArModal = (e) => {
    if (e.target.dataset.overlay === "ar-overlay") {
      setShowArModal(false);
    }
  };

  const selectArProduct = (ar) => {
    setNewProduct({
      ...newProduct,
      arUrl: ar.arUrl,
      imageUrl: ar.imageUrl,
    });
    setShowArModal(false);
  };

  return (
    <>
      <style>{`
        .product-grid {
          padding: 2rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          color: #fff;
        }
        .product-card {
          background: linear-gradient(135deg, #a166ff, #ebdfff);
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .product-card img {
          width: 100%;
          height: 160px;
          object-fit: cover;
          border-radius: 8px;
        }
        .sizes-pill {
          color: #000;
          background: #fff;
          padding: 4px;
          border-radius: 4px;
          display: inline-block;
          width: 100%;
        }
        .actions-row {
          display: flex;
          justify-content: space-between;
          margin-top: 0.8rem;
        }
        .edit-button {
          background-color: #4CAF50;;
          color: #fff;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          border: none;
          width: 45%;
        }
        .edit-button:hover {
          transform: translateY(-2px);
        }
        .delete-button {
          background: #ff4d4d;
          color: #fff;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          border: none;
          width: 45%;
        }
        .delete-button:hover {
          transform: translateY(-2px);
        }
        .add-card {
          border: 2px dashed #ccc;
          border-radius: 12px;
          height: 350px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          cursor: pointer;
          color: #555;
        }
      `}</style>
      <div className="product-grid">
        {[...products]
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((product) => (
            <div key={product.id} className="product-card">
              <img
                src={product.imageUrl || "/asset/icon.png"}
                alt={product.productName}
              />
              <h3>
                {product.productID
                  ? `${product.productID} - ${product.productName}`
                  : product.productName}
              </h3>
              <p>₱{product.price}</p>
              <p>⭐ {product.rating}</p>
              <p>Sold: {formatNumber(product.sold)}</p>
              <p>Delivery: {product.delivery}</p>

              <div>
                <Label>Sizes</Label>
                <p className="sizes-pill">{getSizesInStock(product.stock)}</p>
              </div>

              <div className="actions-row">
                <button
                  onClick={() => {
                    setEditProduct(product);
                    setOriginalData(product);
                  }}
                  className="edit-button"
                >
                  Edit
                </button>

                <button
                  onClick={() => {
                    setProductToDelete(product);
                    setDeleteConfirm({ show: true, id: product.id });
                  }}
                  className="delete-button"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

        <div onClick={() => setAddProduct(true)} className="add-card">
          + Add Product
        </div>

        {addProduct && (
          <ModalOverlay onClick={handleModalClick} data-overlay="true">
            <ModalContent
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "95vw",
                width: "1400px",
                maxHeight: "90vh",
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
                <ModalTitle>Add Product</ModalTitle>
                <Label>
                  Choose AR Product{" "}
                  <span style={{ color: "red" }}>(*Required)</span>
                </Label>
                <div style={{ marginBottom: "1rem" }}>
                  <SaveButton
                    onClick={() => setShowArModal(true)}
                    style={{
                      backgroundColor: newProduct.arUrl ? "#6a2edb" : "#8a4fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {newProduct.arUrl
                      ? "AR Product Selected"
                      : "Choose AR Product"}
                    {newProduct.arUrl && <FaCheck color="lightgreen" />}
                  </SaveButton>
                </div>
                <Label>
                  Name <span style={{ color: "red" }}>(*Required)</span>
                </Label>
                <Input
                  value={newProduct.name}
                  placeholder="Enter Product Name"
                  maxLength={50}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      name: e.target.value,
                    })
                  }
                />
                <Label>
                  Price <span style={{ color: "red" }}>(*Required)</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="99999"
                  value={newProduct.price}
                  placeholder="Enter Product Price"
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.length > 5) val = val.slice(0, 5);
                    setNewProduct({ ...newProduct, price: val });
                  }}
                />
                <Label>
                  Delivery <span style={{ color: "red" }}>(*Required)</span>
                </Label>
                <Input
                  maxLength={10}
                  value={newProduct.delivery}
                  placeholder="Enter the Delivery Days"
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, delivery: e.target.value })
                  }
                />
                <Label>Description</Label>
                <textarea
                  maxLength={250}
                  value={newProduct.description}
                  placeholder="Enter product description"
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
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
                  }}
                />
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
                <div style={{ marginBottom: "1rem" }}>
                  <Label>
                    Main Category{" "}
                    <span style={{ color: "red" }}>(*Required)</span>
                  </Label>
                  {["Top", "Bottom"].map((main) => (
                    <label
                      key={main}
                      style={{ marginRight: "1rem", color: "#000" }}
                    >
                      <input
                        type="radio"
                        name="mainCategoryAdd"
                        value={main}
                        checked={newProductCategory.main === main}
                        onChange={() =>
                          setNewProductCategory({ main, sub: "" })
                        }
                      />
                      {main.toUpperCase()}
                    </label>
                  ))}

                  {newProductCategory.main && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <Label>
                        Sub Category{" "}
                        <span style={{ color: "red" }}>(*Required)</span>
                      </Label>
                      {subCategoryMap[newProductCategory.main].map((sub) => (
                        <label
                          key={sub}
                          style={{ marginRight: "1rem", color: "#000" }}
                        >
                          <input
                            type="radio"
                            name="subCategoryAdd"
                            value={sub}
                            checked={newProductCategory.sub === sub}
                            onChange={() =>
                              setNewProductCategory({
                                ...newProductCategory,
                                sub,
                              })
                            }
                          />
                          {sub}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <Label style={{ color: "#a166ff" }}>Stocks</Label>

                <div>
                  <Label style={{ color: "#000" }}>Stock</Label>
                  <table
                    border="1"
                    style={{
                      marginTop: "5px",
                      borderCollapse: "collapse",
                      width: "100%",
                      tableLayout: "fixed",
                      background: "#fff",
                      color: "#000",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: "12%" }}>Size</th>
                        {newProductCategory.main === "Top" ? (
                          <>
                            <th style={{ width: "12%" }}>Height (cm)</th>
                            <th style={{ width: "12%" }}>Weight (kg)</th>
                            <th style={{ width: "12%" }}>Shoulder (cm)</th>
                            <th style={{ width: "12%" }}>Chest (cm)</th>
                            <th style={{ width: "12%" }}>Stock</th>
                          </>
                        ) : newProductCategory.main === "Bottom" ? (
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
                          newProductCategory.main === "Top"
                            ? sizeDataTop[size]
                            : newProductCategory.main === "Bottom"
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
                                value={newProduct.stock[size]}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (val.length > 10) val = val.slice(0, 10);
                                  setNewProduct({
                                    ...newProduct,
                                    stock: { ...newProduct.stock, [size]: val },
                                  });
                                }}
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
                    gap: "4rem",
                  }}
                >
                  <SaveButton onClick={handleAddProduct}>Request</SaveButton>
                  <CancelButton
                    onClick={() => {
                      setAddProduct(false);
                      setNewProduct({
                        name: "",
                        price: "",
                        delivery: "",
                        imageUrl: "",
                        arUrl: "",
                        description: "",
                        stock: { S: 0, M: 0, L: 0, XL: 0 },
                      });
                      setNewProductCategory({ main: "", sub: "" });
                    }}
                  >
                    Cancel
                  </CancelButton>
                </div>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}

        {editProduct && (
          <ModalOverlay onClick={handleModalClick} data-overlay="true">
            <ModalContent
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "95vw",
                width: "1400px",
                maxHeight: "90vh",
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
                <ModalTitle>Edit Product</ModalTitle>

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
                      width: "100%",
                      tableLayout: "fixed",
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
                    gap: "4rem",
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

        {deleteConfirm.show && (
          <ModalOverlay onClick={handleModalClick} data-overlay="true">
            <ModalContent
              style={{
                maxWidth: "400px",
                padding: "1rem",
                textAlign: "center",
                color: "#363636ff",
                fontSize: "20px",
              }}
            >
              <p>
                Are you sure you want to remove {productToDelete?.productName}?
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  marginTop: "55px",
                }}
              >
                <SaveButton onClick={confirmDelete}>Yes</SaveButton>
                <CancelButton
                  onClick={() => setDeleteConfirm({ show: false, id: null })}
                >
                  No
                </CancelButton>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}
        {showArModal && (
          <ModalOverlay data-overlay="ar-overlay" onClick={closeArModal}>
            <ModalContent
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "800px",
                padding: "1rem",
                maxHeight: "70vh",
                overflowY: "auto",
                textAlign: "center",
                backgroundColor: "#f5f5f5",
                borderRadius: "12px",
              }}
            >
              <h3 style={{ marginBottom: "1rem", color: "#8a4fff" }}>
                Available AR Experience
              </h3>
              {arProducts.length === 0 && (
                <p style={{ color: "#333" }}>No available AR products.</p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                {arProducts.map((ar) => {
                  const isInUse = products.some((p) => p.arUrl === ar.arUrl);

                  return (
                    <div
                      key={ar.id}
                      style={{
                        border: "1px solid #8a4fff",
                        borderRadius: "8px",
                        padding: "0.5rem",
                        cursor: isInUse ? "not-allowed" : "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        backgroundColor: "#fff",
                        textAlign: "center",
                        transition: "transform 0.2s",
                        position: "relative",
                      }}
                      onClick={() => !isInUse && selectArProduct(ar)}
                      onMouseEnter={(e) =>
                        !isInUse &&
                        (e.currentTarget.style.transform = "scale(1.03)")
                      }
                      onMouseLeave={(e) =>
                        !isInUse &&
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      <div
                        style={{
                          filter: isInUse ? "blur(2px)" : "none",
                          pointerEvents: isInUse ? "none" : "auto",
                        }}
                      >
                        {newProduct.arUrl === ar.arUrl && !isInUse && (
                          <div
                            style={{
                              position: "absolute",
                              top: "8px",
                              left: "8px",
                              backgroundColor: "#4caf50",
                              borderRadius: "50%",
                              width: "20px",
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: "14px",
                              fontWeight: "bold",
                            }}
                          >
                            ✓
                          </div>
                        )}

                        <img
                          src={ar.imageUrl}
                          alt="AR Preview"
                          style={{
                            width: "100%",
                            maxHeight: "150px",
                            objectFit: "contain",
                            borderRadius: "4px",
                          }}
                        />
                      </div>

                      <p
                        style={{
                          fontSize: isInUse ? "16px" : "12px",
                          marginTop: "0.5rem",
                          wordBreak: "break-word",
                          color: isInUse ? "red" : "#333",
                          fontWeight: isInUse ? "bold" : "normal",
                          fontStyle: isInUse ? "italic" : "normal",
                          position: isInUse ? "relative" : "static",
                          zIndex: isInUse ? 1 : "auto",
                        }}
                      >
                        {isInUse ? "In Use" : ar.arUrl}
                      </p>
                    </div>
                  );
                })}
              </div>
              <CancelButton
                onClick={() => setShowArModal(false)}
                style={{
                  marginTop: "1rem",
                  backgroundColor: "#8a4fff",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Cancel
              </CancelButton>
            </ModalContent>
          </ModalOverlay>
        )}

        {showPendingModal && (
          <ModalOverlay
            onClick={() => setShowPendingModal(false)}
            data-overlay="true"
          >
            <ModalContent
              style={{
                maxWidth: "400px",
                padding: "1.5rem",
                textAlign: "center",
                color: "#363636",
                fontSize: "18px",
                borderRadius: "12px",
                backgroundColor: "#fff",
              }}
            >
              <h3 style={{ marginBottom: "1rem", color: "#8a4fff" }}>
                Pending Product Review
              </h3>
              <p>
                Your product <strong>{pendingProductName}</strong> has been
                submitted and is waiting for admin review.
              </p>
              <SaveButton
                style={{ marginTop: "1.5rem" }}
                onClick={() => setShowPendingModal(false)}
              >
                OK
              </SaveButton>
            </ModalContent>
          </ModalOverlay>
        )}
      </div>
    </>
  );
};

export default Products;
