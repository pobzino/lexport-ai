import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Lexport",
  description:
    "Learn about Lexport AI — the AI-powered platform for creating legally binding contracts, e-signatures, and payment collection for startups and freelancers.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
