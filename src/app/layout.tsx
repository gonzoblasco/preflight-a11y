import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Preflight — the pre-launch accessibility gate for AI-built sites",
  description: "Proves your AI-built site actually works for screen reader users.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
