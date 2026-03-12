import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Lexport documentation and guides. Learn how to create AI-powered contracts, collect e-signatures, and manage payments.",
  openGraph: {
    title: "Documentation - Lexport",
    description:
      "Guides for creating AI-powered contracts, collecting e-signatures, and managing payments.",
    url: "https://lexportai.com/docs",
  },
  twitter: {
    title: "Documentation - Lexport",
    description:
      "Guides for creating AI-powered contracts, collecting e-signatures, and managing payments.",
  },
  alternates: {
    canonical: "https://lexportai.com/docs",
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
