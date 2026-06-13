import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";
import { TemplatePageTracker } from "@/components/templates/TemplatePageTracker";
import {
  typeSlugToEnum,
  getAllTypeSlugs,
  getTypeDisplayName,
  getValidJurisdictions,
  jurisdictionEnumToSlug,
  getJurisdictionDisplayName,
  typeEnumToSlug,
} from "@/lib/templates/slugs";
import {
  getTypeContent,
  getBaseJurisdictionNotes,
  TEMPLATE_TYPE_CONTENT,
} from "@/lib/templates/seo-content";
import { Breadcrumbs, FaqJsonLd } from "@/components/templates/Breadcrumbs";

export const revalidate = 3600;
export const dynamicParams = false;

interface Props {
  params: Promise<{ type: string }>;
}

export async function generateStaticParams() {
  return getAllTypeSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type: typeSlug } = await params;
  const contractType = typeSlugToEnum(typeSlug);
  if (!contractType) return { title: "Template Not Found" };

  const content = getTypeContent(contractType);
  if (!content) return { title: "Template Not Found" };

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: {
      canonical: `/templates/${typeEnumToSlug(contractType)}`,
    },
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription,
    },
  };
}

export default async function TemplateTypePage({ params }: Props) {
  const { type: typeSlug } = await params;
  const contractType = typeSlugToEnum(typeSlug);
  if (!contractType) notFound();

  const content = getTypeContent(contractType);
  if (!content) notFound();

  const typeName = getTypeDisplayName(contractType);
  const jurisdictions = getValidJurisdictions();

  // Related templates
  const relatedTemplates = content.relatedTypes
    .filter((t) => TEMPLATE_TYPE_CONTENT[t])
    .slice(0, 4);

  return (
    <>
      <TemplatePageTracker type={contractType} />
      <FaqJsonLd faqs={content.faqs} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Templates", href: "/templates" },
            { label: typeName },
          ]}
        />

        {/* Hero */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          {content.heroTitle}
        </h1>
        <div className="prose prose-slate max-w-none mb-10">
          {content.longDescription.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-slate-600 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Jurisdiction Cards */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#529ec6]" />
            Select Contract Jurisdiction
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {jurisdictions.map((j) => {
              const jSlug = jurisdictionEnumToSlug(j);
              const jName = getJurisdictionDisplayName(j);
              const jNotes = getBaseJurisdictionNotes(j);
              const flag = j === "uk" ? "\uD83C\uDDEC\uD83C\uDDE7" : "\uD83C\uDDFA\uD83C\uDDF8";

              return (
                <Link
                  key={j}
                  href={`/templates/${typeSlug}/${jSlug}`}
                  className="group relative flex flex-col p-5 pl-6 bg-white border border-slate-200 rounded-xl hover:border-[#529ec6] hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-[#529ec6] transition-colors" />
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-lg">{flag}</span>
                    <h3 className="font-semibold text-slate-900 group-hover:text-[#529ec6] transition-colors">
                      {jName} {typeName}
                    </h3>
                  </div>
                  {jNotes && (
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                      {jNotes.overview.slice(0, 150)}...
                    </p>
                  )}
                  <span className="text-sm text-[#529ec6] font-medium flex items-center gap-1 mt-auto group-hover:gap-2 transition-all">
                    View template
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Key Clauses */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Key Clauses Included
          </h2>
          <div className="space-y-3">
            {content.keyClauses.map((clause, i) => (
              <details key={i} className="group border border-slate-200 rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <span className="font-medium text-slate-900">
                    {clause.title}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-600">
                  {clause.description}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Who Needs This / When To Use */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Who needs this?
            </h2>
            <ul className="space-y-2">
              {content.whoNeedsThis.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="w-1.5 h-1.5 bg-[#529ec6] rounded-full mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              When to use it
            </h2>
            <ul className="space-y-2">
              {content.whenToUse.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="w-1.5 h-1.5 bg-[#529ec6] rounded-full mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {content.faqs.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <span className="font-medium text-slate-900 text-sm">
                    {faq.question}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Related Templates */}
        {relatedTemplates.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Related Templates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedTemplates.map((type) => {
                const name = getTypeDisplayName(type);
                const slug = typeEnumToSlug(type);
                const desc = TEMPLATE_TYPE_CONTENT[type]?.metaDescription ?? "";

                return (
                  <Link
                    key={type}
                    href={`/templates/${slug}`}
                    className="group p-4 bg-white border border-slate-200 rounded-lg hover:border-[#529ec6]/40 hover:shadow-sm transition-all"
                  >
                    <h3 className="font-medium text-slate-900 mb-1 group-hover:text-[#529ec6] transition-colors">
                      {name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {desc}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-10 px-6 bg-slate-50 rounded-xl border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Generate your {typeName.toLowerCase()} now
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Create a customized {typeName.toLowerCase()} in 60 seconds with AI.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white font-semibold rounded-lg hover:bg-[#1a2539] transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </>
  );
}
