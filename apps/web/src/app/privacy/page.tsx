"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Mail } from "lucide-react";

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12">
                {/* Title */}
                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-[#529ec6]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-[#529ec6]" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
                    <p className="text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-8">
                    <Section title="1. Introduction">
                        <p>
                            Lexport (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our contract management and e-signature platform.
                        </p>
                        <p>
                            By using Lexport, you agree to the collection and use of information in accordance with this policy.
                        </p>
                    </Section>

                    <Section title="2. Information We Collect">
                        <h4 className="font-semibold text-slate-900 mb-2">Personal Information</h4>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 mb-4">
                            <li>Name and email address</li>
                            <li>Signature images (drawn, typed, or uploaded)</li>
                            <li>Payment information (processed securely via Stripe)</li>
                            <li>Contract content and metadata</li>
                        </ul>

                        <h4 className="font-semibold text-slate-900 mb-2">Automatically Collected Information</h4>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                            <li>IP address and approximate location</li>
                            <li>Browser type and device information</li>
                            <li>Usage data and interaction logs</li>
                            <li>Cookies and similar tracking technologies</li>
                        </ul>
                    </Section>

                    <Section title="3. How We Use Your Information">
                        <p>We use the collected information to:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 mt-2">
                            <li>Provide and maintain our service</li>
                            <li>Process e-signatures and verify identity</li>
                            <li>Process payments and prevent fraud</li>
                            <li>Create legally-binding audit trails</li>
                            <li>Send service-related communications</li>
                            <li>Improve our platform and user experience</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </Section>

                    <Section title="4. Legal Basis for Processing (GDPR)">
                        <p>If you are in the European Economic Area (EEA), we process your data based on:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 mt-2">
                            <li><strong>Contract:</strong> Processing necessary to provide our services</li>
                            <li><strong>Legitimate Interest:</strong> Improving services and preventing fraud</li>
                            <li><strong>Legal Obligation:</strong> Maintaining audit trails for e-signatures</li>
                            <li><strong>Consent:</strong> Marketing communications (where applicable)</li>
                        </ul>
                    </Section>

                    <Section title="5. Data Sharing and Disclosure">
                        <p>We may share your information with:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 mt-2">
                            <li><strong>Other Contract Parties:</strong> Signers and contract owners can see relevant information</li>
                            <li><strong>Service Providers:</strong> Stripe (payments), Supabase (hosting), email providers</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
                        </ul>
                        <p className="mt-2">We do not sell your personal information to third parties.</p>
                    </Section>

                    <Section title="6. Data Retention">
                        <p>We retain your data for as long as necessary to:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 mt-2">
                            <li>Provide our services</li>
                            <li>Comply with legal obligations (e-signature records: 7+ years)</li>
                            <li>Resolve disputes and enforce agreements</li>
                        </ul>
                        <p className="mt-2">You can request deletion of your account at any time through your settings.</p>
                    </Section>

                    <Section title="7. Your Rights (GDPR)">
                        <p>If you are in the EEA, you have the right to:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 mt-2">
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Rectification:</strong> Correct inaccurate information</li>
                            <li><strong>Erasure:</strong> Request deletion of your data</li>
                            <li><strong>Portability:</strong> Receive your data in a portable format</li>
                            <li><strong>Objection:</strong> Object to certain data processing</li>
                            <li><strong>Restriction:</strong> Limit how we use your data</li>
                        </ul>
                        <p className="mt-4">
                            To exercise these rights, visit your{" "}
                            <Link href="/settings" className="text-[#529ec6] hover:underline">
                                account settings
                            </Link>{" "}
                            or contact us at the email below.
                        </p>
                    </Section>

                    <Section title="8. Cookies">
                        <p>We use cookies for:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 mt-2">
                            <li><strong>Essential:</strong> Authentication and security</li>
                            <li><strong>Functional:</strong> Remembering your preferences</li>
                            <li><strong>Analytics:</strong> Understanding how you use our service</li>
                        </ul>
                        <p className="mt-2">You can manage cookie preferences through our cookie consent banner.</p>
                    </Section>

                    <Section title="9. Security">
                        <p>
                            We implement industry-standard security measures including encryption in transit (TLS), encryption at rest, and regular security audits. However, no method of transmission over the Internet is 100% secure.
                        </p>
                    </Section>

                    <Section title="10. International Transfers">
                        <p>
                            Your data may be transferred to and processed in countries outside your residence. We ensure appropriate safeguards are in place, including Standard Contractual Clauses for EU data transfers.
                        </p>
                    </Section>

                    <Section title="11. Children&apos;s Privacy">
                        <p>
                            Our service is not intended for children under 16. We do not knowingly collect information from children under 16.
                        </p>
                    </Section>

                    <Section title="12. Changes to This Policy">
                        <p>
                            We may update this Privacy Policy periodically. We will notify you of significant changes via email or a notice on our platform.
                        </p>
                    </Section>

                    <Section title="13. Contact Us">
                        <p>For privacy-related questions or to exercise your rights, contact us:</p>
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center gap-3">
                            <Mail className="w-5 h-5 text-slate-500" />
                            <a href="mailto:privacy@lexport.ai" className="text-[#529ec6] hover:underline">
                                privacy@lexport.ai
                            </a>
                        </div>
                    </Section>
                </div>
            </main>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
            <div className="text-slate-600 space-y-2">{children}</div>
        </section>
    );
}
