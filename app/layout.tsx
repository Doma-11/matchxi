import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MatchXI · Tables, highlights & statistics",
  description: "Follow league standings, football highlights and player and team statistics across England, Spain, Italy, Germany and Croatia, plus national teams.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
