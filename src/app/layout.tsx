import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/config/site";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteGraphLd } from "@/lib/seo/schema";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "ScopeBnB · Rent a telescope under Bortle 1 skies in Texas",
    template: "%s · ScopeBnB",
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "rent a telescope",
    "remote astrophotography",
    "remote telescope rental",
    "Bortle 1 dark skies",
    "deep-sky imaging",
    "astrophotography Texas",
    "N.I.N.A. remote imaging",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "ScopeBnB · Rent a telescope under Bortle 1 skies in Texas",
    description: site.description,
    url: site.url,
    locale: "en_US",
    images: [{ url: "/images/hero/foto1.jpg", width: 1200, height: 630, alt: site.tagline }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScopeBnB · Rent a telescope under Bortle 1 skies in Texas",
    description: site.tagline,
    images: ["/images/hero/foto1.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full">
        <JsonLd data={siteGraphLd()} />
        {children}
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
