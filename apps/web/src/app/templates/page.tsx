import { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Shield,
  Users,
  Briefcase,
  DollarSign,
  Handshake,
  UserCheck,
  FileSignature,
  Receipt,
  Scale,
  Award,
  Building2,
  ClipboardList,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Crown,
} from "lucide-react";
import {
  getValidContractTypes,
  getValidJurisdictions,
  typeEnumToSlug,
  getTypeDisplayName,
  getTypeShortDescription,
} from "@/lib/templates/slugs";
import { TEMPLATE_TYPE_CONTENT } from "@/lib/templates/seo-content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Free Legal Contract Templates",
  description:
    "Browse 50+ professionally-drafted legal contract templates. NDAs, contractor agreements, consulting agreements, SAFE notes, and more for California, Texas, New York, and the UK.",
  openGraph: {
    title: "Free Legal Contract Templates | Lexport",
    description:
      "Browse 50+ professionally-drafted legal contract templates. Generate, customize, and e-sign online.",
  },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  nda_mutual: Shield,
  nda_one_way: Shield,
  independent_contractor: Users,
  consulting_agreement: Briefcase,
  safe_note: DollarSign,
  freelance_service: FileText,
  letter_of_intent: Handshake,
  cofounder_agreement: UserCheck,
  sales_contract: Receipt,
  ip_assignment: Scale,
  advisor_agreement: Award,
  employment_offer: Building2,
  sow: ClipboardList,
  msa: Layers,
};

const CATEGORIES = [
  {
    name: "Confidentiality",
    types: ["nda_mutual", "nda_one_way"],
  },
  {
    name: "Services",
    types: ["independent_contractor", "consulting_agreement", "freelance_service", "sow", "msa"],
  },
  {
    name: "Startup & Fundraising",
    types: ["safe_note", "cofounder_agreement", "advisor_agreement", "letter_of_intent"],
  },
  {
    name: "Employment & IP",
    types: ["employment_offer", "ip_assignment", "sales_contract"],
  },
];

export default function TemplatesHubPage() {
  const types = getValidContractTypes();
  const jurisdictionCount = getValidJurisdictions().length;

  return (
    <>
      {/* Organization JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Lexport",
            url: process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com",
            description:
              "AI-powered legal platform for contract generation, e-signatures, and payment collection.",
          }),
        }}
      />

      {/* Hero */}
      <section className="pt-24 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Free Legal Contract Templates
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Professionally-drafted, jurisdiction-specific contract templates.
            Generate with AI, customize to your needs, and get them signed online.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#529ec6]" />
              {types.length} contract types
            </span>
            <span className="flex items-center gap-1.5">
              <FileSignature className="w-4 h-4 text-[#529ec6]" />
              {jurisdictionCount} jurisdictions
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#529ec6]" />
              AI-powered
            </span>
          </div>
        </div>
      </section>

      {/* Template Categories */}
      <section className="pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {CATEGORIES.map((category) => (
            <div key={category.name} className="mb-12">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                {category.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.types.map((type) => {
                  const Icon = TYPE_ICONS[type] || FileText;
                  const name = getTypeDisplayName(type);
                  const description = getTypeShortDescription(type);
                  const slug = typeEnumToSlug(type);
                  const content = TEMPLATE_TYPE_CONTENT[type];
                  const isPremium = content?.isPremiumOnly ?? false;

                  return (
                    <Link
                      key={type}
                      href={`/templates/${slug}`}
                      className="group flex flex-col p-5 bg-white border border-slate-200 rounded-xl hover:border-[#529ec6]/40 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center group-hover:bg-[#529ec6]/20 transition-colors">
                          <Icon className="w-5 h-5 text-[#529ec6]" />
                        </div>
                        {isPremium && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                            <Crown className="w-3 h-3" />
                            Premium
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-[#529ec6] transition-colors">
                        {name}
                      </h3>
                      <p className="text-sm text-slate-500 mb-3 flex-1">
                        {description}
                      </p>
                      <span className="text-xs text-slate-400">
                        {jurisdictionCount} jurisdictions available
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Lexport */}
      <section className="py-16 px-4 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">
            Why use Lexport templates?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Sparkles,
                title: "AI-Generated",
                description:
                  "Each template is generated and reviewed by AI trained on thousands of legal contracts.",
              },
              {
                icon: Scale,
                title: "Jurisdiction-Specific",
                description:
                  "Tailored to comply with California, Texas, New York, and UK law.",
              },
              {
                icon: FileSignature,
                title: "E-Sign Built In",
                description:
                  "Send for signature directly from the platform. No separate signing tool needed.",
              },
              {
                icon: CheckCircle2,
                title: "Fully Customizable",
                description:
                  "Edit any clause, add provisions, or remove sections that don't apply to your situation.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-xl border border-slate-200"
              >
                <feature.icon className="w-8 h-8 text-[#529ec6] mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Ready to create your first contract?
          </h2>
          <p className="text-slate-500 mb-6">
            Sign up free and generate a professional contract in 60 seconds.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#202e46] text-white font-semibold rounded-lg hover:bg-[#1a2539] transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
