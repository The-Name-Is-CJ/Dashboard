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
  SaveButton,
  CancelButton,
} from '../components/dashboardstyles';

// ✅ Fixed options
const COLOR_OPTIONS = ['Black', 'White', 'Red', 'Yellow', 'Blue'];
const SIZE_OPTIONS = ['S', 'M', 'L'];

const Products = () => {
  const [products, setProducts] = useState([]);

  // Add product modal
  const [addProduct, setAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    delivery: '',
    imageUrl: '',
    stock: {}, // 
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

  const initializeFullStock = (currentStock = {}) => {
  const stock = {};
  COLOR_OPTIONS.forEach(color => {
    stock[color] = {};
    SIZE_OPTIONS.forEach(size => {
      // Use existing value if available, otherwise 0
      stock[color][size] = currentStock?.[color]?.[size] ?? 0;
    });
  });
  return stock;
  }; 
    
  const getColorsInStock = (stock) => {
    if (!stock) return 'No stock';
    return COLOR_OPTIONS
      .filter(color =>
        SIZE_OPTIONS.some(size => stock[color]?.[size] > 0)
      ).join(', ') || 'No stock';
  };

const getSizesInStock = (stock) => {
  if (!stock) return 'No stock';
  return SIZE_OPTIONS
    .filter(size =>
      COLOR_OPTIONS.some(color => stock[color]?.[size] > 0)
    ).join(', ') || 'No stock';
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
        stock: initializeFullStock(newProduct.stock), // ✅ structured stock
        categoryMain: newProductCategory.main,
        categorySub: newProductCategory.sub,
        colors: COLOR_OPTIONS,
        sizes: SIZE_OPTIONS,
      });

      await addDoc(collection(db, 'recentActivityLogs'), {
        action: 'added product',
        productId: docRef.id,
        productName: newProduct.name,
        timestamp: serverTimestamp(),
      });

      fetchProducts();
      setAddProduct(false);
      setNewProduct({ name: '', price: '', delivery: '', imageUrl: '', stock: initializeFullStock() });
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
        stock: initializeFullStock(editProduct.stock),
        categoryMain: editProduct.categoryMain,
        categorySub: editProduct.categorySub,
        colors: COLOR_OPTIONS,
        sizes: SIZE_OPTIONS,
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

  // Modal click handler
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
          <p>Delivery: {product.delivery}</p>

          {/* ✅ Stock Table */}
          <div>
            <Label>Colors</Label>
            <p style={{ color: '#000', background: '#fff', padding: '4px', borderRadius: '4px' }}>
              {getColorsInStock(product.stock)}
            </p>

            <Label>Sizes</Label>
            <p style={{ color: '#000', background: '#fff', padding: '4px', borderRadius: '4px' }}>
              {getSizesInStock(product.stock)}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem' }}>
            <button
              onClick={() => {
                setEditProduct(product);
              }}
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
        maxWidth: '90vw',      // landscape
        width: '1200px',
        maxHeight: '80vh',
        overflowY: 'auto',     // scrollable
        padding: '1.5rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
      }}
    >
      {/* left column: product info */}
      <div>
        <ModalTitle>Add Product</ModalTitle>
        <Label>Name</Label>
        <Input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
        <Label>Price</Label>
        <Input type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
        <Label>Delivery</Label>
        <Input value={newProduct.delivery} onChange={e => setNewProduct({ ...newProduct, delivery: e.target.value })} />
        <Label>Image URL</Label>
        <Input value={newProduct.imageUrl} onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })} />
      </div>

      {/* right column: stock table */}
      <div>
        <Label>Stock</Label>
        <Label style={{ color: '#000' }}>Stock</Label>
          <table border="1" style={{ marginTop: '5px', borderCollapse: 'collapse', width: '100%', background: '#fff', color: '#000' }}>
            <thead>
              <tr>
                <th>Color</th>
                {SIZE_OPTIONS.map(size => (
                  <th key={size}>{size}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COLOR_OPTIONS.map(color => (
                <tr key={color}>
                  <td>{color}</td>
                  {SIZE_OPTIONS.map(size => (
                    <td key={size}>
                      <input
                        type="number"
                        value={newProduct.stock?.[color]?.[size] ?? 0}
                        onChange={e => {
                          const updated = { ...newProduct.stock };
                          if (!updated[color]) updated[color] = {};
                          updated[color][size] = Number(e.target.value);
                          setNewProduct({ ...newProduct, stock: updated });
                        }}
                        style={{ width: '60px' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

        {/* Category Selection */}
          <div style={{ marginTop: '1rem' }}>
            <Label style={{ color: '#000' }}>Main Category</Label>
            {['Top', 'Bottom'].map(main => (
              <label key={main} style={{ marginRight: '1rem', color: '#000' }}>
                <input
                  type="radio"
                  name="mainCategory"
                  value={main}
                  checked={newProductCategory.main === main}
                  onChange={() => setNewProductCategory({ ...newProductCategory, main: main, sub: '' })}
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
                      name="subCategory"
                      value={sub}
                      checked={newProductCategory.sub === sub}
                      onChange={() => setNewProductCategory({ ...newProductCategory, sub })}
                    />
                    {sub}
                  </label>
                ))}
              </div>
            )}
          </div>

      </div>

      {/* footer buttons */}
      <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <SaveButton onClick={handleAddProduct}>Add</SaveButton>
        <CancelButton onClick={() => setAddProduct(false)}>Cancel</CancelButton>
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
        maxWidth: '90vw',      // almost full width
        width: '1200px',       // fixed wide width
        maxHeight: '80vh',     // max height to fit screen
        overflowY: 'auto',     // allow vertical scrolling
        padding: '1.5rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr', // two-column layout
        gap: '1.5rem',
      }}
    >
      {/* left column: product info */}
      <div>
        <ModalTitle>Edit Product</ModalTitle>
        <Label>Product ID</Label>
        <Input value={editProduct.productID || ''} readOnly />
        <Label>Name</Label>
        <Input value={editProduct.name} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} />
        <Label>Price</Label>
        <Input type="number" value={editProduct.price} onChange={e => setEditProduct({ ...editProduct, price: e.target.value })} />
        <Label>Delivery</Label>
        <Input value={editProduct.delivery} onChange={e => setEditProduct({ ...editProduct, delivery: e.target.value })} />
        <Label>Image URL</Label>
        <Input value={editProduct.imageUrl} onChange={e => setEditProduct({ ...editProduct, imageUrl: e.target.value })} />
      </div>

      {/* right column: stock table */}
      <div>
        <Label>Stock</Label>
        <table border="1" style={{ marginTop: '5px', borderCollapse: 'collapse', width: '100%', background: '#fff', color: '#000' }}>
          <thead>
            <tr>
              <th>Color</th>
              {SIZE_OPTIONS.map(size => (
                <th key={size}>{size}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COLOR_OPTIONS.map(color => (
              <tr key={color}>
                <td>{color}</td>
                {SIZE_OPTIONS.map(size => (
                  <td key={size}>
                    <input
                      type="number"
                      value={editProduct.stock?.[color]?.[size] ?? 0}
                      onChange={e => {
                        const updated = { ...editProduct.stock };
                        if (!updated[color]) updated[color] = {};
                        updated[color][size] = Number(e.target.value);
                        setEditProduct({ ...editProduct, stock: updated });
                      }}
                      style={{ width: '60px' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Category Selection */}
          <div style={{ marginTop: '1rem' }}>
            <Label style={{ color: '#000' }}>Main Category</Label>
            {['Top', 'Bottom'].map(main => (
              <label key={main} style={{ marginRight: '1rem', color: '#000' }}>
                <input
                  type="radio"
                  name="mainCategoryEdit"
                  value={main}
                  checked={editProduct.categoryMain === main}
                  onChange={() => setEditProduct({ ...editProduct, categoryMain: main, categorySub: '' })}
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
                      onChange={() => setEditProduct({ ...editProduct, categorySub: sub })}
                    />
                    {sub}
                  </label>
                ))}
              </div>
            )}
          </div>

      </div>

      {/* footer buttons spanning both columns */}
      <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <SaveButton onClick={handleSaveEdit}>Save</SaveButton>
        <CancelButton onClick={() => setEditProduct(null)}>Cancel</CancelButton>
      </div>
    </ModalContent>
  </ModalOverlay>
)}


      {/* Delete Confirmation */}
      {deleteConfirm.show && (
        <ModalOverlay onClick={handleModalClick} data-overlay="true">
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalTitle>Confirm Delete</ModalTitle>
            <p>Are you sure you want to delete {productToDelete?.name}?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <SaveButton onClick={confirmDelete}>Yes</SaveButton>
              <CancelButton onClick={() => setDeleteConfirm({ show: false, id: null })}>Cancel</CancelButton>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </div>
  );
};

const editBtn = {
  background: '#fff',
  color: '#000',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  cursor: 'pointer',
};

const deleteBtn = {
  background: '#ccc',
  color: '#000',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  cursor: 'pointer',
};

export default Products;
