import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "SpendWise - Smart Personal Finance & Expense Tracker";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #08070b 0%, #120d20 50%, #1e1136 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          padding: 60,
          border: "8px solid #7c3aed"
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 300,
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 70%)",
            filter: "blur(60px)",
            top: 150,
            left: 300,
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 24px",
            background: "rgba(139, 92, 246, 0.2)",
            border: "1px solid rgba(167, 139, 250, 0.5)",
            borderRadius: 50,
            color: "#c4b5fd",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.05em",
            marginBottom: 28,
          }}
        >
          ✨ AI-POWERED FINANCIAL INTELLIGENCE
        </div>

        {/* Brand Name */}
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            marginBottom: 20,
          }}
        >
          SPEND<span style={{ color: "#a78bfa" }}>WISE</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#d4d4d8",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Take absolute control of your spending, track EMIs, enforce 50/30/20 budgets, and build lasting wealth.
        </div>

        {/* Footer features */}
        <div
          style={{
            display: "flex",
            gap: 36,
            marginTop: 48,
            fontSize: 18,
            color: "#a1a1aa",
            fontWeight: 600,
          }}
        >
          <span>🔒 100% Private & Encrypted</span>
          <span>•</span>
          <span>⚡ Real-time Analytics</span>
          <span>•</span>
          <span>🏆 Milestone Achievements</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
