import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: {
    default: "Memories: Event Photo Album",
    template: "%s | Memories",
  },
  description:
    "Private photo and video sharing for events. Create an album, share a code with guests, and collect memories together — no accounts required.",
  applicationName: "Memories",
  keywords: [
    "event photos",
    "photo sharing",
    "private album",
    "event memories",
    "guest uploads",
  ],
  openGraph: {
    title: "Memories: Event Photo Album.",
    description:
      "Private photo and video sharing for events. Create an album, share a code with guests, and collect memories together — no accounts required.",
    type: "website",
    siteName: "Memories",
  },
  twitter: {
    card: "summary",
    title: "Memories: Event Photo Album.",
    description:
      "Private photo and video sharing for events. Create an album, share a code with guests, and collect memories together — no accounts required.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
