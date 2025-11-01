import styled from "styled-components";

export const Colors = {
  primary: "#EDEDED",
  secondary: "#a166ff",
  white: "#FFFFFF",
  black: "#000000",
  gray: "#717171",
  gradient: [
    "#a166ff", "#a875ff", "#b183ff", "#ba92ff",
    "#c3a0ff", "#cdb0ff", "#d6bfff", "#e0cfff", "#ebdfff"
  ]
};

const { primary, secondary, white, black, gray } = Colors;

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
`;

export const ModalContent = styled.div`
  background-color: ${white};
  padding: 30px;
  border-radius: 16px;
  width: 400px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
`;

export const ModalTitle = styled.h2`
  font-size: 1.75rem;
  color: ${secondary};
  margin-bottom: 1.5rem;
  font-family: 'Krona One', sans-serif;
`;

export const Label = styled.label`
  color: ${black};
  font-size: 1rem;
  display: block;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
`;

export const Input = styled.input`
  width: 90%;
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid ${gray};
  background-color: ${white};
  font-size: 0.9rem;
  margin-bottom: 10px;
  color: ${black};
  text-indent: 0;      
  text-align: left;     
  box-sizing: border-box;

   &:focus {
    outline: none;
    border-color: ${Colors.secondary}; // purple border
    box-shadow: 0 0 4px ${Colors.secondary};
`;


export const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
`;

export const SaveButton = styled.button`
  padding: 14px 60px;
  background-color: ${secondary};
  color: ${white};
  font-size: 1rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;

  &:hover {
    background-color: #462e6c;
  }
`;

export const CancelButton = styled.button`
  padding: 14px 60px;
  margin-left: 12px;
  background-color: ${gray};
  color: ${white};
  font-size: 1rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;

  &:hover {
    background-color: #5e5e5e;
  }
`;

// ✅ Added these new styles
export const TableWrapper = styled.div`
  overflow-x: auto;
  width: 200%;
  margin-top: 1rem;
`;

export const StyledTable = styled.table`
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;

  tbody {
    font-size: 1px;
  }

  th {
    text-align: left;
    padding: 12px 16px;
    border: 1px solid ${gray};
  }

  img {
    object-fit: cover;
    border-radius: 8px;
  }

  button {
    margin-right: 8px;
    padding: 8px 12px;
    font-size: 0.9rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background-color: ${secondary};
    color: ${white};

    &:hover {
      background-color: #735d97ff;
    }
  }
`;
