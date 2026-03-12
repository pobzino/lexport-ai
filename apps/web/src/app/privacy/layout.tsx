import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Lexport's privacy policy. Learn how we collect, use, and protect your personal data when using our AI contract generation and e-signature platform.",
  openGraph: {
    title: "Privacy Policy - Lexport",
    description:
      "Learn how Lexport collects, uses, and protects your personal data.",
    url: "https://lexportai.com/privacy",
  },
  twitter: {
    title: "Privacy Policy - Lexport",
    description:
      "Learn how Lexport collects, uses, and protects your personal data.",
  },
  alternates: {
    canonical: "https://lexportai.com/privacy",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
