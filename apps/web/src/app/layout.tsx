import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
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
  metadataBase: new URL("https://lexportai.com"),
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
  authors: [{ name: "Lexport", url: "https://lexportai.com" }],
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
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://lexportai.com",
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
        {process.env.DEPLOY_ID ? (
          <meta name="x-deployment-id" content={process.env.DEPLOY_ID} />
        ) : null}
      </head>
      <body className={`${inter.variable} font-sans`}>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-P5CLFJ88');`}
        </Script>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P5CLFJ88"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Lexport",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "AI-powered platform for creating legally binding contracts, collecting e-signatures, and managing payments.",
              url: "https://lexportai.com",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free plan available",
              },
              creator: {
                "@type": "Organization",
                name: "Lexport",
                url: "https://lexportai.com",
                logo: "https://lexportai.com/logo.svg",
              },
            }),
          }}
        />
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
