import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://bizlist.app"),
  title: "BizList — Local Listings, Feed & Partnerships",
  description:
    "Discover local businesses on BizList. Browse listings, follow the feed for jobs and deals, and create B2B partnerships.",
  icons: {
    icon: "/bizlist-logo.png",
    apple: "/bizlist-logo.png",
  },
  openGraph: {
    title: "BizList",
    description: "Listings. Feed. Partnerships.",
    images: ["/bizlist-logo.png"],
  },
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
