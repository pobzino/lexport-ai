import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Lexport team. Questions about AI contracts, e-signatures, or pricing? We're here to help.",
  openGraph: {
    title: "Contact Lexport",
    description:
      "Questions about AI contracts, e-signatures, or pricing? Get in touch with the Lexport team.",
    url: "https://lexportai.com/contact",
  },
  twitter: {
    title: "Contact Lexport",
    description:
      "Questions about AI contracts, e-signatures, or pricing? Get in touch with the Lexport team.",
  },
  alternates: {
    canonical: "https://lexportai.com/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
