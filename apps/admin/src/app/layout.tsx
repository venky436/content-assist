import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Assist Admin",
  description: "Admin dashboard for Content Assist",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
