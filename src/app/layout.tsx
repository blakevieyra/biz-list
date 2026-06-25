import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://AllConnect.app"),
  title: "AllConnect — Local Listings, Feed & Partnerships",
  description:
    "Discover local businesses on AllConnect. Browse listings, follow the feed for jobs and deals, and create B2B partnerships.",
  icons: {
    icon: "/AllConnect-logo.png",
    apple: "/AllConnect-logo.png",
  },
  openGraph: {
    title: "AllConnect",
    description: "Listings. Feed. Partnerships.",
    images: ["/AllConnect-logo.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
