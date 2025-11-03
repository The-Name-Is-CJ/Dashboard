import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import {
  ModalOverlay,
  ModalContent,
  ModalTitle,
  Label,
  Input,
  SaveButton,
  CancelButton,
} from '../components/dashboardstyles';

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL'];

const Products = () => {
  const [products, setProducts] = useState([]);
  const user = auth.currentUser;
  const [role, setRole] = useState(localStorage.getItem("role") || "Unknown");
 

  const generateLogID = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `LOG-${timestamp}-${random}`;
  };

  


  const [addProduct, setAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    delivery: '',
    imageUrl: '',
    arUrl: '',
    stock: { S: 0, M: 0, L: 0, XL: 0 },
  });
  const [newProductCategory, setNewProductCategory] = useState({ main: '', sub: '' });

  // Edit product modal
  const [editProduct, setEditProduct] = useState(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [productToDelete, setProductToDelete] = useState(null);

  const subCategoryMap = {
    Top: ['T-Shirt', 'Longsleeves'],
    Bottom: ['Pants', 'Shorts'],
  };

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'admins'));
        let foundRole = "Unknown";

        querySnapshot.forEach(doc => {
          const data = doc.data();
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

    if (user?.email) {
      fetchRole();
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const generateNextProductID = () => {
    if (products.length === 0) return 'CP001';

    const ids = products
      .map(p => p.productID)
      .filter(id => typeof id === 'string' && id.startsWith('CP') && /^\d{3}$/.test(id.slice(2)))
      .map(id => parseInt(id.slice(2), 10));

    if (ids.length === 0) return 'CP001';

    const maxNumber = Math.max(...ids);
    const nextNumber = maxNumber + 1;
    return 'CP' + nextNumber.toString().padStart(3, '0');
  };

  const formatDelivery = delivery => {
    if (!delivery) return '';
    return delivery.endsWith(' Days') ? delivery : delivery + ' Days';
  };

  const formatNumber = num => {
    if (!num && num !== 0) return '';
    if (num < 1000) return num.toString();
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  };

  const initializeFullStock = (currentStock = {}) => {
    const stock = {};
    SIZE_OPTIONS.forEach(size => {
      const val = Number(currentStock[size]) || 0;
      stock[size] = val;
    });
    return stock;
  };

  const getSizesInStock = (stock) => {
    if (!stock) return 'No stock';
    return SIZE_OPTIONS
      .filter(size => stock[size] > 0)
      .join(', ') || 'No stock';
  };

  const handleAddProduct = async () => {
    if (
      !newProduct.name ||
      !newProduct.price ||
      !newProductCategory.main ||
      !newProductCategory.sub
    ) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const newProductID = generateNextProductID();
      const stockData = initializeFullStock(newProduct.stock);
      const totalStock = Object.values(stockData).reduce((sum, val) => sum + val, 0);

      await addDoc(collection(db, 'products'), {
        productID: newProductID,
        name: newProduct.name,
        price: Number(newProduct.price),
        delivery: formatDelivery(newProduct.delivery),
        imageUrl: newProduct.imageUrl || '',
        arUrl: newProduct.arUrl || '',
        description: newProduct.description || '',
        rating: 0,
        sold: 0,
        stock: stockData,
        categoryMain: newProductCategory.main,
        categorySub: newProductCategory.sub,
        sizes: SIZE_OPTIONS,
        totalStock: totalStock,
        timestamp: serverTimestamp(),
      });

      await addDoc(collection(db, 'recentActivityLogs'), {
        logID: generateLogID(), 
        userEmail: user?.email || "Unknown user",
        role: role,
        action: 'Add product',
        productName: newProduct.name,
        timestamp: serverTimestamp(),
      });


      fetchProducts();
      setAddProduct(false);
      setNewProduct({
        name: '',
        price: '',
        delivery: '',
        imageUrl: '',
        arUrl: '',
        description: '',
        stock: { S: 0, M: 0, L: 0, XL: 0 },
      });
      setNewProductCategory({ main: '', sub: '' });
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editProduct.name || !editProduct.price || !editProduct.categoryMain || !editProduct.categorySub) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const productRef = doc(db, 'products', editProduct.id);
      const updatedStock = initializeFullStock(editProduct.stock);
      const totalStock = Object.values(updatedStock).reduce((sum, val) => sum + val, 0);

      await updateDoc(productRef, {
        name: editProduct.name,
        price: Number(editProduct.price),
        delivery: formatDelivery(editProduct.delivery),
        imageUrl: editProduct.imageUrl || '',
        arUrl: editProduct.arUrl || '',
        description: editProduct.description || '',
        stock: updatedStock,
        totalStock: totalStock,
        categoryMain: editProduct.categoryMain,
        categorySub: editProduct.categorySub,
        sizes: SIZE_OPTIONS,
      });

     await addDoc(collection(db, 'recentActivityLogs'), {
      logID: generateLogID(),
      userEmail: user?.email || "Unknown user",
      role: role,
      action: 'Edit product',
      productId: editProduct.id,
      productName: editProduct.name,
      timestamp: serverTimestamp(),
    });


      fetchProducts();
      setEditProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product.');
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'products', deleteConfirm.id));
      setProducts(prev => prev.filter(product => product.id !== deleteConfirm.id));
      setDeleteConfirm({ show: false, id: null });

      await addDoc(collection(db, 'recentActivityLogs'), {
        logID: generateLogID(),
        userEmail: user?.email || "Unknown user",
        role: role,
        action: 'deleted product',
        productId: deleteConfirm.id,
        productName: productToDelete ? productToDelete.name : '',
        timestamp: serverTimestamp(),
      });


      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete.');
      setDeleteConfirm({ show: false, id: null });
      setProductToDelete(null);
    }
  };

  const handleModalClick = e => {
    if (e.target.dataset.overlay === 'true') {
      setAddProduct(false);
      setEditProduct(null);
      setDeleteConfirm({ show: false, id: null });
      setProductToDelete(null);
      setNewProductCategory({ main: '', sub: '' });
    }
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
        {products.map(product => (
          <div key={product.id} className="product-card">
            <img src={product.imageUrl || '/asset/icon.png'} alt={product.name} />

            <h3>{product.productID ? `${product.productID} - ${product.name}` : product.name}</h3>
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
                onClick={() => setEditProduct(product)}
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
                Delete
              </button>
            </div>
          </div>
        ))}

        <div onClick={() => setAddProduct(true)} className="add-card">
          + Add Product
        </div>

        {/* Add Product Modal */}
        {addProduct && (
          <ModalOverlay onClick={handleModalClick} data-overlay="true">
            <ModalContent
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                width: '1200px',
                maxHeight: '80vh',
                overflowY: 'auto',
                padding: '1.5rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem',
              }}
            >
              {/* left column card */}
              <div style={{
                background: '#fff',
                padding: '1rem',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                color: '#000',
                width: '500px'
              }}>
                <ModalTitle>Add Product</ModalTitle>
                <Label>Name</Label>
                <Input value={newProduct.name} placeholder='Enter Product Name' onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                <Label>Price</Label>
                <Input type="number" value={newProduct.price} placeholder='Enter Product Price' onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
                <Label>Delivery</Label>
                <Input value={newProduct.delivery} placeholder='Enter the Delivery Days' onChange={e => setNewProduct({ ...newProduct, delivery: e.target.value })} />
                <Label>Image URL</Label>
                <Input value={newProduct.imageUrl} onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })} />
                <Label>AR URL/LINK</Label>
                <Input value={newProduct.arUrl} onChange={e => setNewProduct({ ...newProduct, arUrl: e.target.value })} />
                <Label>Description</Label>
                  <textarea
                    value={newProduct.description}
                    placeholder="Enter product description"
                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                    style={{
                      width: '100%',
                      minHeight: '100px',  // <-- makes it bigger
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      resize: 'vertical', // <-- allows vertical resize
                    }}
                  />

              </div>

              {/* right column card */}
              <div style={{
                background: '#fff',
                padding: '1rem',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                color: '#000',
                width: '600px'
              }}>
                <Label style={{ color: '#a166ff'  }}>Stock & Category</Label>
                {/* Category Selection */}
                <div style={{ marginBottom: '1rem' }}>
                  <Label style={{ color: '#000' }}>Main Category</Label>
                  {['Top', 'Bottom'].map(main => (
                    <label key={main} style={{ marginRight: '1rem', color: '#000' }}>
                      <input
                        type="radio"
                        name="mainCategoryAdd"
                        value={main}
                        checked={newProductCategory.main === main}
                        onChange={() =>
                          setNewProductCategory({ main, sub: '' })
                        }
                      />
                      {main.toUpperCase()}
                    </label>
                  ))}

                  {newProductCategory.main && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <Label style={{ color: '#000' }}>Sub Category</Label>
                      {subCategoryMap[newProductCategory.main].map(sub => (
                        <label key={sub} style={{ marginRight: '1rem', color: '#000' }}>
                          <input
                            type="radio"
                            name="subCategoryAdd"
                            value={sub}
                            checked={newProductCategory.sub === sub}
                            onChange={() =>
                              setNewProductCategory({ ...newProductCategory, sub })
                            }
                          />
                          {sub}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stock Table */}
                <div>
                  <Label style={{ color: '#000' }}>Stock</Label>
                  <table border="1" style={{ marginTop: '5px', borderCollapse: 'collapse', width: '100%', background: '#fff', color: '#000' }}>
                    <thead>
                      <tr>
                        <th>Size</th>
                        {newProductCategory.main === 'Top' ? (
                          <>
                            <th>Height (cm)</th>
                            <th>Weight (kg)</th>
                            <th>Shoulder (cm)</th>
                            <th>Chest (cm)</th>
                            <th>Stock</th>
                          </>
                        ) : newProductCategory.main === 'Bottom' ? (
                          <>
                            <th>Waist (cm)</th>
                            <th>Hip (cm)</th>
                            <th>Height (cm)</th>
                            <th>Weight (kg)</th>
                            <th>Stock</th>
                          </>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {SIZE_OPTIONS.map(size => {
                        const sizeDataTop = {
                          S: { height: '150–165', weight: '45–60', shoulder: '37–44', chest: '81–92' },
                          M: { height: '155–170', weight: '50–68', shoulder: '39–46', chest: '86–96' },
                          L: { height: '160–175', weight: '55–75', shoulder: '41–48', chest: '91–100' },
                          XL: { height: '165–180', weight: '62–85', shoulder: '43–50', chest: '97–106' },
                        };
                        const sizeDataBottom = {
                          S: { waist: '63–76', hip: '87–92', height: '150–165', weight: '45–60' },
                          M: { waist: '67–82', hip: '91–96', height: '155–170', weight: '50–68' },
                          L: { waist: '71–88', hip: '95–100', height: '160–175', weight: '55–75' },
                          XL: { waist: '77–94', hip: '99–105', height: '165–180', weight: '62–85' },
                        };

                        const data = newProductCategory.main === 'Top' ? sizeDataTop[size] :
                                     newProductCategory.main === 'Bottom' ? sizeDataBottom[size] : null;

                        return (
                          <tr key={size}>
                            <td>{size}</td>
                            {data ? Object.values(data).map((val, i) => <td key={i}>{val}</td>) : null}
                            <td>
                              <Input type="number" value={newProduct.stock[size]} onChange={e => setNewProduct({ ...newProduct, stock: { ...newProduct.stock, [size]: e.target.value } })} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <SaveButton onClick={handleAddProduct}>Save</SaveButton>
                  <CancelButton onClick={() => setAddProduct(false)}>Cancel</CancelButton>
                </div>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* Edit Product Modal */}
        {editProduct && (
          <ModalOverlay onClick={handleModalClick} data-overlay="true">
            <ModalContent
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                width: '1200px',
                maxHeight: '80vh',
                overflowY: 'auto',
                padding: '1.5rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem',
              }}
            >
              {/* left column card */}
              <div style={{
                background: '#fff',
                padding: '1rem',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                color: '#000',
                width: '500px'
              }}>
                <ModalTitle>Edit Product</ModalTitle>
                <Label>Name</Label>
                <Input value={editProduct.name} placeholder='Enter Product Name' onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} />
                <Label>Price</Label>
                <Input type="number" value={editProduct.price} placeholder='Enter Product Price' onChange={e => setEditProduct({ ...editProduct, price: e.target.value })} />
                <Label>Delivery</Label>
                <Input value={editProduct.delivery} placeholder='Enter the Delivery Days' onChange={e => setEditProduct({ ...editProduct, delivery: e.target.value })} />
                <Label>Image URL</Label>
                <Input value={editProduct.imageUrl} onChange={e => setEditProduct({ ...editProduct, imageUrl: e.target.value })} />
                <Label>AR URL/LINK</Label>
                <Input value={editProduct.arUrl} onChange={e => setEditProduct({ ...editProduct, arUrl: e.target.value })} />
                <Label>Description</Label>
                <textarea
                  value={editProduct.description || ''}
                  placeholder="Enter product description"
                  onChange={e => setEditProduct({ ...editProduct, description: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: '100px',  // bigger area for description
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    resize: 'vertical',
                    marginBottom: '1rem'
                  }}
                />

              </div>

              {/* right column card */}
              <div style={{
                background: '#fff',
                padding: '1rem',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                color: '#000',
                width: '610px'
              }}>
                <Label style={{ color: '#a166ff' }}>Stock & Category</Label>
                {/* Category Selection */}
                <div style={{ marginBottom: '1rem' }}>
                  <Label style={{ color: '#000' }}>Main Category</Label>
                  {['Top', 'Bottom'].map(main => (
                    <label key={main} style={{ marginRight: '1rem', color: '#000' }}>
                      <input
                        type="radio"
                        name="mainCategoryEdit"
                        value={main}
                        checked={editProduct.categoryMain === main}
                        onChange={() =>
                          setEditProduct({ ...editProduct, categoryMain: main, categorySub: '' })
                        }
                      />
                      {main.toUpperCase()}
                    </label>
                  ))}

                  {editProduct.categoryMain && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <Label style={{ color: '#000' }}>Sub Category</Label>
                      {subCategoryMap[editProduct.categoryMain].map(sub => (
                        <label key={sub} style={{ marginRight: '1rem', color: '#000' }}>
                          <input
                            type="radio"
                            name="subCategoryEdit"
                            value={sub}
                            checked={editProduct.categorySub === sub}
                            onChange={() =>
                              setEditProduct({ ...editProduct, categorySub: sub })
                            }
                          />
                          {sub}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stock Table */}
                <div>
                  <Label style={{ color: '#000' }}>Stock</Label>
                  <table border="1" style={{ marginTop: '5px', borderCollapse: 'collapse', width: '100%', background: '#fff', color: '#000' }}>
                    <thead>
                      <tr>
                        <th>Size</th>
                        {editProduct.categoryMain === 'Top' ? (
                          <>
                            <th>Height (cm)</th>
                            <th>Weight (kg)</th>
                            <th>Shoulder (cm)</th>
                            <th>Chest (cm)</th>
                            <th>Stock</th>
                          </>
                        ) : editProduct.categoryMain === 'Bottom' ? (
                          <>
                            <th>Waist (cm)</th>
                            <th>Hip (cm)</th>
                            <th>Height (cm)</th>
                            <th>Weight (kg)</th>
                            <th>Stock</th>
                          </>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {SIZE_OPTIONS.map(size => {
                        const sizeDataTop = {
                          S: { height: '150–165', weight: '45–60', shoulder: '37–44', chest: '81–92' },
                          M: { height: '155–170', weight: '50–68', shoulder: '39–46', chest: '86–96' },
                          L: { height: '160–175', weight: '55–75', shoulder: '41–48', chest: '91–100' },
                          XL: { height: '165–180', weight: '62–85', shoulder: '43–50', chest: '97–106' },
                        };
                        const sizeDataBottom = {
                          S: { waist: '63–76', hip: '87–92', height: '150–165', weight: '45–60' },
                          M: { waist: '67–82', hip: '91–96', height: '155–170', weight: '50–68' },
                          L: { waist: '71–88', hip: '95–100', height: '160–175', weight: '55–75' },
                          XL: { waist: '77–94', hip: '99–105', height: '165–180', weight: '62–85' },
                        };

                        const data = editProduct.categoryMain === 'Top' ? sizeDataTop[size] :
                                     editProduct.categoryMain === 'Bottom' ? sizeDataBottom[size] : null;

                        return (
                          <tr key={size}>
                            <td>{size}</td>
                            {data ? Object.values(data).map((val, i) => <td key={i}>{val}</td>) : null}
                            <td>
                              <Input  type="number" value={editProduct.stock[size]} onChange={e => setEditProduct({ ...editProduct, stock: { ...editProduct.stock, [size]: e.target.value } })} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <SaveButton onClick={handleSaveEdit}>Save</SaveButton>
                  <CancelButton onClick={() => setEditProduct(null)}>Cancel</CancelButton>
                </div>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <ModalOverlay onClick={handleModalClick} data-overlay="true">
            <ModalContent style={{ maxWidth: '400px', padding: '1rem', textAlign: 'center', color: '#363636ff', fontSize: '20px'}}>
              <p>Are you sure you want to delete {productToDelete?.name}?</p>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '55px' }}>
                <SaveButton onClick={confirmDelete}>Yes</SaveButton>
                <CancelButton onClick={() => setDeleteConfirm({ show: false, id: null })}>No</CancelButton>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}
      </div>
    </>
  );
};

export default Products;
