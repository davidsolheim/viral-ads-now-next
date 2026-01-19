import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Viral Ads Now - Create Instant Video Ads",
  description: "Create professional video advertisements instantly from product links using AI",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Viral Ads Now - Create Instant Video Ads",
    description: "Create professional video advertisements instantly from product links using AI",
    images: [
      {
        url: "/banner.png",
        width: 1200,
        height: 630,
        alt: "Viral Ads Now",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Viral Ads Now - Create Instant Video Ads",
    description: "Create professional video advertisements instantly from product links using AI",
    images: ["/banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
