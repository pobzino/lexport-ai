import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Lexport",
  description:
    "Learn about Lexport AI — the AI-powered platform for creating legally binding contracts, e-signatures, and payment collection for startups and freelancers.",
  openGraph: {
    title: "About Lexport",
    description:
      "The AI-powered platform for creating legally binding contracts, e-signatures, and payment collection.",
    url: "https://lexportai.com/about",
  },
  twitter: {
    title: "About Lexport",
    description:
      "The AI-powered platform for creating legally binding contracts, e-signatures, and payment collection.",
  },
  alternates: {
    canonical: "https://lexportai.com/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
