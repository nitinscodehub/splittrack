import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SplitTrack — Split bills, not friendships",
    short_name: "SplitTrack",
    description:
      "Share bills with friends and see one clear amount per person. Exact amounts, simple payments, and full history.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0b0a16",
    theme_color: "#4f46e5",
    categories: ["finance", "productivity", "social"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Add bill", url: "/dashboard?add=1" },
      { name: "Payments", url: "/dues" },
    ],
  };
}
