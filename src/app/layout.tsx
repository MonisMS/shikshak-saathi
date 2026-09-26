import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari, Geist_Mono } from "next/font/google";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/pwa/pwa";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shikshak Saathi",
  description: "एक अध्याय दें, पूरी कक्षा की तैयारी पाएँ — One chapter in, a full teaching kit out.",
  appleWebApp: { capable: true, title: "शिक्षक साथी", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#1e6a47" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSansDevanagari.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
