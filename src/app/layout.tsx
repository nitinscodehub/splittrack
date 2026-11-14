import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "SplitTrack — Split bills, not friendships",
    template: "%s · SplitTrack",
  },
  description:
    "Share bills with friends and see one clear amount per person. Exact amounts, simple payments, and full history.",
  applicationName: "SplitTrack",
  keywords: ["shared bills", "split bills", "bill tracker", "friends", "payments", "India"],
  authors: [{ name: "SplitTrack" }],
  creator: "SplitTrack",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "SplitTrack",
    title: "SplitTrack — Split bills, not friendships",
    description:
      "Track who paid and who pays next, without awkward reminders. One clear balance per friend.",
    url: appUrl,
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "SplitTrack" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SplitTrack — Split bills, not friendships",
    description: "A simple shared bill tracker for friends. Exact amounts and full history.",
  },
  appleWebApp: {
    capable: true,
    title: "SplitTrack",
    statusBarStyle: "black-translucent",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a16" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
