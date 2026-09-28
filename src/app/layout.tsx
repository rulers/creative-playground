import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liminal — Creative Playground",
  description:
    "001 — Liminal. 光が重なり、ほどけ、またひとつになる。コードでつくる、表現と実験の遊び場。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
