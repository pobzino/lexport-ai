import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toast";
import { CookieConsent } from "@/components/cookie-consent";
import { NavigationProgress } from "@/components/navigation-progress";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lexport.ai"),
  title: {
    default: "Lexport - AI-Powered Legal Contracts & E-Signatures",
    template: "%s | Lexport",
  },
  description:
    "Generate legally binding contracts with AI in minutes. E-signatures, payment collection, and contract management for startup founders, freelancers, and small businesses. Supports CA, TX, NY, and UK law.",
  keywords: [
    "AI legal contracts",
    "e-signature platform",
    "NDA generator",
    "contractor agreement",
    "freelance contract",
    "startup legal documents",
    "AI contract generator",
    "electronic signature",
    "legal document automation",
    "contract management software",
  ],
  authors: [{ name: "Lexport", url: "https://lexport.ai" }],
  creator: "Lexport",
  publisher: "Lexport",
  formatDetection: {
    email: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://lexport.ai",
    siteName: "Lexport",
    title: "Lexport - AI-Powered Legal Contracts & E-Signatures",
    description:
      "Generate legally binding contracts with AI in minutes. E-signatures, payment collection, and contract management for startups and freelancers.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lexport - AI-Powered Legal Contracts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lexport - AI-Powered Legal Contracts & E-Signatures",
    description:
      "Generate legally binding contracts with AI in minutes. E-signatures and payment collection for startups and freelancers.",
    images: ["/og-image.png"],
    creator: "@lexport_ai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add these when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  category: "Legal Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts for signature styles */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Allura&family=Caveat:wght@700&family=Dancing+Script&family=Great+Vibes&family=Pacifico&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          {children}
          <Toaster />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}

