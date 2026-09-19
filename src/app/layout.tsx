import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "MailOrdinal — Decision-native enterprise inbox",
    template: "%s · MailOrdinal",
  },
  description:
    "A reference architecture for typed AI decisions, deterministic priority policy, and confidence-aware enterprise email routing.",
  applicationName: "MailOrdinal",
  keywords: [
    "enterprise inbox",
    "decision systems",
    "email triage",
    "Jev",
    "TypeSafe AI",
    "probabilistic software",
  ],
  openGraph: {
    title: "MailOrdinal",
    description: "Typed model signals. Deterministic policy. One ranked inbox.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MailOrdinal",
    description: "A decision-native enterprise inbox.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101210",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
