import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAIS Sourcing Dashboard",
  description: "SF AI event sourcing for the CAIS Head of Delivery search.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 font-sans antialiased">{children}</body>
    </html>
  );
}
