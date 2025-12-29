import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Lexport",
  description: "Terms of Service and Electronic Signature Consent for Lexport",
};

export default function TermsPage() {
  const lastUpdated = "December 29, 2024";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Terms of Service
          </h1>
          <p className="text-slate-500 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-slate-600 leading-relaxed">
                By accessing or using Lexport&apos;s services, you agree to be bound by these
                Terms of Service and all applicable laws and regulations. If you do not
                agree with any of these terms, you are prohibited from using or accessing
                this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                2. Electronic Signature Consent
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
                <h3 className="font-semibold text-blue-900 mb-3">
                  IMPORTANT: Electronic Signature Disclosure
                </h3>
                <p className="text-blue-800 leading-relaxed mb-4">
                  By using Lexport to sign documents, you consent to conduct business
                  electronically and agree that your electronic signature is legally
                  equivalent to your handwritten signature.
                </p>
                <p className="text-blue-800 leading-relaxed">
                  This consent is provided pursuant to the Electronic Signatures in
                  Global and National Commerce Act (ESIGN Act), the Uniform Electronic
                  Transactions Act (UETA), and similar laws governing electronic
                  signatures in your jurisdiction.
                </p>
              </div>

              <h3 className="font-semibold text-slate-800 mb-2">
                2.1 Your Rights Regarding Electronic Records
              </h3>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>
                  You have the right to receive documents in paper form. You may
                  request paper copies of any document by contacting the document
                  sender.
                </li>
                <li>
                  You may withdraw your consent to receive electronic documents at any
                  time by notifying us in writing.
                </li>
                <li>
                  Withdrawal of consent will not affect the legal validity of any
                  electronic signatures or documents already executed.
                </li>
              </ul>

              <h3 className="font-semibold text-slate-800 mb-2">
                2.2 Hardware and Software Requirements
              </h3>
              <p className="text-slate-600 leading-relaxed mb-2">
                To access and retain electronic documents, you need:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-1 mb-4">
                <li>A computer or mobile device with internet access</li>
                <li>A current web browser (Chrome, Firefox, Safari, or Edge)</li>
                <li>A valid email address to receive notifications</li>
                <li>
                  Sufficient storage space to download and save documents (PDF format)
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                3. Legal Validity of Electronic Signatures
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Electronic signatures executed through Lexport are intended to be
                legally binding and enforceable. Our platform complies with:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>
                  <strong>United States:</strong> Electronic Signatures in Global and
                  National Commerce Act (ESIGN Act) and Uniform Electronic Transactions
                  Act (UETA)
                </li>
                <li>
                  <strong>European Union:</strong> eIDAS Regulation (EU No 910/2014)
                </li>
                <li>
                  <strong>United Kingdom:</strong> Electronic Communications Act 2000
                  and eIDAS (UK)
                </li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 text-sm">
                  <strong>Note:</strong> Certain documents may require handwritten
                  signatures or notarization by law, including but not limited to:
                  wills, trusts, powers of attorney, real estate deeds, and court
                  documents. Consult with legal counsel if you are unsure whether your
                  document is eligible for electronic signature.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                4. Identity Verification and Authentication
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                When signing documents through Lexport, you confirm that:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>
                  You are the person identified in the signature request or are
                  authorized to sign on their behalf
                </li>
                <li>
                  You have the legal authority to enter into the agreement being signed
                </li>
                <li>
                  The information you provide is accurate and complete
                </li>
                <li>
                  You understand that your electronic signature is equivalent to a
                  handwritten signature
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                5. Audit Trail and Record Keeping
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Lexport maintains a comprehensive audit trail for each document,
                including:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>
                  Timestamps for all actions (document creation, viewing, signing)
                </li>
                <li>IP addresses and approximate geographic location</li>
                <li>Browser and device information</li>
                <li>Email verification records (when applicable)</li>
                <li>Cryptographic document hashes for tamper detection</li>
                <li>RFC 3161 trusted timestamps (when available)</li>
              </ul>
              <p className="text-slate-600 leading-relaxed">
                This audit trail provides evidence of the signing process and helps
                establish the authenticity and integrity of signed documents.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                6. Document Integrity
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We use cryptographic hashing (SHA-256) to ensure document integrity.
                Any modification to a document after it has been sent for signature
                will be detected and flagged. Signed documents are sealed with a
                Certificate of Completion that includes:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>Document fingerprint (hash) at time of signing</li>
                <li>Signer information and timestamps</li>
                <li>Complete audit trail</li>
                <li>Certificate of authenticity</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                7. Data Protection and Privacy
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We are committed to protecting your personal data. Information
                collected during the signing process is used solely for:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>Facilitating the electronic signature process</li>
                <li>Creating and maintaining audit trails</li>
                <li>Sending notifications related to documents</li>
                <li>Complying with legal requirements</li>
              </ul>
              <p className="text-slate-600 leading-relaxed">
                For more information, please review our{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                8. Document Retention
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Signed documents and audit trails are retained for a minimum of 7
                years from the date of completion, or longer if required by
                applicable law. Users may download copies of their documents at any
                time through the Lexport platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                9. Limitation of Liability
              </h2>
              <p className="text-slate-600 leading-relaxed">
                While Lexport strives to provide a reliable platform for electronic
                signatures, we do not guarantee that our services will be
                uninterrupted or error-free. Lexport is not responsible for the
                content of documents signed through our platform, and users are
                solely responsible for ensuring the accuracy and legality of their
                agreements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                10. Governing Law
              </h2>
              <p className="text-slate-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with
                the laws of the State of California, United States, without regard
                to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                11. Contact Information
              </h2>
              <p className="text-slate-600 leading-relaxed">
                If you have questions about these Terms of Service or need to
                withdraw your consent to electronic signatures, please contact us
                at:{" "}
                <a
                  href="mailto:legal@lexportai.com"
                  className="text-blue-600 hover:underline"
                >
                  legal@lexportai.com
                </a>
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200">
            <p className="text-slate-500 text-sm text-center">
              By using Lexport, you acknowledge that you have read, understood, and
              agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
