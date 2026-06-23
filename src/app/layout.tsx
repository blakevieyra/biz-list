import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://all-connect-seven.vercel.app",
  ),
  title: "AllConnect — Local Business Directory & Community",
  description:
    "Discover local businesses and organizations, join forums, collaborate on joint ventures, and build your profile from scratch.",
  icons: {
    icon: "/allconnect-logo.png",
    apple: "/allconnect-logo.png",
  },
  openGraph: {
    title: "AllConnect",
    description: "Connect. Discover. Collaborate.",
    images: ["/allconnect-logo.png"],
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
