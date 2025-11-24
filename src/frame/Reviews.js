import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FaStar, FaUserCircle } from "react-icons/fa";
import styled from "styled-components";
import { db } from "../firebase";

const Reviews = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const prods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(prods);
      if (!selectedProduct && prods.length > 0) setSelectedProduct(prods[0]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    const q = query(
      collection(db, "productReviews"),
      where("productID", "==", selectedProduct.productID),
      where("comment", "!=", "")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReviews(data);
    });
    return () => unsubscribe();
  }, [selectedProduct]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const prods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      prods.sort((a, b) => {
        if (!a.productID) return 1;
        if (!b.productID) return -1;
        return a.productID.localeCompare(b.productID, undefined, {
          numeric: true,
        });
      });

      setProducts(prods);

      if (!selectedProduct && prods.length > 0) setSelectedProduct(prods[0]);
    });

    return () => unsubscribe();
  }, []);

  const renderStars = (count) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        i < count ? (
          <FaStar key={i} />
        ) : (
          <FaStar key={i} style={{ opacity: 0.3 }} />
        )
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
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div className="product-id" style={{ fontWeight: "bold" }}>
                {product.productID} -
              </div>
              <div>{product.productName}</div>
            </div>
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
                  <FaUserCircle size={24} />
                  <ReviewInfoText>
                    <div>{review.userName}</div>
                    <div>Size: {review.size || "Unknown"}</div>
                  </ReviewInfoText>
                </ReviewerRow>
                <StarRating>{renderStars(review.rating)}</StarRating>
                <CommentText>{review.comment}</CommentText>
                <ReviewDate>
                  {review.createdAt
                    ? review.createdAt.toDate
                      ? review.createdAt.toDate().toLocaleString()
                      : new Date(
                          review.createdAt.seconds * 1000
                        ).toLocaleString()
                    : ""}
                </ReviewDate>
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

const Container = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #f5f0ff;
`;

const SideNav = styled.div`
  width: 500px;
  background: #d9c6ff;
  overflow-y: auto;
  padding: 1rem;
`;

const ProductItem = styled.div`
  width: 100%;
  padding: 1.2rem;
  margin-bottom: 0.6rem;
  border-radius: 10px;
  background: ${(props) => (props.selected ? "#a166ff" : "transparent")};
  color: ${(props) => (props.selected ? "#fff" : "#000")};
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 1.2rem;
  &:hover {
    background: #b788ff;
    color: #fff;
  }
  .product-id {
    font-size: 1.2rem;
    margin-top: 0;
    font-weight: bold;
  }
`;

const ReviewPanel = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const ReviewItem = styled.div`
  width: 90%;
  max-width: 1000px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 14px;
  font-size: 1rem;
  display: flex;
  flex-direction: column;
`;
const ReviewerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
`;

const ReviewInfoText = styled.div`
  font-size: 1rem;
  font-weight: bold;
  display: flex;
  gap: 2.5rem;
`;

const StarRating = styled.div`
  color: gold;
  display: flex;
  gap: 3px;
  margin-top: 6px;
`;

const CommentText = styled.div`
  font-size: 1.05rem;
  margin-top: 6px;
  line-height: 1.4;
`;
const ReviewDate = styled.small`
  width: 100%;
  text-align: right;
  font-size: 0.8rem;
  color: #555;
  margin-top: 4px;
`;
