/**
 * SEO Content for Public Template Pages
 *
 * Static content optimized for search engines. Each contract type has rich descriptions,
 * FAQs, and clause summaries. Each type+jurisdiction combo has jurisdiction-specific notes.
 */

// ============================================================================
// Types
// ============================================================================

export interface TemplateTypeSEO {
  heroTitle: string;
  metaTitle: string;
  metaDescription: string; // ≤155 chars
  longDescription: string;
  keyClauses: Array<{ title: string; description: string }>;
  whoNeedsThis: string[];
  whenToUse: string[];
  faqs: Array<{ question: string; answer: string }>;
  relatedTypes: string[];
  isPremiumOnly: boolean;
}

export interface JurisdictionVariantSEO {
  metaTitle: string;
  metaDescription: string; // ≤155 chars
  jurisdictionNotes: string;
  specificProvisions: string[];
  enforcementNotes: string;
  faqs: Array<{ question: string; answer: string }>;
}

// ============================================================================
// Contract Type Content
// ============================================================================

export const TEMPLATE_TYPE_CONTENT: Record<string, TemplateTypeSEO> = {
  nda_mutual: {
    heroTitle: "Mutual NDA Template",
    metaTitle: "Free Mutual NDA Template — Generate & Sign Online",
    metaDescription:
      "Generate a mutual non-disclosure agreement in 60 seconds. Legally reviewed, jurisdiction-specific NDAs for CA, TX, NY & UK. E-sign and share instantly.",
    longDescription:
      "A mutual non-disclosure agreement (NDA) protects confidential information shared between two parties. Unlike a one-way NDA, both sides agree to keep the other's information confidential — making it ideal for business partnerships, joint ventures, and exploratory discussions where both parties share sensitive data.\n\nOur AI-generated mutual NDAs are tailored to your specific jurisdiction, covering critical areas like the definition of confidential information, permitted disclosures, exclusions, and the obligations of both parties. Each agreement includes clear terms for duration, remedies for breach, and return or destruction of confidential materials.\n\nWhether you're a startup exploring a partnership, a freelancer discussing a new project, or a business entering negotiations, a well-drafted mutual NDA sets the foundation for trust and legal protection.",
    keyClauses: [
      { title: "Definition of Confidential Information", description: "Clearly defines what constitutes protected information for both parties, including business plans, financial data, technical information, and trade secrets." },
      { title: "Exclusions from Confidentiality", description: "Specifies what information is not covered — publicly available information, independently developed knowledge, and information received from third parties." },
      { title: "Permitted Disclosures", description: "Outlines when disclosure is allowed, such as to employees on a need-to-know basis or when compelled by law or court order." },
      { title: "Term and Survival", description: "Sets the duration of the agreement and how long confidentiality obligations continue after the NDA expires." },
      { title: "Return or Destruction of Materials", description: "Requires parties to return or destroy confidential materials when the agreement ends or upon request." },
      { title: "Remedies and Injunctive Relief", description: "Establishes that breach may cause irreparable harm and entitles the non-breaching party to seek injunctive relief in addition to damages." },
    ],
    whoNeedsThis: [
      "Startup founders exploring partnerships or joint ventures",
      "Businesses entering merger or acquisition discussions",
      "Freelancers and consultants sharing proprietary methods with clients",
      "Companies evaluating potential vendors or service providers",
      "Investors and founders during fundraising due diligence",
    ],
    whenToUse: [
      "Before sharing business plans, financial projections, or trade secrets",
      "When entering partnership or collaboration discussions",
      "During M&A due diligence processes",
      "Before technical or product demonstrations with potential partners",
      "When hiring consultants who will access your confidential systems",
    ],
    faqs: [
      { question: "What is the difference between a mutual and one-way NDA?", answer: "A mutual NDA protects confidential information shared by both parties, while a one-way NDA only protects the disclosing party's information. Use a mutual NDA when both sides will share sensitive information." },
      { question: "How long should a mutual NDA last?", answer: "Most mutual NDAs have a term of 1-3 years, with confidentiality obligations surviving for 2-5 years after expiration. The right duration depends on the nature of the information and your industry." },
      { question: "Is a mutual NDA legally binding?", answer: "Yes. When properly executed (signed by authorized representatives of both parties), a mutual NDA is a legally enforceable contract. It can be enforced in court if one party breaches the agreement." },
      { question: "Can I modify the template after generating it?", answer: "Absolutely. Our AI generates a solid starting point tailored to your jurisdiction. You can edit any clause, add custom provisions, or remove sections that don't apply to your situation." },
      { question: "Do I need a lawyer to sign an NDA?", answer: "For standard business NDAs, most parties don't need a lawyer. However, if the NDA involves highly sensitive information, complex technology, or significant financial implications, legal review is recommended." },
    ],
    relatedTypes: ["nda_one_way", "consulting_agreement", "letter_of_intent", "independent_contractor"],
    isPremiumOnly: false,
  },

  nda_one_way: {
    heroTitle: "One-Way NDA Template",
    metaTitle: "Free One-Way NDA Template — Protect Your Confidential Information",
    metaDescription:
      "Generate a one-way NDA to protect your confidential information. Jurisdiction-specific templates for CA, TX, NY & UK. Create, e-sign, and share online.",
    longDescription:
      "A one-way (unilateral) non-disclosure agreement protects confidential information disclosed by one party to another. The disclosing party shares sensitive information, and the receiving party agrees not to share, use, or profit from that information outside the agreed terms.\n\nOne-way NDAs are essential when you need to share proprietary information with someone who won't be sharing confidential information back — such as when hiring contractors, pitching to investors, or demonstrating products to potential customers.\n\nOur AI-generated one-way NDAs include jurisdiction-specific provisions, clear definitions of what constitutes confidential information, and robust enforcement mechanisms to protect your intellectual property and trade secrets.",
    keyClauses: [
      { title: "Definition of Confidential Information", description: "Broadly defines the disclosing party's protected information, including written, oral, and electronic communications." },
      { title: "Obligations of the Receiving Party", description: "Details the receiving party's duties to protect confidential information, including security measures and use restrictions." },
      { title: "Exclusions from Confidentiality", description: "Carves out information that is publicly known, independently developed, or received from a third party without restriction." },
      { title: "Compelled Disclosure", description: "Provides a process for the receiving party to follow if legally compelled to disclose confidential information." },
      { title: "Term and Termination", description: "Specifies the agreement duration and the surviving obligations that continue after termination." },
      { title: "Return of Materials", description: "Requires the receiving party to return or certify destruction of all confidential materials upon request or termination." },
    ],
    whoNeedsThis: [
      "Founders pitching to investors or potential partners",
      "Companies sharing proprietary technology with contractors",
      "Businesses demonstrating products to potential customers",
      "Employers sharing trade secrets with new employees",
      "Inventors discussing ideas with potential manufacturers",
    ],
    whenToUse: [
      "Before investor pitches or fundraising presentations",
      "When onboarding contractors who will access proprietary systems",
      "Before product demonstrations or beta testing programs",
      "When sharing business strategies with potential advisors",
      "Before disclosing patentable inventions to third parties",
    ],
    faqs: [
      { question: "When should I use a one-way NDA instead of a mutual NDA?", answer: "Use a one-way NDA when only one party is sharing confidential information. If both parties will share sensitive data, use a mutual NDA instead." },
      { question: "Can a one-way NDA be converted to a mutual NDA later?", answer: "Yes, but it requires a new agreement. If the relationship evolves and both parties start sharing confidential information, it's best to execute a mutual NDA to protect both sides." },
      { question: "What happens if the receiving party breaches the NDA?", answer: "The disclosing party can seek damages in court and may be entitled to injunctive relief to prevent further disclosure. The specific remedies depend on the NDA terms and applicable law." },
      { question: "How specific should the definition of confidential information be?", answer: "Strike a balance — broad enough to cover all sensitive information you may share, but specific enough to be enforceable. Overly vague definitions may not hold up in court." },
    ],
    relatedTypes: ["nda_mutual", "independent_contractor", "consulting_agreement", "ip_assignment"],
    isPremiumOnly: false,
  },

  independent_contractor: {
    heroTitle: "Independent Contractor Agreement Template",
    metaTitle: "Free Independent Contractor Agreement Template — Create Online",
    metaDescription:
      "Generate a professional contractor agreement in minutes. Define scope, payment, IP ownership & termination. Jurisdiction-specific for CA, TX, NY & UK.",
    longDescription:
      "An independent contractor agreement formalizes the relationship between a company and a contractor, clearly establishing that the worker is not an employee. This distinction is critical for tax compliance, liability protection, and intellectual property ownership.\n\nA well-drafted contractor agreement protects both parties: the company retains ownership of work product, and the contractor maintains their independent status with clear payment terms and scope of work. Without this agreement, businesses risk misclassification penalties, and contractors may lose rights to their own tools and methods.\n\nOur AI-generated agreements are tailored to your jurisdiction's specific rules on worker classification — particularly important in states like California, which has strict ABC test requirements under AB5.",
    keyClauses: [
      { title: "Scope of Services", description: "Defines the specific work the contractor will perform, deliverables, and project milestones." },
      { title: "Compensation and Payment Terms", description: "Sets the payment amount, schedule (hourly, fixed, milestone-based), invoicing requirements, and expense reimbursement policies." },
      { title: "Independent Contractor Status", description: "Explicitly establishes the contractor as an independent worker, not an employee, with provisions for tax obligations and benefits exclusion." },
      { title: "Intellectual Property Ownership", description: "Assigns ownership of all work product to the company, with clear work-for-hire provisions and IP assignment clauses." },
      { title: "Confidentiality", description: "Protects the company's proprietary information and trade secrets that the contractor may access during the engagement." },
      { title: "Termination", description: "Defines how either party can end the agreement, notice requirements, and obligations upon termination." },
      { title: "Indemnification", description: "Allocates risk between the parties for third-party claims arising from the contractor's work." },
    ],
    whoNeedsThis: [
      "Startups hiring freelance developers, designers, or marketers",
      "Businesses engaging independent consultants for projects",
      "Companies working with remote contractors across state lines",
      "Agencies subcontracting work to specialists",
      "Any business that hires non-employee workers",
    ],
    whenToUse: [
      "Before any contractor begins work on a project",
      "When engaging a freelancer for recurring work",
      "When hiring contractors who will access confidential systems or data",
      "Before subcontracting work to third-party specialists",
      "When transitioning a verbal arrangement to a formal agreement",
    ],
    faqs: [
      { question: "What's the difference between a contractor and an employee?", answer: "Contractors control how and when they work, use their own tools, and can work for multiple clients. Employees work under the company's direction, use company resources, and typically work exclusively for one employer. Misclassification can result in significant penalties." },
      { question: "Who owns the intellectual property created by a contractor?", answer: "Without a written agreement, the contractor may own the IP they create. A proper contractor agreement includes work-for-hire and IP assignment clauses that transfer ownership to the company." },
      { question: "Can a contractor agreement include a non-compete clause?", answer: "It depends on the jurisdiction. California generally prohibits non-competes. Texas and New York allow them with reasonable restrictions. The UK permits them if they're reasonable in scope and duration." },
      { question: "How should contractor payments be structured?", answer: "Common structures include hourly rates, fixed project fees, milestone-based payments, or retainers. The agreement should specify the amount, payment schedule, invoicing process, and any late payment penalties." },
      { question: "Do I need to issue a 1099 for contractors?", answer: "In the US, you must issue a 1099-NEC to contractors paid $600 or more in a calendar year. In the UK, contractors are responsible for their own tax reporting through self-assessment." },
    ],
    relatedTypes: ["freelance_service", "consulting_agreement", "sow", "nda_one_way"],
    isPremiumOnly: false,
  },

  consulting_agreement: {
    heroTitle: "Consulting Agreement Template",
    metaTitle: "Free Consulting Agreement Template — Professional & Customizable",
    metaDescription:
      "Create a consulting agreement tailored to your needs. Define scope, fees, deliverables & IP rights. Jurisdiction-specific templates for CA, TX, NY & UK.",
    longDescription:
      "A consulting agreement defines the terms of a professional consulting engagement, including the scope of advisory services, compensation structure, intellectual property rights, and confidentiality obligations. It's the foundation of a clear, professional consulting relationship.\n\nUnlike a simple contractor agreement, consulting agreements often involve strategic advisory work, specialized expertise, and ongoing relationships. They typically include provisions for retainer fees, expense reimbursement, and detailed scope-of-work descriptions that can evolve over the engagement.\n\nOur AI-generated consulting agreements incorporate best practices from thousands of professional services contracts, ensuring your agreement covers everything from payment milestones to dispute resolution — all tailored to your specific jurisdiction.",
    keyClauses: [
      { title: "Scope of Consulting Services", description: "Defines the advisory services to be provided, including specific deliverables, project phases, and success criteria." },
      { title: "Compensation Structure", description: "Sets consulting fees (hourly, daily, project-based, or retainer), payment schedule, expense policies, and invoicing procedures." },
      { title: "Term and Engagement Period", description: "Specifies the start date, duration, renewal terms, and conditions for extending the engagement." },
      { title: "Confidentiality and Non-Disclosure", description: "Protects both parties' proprietary information, trade secrets, and business strategies shared during the engagement." },
      { title: "Intellectual Property Rights", description: "Clarifies ownership of work product, pre-existing IP, and any jointly developed intellectual property." },
      { title: "Non-Solicitation", description: "Prevents the consultant from soliciting the client's employees or customers for a specified period." },
      { title: "Limitation of Liability", description: "Caps the consultant's liability and defines exclusions for consequential damages." },
    ],
    whoNeedsThis: [
      "Businesses hiring management or strategy consultants",
      "Startups engaging technical or product advisors",
      "Companies bringing in specialized expertise for specific projects",
      "Consultants formalizing relationships with new clients",
      "Organizations engaging compliance or regulatory consultants",
    ],
    whenToUse: [
      "When engaging a professional consultant for advisory services",
      "Before starting a retainer-based consulting relationship",
      "When hiring specialized expertise for a strategic initiative",
      "Before sharing confidential business information with a consultant",
      "When formalizing an existing informal consulting arrangement",
    ],
    faqs: [
      { question: "How is a consulting agreement different from a contractor agreement?", answer: "Consulting agreements typically involve advisory and strategic work, while contractor agreements focus on specific deliverables or tasks. Consultants often have more autonomy in how they provide services and may bill on a retainer or hourly basis." },
      { question: "What fee structure should I use for consulting?", answer: "Common structures include hourly rates ($50-500+/hr), daily rates, project-based fixed fees, monthly retainers, or success-based fees. The right structure depends on the nature of the work and the consultant's preference." },
      { question: "Can a consultant work for competitors simultaneously?", answer: "Unless the agreement includes a non-compete or exclusivity clause, consultants are generally free to work with competitors. If exclusivity is important, include it in the agreement with appropriate compensation." },
      { question: "What should I do if the scope of work changes mid-engagement?", answer: "Include a change order provision in your agreement. This defines the process for modifying the scope, adjusting fees, and obtaining written approval before additional work begins." },
    ],
    relatedTypes: ["independent_contractor", "sow", "msa", "advisor_agreement"],
    isPremiumOnly: false,
  },

  freelance_service: {
    heroTitle: "Freelance Service Agreement Template",
    metaTitle: "Free Freelance Service Agreement Template — Protect Your Work",
    metaDescription:
      "Create a professional freelance service agreement. Define scope, payment, revisions & deadlines. Get signed and paid faster with Lexport.",
    longDescription:
      "A freelance service agreement protects both the freelancer and the client by clearly defining the scope of work, payment terms, revision policies, and deadlines. It's the essential contract for any freelance engagement — from design and development to writing and marketing.\n\nWithout a clear agreement, freelancers risk scope creep, delayed payments, and disputes over deliverables. Clients risk receiving work that doesn't meet expectations, missed deadlines, and unclear ownership of the final product.\n\nOur AI-generated freelance agreements are designed specifically for the modern freelance economy, with provisions for remote work, digital deliverables, milestone-based payments, and kill fees — all customized to your jurisdiction's requirements.",
    keyClauses: [
      { title: "Scope of Work and Deliverables", description: "Defines exactly what the freelancer will deliver, including specifications, formats, and acceptance criteria." },
      { title: "Payment Terms and Schedule", description: "Sets the total fee, deposit requirements, milestone payments, payment methods, and late payment penalties." },
      { title: "Timeline and Deadlines", description: "Establishes project milestones, delivery dates, and consequences for delays by either party." },
      { title: "Revision and Approval Process", description: "Specifies the number of included revisions, the approval process, and fees for additional changes beyond scope." },
      { title: "Intellectual Property Transfer", description: "Defines when IP transfers to the client (typically upon full payment) and what rights the freelancer retains for portfolio use." },
      { title: "Cancellation and Kill Fee", description: "Covers what happens if the project is cancelled, including payment for work completed and any kill fee provisions." },
    ],
    whoNeedsThis: [
      "Freelance designers, developers, and writers",
      "Marketing and content creation professionals",
      "Photographers, videographers, and creative professionals",
      "Small business owners hiring freelancers",
      "Agencies subcontracting creative work",
    ],
    whenToUse: [
      "Before starting any freelance project",
      "When a client requests work beyond the initial discussion",
      "Before accepting a deposit or starting paid work",
      "When working with a new client for the first time",
      "When transitioning from informal to formal freelance work",
    ],
    faqs: [
      { question: "Should I require a deposit before starting work?", answer: "Yes, requiring a 25-50% deposit upfront is standard practice. It demonstrates the client's commitment and ensures you're compensated if the project is cancelled. Our template includes deposit and milestone payment provisions." },
      { question: "How many revisions should I include?", answer: "2-3 rounds of revisions is standard for most freelance work. Include a clear revision policy in your agreement, with a process for handling requests beyond the included rounds." },
      { question: "Who owns the work — me or the client?", answer: "Typically, IP transfers to the client upon full payment. However, freelancers often retain portfolio rights. The agreement should clearly state when ownership transfers and what rights each party retains." },
      { question: "What is a kill fee?", answer: "A kill fee is a predetermined amount the client pays if they cancel the project after work has begun. It typically covers the work completed plus a percentage of the remaining fee. It protects freelancers from lost income." },
      { question: "Can I use this agreement for recurring client work?", answer: "Yes, but for ongoing relationships, consider a master service agreement (MSA) with individual statements of work (SOW) for each project. This provides a framework for recurring work without renegotiating terms each time." },
    ],
    relatedTypes: ["independent_contractor", "sow", "nda_one_way", "consulting_agreement"],
    isPremiumOnly: false,
  },

  safe_note: {
    heroTitle: "SAFE Note Template",
    metaTitle: "Free SAFE Note Template — Y Combinator Standard",
    metaDescription:
      "Generate a SAFE (Simple Agreement for Future Equity) note for your startup. Based on Y Combinator standards. Customizable for your cap and terms.",
    longDescription:
      "A SAFE (Simple Agreement for Future Equity) is a financing instrument used by startups to raise capital without immediately setting a valuation. Popularized by Y Combinator, SAFEs convert to equity in a future priced round, giving investors equity at a discount or subject to a valuation cap.\n\nSAFEs are simpler and faster than convertible notes — they have no interest rate, no maturity date, and no repayment obligation. This makes them the preferred instrument for early-stage fundraising.\n\nOur AI-generated SAFE notes follow Y Combinator's standard terms while allowing customization for your specific cap, discount, and most-favored-nation provisions.",
    keyClauses: [
      { title: "Valuation Cap", description: "Sets the maximum valuation at which the SAFE converts to equity, protecting the investor if the company's valuation increases significantly." },
      { title: "Discount Rate", description: "Provides the investor a percentage discount on the share price in the next equity financing round." },
      { title: "Conversion Mechanics", description: "Defines how and when the SAFE converts to equity — typically at the next priced equity round, dissolution, or change of control." },
      { title: "Pro Rata Rights", description: "Gives the investor the right to participate in future funding rounds to maintain their ownership percentage." },
      { title: "Most Favored Nation", description: "Ensures the investor gets the benefit of any better terms offered to other SAFE holders." },
    ],
    whoNeedsThis: [
      "Early-stage startup founders raising pre-seed or seed funding",
      "Angel investors making early-stage investments",
      "Startup accelerators and incubators",
      "Founders who want a quick fundraising instrument without complex negotiations",
    ],
    whenToUse: [
      "When raising a pre-seed or seed round from angel investors",
      "When you want to avoid setting a company valuation too early",
      "When speed is important and you need a simple investment document",
      "When participating in an accelerator program",
    ],
    faqs: [
      { question: "What is the difference between a SAFE and a convertible note?", answer: "A SAFE has no interest rate, no maturity date, and no repayment obligation. Convertible notes accrue interest and must be repaid or converted by a maturity date. SAFEs are simpler and more founder-friendly." },
      { question: "Should I use a valuation cap, discount, or both?", answer: "Most SAFEs include a valuation cap, a discount (typically 15-25%), or both. A cap-only SAFE is most common for early-stage rounds. Discuss with your investors to determine the best structure." },
      { question: "Are SAFE notes available in all jurisdictions?", answer: "SAFEs are primarily used in the US and follow US securities law. They can be adapted for UK use, but the legal framework differs. Consult local counsel for non-US jurisdictions." },
      { question: "How much can I raise with a SAFE?", answer: "There's no legal limit, but SAFEs are typically used for raises of $50K to $2M. For larger rounds, a priced equity round may be more appropriate." },
    ],
    relatedTypes: ["advisor_agreement", "cofounder_agreement", "letter_of_intent", "ip_assignment"],
    isPremiumOnly: true,
  },

  letter_of_intent: {
    heroTitle: "Letter of Intent Template",
    metaTitle: "Free Letter of Intent (LOI) Template — Non-Binding Agreement",
    metaDescription:
      "Generate a professional letter of intent for business deals, acquisitions, or partnerships. Outline key terms before committing to a formal agreement.",
    longDescription:
      "A letter of intent (LOI) outlines the key terms of a proposed business transaction before the parties commit to a binding agreement. It establishes mutual understanding and sets the framework for negotiating the final contract.\n\nLOIs are commonly used in mergers and acquisitions, real estate transactions, business partnerships, and joint ventures. While typically non-binding, certain provisions like confidentiality and exclusivity are often binding.\n\nOur AI-generated LOIs help you clearly articulate the proposed terms while maintaining appropriate legal protections during the negotiation phase.",
    keyClauses: [
      { title: "Transaction Overview", description: "Outlines the nature, structure, and key terms of the proposed deal." },
      { title: "Binding vs. Non-Binding Provisions", description: "Clearly identifies which terms are binding (e.g., confidentiality) and which are non-binding." },
      { title: "Exclusivity Period", description: "Grants the parties an exclusive negotiation window, preventing talks with competitors." },
      { title: "Due Diligence", description: "Sets the scope and timeline for investigating the other party's business and assets." },
      { title: "Conditions Precedent", description: "Lists conditions that must be met before a final agreement is executed." },
    ],
    whoNeedsThis: [
      "Companies exploring mergers or acquisitions",
      "Businesses entering joint venture discussions",
      "Parties negotiating significant commercial transactions",
      "Real estate investors making offers on commercial properties",
    ],
    whenToUse: [
      "At the beginning of M&A negotiations",
      "Before committing significant resources to due diligence",
      "When you want to formalize verbal agreement on key terms",
      "Before engaging lawyers to draft a definitive agreement",
    ],
    faqs: [
      { question: "Is a letter of intent legally binding?", answer: "Most LOI terms are non-binding — they express intent without creating a legal obligation. However, certain provisions like confidentiality, exclusivity, and governing law are typically binding." },
      { question: "What's the difference between an LOI and a term sheet?", answer: "They're very similar. Term sheets are more common in investment contexts, while LOIs are used for business transactions. Both outline proposed terms before a definitive agreement." },
      { question: "How long should an exclusivity period be?", answer: "Typically 30-90 days. The period should be long enough to complete due diligence and negotiate final terms, but not so long that it prevents the other party from pursuing other opportunities." },
    ],
    relatedTypes: ["nda_mutual", "safe_note", "cofounder_agreement", "msa"],
    isPremiumOnly: true,
  },

  cofounder_agreement: {
    heroTitle: "Co-Founder Agreement Template",
    metaTitle: "Free Co-Founder Agreement Template — Equity, Roles & Vesting",
    metaDescription:
      "Create a co-founder agreement with equity splits, vesting schedules, and role definitions. Prevent disputes before they happen. Generate in minutes.",
    longDescription:
      "A co-founder agreement defines the relationship between startup co-founders, including equity distribution, vesting schedules, roles and responsibilities, decision-making processes, and departure scenarios. It's one of the most important documents a startup can have.\n\nWithout a co-founder agreement, disputes over equity, control, and intellectual property can destroy a company. This agreement ensures all founders are aligned on expectations and have a clear framework for resolving disagreements.\n\nOur AI-generated agreements cover all the critical areas, from cliff and vesting periods to intellectual property assignment and non-compete provisions.",
    keyClauses: [
      { title: "Equity Split and Vesting", description: "Defines each founder's ownership percentage and vesting schedule, typically with a 4-year vesting period and 1-year cliff." },
      { title: "Roles and Responsibilities", description: "Assigns specific roles, titles, and areas of responsibility to each co-founder." },
      { title: "Decision Making", description: "Establishes how major decisions are made, voting rights, and deadlock resolution procedures." },
      { title: "IP Assignment", description: "Ensures all intellectual property created for the company is owned by the company, not individual founders." },
      { title: "Departure Terms", description: "Covers what happens when a co-founder leaves — voluntarily or involuntarily — including buyback provisions and accelerated vesting." },
    ],
    whoNeedsThis: [
      "Startup co-founders at the formation stage",
      "Existing teams formalizing their partnership",
      "Friends or colleagues starting a business together",
      "Technical and non-technical co-founders defining contributions",
    ],
    whenToUse: [
      "At the very beginning of a startup — ideally before any code is written",
      "When adding a new co-founder to an existing venture",
      "When co-founders want to formalize a handshake agreement",
      "Before accepting any outside investment",
    ],
    faqs: [
      { question: "What is a standard equity split for co-founders?", answer: "There's no universal standard. Equal splits (50/50) are common for two co-founders, but many advisors recommend splits based on contributions — idea, capital, time commitment, and expertise. What matters most is that all founders feel the split is fair." },
      { question: "What is a vesting cliff?", answer: "A vesting cliff is a minimum period (typically 1 year) before any equity vests. If a co-founder leaves before the cliff, they receive no equity. After the cliff, equity vests monthly or quarterly over the remaining vesting period (typically 3 more years)." },
      { question: "What happens if a co-founder wants to leave?", answer: "The agreement should specify departure terms — including what happens to unvested equity (typically forfeited), whether the company can buy back vested equity, and any non-compete or non-solicitation obligations." },
    ],
    relatedTypes: ["ip_assignment", "advisor_agreement", "safe_note", "nda_mutual"],
    isPremiumOnly: true,
  },

  sales_contract: {
    heroTitle: "Sales Contract Template",
    metaTitle: "Free Sales Contract Template — Terms for Goods & Services",
    metaDescription:
      "Generate a professional sales contract for goods or services. Define pricing, delivery, warranties & returns. Jurisdiction-specific for CA, TX, NY & UK.",
    longDescription:
      "A sales contract formalizes the terms of a transaction for goods or services, protecting both the buyer and seller. It covers pricing, delivery terms, warranties, payment conditions, and remedies for breach.\n\nWhether you're selling products, software licenses, or professional services, a well-drafted sales contract prevents misunderstandings and provides legal recourse if either party doesn't fulfill their obligations.\n\nOur AI-generated sales contracts comply with the Uniform Commercial Code (UCC) for US transactions and the Sale of Goods Act for UK transactions.",
    keyClauses: [
      { title: "Product/Service Description", description: "Detailed specification of what is being sold, including quantities, quality standards, and acceptance criteria." },
      { title: "Pricing and Payment", description: "Total price, payment schedule, accepted payment methods, and consequences of late payment." },
      { title: "Delivery Terms", description: "Shipping method, delivery timeline, risk of loss transfer, and inspection periods." },
      { title: "Warranties", description: "Express and implied warranties, warranty duration, and limitation of liability." },
      { title: "Returns and Refunds", description: "Return policy, refund process, and restocking fees if applicable." },
    ],
    whoNeedsThis: [
      "Businesses selling products or services to other businesses",
      "E-commerce companies formalizing B2B transactions",
      "Manufacturers selling goods to distributors or retailers",
      "Service providers with high-value client engagements",
    ],
    whenToUse: [
      "Before any significant B2B transaction",
      "When selling goods or services above a threshold amount",
      "When dealing with new customers or entering new markets",
      "When terms need to differ from standard terms and conditions",
    ],
    faqs: [
      { question: "Is a sales contract different from a purchase order?", answer: "Yes. A purchase order is a buyer's offer to purchase. A sales contract is a binding agreement between both parties. A PO can become a contract when the seller accepts it." },
      { question: "What warranties should be included?", answer: "At minimum, include express warranties about the product/service quality. Consider whether to disclaim implied warranties (merchantability, fitness for purpose) or limit their scope." },
      { question: "What law governs the sale of goods?", answer: "In the US, Article 2 of the Uniform Commercial Code (UCC) governs. In the UK, the Sale of Goods Act 1979 and Consumer Rights Act 2015 apply. International sales may be governed by the UN CISG." },
    ],
    relatedTypes: ["msa", "sow", "freelance_service", "independent_contractor"],
    isPremiumOnly: false,
  },

  ip_assignment: {
    heroTitle: "IP Assignment Agreement Template",
    metaTitle: "Free IP Assignment Agreement Template — Transfer IP Rights",
    metaDescription:
      "Generate an intellectual property assignment agreement. Transfer patents, copyrights, trademarks & trade secrets. Jurisdiction-specific templates available.",
    longDescription:
      "An IP assignment agreement transfers ownership of intellectual property rights from one party to another. This includes patents, copyrights, trademarks, trade secrets, and other proprietary rights.\n\nIP assignment agreements are critical for startups (ensuring founder and contractor IP belongs to the company), acquisitions (transferring IP assets), and any situation where intellectual property changes hands.\n\nOur AI-generated agreements cover all forms of IP, include representations and warranties about ownership, and comply with jurisdiction-specific registration and recording requirements.",
    keyClauses: [
      { title: "Description of Assigned IP", description: "Comprehensive listing of all intellectual property being transferred, including registration numbers and descriptions." },
      { title: "Assignment and Transfer", description: "The actual transfer clause, including present assignment of all rights, title, and interest." },
      { title: "Representations and Warranties", description: "Assignor's warranties regarding ownership, non-infringement, and absence of encumbrances." },
      { title: "Further Assurances", description: "Obligation to execute additional documents needed to perfect the IP transfer." },
      { title: "Consideration", description: "Payment or other consideration for the IP transfer." },
    ],
    whoNeedsThis: [
      "Startups ensuring founder and employee IP belongs to the company",
      "Companies acquiring intellectual property from contractors",
      "Businesses purchasing IP assets from other companies",
      "Inventors licensing or selling patent rights",
    ],
    whenToUse: [
      "When incorporating a startup with pre-existing founder IP",
      "When a contractor creates IP that should belong to the company",
      "During M&A transactions involving IP assets",
      "When purchasing patent, copyright, or trademark rights",
    ],
    faqs: [
      { question: "What types of IP can be assigned?", answer: "All forms of intellectual property can be assigned: patents, copyrights, trademarks, trade secrets, domain names, and software code. The agreement should specifically identify each type being transferred." },
      { question: "Does an IP assignment need to be recorded?", answer: "For patents and trademarks, recording with the relevant government office (USPTO, UKIPO) provides constructive notice and is recommended. Copyright assignments should be recorded with the Copyright Office for full protection." },
      { question: "Can IP be partially assigned?", answer: "Yes. You can assign specific rights (e.g., rights in a particular territory) while retaining others. However, partial assignments can be complex and should be clearly documented." },
    ],
    relatedTypes: ["independent_contractor", "cofounder_agreement", "nda_one_way", "employment_offer"],
    isPremiumOnly: true,
  },

  advisor_agreement: {
    heroTitle: "Advisor Agreement Template",
    metaTitle: "Free Startup Advisor Agreement Template — Equity & Terms",
    metaDescription:
      "Create a startup advisor agreement with equity compensation, vesting, and scope of advisory services. Based on FAST Agreement standards.",
    longDescription:
      "An advisor agreement formalizes the relationship between a startup and its advisors, defining the scope of advisory services, equity compensation, vesting schedule, and confidentiality obligations.\n\nStartup advisors typically receive equity (0.1-1% depending on stage and involvement level) in exchange for strategic guidance, introductions, and expertise. A clear agreement protects both parties and ensures expectations are aligned.\n\nOur AI-generated advisor agreements follow industry standards (including the FAST Agreement framework) while allowing customization for your specific needs.",
    keyClauses: [
      { title: "Advisory Services", description: "Defines the expected advisory contributions — strategic guidance, introductions, technical expertise, or board participation." },
      { title: "Equity Compensation", description: "Sets the equity grant amount, vesting schedule (typically 2 years monthly), and any cliff period." },
      { title: "Time Commitment", description: "Specifies the expected hours per month and availability requirements." },
      { title: "Confidentiality", description: "Protects the company's proprietary information and strategic plans shared with the advisor." },
      { title: "Non-Compete and Non-Solicitation", description: "Restrictions on the advisor working with competitors or soliciting employees during and after the engagement." },
    ],
    whoNeedsThis: [
      "Early-stage startups building an advisory board",
      "Founders seeking industry expertise and connections",
      "Companies formalizing existing advisory relationships",
      "Serial entrepreneurs advising portfolio companies",
    ],
    whenToUse: [
      "When bringing on a new advisor to your startup",
      "When an advisor will receive equity compensation",
      "Before sharing confidential business information with a potential advisor",
      "When formalizing a mentor relationship with equity involvement",
    ],
    faqs: [
      { question: "How much equity should I give an advisor?", answer: "Standard ranges: 0.1-0.25% for light involvement (a few hours/month), 0.25-0.5% for moderate involvement, and 0.5-1% for heavy involvement (weekly calls, strategic guidance). Early-stage companies typically grant more." },
      { question: "What vesting schedule is standard for advisors?", answer: "The most common schedule is 2 years with monthly vesting and no cliff. Some agreements use a 1-year vesting with quarterly periods. The FAST Agreement standard is 2 years monthly." },
      { question: "What's the difference between an advisor and a board member?", answer: "Advisors provide informal guidance without fiduciary duties. Board members have legal obligations to the company and its shareholders, participate in governance, and have voting rights on major decisions." },
    ],
    relatedTypes: ["cofounder_agreement", "safe_note", "consulting_agreement", "nda_mutual"],
    isPremiumOnly: true,
  },

  employment_offer: {
    heroTitle: "Employment Offer Letter Template",
    metaTitle: "Free Employment Offer Letter Template — Professional & Compliant",
    metaDescription:
      "Generate a compliant employment offer letter with salary, benefits, start date & terms. Jurisdiction-specific for California, Texas, New York & UK.",
    longDescription:
      "An employment offer letter formally extends a job offer to a candidate, outlining the key terms of employment including position, compensation, benefits, start date, and any conditions of employment.\n\nA well-drafted offer letter sets clear expectations and protects both the employer and the new hire. It serves as the foundation for the employment relationship and may be referenced in any future disputes.\n\nOur AI-generated offer letters comply with jurisdiction-specific employment laws, including at-will employment provisions (US) and statutory employment rights (UK).",
    keyClauses: [
      { title: "Position and Duties", description: "Defines the job title, reporting structure, and primary responsibilities." },
      { title: "Compensation", description: "Base salary, bonus structure, equity grants, and payment frequency." },
      { title: "Benefits", description: "Health insurance, retirement plans, PTO, and other employee benefits." },
      { title: "Start Date and Location", description: "Expected start date, work location, and remote work arrangements." },
      { title: "At-Will Employment / Notice Period", description: "At-will provisions (US) or notice period requirements (UK) for termination." },
      { title: "Conditions of Employment", description: "Background checks, drug screening, right to work verification, and other pre-employment conditions." },
    ],
    whoNeedsThis: [
      "Startups making their first hires",
      "HR departments standardizing offer letters",
      "Small businesses hiring full-time employees",
      "Companies hiring across different jurisdictions",
    ],
    whenToUse: [
      "After selecting a candidate and negotiating compensation",
      "When formalizing a verbal job offer",
      "When hiring employees in a new jurisdiction for the first time",
      "When updating offer letter templates for compliance",
    ],
    faqs: [
      { question: "Is an offer letter legally binding?", answer: "Offer letters can create binding obligations depending on the language used and jurisdiction. It's important to include at-will provisions (US) or clearly state that the letter is not a contract of employment unless intended." },
      { question: "What's the difference between an offer letter and an employment contract?", answer: "An offer letter is typically shorter and outlines key terms. An employment contract is more detailed and legally binding, covering specific obligations, restrictive covenants, and termination procedures." },
      { question: "Should I include equity details in the offer letter?", answer: "Include the equity grant amount and vesting schedule at a high level. Reference a separate equity agreement for detailed terms. This keeps the offer letter clean while confirming the equity commitment." },
    ],
    relatedTypes: ["independent_contractor", "nda_one_way", "ip_assignment", "advisor_agreement"],
    isPremiumOnly: true,
  },

  sow: {
    heroTitle: "Statement of Work Template",
    metaTitle: "Free Statement of Work (SOW) Template — Define Project Scope",
    metaDescription:
      "Create a detailed statement of work with deliverables, timeline, milestones & acceptance criteria. Perfect for project-based engagements.",
    longDescription:
      "A statement of work (SOW) defines the specific tasks, deliverables, timeline, and acceptance criteria for a project. It's typically used alongside a master service agreement (MSA) or as a standalone document for project-based engagements.\n\nA clear SOW prevents scope creep, aligns expectations, and provides a framework for measuring project success. It's the most important document for any project-based engagement.\n\nOur AI-generated SOWs include best practices for deliverable descriptions, milestone payments, and change management processes.",
    keyClauses: [
      { title: "Project Scope and Objectives", description: "High-level description of the project goals and what is in and out of scope." },
      { title: "Deliverables and Specifications", description: "Detailed list of all deliverables with format, quality, and specification requirements." },
      { title: "Timeline and Milestones", description: "Project schedule with key milestones, dependencies, and delivery dates." },
      { title: "Acceptance Criteria", description: "How deliverables will be evaluated and the process for acceptance or rejection." },
      { title: "Change Management", description: "Process for handling scope changes, including change request procedures and cost implications." },
    ],
    whoNeedsThis: [
      "Project managers defining project scope",
      "Agencies scoping client projects",
      "IT service providers detailing implementation plans",
      "Companies outsourcing specific projects or workstreams",
    ],
    whenToUse: [
      "When starting a new project-based engagement",
      "When adding a new project under an existing MSA",
      "When a project scope needs to be clearly documented",
      "When working with external vendors on specific deliverables",
    ],
    faqs: [
      { question: "What's the difference between an SOW and a contract?", answer: "An SOW defines project-specific details (scope, deliverables, timeline). It often operates under a master service agreement (MSA) that covers general terms. Together, they form the complete engagement framework." },
      { question: "How detailed should deliverable descriptions be?", answer: "Detailed enough that both parties agree on what 'done' looks like. Include format, quantity, quality standards, and acceptance criteria for each deliverable." },
      { question: "How should I handle scope changes?", answer: "Include a change management clause requiring written change requests, impact assessment (cost and timeline), and mutual approval before any changes to the original scope." },
    ],
    relatedTypes: ["msa", "consulting_agreement", "independent_contractor", "freelance_service"],
    isPremiumOnly: false,
  },

  msa: {
    heroTitle: "Master Service Agreement Template",
    metaTitle: "Free Master Service Agreement (MSA) Template — Framework Agreement",
    metaDescription:
      "Generate a master service agreement to govern ongoing business relationships. Define terms once, use SOWs for individual projects. Professional templates.",
    longDescription:
      "A master service agreement (MSA) establishes the general terms and conditions that govern an ongoing business relationship between a service provider and a client. Individual projects are then executed under separate statements of work (SOWs) that reference the MSA.\n\nMSAs save time and reduce negotiation costs by establishing terms once — covering liability, IP ownership, confidentiality, and dispute resolution — so each new project only requires a project-specific SOW.\n\nOur AI-generated MSAs are comprehensive framework agreements suitable for technology, consulting, professional services, and creative agencies.",
    keyClauses: [
      { title: "General Terms and Conditions", description: "Overarching terms that apply to all work performed under the agreement." },
      { title: "Intellectual Property", description: "Default IP ownership rules for work product created under any SOW." },
      { title: "Confidentiality", description: "Mutual confidentiality obligations that apply across all projects." },
      { title: "Indemnification", description: "Each party's indemnification obligations for third-party claims." },
      { title: "Limitation of Liability", description: "Caps on liability and exclusions for consequential damages." },
      { title: "Dispute Resolution", description: "Process for resolving disputes — negotiation, mediation, arbitration, or litigation." },
    ],
    whoNeedsThis: [
      "Service providers with recurring client relationships",
      "Agencies managing multiple projects per client",
      "IT companies providing ongoing support and development",
      "Consulting firms with enterprise clients",
    ],
    whenToUse: [
      "When starting a long-term service provider relationship",
      "When you expect multiple projects with the same client",
      "When you want to streamline future project negotiations",
      "When replacing ad-hoc contracts with a structured framework",
    ],
    faqs: [
      { question: "Do I need both an MSA and SOWs?", answer: "The MSA provides general terms. Each project gets its own SOW with specific scope, timeline, and cost. This structure is efficient for ongoing relationships — you negotiate the MSA once and only negotiate project specifics for each new SOW." },
      { question: "Which takes precedence — the MSA or the SOW?", answer: "The agreement should specify. Typically, the SOW takes precedence for project-specific terms, while the MSA governs general terms. Conflicting provisions should be addressed in a precedence clause." },
      { question: "How long should an MSA last?", answer: "MSAs typically have a 1-3 year term with automatic renewal. Either party can usually terminate with 30-90 days' notice. Active SOWs may survive MSA termination." },
    ],
    relatedTypes: ["sow", "consulting_agreement", "independent_contractor", "sales_contract"],
    isPremiumOnly: true,
  },
};

// ============================================================================
// Jurisdiction-Specific Content
// ============================================================================

// Base jurisdiction content that applies across all contract types
const BASE_JURISDICTION_NOTES: Record<string, { overview: string; keyFacts: string[] }> = {
  us_california: {
    overview: "California has some of the most employee and contractor-friendly laws in the United States. The state's strict worker classification rules under AB5, broad non-compete prohibitions, and strong privacy protections (CCPA/CPRA) significantly impact contract drafting.",
    keyFacts: [
      "Non-compete clauses are generally unenforceable under Business and Professions Code §16600",
      "AB5 codifies the ABC test for worker classification — contractors must meet all three prongs",
      "CCPA/CPRA requires data protection provisions in contracts involving personal information",
      "California's Fair Employment and Housing Act provides broad workplace protections",
    ],
  },
  us_texas: {
    overview: "Texas is widely considered a business-friendly state with strong contract enforcement traditions. The state follows at-will employment, enforces reasonable non-competes, and has no state income tax — factors that influence how contracts are drafted and compensation structured.",
    keyFacts: [
      "Non-compete agreements are enforceable if reasonable in scope, duration, and geography",
      "Texas follows the economic reality test for worker classification",
      "The Texas Business and Commerce Code governs commercial transactions",
      "Texas courts generally favor freedom of contract and enforce agreements as written",
    ],
  },
  us_new_york: {
    overview: "New York is a major commercial hub with sophisticated contract law shaped by centuries of case precedent. The state's courts are experienced with complex business disputes, and many national and international agreements choose New York law as the governing jurisdiction.",
    keyFacts: [
      "Recent legislation has significantly restricted non-compete agreements",
      "New York follows the common-law test for independent contractor classification",
      "The state has strong consumer protection laws affecting B2C contracts",
      "New York courts strictly enforce written contract terms with limited parol evidence",
    ],
  },
  uk: {
    overview: "United Kingdom contract law is governed by common law principles, the Employment Rights Act, and extensive regulations implementing retained EU law including GDPR. UK contracts must comply with the Consumer Rights Act 2015, the Unfair Contract Terms Act 1977, and sector-specific regulations.",
    keyFacts: [
      "UK GDPR and Data Protection Act 2018 require data processing provisions in many contracts",
      "Employment status (employee vs. worker vs. self-employed) has significant legal implications",
      "IR35 rules affect how contractors are classified and taxed when working through intermediaries",
      "Restrictive covenants must be reasonable in scope and duration to be enforceable",
    ],
  },
};

// Generate jurisdiction-specific content for each type+jurisdiction combo
function generateJurisdictionContent(
  contractType: string,
  jurisdiction: string
): JurisdictionVariantSEO {
  const typeContent = TEMPLATE_TYPE_CONTENT[contractType];
  const jurisdictionBase = BASE_JURISDICTION_NOTES[jurisdiction];
  const jurisdictionName = JURISDICTION_DISPLAY_MAP[jurisdiction];
  const typeName = TYPE_DISPLAY_MAP[contractType];

  if (!typeContent || !jurisdictionBase || !jurisdictionName || !typeName) {
    return {
      metaTitle: "Legal Template",
      metaDescription: "Professional legal contract template.",
      jurisdictionNotes: "",
      specificProvisions: [],
      enforcementNotes: "",
      faqs: [],
    };
  }

  return JURISDICTION_CONTENT[`${contractType}:${jurisdiction}`] ?? {
    metaTitle: `${jurisdictionName} ${typeName} Template — Free Download`,
    metaDescription: `Generate a ${typeName.toLowerCase()} compliant with ${jurisdictionName} law. Professionally drafted, customizable, and ready to e-sign.`,
    jurisdictionNotes: `${jurisdictionBase.overview}\n\nWhen drafting a ${typeName.toLowerCase()} under ${jurisdictionName} law, it's important to account for these local requirements to ensure your agreement is enforceable.`,
    specificProvisions: jurisdictionBase.keyFacts,
    enforcementNotes: `Contracts governed by ${jurisdictionName} law are subject to the state's specific enforcement standards. Courts will evaluate the reasonableness of restrictive provisions and may modify overly broad terms rather than voiding the entire agreement.`,
    faqs: [
      {
        question: `Is this ${typeName.toLowerCase()} enforceable in ${jurisdictionName}?`,
        answer: `Yes. Our templates are specifically drafted to comply with ${jurisdictionName} law, including all relevant statutes and case law requirements. However, we always recommend legal review for high-value or complex transactions.`,
      },
      {
        question: `What courts handle contract disputes in ${jurisdictionName}?`,
        answer: jurisdiction === "uk"
          ? "Contract disputes in the UK are typically handled by the County Court (claims under £100,000) or the High Court (larger claims). The Commercial Court, part of the High Court, handles complex business disputes."
          : `Contract disputes in ${jurisdictionName} are handled by state courts. For business disputes, you may also specify federal court or arbitration in your agreement.`,
      },
      {
        question: `Do I need a lawyer to use this template in ${jurisdictionName}?`,
        answer: `For standard business transactions, our AI-generated templates are designed to be used without legal counsel. For complex deals, high-value transactions, or situations with unusual circumstances, we recommend having a ${jurisdictionName}-licensed attorney review the agreement.`,
      },
    ],
  };
}

// Display name maps (used internally by generateJurisdictionContent)
const JURISDICTION_DISPLAY_MAP: Record<string, string> = {
  us_california: "California",
  us_texas: "Texas",
  us_new_york: "New York",
  uk: "United Kingdom",
};

const TYPE_DISPLAY_MAP: Record<string, string> = {
  nda_mutual: "Mutual NDA",
  nda_one_way: "One-Way NDA",
  independent_contractor: "Independent Contractor Agreement",
  consulting_agreement: "Consulting Agreement",
  safe_note: "SAFE Note",
  freelance_service: "Freelance Service Agreement",
  letter_of_intent: "Letter of Intent",
  cofounder_agreement: "Co-Founder Agreement",
  sales_contract: "Sales Contract",
  ip_assignment: "IP Assignment Agreement",
  advisor_agreement: "Advisor Agreement",
  employment_offer: "Employment Offer Letter",
  sow: "Statement of Work",
  msa: "Master Service Agreement",
};

// ============================================================================
// Detailed Jurisdiction Overrides (for high-priority combos)
// ============================================================================

const JURISDICTION_CONTENT: Record<string, JurisdictionVariantSEO> = {
  "nda_mutual:us_california": {
    metaTitle: "California Mutual NDA Template — Free & Compliant",
    metaDescription: "Generate a mutual NDA compliant with California law. Accounts for CA non-compete restrictions and CCPA requirements. E-sign and share instantly.",
    jurisdictionNotes: "California imposes unique restrictions on NDAs that don't exist in other states. Non-compete provisions within NDAs are generally unenforceable under Business and Professions Code §16600. Additionally, NDAs cannot be used to prevent disclosure of sexual harassment or discrimination claims (SB 331, the Silenced No More Act).\n\nOur California mutual NDAs are drafted to comply with these restrictions while still providing strong confidentiality protection for your business information.",
    specificProvisions: [
      "Non-compete clauses excluded per Business and Professions Code §16600",
      "Compliant with SB 331 (Silenced No More Act) — does not restrict harassment/discrimination disclosure",
      "CCPA/CPRA data protection language included when personal information may be shared",
      "Trade secret protections under California's Uniform Trade Secrets Act (CUTSA)",
      "Carve-out for legally compelled disclosure under California Evidence Code",
    ],
    enforcementNotes: "California courts strongly enforce the confidentiality provisions of mutual NDAs but will strike down any provisions that effectively function as non-compete agreements. The state's Uniform Trade Secrets Act provides additional protection beyond the NDA for qualifying trade secrets.",
    faqs: [
      { question: "Can a California NDA include a non-compete clause?", answer: "No. California Business and Professions Code §16600 prohibits non-compete agreements. Any non-compete provision in an NDA is unenforceable and could expose you to liability. Our California NDA templates exclude non-compete clauses." },
      { question: "Does my NDA need to comply with CCPA?", answer: "If your NDA involves sharing personal information of California residents, you should include CCPA/CPRA compliance language. Our templates include optional data protection provisions for this purpose." },
      { question: "What remedies are available for NDA breach in California?", answer: "You can seek injunctive relief (court order to stop further disclosure), monetary damages, and attorney's fees. California's CUTSA also provides additional remedies for trade secret misappropriation, including exemplary damages for willful violations." },
    ],
  },

  "nda_mutual:us_texas": {
    metaTitle: "Texas Mutual NDA Template — Free & Enforceable",
    metaDescription: "Generate a mutual NDA under Texas law. Includes enforceable non-solicitation and trade secret protections. Create, e-sign, and share online.",
    jurisdictionNotes: "Texas courts strongly enforce well-drafted NDAs and provide broad protections for trade secrets under the Texas Uniform Trade Secrets Act (TUTSA). Unlike California, Texas allows reasonable restrictive covenants within NDAs, including non-solicitation provisions.\n\nTexas also has a relatively quick court process for obtaining temporary restraining orders and injunctions in trade secret cases, providing effective enforcement mechanisms.",
    specificProvisions: [
      "Trade secret protections under the Texas Uniform Trade Secrets Act (TUTSA)",
      "Reasonable non-solicitation provisions may be included and enforced",
      "Texas courts can modify overly broad restrictions rather than voiding them entirely",
      "Specific performance and injunctive relief readily available for NDA breaches",
      "Exemplary damages available for willful and malicious trade secret misappropriation",
    ],
    enforcementNotes: "Texas courts enforce NDAs as written and may reform overly broad provisions to make them reasonable rather than striking them entirely. This reformation doctrine is favorable for NDA enforcement.",
    faqs: [
      { question: "Can I include non-solicitation provisions in a Texas NDA?", answer: "Yes. Texas enforces reasonable non-solicitation provisions tied to legitimate business interests. The restrictions must be reasonable in scope, duration, and geographic area." },
      { question: "How quickly can I get an injunction for NDA breach in Texas?", answer: "Texas courts can issue temporary restraining orders (TROs) within days of filing. A temporary injunction hearing typically occurs within 14 days. For urgent situations, ex parte TROs can be obtained within hours." },
      { question: "What damages can I recover for NDA breach in Texas?", answer: "Actual damages, unjust enrichment, reasonable royalties, exemplary damages (up to 2x actual damages for willful misappropriation), and attorney's fees under TUTSA." },
    ],
  },

  "nda_mutual:us_new_york": {
    metaTitle: "New York Mutual NDA Template — Free & Enforceable",
    metaDescription: "Generate a mutual NDA governed by New York law. Industry-standard protections for business transactions. Create, customize, and e-sign online.",
    jurisdictionNotes: "New York is one of the most common governing law choices for NDAs in the United States, particularly for business transactions involving financial services, media, and technology companies. New York courts have extensive experience adjudicating NDA disputes.\n\nRecent New York legislation has restricted non-compete agreements, but standard NDA provisions remain fully enforceable.",
    specificProvisions: [
      "New York's Defend Trade Secrets Act provides strong trade secret protections",
      "Recent non-compete restrictions do not affect standard NDA confidentiality provisions",
      "New York courts strictly enforce written contract terms with limited parol evidence exceptions",
      "Preliminary injunctions are available through NY CPLR Article 63 for NDA breaches",
      "Choice of New York law and forum is widely respected by courts in other jurisdictions",
    ],
    enforcementNotes: "New York courts are highly experienced with NDA enforcement. They strictly enforce the written terms and are generally reluctant to add terms not expressly stated. Choose New York law when you want predictable enforcement.",
    faqs: [
      { question: "Why do so many NDAs choose New York law?", answer: "New York has a well-developed body of contract law, experienced judges, and predictable enforcement. NY General Obligations Law §5-1401 allows parties to choose New York law for agreements involving $250,000 or more, even if neither party is based in New York." },
      { question: "How does New York's new non-compete law affect NDAs?", answer: "The recent restrictions on non-compete agreements do not affect standard NDA provisions. Confidentiality obligations, non-disclosure requirements, and non-solicitation provisions tied to protecting confidential information remain fully enforceable." },
      { question: "Can I enforce a New York NDA against someone in another state?", answer: "Generally yes, if you can establish personal jurisdiction over the breaching party. Most NDAs include a consent-to-jurisdiction clause that helps ensure enforcement in New York courts." },
    ],
  },

  "nda_mutual:uk": {
    metaTitle: "UK Mutual NDA Template — GDPR Compliant & Enforceable",
    metaDescription: "Generate a mutual NDA compliant with UK law and GDPR. Protect confidential information in business dealings. Create and e-sign online.",
    jurisdictionNotes: "UK NDAs (also called confidentiality agreements) are governed by common law principles of contract and equity, supplemented by statute. UK GDPR and the Data Protection Act 2018 impose additional requirements when personal data is shared under an NDA.\n\nUK courts enforce NDAs but will not enforce provisions that are unreasonable in scope or duration. Restrictive covenants must protect legitimate business interests and go no further than necessary.",
    specificProvisions: [
      "UK GDPR compliance provisions for personal data shared under the NDA",
      "Data Protection Act 2018 requirements for data processing",
      "Restrictive covenants must be reasonable and proportionate to be enforceable",
      "Equitable remedies (injunctions, account of profits) available for breach",
      "Compliance with the Employment Rights Act where the NDA involves employees",
    ],
    enforcementNotes: "UK courts enforce NDAs through both common law (breach of contract) and equitable principles (breach of confidence). Interim injunctions are available through the courts. The party seeking enforcement must demonstrate a serious issue to be tried and that damages would not be an adequate remedy.",
    faqs: [
      { question: "Does my UK NDA need to comply with GDPR?", answer: "If any personal data (names, emails, etc.) will be shared under the NDA, you should include GDPR-compliant data processing provisions. Our UK templates include appropriate data protection clauses." },
      { question: "Are UK NDAs called something different?", answer: "In the UK, NDAs are often called 'confidentiality agreements' or 'CDAs'. The terms are interchangeable — the legal effect is the same regardless of the name." },
      { question: "Can a UK NDA prevent me from whistleblowing?", answer: "No. UK law protects whistleblowers under the Public Interest Disclosure Act 1998. NDAs cannot prevent disclosure of criminal activity, regulatory breaches, or health and safety issues." },
    ],
  },

  "independent_contractor:us_california": {
    metaTitle: "California Independent Contractor Agreement — AB5 Compliant",
    metaDescription: "Generate a contractor agreement compliant with California AB5 and the ABC test. Proper worker classification, IP ownership & payment terms.",
    jurisdictionNotes: "California has the strictest independent contractor classification rules in the US. Assembly Bill 5 (AB5) codifies the ABC test, which presumes all workers are employees unless the hiring entity can prove all three conditions: (A) the worker is free from control, (B) the work is outside the usual course of business, and (C) the worker has an independently established business.\n\nProper classification is critical — misclassification penalties include back taxes, benefits, overtime, and penalties under the Labor Code.",
    specificProvisions: [
      "AB5 ABC test compliance language and representations",
      "Non-compete clauses excluded per Business and Professions Code §16600",
      "Contractor independence provisions (own tools, own schedule, multiple clients)",
      "CCPA/CPRA compliance for personal information handling",
      "Explicit statements about tax responsibility and no employee benefits",
    ],
    enforcementNotes: "California aggressively enforces worker classification rules. The Labor Commissioner, Employment Development Department (EDD), and Franchise Tax Board all investigate misclassification. Penalties can exceed $25,000 per violation plus back wages, benefits, and taxes.",
    faqs: [
      { question: "What is the ABC test under AB5?", answer: "A worker is an employee unless: (A) they're free from control and direction in performing work, (B) the work is outside the hiring entity's usual course of business, and (C) the worker has an independently established trade or business. All three must be proven." },
      { question: "Can I include a non-compete in a California contractor agreement?", answer: "No. California Business and Professions Code §16600 prohibits non-compete agreements for both employees and contractors. Non-solicitation of clients may be enforceable in limited circumstances." },
      { question: "What happens if I misclassify a worker in California?", answer: "Penalties include back wages, overtime, rest period violations, unpaid benefits, tax penalties, and statutory penalties of $5,000-$25,000 per violation. Willful misclassification carries additional penalties." },
    ],
  },

  "independent_contractor:uk": {
    metaTitle: "UK Independent Contractor Agreement — IR35 Compliant",
    metaDescription: "Generate a contractor agreement compliant with UK law and IR35. Proper employment status, IP ownership & GDPR provisions. Create online.",
    jurisdictionNotes: "The UK distinguishes between employees, workers, and self-employed contractors. IR35 (off-payroll working rules) requires businesses to assess whether a contractor is genuinely self-employed or should be treated as an employee for tax purposes.\n\nSince April 2021, medium and large businesses are responsible for determining contractor status. Getting it wrong can result in significant tax liabilities for the hiring company.",
    specificProvisions: [
      "IR35 compliance provisions and status determination statement",
      "Employment status indicators clearly establishing self-employed status",
      "GDPR and Data Protection Act 2018 compliance",
      "Substitution clause (right to send a substitute) — key IR35 factor",
      "Confirmation of contractor's VAT registration status if applicable",
    ],
    enforcementNotes: "HMRC enforces IR35 through compliance checks and can reassess contractor status retrospectively. If a determination is challenged, the employment tribunal or tax tribunal will examine the actual working relationship, not just the contract terms.",
    faqs: [
      { question: "What is IR35 and how does it affect my contractor agreement?", answer: "IR35 determines whether a contractor should be taxed as an employee. If the working arrangement looks like employment (regular hours, single client, employer's tools), HMRC may deem it 'inside IR35' and the hiring company becomes liable for employment taxes." },
      { question: "Who is responsible for IR35 assessment?", answer: "Since April 2021, medium and large private sector businesses must assess contractor status and provide a Status Determination Statement (SDS). Small businesses are exempt — the contractor makes their own determination." },
      { question: "What makes a contractor 'outside IR35'?", answer: "Key factors include: right of substitution (can send someone else to do the work), no mutuality of obligation (no guarantee of ongoing work), financial risk (fixed price vs. hourly), and use of own equipment." },
    ],
  },

  "freelance_service:us_california": {
    metaTitle: "California Freelance Service Agreement — AB5 Compliant",
    metaDescription: "Generate a freelance service agreement for California. AB5 compliant, covers scope, payment, IP & revisions. Create and e-sign online.",
    jurisdictionNotes: "California's Freelance Worker Protection Act (effective 2025) provides additional protections for freelancers, including requirements for written contracts for engagements over $250, timely payment (within 30 days), and penalties for non-payment.\n\nCombined with AB5's strict worker classification rules, freelance agreements in California must carefully establish the freelancer's independent status while complying with new payment and documentation requirements.",
    specificProvisions: [
      "Freelance Worker Protection Act compliance for contracts over $250",
      "30-day payment requirement per state law",
      "AB5 ABC test compliance language",
      "Non-compete exclusion per Business and Professions Code §16600",
      "IP transfer provisions compliant with California Copyright Act provisions",
    ],
    enforcementNotes: "The California Labor Commissioner enforces the Freelance Worker Protection Act. Freelancers can recover double damages for late payment, plus attorney's fees. The city attorney or district attorney may also bring enforcement actions.",
    faqs: [
      { question: "Do I need a written agreement for freelance work in California?", answer: "Yes, for engagements worth $250 or more. California's Freelance Worker Protection Act requires written contracts specifying the scope, pay rate, and payment date." },
      { question: "How quickly must freelancers be paid in California?", answer: "Within 30 days of completing the work, unless the written agreement specifies a different date. Late payment can result in double damages." },
      { question: "Can California freelancers include a non-compete clause?", answer: "No. Non-compete agreements are unenforceable in California for both employees and freelancers." },
    ],
  },
};

// ============================================================================
// Public API
// ============================================================================

/** Get SEO content for a contract type. Returns null if type is invalid. */
export function getTypeContent(contractType: string): TemplateTypeSEO | null {
  return TEMPLATE_TYPE_CONTENT[contractType] ?? null;
}

/** Get SEO content for a type+jurisdiction combo. */
export function getJurisdictionContent(
  contractType: string,
  jurisdiction: string
): JurisdictionVariantSEO {
  return generateJurisdictionContent(contractType, jurisdiction);
}

/** Get base jurisdiction notes (applies across all contract types). */
export function getBaseJurisdictionNotes(jurisdiction: string) {
  return BASE_JURISDICTION_NOTES[jurisdiction] ?? null;
}
