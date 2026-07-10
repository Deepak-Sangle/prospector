import { ImageResponse } from "next/og";

// Apple touch icon (raster required — SVG isn't supported for apple-icon).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#BB7558",
        borderRadius: 40,
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FBF7F0"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 21 14 10" />
        <path d="M4.5 8.5c3-3 8-4 15-2.5-5 .5-8 2-9.5 3.5S8 16.5 7 21.5c-1.5-7-2.5-10-2.5-13Z" />
      </svg>
    </div>,
    size,
  );
}
