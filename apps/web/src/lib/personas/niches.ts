/**
 * Niche landing-page data for /for/[niche].
 *
 * Each niche is a high-intent audience we can point an ad group + SEO at, with
 * message-match copy and the specific contract templates that matter to them.
 * Keep the set small and tied to real ad groups — add a niche only when there's
 * a campaign pointing at it.
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
    h1a: "Lock down scope and IP",
    h1b: "before you build the automation",
    subhead:
      "Stop starting builds on a verbal yes. Generate a legally binding agreement for the automation, get it e-signed in minutes, and collect your deposit before you touch a single API — with scope, workflow ownership, and client-data terms locked in.",
    metaTitle: "Contracts for AI Automation Agencies",
    metaDescription:
      "Generate legally binding contracts for AI automation projects, get them e-signed in minutes, and collect deposits at signing — with workflow IP and client-data terms built in.",
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
      { title: "Automation builds", description: "Scoped per-project SOWs with milestones and deposits" },
      { title: "Maintenance retainers", description: "Monthly MSAs with auto-billing for upkeep" },
      { title: "Data & access", description: "NDA + terms covering the accounts and data you handle" },
      { title: "Workflow ownership", description: "Clear IP transfer so there's no dispute later" },
    ],
  },
  {
    slug: "ai-development-agencies",
    audience: "agency",
    icon: "Cpu",
    badge: "For AI Development Agencies",
    accent: "blue",
    h1a: "Own the terms before",
    h1b: "you ship the model",
    subhead:
      "Turn a handshake into a legally binding agreement — e-signed online, with milestone payments collected automatically as you ship. Model and code ownership, training-data protection, and ML scope all locked in.",
    metaTitle: "Contracts for AI Development Agencies",
    metaDescription:
      "Legally binding agreements for AI/ML development — e-signed online with milestone payments collected automatically, plus model & code ownership and training-data protection.",
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
      { title: "Custom model builds", description: "Milestone SOWs with deposits and clear acceptance" },
      { title: "IP & ownership", description: "Who owns the model, code, and weights — in writing" },
      { title: "Data protection", description: "NDAs covering training data and client systems" },
      { title: "Ongoing MLOps", description: "Retainer MSAs for monitoring and upkeep" },
    ],
  },
  {
    slug: "marketing-agencies",
    audience: "agency",
    icon: "Megaphone",
    badge: "For Marketing Agencies",
    accent: "orange",
    h1a: "Retainers signed and",
    h1b: "deposits collected, fast",
    subhead:
      "Lock in monthly retainers, define exactly what's in scope, and collect before the campaign starts — instead of arguing about deliverables at invoice time.",
    metaTitle: "Contracts for Marketing Agencies",
    metaDescription:
      "Retainer MSAs, SOWs and consulting agreements for marketing agencies. Define scope, e-sign, and collect deposits before the campaign starts.",
    problems: [
      { problem: "Retainers with fuzzy 'whatever's needed' scope", solution: "MSA + SOW that lists deliverables" },
      { problem: "Clients disputing what was included", solution: "Signed scope both parties agreed to" },
      { problem: "Late monthly payments", solution: "Auto-billing and deposits at signing" },
      { problem: "Slow contract turnaround losing deals", solution: "Generate and send in minutes" },
    ],
    contracts: [
      { ...C.msa, why: "The backbone for monthly retainer relationships." },
      { ...C.sow, why: "Spell out deliverables per campaign or month." },
      { ...C.consulting, why: "For strategy and advisory engagements." },
      { ...C.nda, why: "Protect client strategy and data you're handed." },
    ],
    useCases: [
      { title: "Monthly retainers", description: "Recurring MSAs with auto-billing" },
      { title: "Campaign SOWs", description: "Per-campaign scope and deliverables" },
      { title: "Strategy engagements", description: "Consulting agreements for advisory work" },
      { title: "Client onboarding", description: "Send, sign, and collect in one link" },
    ],
  },
  {
    slug: "web-design-agencies",
    audience: "agency",
    icon: "LayoutTemplate",
    badge: "For Web & Design Agencies",
    accent: "blue",
    h1a: "Scope the build and",
    h1b: "get the deposit upfront",
    subhead:
      "Stop eating revision rounds and hosting questions. Fix the scope, set milestone payments, transfer IP on final payment, and start with money in the bank.",
    metaTitle: "Contracts for Web & Design Agencies",
    metaDescription:
      "MSAs, SOWs and IP assignment for web design and development agencies. Fix scope, milestone billing, e-sign and collect a deposit before you start.",
    problems: [
      { problem: "Endless 'just one more revision'", solution: "Revision limits written into the SOW" },
      { problem: "Who owns the site, code & assets?", solution: "IP transfer on final payment" },
      { problem: "Starting work before any deposit", solution: "Collect deposit at signing" },
      { problem: "Maintenance billed inconsistently", solution: "Retainer MSA for ongoing care" },
    ],
    contracts: [
      { ...C.msa, why: "Cover the relationship plus ongoing maintenance." },
      { ...C.sow, why: "Lock scope, revisions, and milestone payments." },
      { ...C.ip, why: "Transfer ownership of the site and assets cleanly." },
      { ...C.nda, why: "Protect client brand and pre-launch material." },
    ],
    useCases: [
      { title: "Website builds", description: "Milestone SOWs with deposits" },
      { title: "Revision control", description: "Defined rounds, extras billed" },
      { title: "Care plans", description: "Monthly maintenance retainers" },
      { title: "Asset ownership", description: "Clean IP transfer on payment" },
    ],
  },

  // ── Freelancers ───────────────────────────────────────────────────────────
  {
    slug: "graphic-designers",
    audience: "freelancer",
    icon: "Palette",
    badge: "For Graphic Designers",
    accent: "orange",
    h1a: "Get paid before",
    h1b: "you open the canvas",
    subhead:
      "Stop handing over finals to clients who ghost. Set scope and revision limits, transfer rights only on payment, and collect a deposit at signing.",
    metaTitle: "Contracts for Graphic Designers",
    metaDescription:
      "Freelance service agreements, IP assignment and NDAs for graphic designers. Set scope, transfer rights on payment, e-sign and collect a deposit.",
    problems: [
      { problem: "Clients ghosting after you deliver finals", solution: "Deposit collected at signing" },
      { problem: "Endless 'small tweaks'", solution: "Revision limits in the agreement" },
      { problem: "Clients using work before paying", solution: "Rights transfer on final payment" },
      { problem: "No paper trail when it goes wrong", solution: "Signed agreement both parties hold" },
    ],
    contracts: [
      { ...C.freelance, why: "Scope, deliverables, revisions, and payment in one." },
      { ...C.ip, why: "Design rights transfer only when you're paid." },
      { ...C.nda, why: "Protect concepts before you share them." },
    ],
    useCases: [
      { title: "Project work", description: "Logos, brand, and one-off design jobs" },
      { title: "Retainers", description: "Ongoing design with monthly billing" },
      { title: "Usage rights", description: "Define exactly what the client can use" },
      { title: "Concept NDAs", description: "Protect ideas before the pitch" },
    ],
  },
  {
    slug: "web-developers",
    audience: "freelancer",
    icon: "Code2",
    badge: "For Web Developers",
    accent: "blue",
    h1a: "Lock scope and code",
    h1b: "ownership upfront",
    subhead:
      "Fix the spec, settle who owns the code, and bill by milestone. Collect a deposit before the first commit and transfer IP only when you're paid.",
    metaTitle: "Contracts for Web Developers",
    metaDescription:
      "Independent contractor agreements, IP assignment and MSAs for freelance web developers. Lock scope, own the terms, e-sign and collect milestone payments.",
    problems: [
      { problem: "Scope creep on every build", solution: "Defined spec + paid change requests" },
      { problem: "Who owns the code?", solution: "IP transfer on final payment" },
      { problem: "Working for free until 'it's done'", solution: "Milestone billing + deposit" },
      { problem: "Clients vanishing mid-project", solution: "Signed agreement + upfront payment" },
    ],
    contracts: [
      { ...C.contractor, why: "Standard agreement for freelance dev work." },
      { ...C.ip, why: "Make code ownership explicit and payment-gated." },
      { ...C.msa, why: "For longer or recurring engagements." },
    ],
    useCases: [
      { title: "Project builds", description: "Milestone-billed development work" },
      { title: "Code ownership", description: "Who owns what, settled in writing" },
      { title: "Retainers", description: "Ongoing dev and maintenance" },
      { title: "Subcontracting", description: "Clean terms when you bring in help" },
    ],
  },
  {
    slug: "freelance-writers",
    audience: "freelancer",
    icon: "PenLine",
    badge: "For Freelance Writers",
    accent: "emerald",
    h1a: "Define usage rights",
    h1b: "and get paid on time",
    subhead:
      "Set exactly how your words can be used, cap revisions, and collect a deposit before the first draft — so a 'quick edit' never turns into free work.",
    metaTitle: "Contracts for Freelance Writers",
    metaDescription:
      "Freelance service agreements, usage rights and NDAs for writers and copywriters. Define rights, cap revisions, e-sign and collect a deposit.",
    problems: [
      { problem: "Work used beyond what was agreed", solution: "Clear usage-rights terms" },
      { problem: "'One more revision' forever", solution: "Revision caps in the agreement" },
      { problem: "Net-60 invoices, or worse", solution: "Deposit collected at signing" },
      { problem: "No proof of what was agreed", solution: "Signed agreement on file" },
    ],
    contracts: [
      { ...C.freelance, why: "Scope, deadlines, revisions, and payment terms." },
      { ...C.ip, why: "Control how and where your writing can be used." },
      { ...C.nda, why: "For ghostwriting and confidential briefs." },
    ],
    useCases: [
      { title: "Content projects", description: "Articles, copy, and one-off pieces" },
      { title: "Ghostwriting", description: "NDAs + clear authorship terms" },
      { title: "Retainers", description: "Ongoing content with monthly billing" },
      { title: "Usage & rights", description: "Define exactly how words are used" },
    ],
  },
  {
    slug: "consultants",
    audience: "freelancer",
    icon: "Lightbulb",
    badge: "For Consultants",
    accent: "violet",
    h1a: "Engagements scoped",
    h1b: "and retainers signed",
    subhead:
      "Set deliverables and boundaries, protect confidential information both ways, and collect before the first call — no more advisory work on a handshake.",
    metaTitle: "Contracts for Consultants",
    metaDescription:
      "Consulting agreements, NDAs and SOWs for independent consultants. Scope engagements, protect confidentiality, e-sign and collect a deposit.",
    problems: [
      { problem: "Advice given, invoice ignored", solution: "Deposit + signed engagement terms" },
      { problem: "Scope drifting into free work", solution: "Defined deliverables and boundaries" },
      { problem: "Sensitive info shared loosely", solution: "Mutual NDA up front" },
      { problem: "Slow, manual contracting", solution: "Generate and send in minutes" },
    ],
    contracts: [
      { ...C.consulting, why: "Core agreement for advisory engagements." },
      { ...C.nda, why: "Protect both sides' confidential information." },
      { ...C.sow, why: "Pin deliverables for fixed-scope projects." },
    ],
    useCases: [
      { title: "Advisory retainers", description: "Recurring engagements with auto-billing" },
      { title: "Fixed projects", description: "Scoped deliverables and milestones" },
      { title: "Confidentiality", description: "Mutual NDAs before deep dives" },
      { title: "Fast onboarding", description: "Send, sign, collect in one link" },
    ],
  },
  {
    slug: "photographers",
    audience: "freelancer",
    icon: "Camera",
    badge: "For Photographers",
    accent: "orange",
    h1a: "Shoots booked with",
    h1b: "a deposit in the bank",
    subhead:
      "Lock the date with a deposit, define how images can be used, and set delivery and licensing terms — so no-shows and rights disputes stop costing you.",
    metaTitle: "Contracts for Photographers",
    metaDescription:
      "Service agreements, licensing and IP terms for freelance photographers. Lock shoots with a deposit, define usage rights, e-sign and get paid.",
    problems: [
      { problem: "No-shows costing you the date", solution: "Non-refundable booking deposit" },
      { problem: "Images used beyond the license", solution: "Clear usage & licensing terms" },
      { problem: "Disputes over delivery & edits", solution: "Defined deliverables and timeline" },
      { problem: "Verbal bookings falling through", solution: "Signed agreement to hold the date" },
    ],
    contracts: [
      { ...C.freelance, why: "Shoot scope, delivery, and payment terms." },
      { ...C.ip, why: "Set licensing and image usage rights." },
      { ...C.sales, why: "For print sales and product deliverables." },
    ],
    useCases: [
      { title: "Bookings", description: "Lock the date with a deposit" },
      { title: "Licensing", description: "Define exactly how images are used" },
      { title: "Events & sessions", description: "Scope, delivery, and timelines" },
      { title: "Print sales", description: "Terms for physical deliverables" },
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
