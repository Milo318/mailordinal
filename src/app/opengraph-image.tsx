import { ImageResponse } from "next/og";

export const alt = "MailOrdinal — Decision-native enterprise inbox";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#101210",
        color: "#f7f7f2",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#c9ff62",
            color: "#101210",
            fontWeight: 800,
          }}
        >
          M
        </div>
        MailOrdinal
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1000 }}>
        <div style={{ color: "#c9ff62", fontSize: 22, letterSpacing: 3 }}>
          DECISION-NATIVE INBOX
        </div>
        <div style={{ fontSize: 76, lineHeight: 1.04, fontWeight: 730 }}>
          Typed signals. Deterministic policy. One ranked queue.
        </div>
      </div>
      <div style={{ display: "flex", gap: 22, color: "#a9aea8", fontSize: 22 }}>
        <span>Route</span>
        <span>•</span>
        <span>Rank</span>
        <span>•</span>
        <span>Review uncertainty</span>
      </div>
    </div>,
    size,
  );
}
