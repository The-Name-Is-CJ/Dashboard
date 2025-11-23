import GradientBackground from "../components/gradientbackground";

export default function SplashScreen() {
  return (
    <GradientBackground>
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/asset/icon.png"
          alt="Splash Icon"
          style={{ width: 150, height: 150 }}
        />
      </div>
    </GradientBackground>
  );
}
