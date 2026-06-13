/**
 * Niche landing-page data for /for/[niche].
 *
 * Each niche is a high-intent audience we can point an ad group + SEO at. Copy
 * is written per-persona — visceral, specific pains resolved by Lexport's real
 * mechanism: a legally binding contract, e-signed in minutes, with payment
 * collected at signing. Add a niche only when there's a campaign pointing at it.
 */

export type NicheAudience = "freelancer" | "agency";

export interface RelevantContract {
  slug: string; // must match a /templates/{slug} page
  label: string;
  why: string;
}

export interface Niche {
  slug: string;
  audience: NicheAudience;
  /** lucide icon name, mapped to a component in the page */
  icon: string;
  badge: string; // "For AI Automation Agencies"
  accent: "orange" | "blue" | "violet" | "emerald";
  h1a: string; // first line of headline
  h1b: string; // second (accent-colored) line
  subhead: string;
  metaTitle: string;
  metaDescription: string;
  /** bespoke heading for the problem/solution section */
  problemsHeading: string;
  problems: { problem: string; solution: string }[];
  contracts: RelevantContract[];
  useCases: { title: string; description: string }[];
}

const C = {
  msa: { slug: "master-service-agreement", label: "Master Service Agreement" },
  sow: { slug: "statement-of-work", label: "Statement of Work" },
  nda: { slug: "nda-mutual", label: "Mutual NDA" },
  ip: { slug: "ip-assignment", label: "IP Assignment" },
  contractor: { slug: "independent-contractor", label: "Independent Contractor Agreement" },
  consulting: { slug: "consulting-agreement", label: "Consulting Agreement" },
  freelance: { slug: "freelance-service", label: "Freelance Service Agreement" },
  sales: { slug: "sales-contract", label: "Sales Contract" },
};

export const NICHES: Niche[] = [
  // ── AI agencies (priority) ────────────────────────────────────────────────
  {
    slug: "ai-automation-agencies",
    audience: "agency",
    icon: "Workflow",
    badge: "For AI Automation Agencies",
    accent: "violet",
    h1a: "Signed and paid before",
    h1b: "you connect a single API",
    subhead:
      "Stop starting builds on a verbal yes. Generate a legally binding agreement for the automation, get it e-signed in minutes, and collect your deposit before you touch a single API — with scope, workflow ownership, and client-data terms locked in.",
    metaTitle: "AI Automation Agency Contracts — Signed & Paid",
    metaDescription:
      "Generate legally binding contracts for AI automation projects, get them e-signed in minutes, and collect deposits at signing — with workflow IP and client-data terms built in.",
    problemsHeading: "Where AI automation deals go sideways",
    problems: [
      { problem: "Starting builds on a verbal yes, nothing binding signed", solution: "Legally binding contract, e-signed in minutes" },
      { problem: "Chasing deposits and invoices after the work's done", solution: "Payment collected at signing, before you start" },
      { problem: "Unclear who owns the workflows, prompts & automations", solution: "IP ownership built in, transfers on final payment" },
      { problem: "Handling client API keys, data & accounts on a handshake", solution: "Mutual NDA + data terms, signed by both sides" },
    ],
    contracts: [
      { ...C.msa, why: "The umbrella agreement for ongoing automation + maintenance retainers." },
      { ...C.sow, why: "Pin each build to a fixed scope, milestones, and deliverables." },
      { ...C.nda, why: "Protect client systems, data, and credentials you touch." },
      { ...C.ip, why: "Make ownership of the workflows and prompts explicit." },
    ],
    useCases: [
      { title: "Automation builds", description: "Scoped SOWs with a deposit collected at signing" },
      { title: "Maintenance retainers", description: "Monthly MSAs that auto-collect the fee" },
      { title: "Data & access", description: "NDA + terms covering the accounts and data you handle" },
      { title: "Workflow ownership", description: "IP transfers cleanly when the invoice clears" },
    ],
  },
  {
    slug: "ai-development-agencies",
    audience: "agency",
    icon: "Cpu",
    badge: "For AI Development Agencies",
    accent: "blue",
    h1a: "Scoped, signed, and",
    h1b: "paid by milestone",
    subhead:
      "Turn a handshake into a legally binding agreement — e-signed online, with milestone payments collected automatically as you ship. Model and code ownership, training-data protection, and ML scope all locked in.",
    metaTitle: "AI Development Agency Contracts — Signed & Paid",
    metaDescription:
      "Legally binding agreements for AI/ML development — e-signed online with milestone payments collected automatically, plus model & code ownership and training-data protection.",
    problemsHeading: "Where AI builds get messy",
    problems: [
      { problem: "ML builds starting with nothing binding signed", solution: "Legally binding contract, e-signed online" },
      { problem: "Lumpy, late payments across long builds", solution: "Milestone payments collected at each sign-off" },
      { problem: "Disputes over who owns the model, code & weights", solution: "IP ownership written in, transfers on payment" },
      { problem: "Proprietary training data shared with no protection", solution: "Mutual NDA signed before data changes hands" },
    ],
    contracts: [
      { ...C.ip, why: "Settle ownership of the model, code, and weights up front." },
      { ...C.sow, why: "Tie payment to ML milestones, not a vague finish line." },
      { ...C.msa, why: "Frame the long-term engagement and maintenance." },
      { ...C.nda, why: "Guard proprietary datasets and methods both ways." },
    ],
    useCases: [
      { title: "Custom model builds", description: "Milestone SOWs that release payment at each sign-off" },
      { title: "IP & ownership", description: "Who owns the model, code, and weights — in writing" },
      { title: "Data protection", description: "NDAs covering training data and client systems" },
      { title: "Ongoing MLOps", description: "Retainer MSAs that auto-collect for monitoring & upkeep" },
    ],
  },
  {
    slug: "marketing-agencies",
    audience: "agency",
    icon: "Megaphone",
    badge: "For Marketing Agencies",
    accent: "orange",
    h1a: "Lock the retainer,",
    h1b: "collect it every month",
    subhead:
      "Define exactly what's in the monthly scope, get the client to e-sign before the first deliverable, and auto-collect the retainer on schedule — so “can you also just…” becomes a paid add-on instead of free work.",
    metaTitle: "Marketing Agency Contracts — Sign Clients & Get Paid",
    metaDescription:
      "Lock retainer scope in a legally binding agreement, e-sign new clients in minutes, and auto-collect monthly fees. Stop scope creep and late payments — built for marketing agencies.",
    problemsHeading: "Where agency retainers leak money",
    problems: [
      { problem: "Retainers with fuzzy “whatever's needed” scope", solution: "Deliverables locked in a signed agreement" },
      { problem: "“Can you also just…” turning into free work", solution: "Out-of-scope asks become a paid add-on" },
      { problem: "Chasing the monthly retainer every cycle", solution: "Retainer auto-collected on schedule" },
      { problem: "Losing deals to agencies that onboard faster", solution: "Send, sign, and bill a new client in minutes" },
    ],
    contracts: [
      { ...C.msa, why: "The backbone for monthly retainer relationships." },
      { ...C.sow, why: "Spell out deliverables per campaign or month." },
      { ...C.consulting, why: "For strategy and advisory engagements." },
      { ...C.nda, why: "Protect client strategy and data you're handed." },
    ],
    useCases: [
      { title: "Retainer onboarding", description: "Send a binding agreement, collect month one at signing" },
      { title: "Campaign SOWs", description: "Per-campaign scope, deliverables, and sign-off" },
      { title: "Scope changes", description: "Signed change orders for anything extra" },
      { title: "Client confidentiality", description: "Mutual NDA for strategy and account access" },
    ],
  },
  {
    slug: "web-design-agencies",
    audience: "agency",
    icon: "LayoutTemplate",
    badge: "For Web & Design Agencies",
    accent: "blue",
    h1a: "Scope locked, deposit in,",
    h1b: "before the first mockup",
    subhead:
      "Fix the scope and revision rounds in a legally binding agreement, transfer the site and source files only on final payment, and collect your deposit at signing — so launch day never turns into a payment standoff.",
    metaTitle: "Web Design Agency Contracts — Deposits & Sign-Off",
    metaDescription:
      "Lock scope and revision limits in a binding agreement, transfer the site only on final payment, and collect a deposit at signing. E-sign in minutes — built for web & design agencies.",
    problemsHeading: "Where web projects bleed margin",
    problems: [
      { problem: "“Just one more revision” eating your margin", solution: "Revision rounds capped in the signed scope" },
      { problem: "Clients demanding source files before paying", solution: "Site & files transfer only on final payment" },
      { problem: "Designing for weeks before any deposit lands", solution: "Deposit collected the moment they sign" },
      { problem: "Maintenance billed differently every time", solution: "Recurring care plan on an auto-collected retainer" },
    ],
    contracts: [
      { ...C.msa, why: "Cover the relationship plus ongoing maintenance." },
      { ...C.sow, why: "Lock scope, revisions, and milestone payments." },
      { ...C.ip, why: "Transfer ownership of the site and assets cleanly." },
      { ...C.nda, why: "Protect client brand and pre-launch material." },
    ],
    useCases: [
      { title: "Website builds", description: "Milestone scope with a deposit up front" },
      { title: "Revision control", description: "Defined rounds; extras are billed and signed" },
      { title: "Launch & handoff", description: "IP transfers the moment final payment clears" },
      { title: "Care plans", description: "Monthly maintenance on auto-collect" },
    ],
  },

  // ── Freelancers ───────────────────────────────────────────────────────────
  {
    slug: "graphic-designers",
    audience: "freelancer",
    icon: "Palette",
    badge: "For Graphic Designers",
    accent: "orange",
    h1a: "Get paid before you",
    h1b: "hand over the files",
    subhead:
      "Send a legally binding agreement, collect a deposit at signing, and release the final files and usage rights only when you're paid in full — so a “quick logo” never turns into free work and a ghosted invoice.",
    metaTitle: "Graphic Design Contracts — Get a Deposit & Get Paid",
    metaDescription:
      "Send a legally binding design agreement, collect a deposit at signing, and release files & rights only on final payment. Cap revisions and stop ghosted invoices.",
    problemsHeading: "How designers get burned",
    problems: [
      { problem: "Handing over finals to a client who then ghosts", solution: "Files & rights release only on final payment" },
      { problem: "“Just a few small tweaks” — forever", solution: "Revision rounds capped in the signed agreement" },
      { problem: "Clients using your work before paying", solution: "Usage rights transfer on payment, in writing" },
      { problem: "No deposit, all of the risk on you", solution: "Deposit collected the moment they sign" },
    ],
    contracts: [
      { ...C.freelance, why: "Scope, deliverables, revisions, and payment in one." },
      { ...C.ip, why: "Design rights transfer only when you're paid." },
      { ...C.nda, why: "Protect concepts before you share them." },
    ],
    useCases: [
      { title: "Logo & brand projects", description: "Deposit up front, files on final payment" },
      { title: "Design retainers", description: "Ongoing work on auto-collected monthly fees" },
      { title: "Usage rights", description: "Exactly where and how the client can use the work" },
      { title: "Concept NDAs", description: "Protect ideas before the pitch" },
    ],
  },
  {
    slug: "web-developers",
    audience: "freelancer",
    icon: "Code2",
    badge: "For Web Developers",
    accent: "blue",
    h1a: "Own the code until",
    h1b: "the invoice is paid",
    subhead:
      "Lock the spec in a legally binding agreement, bill by milestone with payment collected at each sign-off, and transfer the code only when you're paid in full — so “can you just add one more thing” becomes a paid change request.",
    metaTitle: "Web Developer Contracts — Milestone Pay & Code Ownership",
    metaDescription:
      "Lock scope in a binding agreement, collect milestone payments at each sign-off, and transfer code only on final payment. Stop scope creep — built for freelance web developers.",
    problemsHeading: "Where dev projects go unpaid",
    problems: [
      { problem: "“Can you also just add…” with no extra pay", solution: "Out-of-scope work becomes a paid change request" },
      { problem: "Handing over the repo before getting paid", solution: "Code transfers only on final payment" },
      { problem: "Coding for weeks before any money lands", solution: "Milestone payments collected at each sign-off" },
      { problem: "Clients vanishing mid-build", solution: "Binding agreement + deposit before the first commit" },
    ],
    contracts: [
      { ...C.contractor, why: "Standard agreement for freelance dev work." },
      { ...C.ip, why: "Make code ownership explicit and payment-gated." },
      { ...C.msa, why: "For longer or recurring engagements." },
    ],
    useCases: [
      { title: "Project builds", description: "Milestone scope, deposit, and sign-offs" },
      { title: "Code ownership", description: "Repo transfers when payment clears" },
      { title: "Retainers", description: "Ongoing dev on auto-collected fees" },
      { title: "Subcontracting", description: "Clean, signed terms when you bring in help" },
    ],
  },
  {
    slug: "freelance-writers",
    audience: "freelancer",
    icon: "PenLine",
    badge: "For Freelance Writers",
    accent: "emerald",
    h1a: "Get paid for your words,",
    h1b: "control where they run",
    subhead:
      "Set exactly how your work can be used, cap the revisions, and collect a deposit at signing — all in a legally binding, e-signed agreement — so a “quick edit” never becomes free work and your words don't run everywhere for a one-time fee.",
    metaTitle: "Freelance Writer Contracts — Usage Rights & Fast Pay",
    metaDescription:
      "Define usage rights, cap revisions, and collect a deposit at signing in a legally binding, e-signed agreement. Stop scope creep and late pay — built for writers & copywriters.",
    problemsHeading: "How writers lose out",
    problems: [
      { problem: "Your work running everywhere for a one-time fee", solution: "Usage rights defined and signed" },
      { problem: "“One more revision” with no end in sight", solution: "Revision rounds capped in the agreement" },
      { problem: "Net-60 invoices, or worse", solution: "Deposit collected at signing" },
      { problem: "Drafting the piece, then the client cancels", solution: "Kill fee written into a binding contract" },
    ],
    contracts: [
      { ...C.freelance, why: "Scope, deadlines, revisions, and payment terms." },
      { ...C.ip, why: "Control how and where your writing can be used." },
      { ...C.nda, why: "For ghostwriting and confidential briefs." },
    ],
    useCases: [
      { title: "Content & copy projects", description: "Scope, deadlines, and a deposit up front" },
      { title: "Ghostwriting", description: "NDA + clear authorship and rights" },
      { title: "Retainers", description: "Ongoing content on auto-collected fees" },
      { title: "Licensing", description: "Define exactly where the words can be used" },
    ],
  },
  {
    slug: "consultants",
    audience: "freelancer",
    icon: "Lightbulb",
    badge: "For Consultants",
    accent: "violet",
    h1a: "Get paid before you",
    h1b: "share your expertise",
    subhead:
      "Set deliverables and boundaries, sign a mutual NDA before the deep dive, and collect your fee before the first call — in one legally binding, e-signed agreement — so your advice is never given on a handshake again.",
    metaTitle: "Consulting Contracts — Get Paid Before You Advise",
    metaDescription:
      "Scope engagements, sign a mutual NDA, and collect a deposit before the first call in a legally binding, e-signed agreement. Built for independent consultants.",
    problemsHeading: "Why consultants don't get paid",
    problems: [
      { problem: "Advice given, then the invoice is ignored", solution: "Deposit collected before the first session" },
      { problem: "Engagements drifting into unpaid “quick calls”", solution: "Deliverables and boundaries signed up front" },
      { problem: "Sensitive information shared on trust alone", solution: "Mutual NDA signed before the deep dive" },
      { problem: "Retainer clients paying late", solution: "Recurring fees auto-collected on schedule" },
    ],
    contracts: [
      { ...C.consulting, why: "Core agreement for advisory engagements." },
      { ...C.nda, why: "Protect both sides' confidential information." },
      { ...C.sow, why: "Pin deliverables for fixed-scope projects." },
    ],
    useCases: [
      { title: "Advisory retainers", description: "Recurring engagements that auto-collect" },
      { title: "Fixed-scope projects", description: "Deliverables, milestones, and sign-off" },
      { title: "Confidentiality", description: "Mutual NDA before sharing anything sensitive" },
      { title: "Fast onboarding", description: "Send, sign, and collect in one link" },
    ],
  },
  {
    slug: "photographers",
    audience: "freelancer",
    icon: "Camera",
    badge: "For Photographers",
    accent: "orange",
    h1a: "Lock the date with",
    h1b: "a deposit in the bank",
    subhead:
      "Hold the booking with a non-refundable deposit collected at signing, define exactly how the images can be used, and set delivery terms — all in a legally binding, e-signed agreement — so no-shows and rights disputes stop costing you.",
    metaTitle: "Photography Contracts — Lock Bookings With a Deposit",
    metaDescription:
      "Hold the date with a non-refundable deposit at signing, define image licensing, and set delivery terms in a legally binding, e-signed agreement. Built for photographers.",
    problemsHeading: "What costs photographers money",
    problems: [
      { problem: "No-shows costing you the date and other bookings", solution: "Non-refundable deposit collected at signing" },
      { problem: "Images used far beyond the agreed license", solution: "Usage and licensing terms signed up front" },
      { problem: "Disputes over delivery, edits, and turnaround", solution: "Deliverables and timeline in the contract" },
      { problem: "Verbal bookings that quietly fall through", solution: "A binding, e-signed agreement holds the date" },
    ],
    contracts: [
      { ...C.freelance, why: "Shoot scope, delivery, and payment terms." },
      { ...C.ip, why: "Set licensing and image usage rights." },
      { ...C.sales, why: "For print sales and product deliverables." },
    ],
    useCases: [
      { title: "Bookings", description: "Lock the date with a deposit at signing" },
      { title: "Licensing", description: "Define exactly how images can be used" },
      { title: "Events & sessions", description: "Scope, delivery, and timeline" },
      { title: "Cancellations", description: "Deposit terms that protect your time" },
    ],
  },
];

const BY_SLUG: Record<string, Niche> = Object.fromEntries(
  NICHES.map((n) => [n.slug, n])
);

export function getNiche(slug: string): Niche | null {
  return BY_SLUG[slug] ?? null;
}

export function getAllNicheSlugs(): { niche: string }[] {
  return NICHES.map((n) => ({ niche: n.slug }));
}
