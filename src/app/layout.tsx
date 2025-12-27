import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Lexport - AI-Powered Legal Contracts",
    template: "%s | Lexport",
  },
  description:
    "Create legally binding contracts with AI. E-signatures, contract management, and templates for startup founders and freelancers.",
  keywords: [
    "legal contracts",
    "AI contracts",
    "e-signature",
    "NDA",
    "contractor agreement",
    "freelance contract",
    "startup legal",
  ],
  authors: [{ name: "Lexport" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://lexport.ai",
    siteName: "Lexport",
    title: "Lexport - AI-Powered Legal Contracts",
    description:
      "Create legally binding contracts with AI. E-signatures, contract management, and templates for startup founders and freelancers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lexport - AI-Powered Legal Contracts",
    description:
      "Create legally binding contracts with AI. E-signatures, contract management, and templates for startup founders and freelancers.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
