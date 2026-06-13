import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ChevronDown, MapPin, Scale } from "lucide-react";
import {
  typeSlugToEnum,
  jurisdictionSlugToEnum,
  getAllTemplateRoutes,
  getTypeDisplayName,
  getJurisdictionDisplayName,
  typeEnumToSlug,
  jurisdictionEnumToSlug,
  getValidJurisdictions,
} from "@/lib/templates/slugs";
import {
  getTypeContent,
  getJurisdictionContent,
  TEMPLATE_TYPE_CONTENT,
} from "@/lib/templates/seo-content";
import { getTemplateForTypeAndJurisdiction } from "@/lib/templates/public-queries";
import {
  Breadcrumbs,
  FaqJsonLd,
  TemplateProductJsonLd,
} from "@/components/templates/Breadcrumbs";
import {
  TemplatePreview,
  TemplatePreviewPlaceholder,
} from "@/components/templates/TemplatePreview";
import { TemplateUseCTA } from "@/components/templates/TemplateUseCTA";
import { TemplatePageTracker } from "@/components/templates/TemplatePageTracker";

export const revalidate = 3600;
// Only pre-generated (valid type + jurisdiction) routes are served; any other
// slug returns a hard 404 instead of rendering a soft-200 page. Fixes invalid
// jurisdictions like /templates/nda-mutual/nonexistent-state returning 200.
export const dynamicParams = false;

interface Props {
  params: Promise<{ type: string; jurisdiction: string }>;
}

export async function generateStaticParams() {
  return getAllTemplateRoutes();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type: typeSlug, jurisdiction: jSlug } = await params;
  const contractType = typeSlugToEnum(typeSlug);
  const jurisdiction = jurisdictionSlugToEnum(jSlug);
  if (!contractType || !jurisdiction) return { title: "Template Not Found" };

  const jContent = getJurisdictionContent(contractType, jurisdiction);

  return {
    title: jContent.metaTitle,
    description: jContent.metaDescription,
    openGraph: {
      title: jContent.metaTitle,
      description: jContent.metaDescription,
    },
  };
}

export default async function TemplateJurisdictionPage({ params }: Props) {
  const { type: typeSlug, jurisdiction: jSlug } = await params;
  const contractType = typeSlugToEnum(typeSlug);
  const jurisdiction = jurisdictionSlugToEnum(jSlug);
  if (!contractType || !jurisdiction) notFound();

  const typeContent = getTypeContent(contractType);
  if (!typeContent) notFound();

  const jContent = getJurisdictionContent(contractType, jurisdiction);
  const typeName = getTypeDisplayName(contractType);
  const jName = getJurisdictionDisplayName(jurisdiction);

  // Fetch actual template data (may be null if no template exists yet)
  let templateData: Awaited<
    ReturnType<typeof getTemplateForTypeAndJurisdiction>
  > = null;
  try {
    templateData = await getTemplateForTypeAndJurisdiction(
      contractType,
      jurisdiction
    );
  } catch {
    // Template data is optional — pages work without it
  }

  const pageUrl = `/templates/${typeSlug}/${jSlug}`;
  const allJurisdictions = getValidJurisdictions();
  const otherJurisdictions = allJurisdictions.filter((j) => j !== jurisdiction);

  // Related types from the type content
  const relatedTypes = typeContent.relatedTypes
    .filter((t) => TEMPLATE_TYPE_CONTENT[t])
    .slice(0, 3);

  return (
    <>
      <TemplatePageTracker type={contractType} jurisdiction={jurisdiction} />
      <FaqJsonLd faqs={[...jContent.faqs, ...typeContent.faqs.slice(0, 2)]} />
      <TemplateProductJsonLd
        name={`${jName} ${typeName}`}
        description={jContent.metaDescription}
        url={pageUrl}
        price={templateData?.price}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Templates", href: "/templates" },
            { label: typeName, href: `/templates/${typeSlug}` },
            { label: jName },
          ]}
        />

        {/* Hero */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          {jName} {typeName} Template
        </h1>
        <p className="text-lg text-slate-500 mb-8">
          {jContent.metaDescription}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Template Preview */}
            {templateData ? (
              <TemplatePreview
                title={templateData.title || `${jName} ${typeName}`}
                clauseTitles={templateData.clauseTitles}
                previewText={templateData.previewText}
              />
            ) : (
              <TemplatePreviewPlaceholder
                typeName={typeName}
                jurisdictionName={jName}
              />
            )}

            {/* Jurisdiction Notes */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#529ec6]" />
                {jName} Legal Considerations
              </h2>
              <div className="prose prose-slate prose-sm max-w-none">
                {jContent.jurisdictionNotes.split("\n\n").map((p, i) => (
                  <p key={i} className="text-slate-600 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </section>

            {/* Specific Provisions */}
            {jContent.specificProvisions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">
                  {jName}-Specific Provisions
                </h2>
                <ul className="space-y-2">
                  {jContent.specificProvisions.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-slate-600"
                    >
                      <span className="w-1.5 h-1.5 bg-[#529ec6] rounded-full mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* What's Included */}
            {templateData && templateData.clauseTitles.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">
                  What's Included
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templateData.clauseTitles.map((clause, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-slate-600 p-2 bg-slate-50 rounded-lg"
                    >
                      <span className="text-xs font-medium text-slate-400 w-5">
                        {i + 1}.
                      </span>
                      {clause}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Enforcement Notes */}
            {jContent.enforcementNotes && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">
                  Enforcement
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {jContent.enforcementNotes}
                </p>
              </section>
            )}

            {/* FAQ */}
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {[...jContent.faqs, ...typeContent.faqs.slice(0, 2)].map(
                  (faq, i) => (
                    <details
                      key={i}
                      className="group border border-slate-200 rounded-lg"
                    >
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
                  )
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* CTA */}
            <TemplateUseCTA
              templateId={templateData?.id ?? null}
              contractType={contractType}
              jurisdiction={jurisdiction}
              isPremium={templateData?.isPremium ?? typeContent.isPremiumOnly}
              price={templateData?.price ?? null}
              typeSlug={typeSlug}
              jurisdictionSlug={jSlug}
            />

            {/* Other Jurisdictions */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#529ec6]" />
                Other Jurisdictions
              </h3>
              <div className="space-y-2">
                {otherJurisdictions.map((j) => (
                  <Link
                    key={j}
                    href={`/templates/${typeSlug}/${jurisdictionEnumToSlug(j)}`}
                    className="block text-sm text-slate-600 hover:text-[#529ec6] transition-colors py-1"
                  >
                    {getJurisdictionDisplayName(j)} {typeName}
                  </Link>
                ))}
              </div>
            </div>

            {/* Related Templates */}
            {relatedTypes.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3">
                  Related Templates
                </h3>
                <div className="space-y-2">
                  {relatedTypes.map((type) => (
                    <Link
                      key={type}
                      href={`/templates/${typeEnumToSlug(type)}`}
                      className="block text-sm text-slate-600 hover:text-[#529ec6] transition-colors py-1"
                    >
                      {getTypeDisplayName(type)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <section className="text-center py-10 px-6 bg-slate-50 rounded-xl border border-slate-200 mt-12">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Generate your {jName.toLowerCase()} {typeName.toLowerCase()} now
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            AI-powered, jurisdiction-specific, and ready to e-sign.
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
