import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaStar, FaUserCircle } from 'react-icons/fa';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust if path differs

const FullScreenContainer = styled.div`
  height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #a166ff, #ebdfff);
  padding: 2rem;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

const ReviewCard = styled.div`
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 800px;
  height: 100%;
  padding: 1.5rem;
  overflow: hidden;
`;

const IconBox = styled.div`
  font-size: 1.8rem;
  color: #fff;
`;

const LabelBox = styled.div`
  line-height: 1.4;
`;

const Label = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
`;

const ReviewsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
  font-size: 0.95rem;
  color: #fff;
`;

const ReviewItem = styled.div`
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 12px;
`;

const ReviewHeader = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 6px;
`;

const ReviewerRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ReviewerIcon = styled.div`
  font-size: 1.4rem;
`;

const ReviewInfoText = styled.div`
  font-size: 0.9rem;
  font-weight: bold;
  display: flex;
  gap: 2rem;
  align-items: center;
`;

const InfoPart = styled.div`
  min-width: 120px;
  white-space: nowrap;
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

const convertColorToName = (color) => {
  const map = {
    '#FF0000': 'Red',
    '#00FF00': 'Lime',
    '#0000FF': 'Blue',
    '#FFFF00': 'Yellow',
    '#FFA500': 'Orange',
    '#800080': 'Purple',
    '#000000': 'Black',
    '#FFFFFF': 'White',
    '#A166FF': 'Lavender',
    '#FFB6C1': 'Pink',
  };
  if (!color) return 'Unknown';
  const normalized = color.trim().toUpperCase();
  return map[normalized] || color;
};

const renderStars = (count) => {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      i < count ? <FaStar key={i} /> : <FaStar key={i} style={{ opacity: 0.3 }} />
    );
  }
  return stars;
};

const Reviews = () => {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'productReviews'), async (snapshot) => {
      const dataWithProductDetails = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let productName = '';
          let shortProductID = '';

          try {
            // Fetch the product doc from 'products' collection using productId from review
            const productRef = doc(db, 'products', data.productId);
            const productDoc = await getDoc(productRef);
            if (productDoc.exists()) {
              const productData = productDoc.data();
              productName = productData.name || '';
              // productID (e.g. CP002) is stored in 'productID' field in products collection
              shortProductID = productData.productID || '';
            }
          } catch (error) {
            console.error('Error fetching product data:', error);
          }

          return {
            id: docSnap.id,
            ...data,
            productName,
            shortProductID,
          };
        })
      );

      setReviews(dataWithProductDetails);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FullScreenContainer>
      <ReviewCard>
        <IconBox>
          <FaStar />
        </IconBox>
        <LabelBox>
          <Label>Product Reviews</Label>
        </LabelBox>
        <ReviewsList>
          {reviews.map((review) => (
            <ReviewItem key={review.id}>
              <ReviewHeader>
                <ReviewerRow>
                  <ReviewerIcon>
                    <FaUserCircle />
                  </ReviewerIcon>
                  <ReviewInfoText>
                    <InfoPart>{review.userName}</InfoPart>
                    <InfoPart>Short Product ID: {review.shortProductID}</InfoPart>
                    <InfoPart>Color: {convertColorToName(review.avatarColor)}</InfoPart>
                  </ReviewInfoText>
                </ReviewerRow>
                <StarRating>{renderStars(review.rating)}</StarRating>
              </ReviewHeader>
              <CommentText>{review.comment}</CommentText>
            </ReviewItem>
          ))}
        </ReviewsList>
      </ReviewCard>
    </FullScreenContainer>
  );
};

export default Reviews;
