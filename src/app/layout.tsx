import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Locana - Local Eco-Attractions & Nature Bookings Philippines",
  description: "Explore, Discover, Recover and breathe with nature near to you. Discover hidden gems, support local guides, and book eco-certified nature experiences in the Philippines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-[#fcfdfd] text-[#1a2822] antialiased">
        {children}
      </body>
    </html>
  );
}
