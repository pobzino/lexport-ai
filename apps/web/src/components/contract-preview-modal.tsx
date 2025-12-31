"use client";

import { X, Eye, Lock, Sparkles } from "lucide-react";
import { useEffect } from "react";

interface ContractPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractType: string;
  contractName: string;
  onUseThis: () => void;
}

// Sample preview content for each contract type
// These are abbreviated examples to show structure, not full legal text
const PREVIEW_CONTENT: Record<string, { preamble: string; clauses: { title: string; preview: string }[] }> = {
  nda_mutual: {
    preamble: "This Mutual Non-Disclosure Agreement is entered into as of [Date] between [Party A] and [Party B], collectively referred to as the \"Parties.\"",
    clauses: [
      { title: "1. Definition of Confidential Information", preview: "\"Confidential Information\" means any non-public information disclosed by either Party to the other, including but not limited to business plans, technical data, trade secrets, customer lists, and financial information..." },
      { title: "2. Obligations of Receiving Party", preview: "Each Party agrees to: (a) hold the other Party's Confidential Information in strict confidence; (b) not disclose such information to third parties without prior written consent; (c) use the information only for the Purpose..." },
      { title: "3. Exclusions from Confidential Information", preview: "Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the receiving Party; (b) was known to the receiving Party prior to disclosure..." },
      { title: "4. Term and Termination", preview: "This Agreement shall remain in effect for [Term] from the Effective Date. The confidentiality obligations shall survive termination for a period of [Survival Period]..." },
      { title: "5. Return of Information", preview: "Upon termination or upon request, each Party shall promptly return or destroy all Confidential Information received from the other Party..." },
    ],
  },
  nda_one_way: {
    preamble: "This Non-Disclosure Agreement is entered into as of [Date] between [Disclosing Party] (\"Discloser\") and [Receiving Party] (\"Recipient\").",
    clauses: [
      { title: "1. Purpose", preview: "Discloser wishes to share certain confidential information with Recipient for the purpose of [Purpose]. Recipient agrees to receive and protect such information under the terms of this Agreement..." },
      { title: "2. Confidential Information", preview: "\"Confidential Information\" includes all information disclosed by Discloser to Recipient, whether orally, in writing, or by inspection, that is designated as confidential or reasonably should be understood to be confidential..." },
      { title: "3. Non-Disclosure Obligations", preview: "Recipient shall: (a) maintain the confidentiality of all Confidential Information; (b) not disclose Confidential Information to any third party; (c) use Confidential Information solely for the Purpose..." },
      { title: "4. Permitted Disclosures", preview: "Recipient may disclose Confidential Information to its employees or contractors who need to know such information, provided they are bound by confidentiality obligations at least as protective as this Agreement..." },
    ],
  },
  freelance_service: {
    preamble: "This Freelance Agreement is entered into as of [Date] between [Client Name] (\"Client\") and [Freelancer Name] (\"Freelancer\").",
    clauses: [
      { title: "1. Services", preview: "Freelancer agrees to provide the following services: [Description of Services]. Client will provide reasonable access and information needed to complete the work..." },
      { title: "2. Deliverables", preview: "Freelancer will deliver: [List of Deliverables]. Deliverables are accepted when Client approves or fails to request changes within [X] days of delivery..." },
      { title: "3. Payment", preview: "Client will pay Freelancer [Amount] for the services. Payment is due [Payment Terms]. Late payments accrue interest at [Rate] per month..." },
      { title: "4. Timeline", preview: "Work begins [Start Date], with final delivery by [End Date]. Client-caused delays extend deadlines accordingly..." },
      { title: "5. Intellectual Property", preview: "Upon full payment, Client owns all deliverables and work product. Freelancer retains rights to pre-existing materials and may show work in portfolio..." },
      { title: "6. Termination", preview: "Either party may terminate with [X] days written notice. Upon termination, Client pays for all completed work..." },
    ],
  },
  independent_contractor: {
    preamble: "This Independent Contractor Agreement is entered into as of [Date] between [Company Name] (\"Company\") and [Contractor Name] (\"Contractor\").",
    clauses: [
      { title: "1. Services", preview: "Contractor agrees to perform the following services for Company: [Description]. Contractor shall perform services in a professional manner consistent with industry standards..." },
      { title: "2. Compensation", preview: "Company shall pay Contractor [Rate/Amount] for services rendered. Payment shall be made [Payment Schedule]. Contractor is responsible for all taxes..." },
      { title: "3. Independent Contractor Status", preview: "Contractor is an independent contractor and not an employee of Company. Contractor controls the manner and means of performing services, maintains their own schedule, and uses their own tools..." },
      { title: "4. Intellectual Property", preview: "All work product, inventions, and materials created by Contractor in connection with this Agreement shall be the sole property of Company as works made for hire..." },
      { title: "5. Confidentiality", preview: "Contractor agrees to maintain the confidentiality of Company's proprietary information and trade secrets during and after the term of this Agreement..." },
    ],
  },
  consulting_agreement: {
    preamble: "This Consulting Agreement is entered into as of [Date] between [Client Name] (\"Client\") and [Consultant Name] (\"Consultant\").",
    clauses: [
      { title: "1. Consulting Services", preview: "Consultant agrees to provide professional consulting services as described in Exhibit A. Services shall be performed with the degree of skill and care expected of a qualified professional..." },
      { title: "2. Term", preview: "This Agreement shall commence on [Start Date] and continue until [End Date], unless earlier terminated. Either party may terminate with [X] days written notice..." },
      { title: "3. Compensation and Expenses", preview: "Client shall pay Consultant [Rate] for services. Consultant shall submit monthly invoices for services rendered. Client shall reimburse pre-approved expenses within [X] days..." },
      { title: "4. Deliverables and Reports", preview: "Consultant shall provide [Deliverables] and periodic progress reports as specified. All deliverables shall meet the specifications agreed upon by both parties..." },
      { title: "5. Representations and Warranties", preview: "Consultant represents that they have the skills, experience, and qualifications necessary to perform the services and that the work will be performed in a professional manner..." },
    ],
  },
  safe_note: {
    preamble: "This SAFE (Simple Agreement for Future Equity) is entered into as of [Date] between [Company Name], a Delaware corporation (\"Company\"), and [Investor Name] (\"Investor\").",
    clauses: [
      { title: "1. Investment Amount", preview: "Investor agrees to invest [Amount] (the \"Purchase Amount\") in Company in exchange for the right to receive equity upon certain triggering events as described herein..." },
      { title: "2. Conversion Events", preview: "This SAFE will convert to equity upon: (a) Equity Financing - conversion at the Valuation Cap or Discount Rate; (b) Liquidity Event; (c) Dissolution Event..." },
      { title: "3. Valuation Cap", preview: "The Valuation Cap for this SAFE is [Amount]. Upon conversion, the price per share shall be calculated based on the lower of the Valuation Cap or the Discount Rate..." },
      { title: "4. Discount Rate", preview: "Upon an Equity Financing, this SAFE converts at a [X]% discount to the price per share paid by new investors in such financing..." },
      { title: "5. Pro Rata Rights", preview: "Investor shall have the right to participate in future equity financings to maintain their proportional ownership, subject to customary limitations..." },
    ],
  },
};

export function ContractPreviewModal({
  isOpen,
  onClose,
  contractType,
  contractName,
  onUseThis,
}: ContractPreviewModalProps) {
  const preview = PREVIEW_CONTENT[contractType];

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Prevent copy/paste and text selection
  const handlePreventCopy = (e: React.ClipboardEvent | React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#529ec6]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{contractName}</h2>
              <p className="text-sm text-slate-500">Preview Example</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Watermark Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            This is a preview example. Generate your personalized contract to get the full document.
          </span>
        </div>

        {/* Content - Non-copyable */}
        <div
          className="flex-1 overflow-y-auto px-6 py-6 preview-content"
          onCopy={handlePreventCopy}
          onCut={handlePreventCopy}
          onContextMenu={handlePreventCopy}
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          {preview ? (
            <div className="space-y-6">
              {/* Preamble */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-slate-700 italic leading-relaxed">
                  {preview.preamble}
                </p>
              </div>

              {/* Clauses */}
              <div className="space-y-4">
                {preview.clauses.map((clause, index) => (
                  <div key={index} className="relative">
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {clause.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {clause.preview}
                    </p>
                    {/* Fade overlay to indicate continuation */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  </div>
                ))}
              </div>

              {/* More content indicator */}
              <div className="text-center py-4 border-t border-dashed border-slate-200">
                <p className="text-sm text-slate-500">
                  + Additional clauses for liability, governing law, signatures, and more...
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">Preview not available for this contract type.</p>
            </div>
          )}

          {/* Watermark overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center overflow-hidden"
            style={{ zIndex: 1 }}
          >
            <div className="text-8xl font-bold text-slate-900 rotate-[-30deg] whitespace-nowrap">
              PREVIEW ONLY
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-500">
            Your contract will be customized with your specific details
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={onUseThis}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#202e46] rounded-lg hover:bg-[#1a2539] transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Use This Contract
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
