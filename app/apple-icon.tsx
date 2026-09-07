import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 108,
          background: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#a78bfa",
          borderRadius: 40,
          border: "4px solid #7c3aed",
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif"
        }}
      >
        SW
      </div>
    ),
    {
      ...size,
    }
  );
}
