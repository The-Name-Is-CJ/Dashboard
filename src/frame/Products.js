import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
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
  ButtonGroup,
  SaveButton,
  CancelButton,
} from '../components/dashboardstyles';

const Products = () => {
  const [products, setProducts] = useState([]);

  // Add product modal
  const [addProduct, setAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    delivery: '',
    imageUrl: '',
    stock: '',
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

  // Handle Add Product
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProductCategory.main || !newProductCategory.sub) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      const newProductID = generateNextProductID();
      const docRef = await addDoc(collection(db, 'products'), {
        productID: newProductID,
        name: newProduct.name,
        price: Number(newProduct.price),
        delivery: formatDelivery(newProduct.delivery),
        imageUrl: newProduct.imageUrl || '',
        rating: 0,
        sold: 0,
        stock: Number(newProduct.stock) || 0,
        categoryMain: newProductCategory.main,
        categorySub: newProductCategory.sub,
      });

      await addDoc(collection(db, 'recentActivityLogs'), {
        action: 'added product',
        productId: docRef.id,
        productName: newProduct.name,
        timestamp: serverTimestamp(),
      });

      fetchProducts();
      setAddProduct(false);
      setNewProduct({ name: '', price: '', delivery: '', imageUrl: '', stock: '' });
      setNewProductCategory({ main: '', sub: '' });
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product.');
    }
  };

  // Handle Edit Product Save
  const handleSaveEdit = async () => {
    if (!editProduct.name || !editProduct.price || !editProduct.categoryMain || !editProduct.categorySub) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const productRef = doc(db, 'products', editProduct.id);

      await updateDoc(productRef, {
        name: editProduct.name,
        price: Number(editProduct.price),
        delivery: formatDelivery(editProduct.delivery),
        imageUrl: editProduct.imageUrl || '',
        stock: Number(editProduct.stock) || 0,
        categoryMain: editProduct.categoryMain,
        categorySub: editProduct.categorySub,
      });

      await addDoc(collection(db, 'recentActivityLogs'), {
        action: 'edited product',
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

  // Confirm Delete
  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'products', deleteConfirm.id));
      setProducts(prev => prev.filter(product => product.id !== deleteConfirm.id));
      setDeleteConfirm({ show: false, id: null });

      await addDoc(collection(db, 'recentActivityLogs'), {
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

  // Modal click handler to close modals when clicking outside content
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
    <div
      style={{
        padding: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        color: '#fff',
      }}
    >
      {products.map(product => (
        <div
          key={product.id}
          style={{
            background: 'linear-gradient(135deg, #a166ff, #ebdfff)',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <img
            src={product.imageUrl || 'https://via.placeholder.com/100'}
            alt={product.name}
            style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px' }}
          />
          <h3>{product.productID ? `${product.productID} - ${product.name}` : product.name}</h3>
          <p>₱{product.price}</p>
          <p>⭐ {product.rating}</p>
          <p>Sold: {formatNumber(product.sold)}</p>
          <p>Stock: {product.stock ?? 0}</p>
          <p>Delivery: {product.delivery}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem' }}>
            <button
              onClick={() => setEditProduct(product)}
              style={editBtn}
            >
              Edit
            </button>
            <button
              onClick={() => {
                setProductToDelete(product);
                setDeleteConfirm({ show: true, id: product.id });
              }}
              style={deleteBtn}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <div
        onClick={() => setAddProduct(true)}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '12px',
          height: '350px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          cursor: 'pointer',
          color: '#555',
        }}
      >
        + Add Product
      </div>

      {/* Add Product Modal */}
      {addProduct && (
        <ModalOverlay onClick={handleModalClick} data-overlay="true">
          <ModalContent
            onClick={e => e.stopPropagation()}
            style={{
              width: '80vw',
              maxWidth: '1400px',
              background: 'linear-gradient(135deg, #a166ff, #ebdfff)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              color: '#fff',
              padding: '2rem',
              borderRadius: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: 'auto',
            }}
          >
            <div style={{ gridColumn: '1 / -1' }}>
              <ModalTitle style={{ color: '#fff' }}>Add Product</ModalTitle>
            </div>

            <div>
              <Label>Name</Label>
              <Input
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                value={newProduct.price}
                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Delivery</Label>
              <Input
                value={newProduct.delivery}
                onChange={e => setNewProduct({ ...newProduct, delivery: e.target.value })}
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={newProduct.imageUrl}
                onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={newProduct.stock}
                onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Main Category</Label>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                {['Top', 'Bottom'].map(cat => (
                  <label key={cat} style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="mainCategory"
                      value={cat}
                      checked={newProductCategory.main === cat}
                      onChange={e => setNewProductCategory({ main: e.target.value, sub: '' })}
                      style={{ marginRight: '0.5rem' }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* Only show subcategory if main is selected */}
            {newProductCategory.main && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Subcategory</Label>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  {subCategoryMap[newProductCategory.main].map(sub => (
                    <label key={sub} style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="subCategory"
                        value={sub}
                        checked={newProductCategory.sub === sub}
                        onChange={e => setNewProductCategory({ ...newProductCategory, sub: e.target.value })}
                        style={{ marginRight: '0.5rem' }}
                      />
                      {sub}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '2rem',
                gap: '1rem',
              }}
            >
              <ButtonGroup>
                <SaveButton onClick={handleAddProduct}>Add</SaveButton>
                <CancelButton
                  onClick={() => {
                    setAddProduct(false);
                    setNewProductCategory({ main: '', sub: '' });
                    setNewProduct({ name: '', price: '', delivery: '', imageUrl: '', stock: '' });
                  }}
                >
                  Cancel
                </CancelButton>
              </ButtonGroup>
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
              width: '80vw',
              maxWidth: '1400px',
              background: 'linear-gradient(135deg, #a166ff, #ebdfff)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              color: '#fff',
              padding: '2rem',
              borderRadius: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: 'auto',
            }}
          >
            <div style={{ gridColumn: '1 / -1' }}>
              <ModalTitle style={{ color: '#fff' }}>Edit Product</ModalTitle>
            </div>

            <div>
              <Label>Product ID</Label>
              <Input value={editProduct.productID || ''} readOnly />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={editProduct.name}
                onChange={e => setEditProduct({ ...editProduct, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                value={editProduct.price}
                onChange={e => setEditProduct({ ...editProduct, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Delivery</Label>
              <Input
                value={editProduct.delivery}
                onChange={e => setEditProduct({ ...editProduct, delivery: e.target.value })}
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={editProduct.imageUrl}
                onChange={e => setEditProduct({ ...editProduct, imageUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={editProduct.stock}
                onChange={e => setEditProduct({ ...editProduct, stock: e.target.value })}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Main Category</Label>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                {['Top', 'Bottom'].map(cat => (
                  <label key={cat} style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="editMainCategory"
                      value={cat}
                      checked={editProduct.categoryMain === cat}
                      onChange={e =>
                        setEditProduct({
                          ...editProduct,
                          categoryMain: e.target.value,
                          categorySub: '',
                        })
                      }
                      style={{ marginRight: '0.5rem' }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* Show subcategory only if main selected */}
            {editProduct.categoryMain && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Subcategory</Label>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  {subCategoryMap[editProduct.categoryMain].map(sub => (
                    <label key={sub} style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="editSubCategory"
                        value={sub}
                        checked={editProduct.categorySub === sub}
                        onChange={e =>
                          setEditProduct({ ...editProduct, categorySub: e.target.value })
                        }
                        style={{ marginRight: '0.5rem' }}
                      />
                      {sub}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '2rem',
                gap: '1rem',
              }}
            >
              <ButtonGroup>
                <SaveButton onClick={handleSaveEdit}>Save</SaveButton>
                <CancelButton onClick={() => setEditProduct(null)}>Cancel</CancelButton>
              </ButtonGroup>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <ModalOverlay onClick={handleModalClick} data-overlay="true">
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalTitle>Confirm Delete</ModalTitle>
            <p>Are you sure you want to delete this item?</p>
            <ButtonGroup>
              <CancelButton onClick={() => setDeleteConfirm({ show: false, id: null })}>
                Cancel
              </CancelButton>
              <SaveButton onClick={confirmDelete} style={{ backgroundColor: '#A94444' }}>
                Delete
              </SaveButton>
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}
    </div>
  );
};

const editBtn = {
  padding: '12px 20px',
  width: '100px',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: '600',
  backgroundColor: 'rgba(10, 21, 227, 1)',
};

const deleteBtn = {
  backgroundColor: '#e20f0fff',
  padding: '12px 20px',
  width: '100px',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: '600',
};

export default Products;
