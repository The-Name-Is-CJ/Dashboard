export default function GradientBackground({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #a166ff, #ebdfff)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}
