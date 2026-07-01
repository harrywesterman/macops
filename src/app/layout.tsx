import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MacOps",
  description: "Interne werkplek voor ABM en Jamf devicebeheer"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
