import React, { useEffect, useState } from 'react';
import styled from 'styled-components'; // <-- move this to top
import { FaStar, FaUserCircle } from 'react-icons/fa';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const Reviews = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviews, setReviews] = useState([]);

  // Fetch all products
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(prods);
      if (!selectedProduct && prods.length > 0) setSelectedProduct(prods[0]);
    });
    return () => unsubscribe();
  }, []);

  // Fetch reviews for selected product
  useEffect(() => {
    if (!selectedProduct) return;
    const q = query(
      collection(db, 'productReviews'),
      where('productID', '==', selectedProduct.productID) // note: match productID string
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReviews(data);
    });
    return () => unsubscribe();
  }, [selectedProduct]);

  const renderStars = (count) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        i < count ? <FaStar key={i} /> : <FaStar key={i} style={{ opacity: 0.3 }} />
      );
    }
    return stars;
  };

  return (
    <Container>
      <SideNav>
        {products.map((product) => (
          <ProductItem
            key={product.id}
            selected={selectedProduct?.id === product.id}
            onClick={() => setSelectedProduct(product)}
          >
            <div>{product.name}</div>
            <div className="product-id">{product.productID}</div>
          </ProductItem>
        ))}
      </SideNav>
      <ReviewPanel>
        {selectedProduct ? (
          <>
            <h2>{selectedProduct.name} Reviews</h2>
            {reviews.length === 0 && <p>No reviews yet.</p>}
            {reviews.map((review) => (
              <ReviewItem key={review.reviewID}>
                <ReviewerRow>
                  <FaUserCircle size={20} />
                  <ReviewInfoText>
                    <div>{review.userName}</div>
                    <div>Size: {review.size || 'Unknown'}</div>
                  </ReviewInfoText>
                </ReviewerRow>
                <StarRating>{renderStars(review.rating)}</StarRating>
                <CommentText>{review.comment}</CommentText>
                <small>
                  {review.createdAt
                    ? review.createdAt.toDate
                      ? review.createdAt.toDate().toLocaleString()
                      : new Date(review.createdAt.seconds * 1000).toLocaleString()
                    : ''}
                </small>
              </ReviewItem>
            ))}


          </>
        ) : (
          <p>Select a product to view reviews</p>
        )}
      </ReviewPanel>
    </Container>
  );
};

export default Reviews;

// ================= Styled Components =================

const Container = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #f5f0ff;
`;

const SideNav = styled.div`
  width: 300px;
  background: #d9c6ff;
  overflow-y: auto;
  padding: 1rem;
`;

const ProductItem = styled.div`
  padding: 0.8rem;
  margin-bottom: 0.5rem;
  border-radius: 10px;
  background: ${(props) => (props.selected ? '#a166ff' : 'transparent')};
  color: ${(props) => (props.selected ? '#fff' : '#000')};
  cursor: pointer;
  &:hover {
    background: #b788ff;
    color: #fff;
  }
  .product-id {
    font-size: 0.8rem;
    margin-top: 2px;
  }
`;

const ReviewPanel = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
`;

const ReviewItem = styled.div`
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
`;

const ReviewerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ReviewInfoText = styled.div`
  font-size: 0.9rem;
  font-weight: bold;
  display: flex;
  gap: 2rem;
`;

const StarRating = styled.div`
  color: gold;
  display: flex;
  gap: 2px;
  margin-top: 4px;
`;

const CommentText = styled.div`
  font-size: 0.9rem;
  margin-top: 4px;
  line-height: 1.3;
`;
