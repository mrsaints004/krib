import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0D1015",
          borderRadius: 6,
          fontFamily: "serif",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 20,
          color: "#1E6F5C",
        }}
      >
        K
      </div>
    ),
    { ...size }
  );
}
