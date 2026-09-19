import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MailOrdinal",
    short_name: "MailOrdinal",
    description: "A decision-native enterprise inbox.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f0ea",
    theme_color: "#101210",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
