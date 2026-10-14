import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Playground — Liminal / Field / Life",
  description:
    "001 — Liminal、002 — Field、003 — Life。光を見ることから触れて変化させ、共有することへ。コードでつくる、表現と実験の遊び場。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
