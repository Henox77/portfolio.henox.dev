import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Netlify sets URL to the site's primary domain in builds and functions.
const SITE_URL = process.env.URL ?? "https://portfolio.henox.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Henox | Portfolyo",
  description:
    "Full-stack geliştirici, İstanbul. Masama otur — monitörler şu anda tam olarak ne üzerinde çalıştığımı gösteriyor.",
  openGraph: {
    title: "Henox | Portfolyo",
    description:
      "Masama otur. Monitörler şu anda tam olarak ne üzerinde çalıştığımı gösteriyor.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1918",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
