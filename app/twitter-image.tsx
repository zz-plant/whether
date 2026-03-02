import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #020617 0%, #0b1220 45%, #111827 100%)",
          color: "#f8fafc",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          padding: "58px 72px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-70px",
            width: "520px",
            height: "520px",
            borderRadius: "999px",
            background: "radial-gradient(circle, rgba(56, 189, 248, 0.32) 0%, rgba(56, 189, 248, 0) 70%)",
          }}
        />
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "30px",
            border: "2px solid #1f2937",
            background: "#0b1120",
            display: "flex",
            justifyContent: "space-between",
            padding: "52px 58px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "8px",
              background: "linear-gradient(90deg, rgba(56, 189, 248, 0.38) 0%, #38bdf8 50%, rgba(56, 189, 248, 0.32) 100%)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "22px", width: "63%" }}>
            <div style={{ fontSize: "20px", letterSpacing: "2px", color: "#93c5fd", fontWeight: 600 }}>
              MARKET CLIMATE STATION
            </div>
            <div style={{ fontSize: "62px", fontWeight: 700, lineHeight: 1.04 }}>Whether Report</div>
            <div style={{ fontSize: "31px", color: "#cbd5e1", lineHeight: 1.24 }}>
              Macro signals for product and engineering planning
            </div>
            <div style={{ fontSize: "22px", color: "#38bdf8", fontWeight: 600 }}>
              Translate Treasury data into operating priorities.
            </div>
          </div>
          <div
            style={{
              width: "31%",
              borderRadius: "24px",
              border: "1.5px solid #334155",
              background: "linear-gradient(180deg, #111d34 0%, #0b1324 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              padding: "32px",
            }}
          >
            <div style={{ color: "#93c5fd", fontSize: "18px", letterSpacing: "1.4px", fontWeight: 600 }}>
              LIVE METRICS
            </div>
            <div style={{ color: "#e2e8f0", fontSize: "24px", fontWeight: 500 }}>Record date</div>
            <div style={{ color: "#f8fafc", fontSize: "32px", fontWeight: 700 }}>Updated daily</div>
            <div style={{ height: "1px", background: "#334155", width: "100%" }} />
            <div style={{ color: "#e2e8f0", fontSize: "24px", fontWeight: 500 }}>Regime call</div>
            <div style={{ color: "#67e8f9", fontSize: "38px", fontWeight: 700 }}>Live</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
