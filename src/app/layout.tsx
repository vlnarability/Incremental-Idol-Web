import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Idol Idle — Incremental Idol Prototype",
  description: "A browser-playable M2 vertical slice of Idol Idle: click to perform as an idol, build a fanbase, release songs, and reach the prestige milestone. Designed as a web prototype of an eventual Steam/Godot game.",
  keywords: ["incremental game", "idle game", "idol", "clicker", "Next.js", "TypeScript"],
  authors: [{ name: "Idol Idle" }],
  icons: {
    icon: "/game/icon-fans.png",
  },
  openGraph: {
    title: "Idol Idle — Web Prototype",
    description: "Incremental idle game where you grow from open-mic-night idol to superstar.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
