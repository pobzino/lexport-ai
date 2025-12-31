/**
 * IP Assignment Template Quality Assessor
 *
 * Queries Supabase for all IP Assignment templates and assesses them for:
 * 1. Legal Completeness (0-10)
 * 2. Jurisdiction Accuracy (0-10)
 * 3. Placeholder Quality (0-10)
 * 4. Clause Structure (0-10)
 * 5. Signature Block (0-10)
 */
import { config } from "dotenv";
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ContractClause {
  id: string;
  title: string;
  content: string;
  order: number;
  type?: string;
}

interface ContractContent {
  preamble: string;
  recitals: string;
  clauses: ContractClause[];
  signatureBlock: string;
}

// Database template structure (flat)
interface TemplateDB {
  id: string;
  title: string;
  contract_type: string;
  jurisdiction: string;
  preamble: string;
  recitals: string;
  clauses: ContractClause[];
  signature_block: string;
  placeholders: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Normalized template for assessment
interface Template {
  id: string;
  title: string;
  contract_type: string;
  jurisdiction: string;
  content: ContractContent;
  placeholders: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function normalizeTemplate(db: TemplateDB): Template {
  return {
    id: db.id,
    title: db.title,
    contract_type: db.contract_type,
    jurisdiction: db.jurisdiction,
    content: {
      preamble: db.preamble || "",
      recitals: db.recitals || "",
      clauses: db.clauses || [],
      signatureBlock: db.signature_block || ""
    },
    placeholders: db.placeholders,
    metadata: db.metadata,
    created_at: db.created_at
  };
}

interface AssessmentScore {
  score: number;
  maxScore: number;
  issues: string[];
  recommendations: string[];
}

interface TemplateAssessment {
  templateId: string;
  title: string;
  jurisdiction: string;
  legalCompleteness: AssessmentScore;
  jurisdictionAccuracy: AssessmentScore;
  placeholderQuality: AssessmentScore;
  clauseStructure: AssessmentScore;
  signatureBlock: AssessmentScore;
  overallScore: number;
  overallMax: number;
  grade: string;
}

// Required elements for IP Assignment agreements
const REQUIRED_IP_ELEMENTS = {
  ipIdentification: [
    "invention", "patent", "copyright", "trademark", "trade secret",
    "intellectual property", "work product", "software", "code", "design",
    "documentation", "materials", "deliverables"
  ],
  assignmentScope: [
    "assign", "transfer", "convey", "grant", "right, title, and interest",
    "worldwide", "perpetual", "irrevocable", "exclusive"
  ],
  representations: [
    "represent", "warrant", "original", "sole owner", "authority",
    "no encumbrance", "no infringement", "free and clear"
  ],
  warranties: [
    "warranty", "no liens", "no claims", "lawful owner", "good title",
    "marketable title", "no conflict"
  ],
  furtherAssurances: [
    "further assurance", "execute", "additional document", "assist",
    "cooperation", "power of attorney", "irrevocable appointment"
  ],
  consideration: [
    "consideration", "payment", "compensation", "$", "dollar", "fee"
  ],
  moralRights: [
    "moral rights", "waive", "attribution", "integrity"
  ]
};

// Jurisdiction-specific requirements
const JURISDICTION_REQUIREMENTS: Record<string, {
  required: string[];
  prohibited: string[];
  notes: string[];
}> = {
  "us_california": {
    required: ["California", "Labor Code", "invention assignment"],
    prohibited: [],
    notes: [
      "Must comply with California Labor Code Section 2870",
      "Cannot assign inventions made on employee's own time without employer resources",
      "Clear identification of assigned vs. excluded IP"
    ]
  },
  "us_texas": {
    required: ["Texas", "governing law"],
    prohibited: [],
    notes: [
      "Texas recognizes assignment of future inventions",
      "Strong enforcement of IP assignment clauses"
    ]
  },
  "us_new_york": {
    required: ["New York", "governing law"],
    prohibited: [],
    notes: [
      "New York follows traditional contract law for IP assignments",
      "Assignments must be in writing for copyrights"
    ]
  },
  "uk": {
    required: ["United Kingdom", "England and Wales", "moral rights", "CDPA 1988"],
    prohibited: [],
    notes: [
      "Must address moral rights under Copyright, Designs and Patents Act 1988",
      "Moral rights cannot be assigned but can be waived",
      "Future copyright may be assigned"
    ]
  }
};

function findPlaceholders(text: string): string[] {
  const patterns = [
    /\[([^\]]+)\]/g,
    /\{\{([^}]+)\}\}/g,
    /<<([^>]+)>>/g,
    /__+([^_]+)__+/g
  ];

  const placeholders: string[] = [];
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      placeholders.push(match[0]);
    }
  }
  return placeholders;
}

function assessLegalCompleteness(content: ContractContent): AssessmentScore {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 0;
  const maxScore = 10;

  const fullText = [
    content.preamble,
    content.recitals,
    ...content.clauses.map(c => c.content),
    content.signatureBlock
  ].join(" ").toLowerCase();

  // Check IP Identification (2 points)
  const ipIdentificationFound = REQUIRED_IP_ELEMENTS.ipIdentification.filter(term =>
    fullText.includes(term.toLowerCase())
  );
  if (ipIdentificationFound.length >= 5) {
    score += 2;
  } else if (ipIdentificationFound.length >= 3) {
    score += 1;
    issues.push(`Limited IP identification. Found: ${ipIdentificationFound.join(", ")}`);
    recommendations.push("Add more specific IP type references (patents, copyrights, trademarks, trade secrets)");
  } else {
    issues.push("Missing comprehensive IP identification");
    recommendations.push("Include explicit listing of IP types being assigned (patents, copyrights, trademarks, trade secrets, software, documentation)");
  }

  // Check Assignment Scope (2 points)
  const assignmentScopeFound = REQUIRED_IP_ELEMENTS.assignmentScope.filter(term =>
    fullText.includes(term.toLowerCase())
  );
  if (assignmentScopeFound.length >= 4) {
    score += 2;
  } else if (assignmentScopeFound.length >= 2) {
    score += 1;
    issues.push(`Assignment scope could be more comprehensive`);
    recommendations.push("Include worldwide, perpetual, irrevocable, exclusive language for clear assignment");
  } else {
    issues.push("Assignment scope is unclear or incomplete");
    recommendations.push("Add clear assignment language: 'hereby irrevocably assigns all right, title, and interest worldwide'");
  }

  // Check Representations (2 points)
  const representationsFound = REQUIRED_IP_ELEMENTS.representations.filter(term =>
    fullText.includes(term.toLowerCase())
  );
  if (representationsFound.length >= 4) {
    score += 2;
  } else if (representationsFound.length >= 2) {
    score += 1;
    issues.push("Representations section needs strengthening");
    recommendations.push("Add representations that assignor is sole owner, has authority to assign, and work is original");
  } else {
    issues.push("Missing key representations");
    recommendations.push("Include representations: original authorship, sole ownership, authority to assign, no encumbrances");
  }

  // Check Warranties (2 points)
  const warrantiesFound = REQUIRED_IP_ELEMENTS.warranties.filter(term =>
    fullText.includes(term.toLowerCase())
  );
  if (warrantiesFound.length >= 3) {
    score += 2;
  } else if (warrantiesFound.length >= 1) {
    score += 1;
    issues.push("Warranty provisions incomplete");
    recommendations.push("Add warranties: no liens, no third-party claims, good and marketable title");
  } else {
    issues.push("Missing warranty provisions");
    recommendations.push("Add warranty section covering title, freedom from claims, no conflicts");
  }

  // Check Further Assurances (1 point)
  const furtherAssurancesFound = REQUIRED_IP_ELEMENTS.furtherAssurances.filter(term =>
    fullText.includes(term.toLowerCase())
  );
  if (furtherAssurancesFound.length >= 2) {
    score += 1;
  } else {
    issues.push("Missing further assurances clause");
    recommendations.push("Add further assurances clause requiring assignor to execute additional documents and cooperate");
  }

  // Check Consideration (1 point)
  const considerationFound = REQUIRED_IP_ELEMENTS.consideration.filter(term =>
    fullText.includes(term.toLowerCase())
  );
  if (considerationFound.length >= 2) {
    score += 1;
  } else {
    issues.push("Consideration may be unclear");
    recommendations.push("Clearly state consideration for the IP assignment (payment amount or other value)");
  }

  return { score, maxScore, issues, recommendations };
}

function assessJurisdictionAccuracy(content: ContractContent, jurisdiction: string): AssessmentScore {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 0;
  const maxScore = 10;

  const fullText = [
    content.preamble,
    content.recitals,
    ...content.clauses.map(c => c.content),
    content.signatureBlock
  ].join(" ").toLowerCase();

  const jurReq = JURISDICTION_REQUIREMENTS[jurisdiction];

  if (!jurReq) {
    issues.push(`Unknown jurisdiction: ${jurisdiction}`);
    recommendations.push("Ensure jurisdiction is properly specified");
    return { score: 5, maxScore, issues, recommendations };
  }

  // Check for required jurisdiction-specific terms (5 points)
  const requiredFound = jurReq.required.filter(term =>
    fullText.includes(term.toLowerCase())
  );
  const requiredRatio = requiredFound.length / jurReq.required.length;
  score += Math.round(requiredRatio * 5);

  if (requiredRatio < 1) {
    const missing = jurReq.required.filter(term => !fullText.includes(term.toLowerCase()));
    issues.push(`Missing jurisdiction-specific terms: ${missing.join(", ")}`);
    recommendations.push(`Include required terms for ${jurisdiction}: ${missing.join(", ")}`);
  }

  // Check moral rights for UK (2 points)
  if (jurisdiction === "uk") {
    const moralRightsFound = REQUIRED_IP_ELEMENTS.moralRights.filter(term =>
      fullText.includes(term.toLowerCase())
    );
    if (moralRightsFound.length >= 2) {
      score += 2;
    } else if (moralRightsFound.length >= 1) {
      score += 1;
      issues.push("Moral rights handling is incomplete");
      recommendations.push("Add explicit moral rights waiver under CDPA 1988");
    } else {
      issues.push("Missing moral rights waiver (required for UK)");
      recommendations.push("UK contracts must include moral rights waiver - these cannot be assigned but can be waived under CDPA 1988");
    }
  } else {
    // For US jurisdictions, check for work-for-hire or clear assignment language
    if (fullText.includes("work for hire") || fullText.includes("work made for hire") || fullText.includes("work-for-hire")) {
      score += 2;
    } else if (fullText.includes("assign") && fullText.includes("copyright")) {
      score += 1;
      recommendations.push("Consider adding work-for-hire language where applicable");
    }
  }

  // Check governing law clause (3 points)
  const hasGoverningLaw = fullText.includes("governing law") ||
    fullText.includes("governed by") ||
    fullText.includes("laws of");

  if (hasGoverningLaw) {
    score += 3;
  } else {
    issues.push("Missing governing law clause");
    recommendations.push("Add governing law clause specifying applicable jurisdiction");
  }

  return { score, maxScore, issues, recommendations };
}

function assessPlaceholderQuality(content: ContractContent): AssessmentScore {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 0;
  const maxScore = 10;

  const fullText = [
    content.preamble,
    content.recitals,
    ...content.clauses.map(c => c.content),
    content.signatureBlock
  ].join(" ");

  const placeholders = findPlaceholders(fullText);

  // Check placeholder count (3 points)
  if (placeholders.length >= 10) {
    score += 3;
  } else if (placeholders.length >= 5) {
    score += 2;
    issues.push(`Only ${placeholders.length} placeholders found - may be incomplete`);
    recommendations.push("Add more placeholders for customizable fields");
  } else if (placeholders.length >= 1) {
    score += 1;
    issues.push("Very few placeholders - limited customization");
    recommendations.push("Add placeholders for: party names, addresses, IP description, dates, consideration");
  } else {
    issues.push("No placeholders found");
    recommendations.push("Add placeholders using [PLACEHOLDER_NAME] format for all customizable fields");
  }

  // Check for essential placeholders (4 points)
  const essentialPlaceholders = [
    { pattern: /assignor|party.*1|transferor/i, name: "Assignor name" },
    { pattern: /assignee|party.*2|recipient|transferee/i, name: "Assignee name" },
    { pattern: /date|effective/i, name: "Effective date" },
    { pattern: /address/i, name: "Party addresses" },
    { pattern: /ip.*description|property|invention|work/i, name: "IP description" },
    { pattern: /consideration|amount|payment|fee/i, name: "Consideration" }
  ];

  let essentialFound = 0;
  const missingEssential: string[] = [];

  for (const essential of essentialPlaceholders) {
    if (placeholders.some(p => essential.pattern.test(p))) {
      essentialFound++;
    } else {
      missingEssential.push(essential.name);
    }
  }

  const essentialRatio = essentialFound / essentialPlaceholders.length;
  score += Math.round(essentialRatio * 4);

  if (missingEssential.length > 0) {
    issues.push(`Missing essential placeholders: ${missingEssential.join(", ")}`);
    recommendations.push(`Add placeholders for: ${missingEssential.join(", ")}`);
  }

  // Check placeholder format consistency (3 points)
  const bracketStyle = placeholders.filter(p => p.startsWith("[")).length;
  const curlyStyle = placeholders.filter(p => p.startsWith("{{")).length;
  const otherStyle = placeholders.length - bracketStyle - curlyStyle;

  const dominantStyle = Math.max(bracketStyle, curlyStyle, otherStyle);
  if (placeholders.length > 0) {
    const consistency = dominantStyle / placeholders.length;
    if (consistency >= 0.9) {
      score += 3;
    } else if (consistency >= 0.7) {
      score += 2;
      issues.push("Inconsistent placeholder formatting");
      recommendations.push("Use consistent placeholder format throughout (recommend [PLACEHOLDER_NAME])");
    } else {
      score += 1;
      issues.push("Very inconsistent placeholder formatting");
      recommendations.push("Standardize all placeholders to [PLACEHOLDER_NAME] format");
    }
  }

  return { score, maxScore, issues, recommendations };
}

function assessClauseStructure(content: ContractContent): AssessmentScore {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 0;
  const maxScore = 10;

  const clauses = content.clauses;

  // Check clause count (2 points)
  if (clauses.length >= 10) {
    score += 2;
  } else if (clauses.length >= 6) {
    score += 1;
    issues.push(`Only ${clauses.length} clauses - may be missing important sections`);
    recommendations.push("Consider adding more comprehensive clauses (aim for 10+ for IP assignment)");
  } else {
    issues.push(`Only ${clauses.length} clauses - significantly incomplete`);
    recommendations.push("Add essential clauses: Definitions, IP Assignment, Representations, Warranties, Further Assurances, Indemnification, Governing Law");
  }

  // Check clause numbering (2 points)
  const hasProperOrder = clauses.every((c, i) => c.order === i + 1 || c.order === i);
  if (hasProperOrder) {
    score += 2;
  } else {
    issues.push("Clause ordering is inconsistent");
    recommendations.push("Ensure clauses are numbered sequentially");
  }

  // Check for essential clause titles (3 points)
  const essentialClauseTitles = [
    /definition/i,
    /assignment|transfer|conveyance/i,
    /representation|warrant/i,
    /confidential/i,
    /governing.*law|applicable.*law/i
  ];

  let essentialTitlesFound = 0;
  for (const pattern of essentialClauseTitles) {
    if (clauses.some(c => pattern.test(c.title))) {
      essentialTitlesFound++;
    }
  }

  const titleRatio = essentialTitlesFound / essentialClauseTitles.length;
  score += Math.round(titleRatio * 3);

  if (titleRatio < 1) {
    issues.push("Missing some essential clause types");
    recommendations.push("Include clauses for: Definitions, IP Assignment, Representations & Warranties, Confidentiality, Governing Law");
  }

  // Check clause content length and quality (3 points)
  const avgContentLength = clauses.reduce((sum, c) => sum + c.content.length, 0) / clauses.length;

  if (avgContentLength >= 500) {
    score += 3;
  } else if (avgContentLength >= 250) {
    score += 2;
    issues.push("Clause content is somewhat brief");
    recommendations.push("Consider expanding clause content for more comprehensive coverage");
  } else if (avgContentLength >= 100) {
    score += 1;
    issues.push("Clause content is too brief");
    recommendations.push("Clauses need more detailed content - aim for 300+ characters per clause");
  } else {
    issues.push("Clause content is severely lacking");
    recommendations.push("Add substantial content to each clause with proper legal language");
  }

  return { score, maxScore, issues, recommendations };
}

function assessSignatureBlock(content: ContractContent): AssessmentScore {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 0;
  const maxScore = 10;

  const sigBlock = content.signatureBlock || "";

  if (!sigBlock || sigBlock.trim().length === 0) {
    issues.push("No signature block found");
    recommendations.push("Add complete signature block with fields for both parties");
    return { score: 0, maxScore, issues, recommendations };
  }

  // Check for party sections (3 points)
  const hasAssignor = /assignor|transferor|party.*1|grantor/i.test(sigBlock);
  const hasAssignee = /assignee|transferee|party.*2|grantee/i.test(sigBlock);

  if (hasAssignor && hasAssignee) {
    score += 3;
  } else if (hasAssignor || hasAssignee) {
    score += 1;
    issues.push("Signature block missing one party designation");
    recommendations.push("Include signature areas for both Assignor and Assignee");
  } else {
    issues.push("No clear party designations in signature block");
    recommendations.push("Add labeled sections for Assignor and Assignee signatures");
  }

  // Check for signature fields (3 points)
  const hasSignatureLine = /signature|sign|by:/i.test(sigBlock) || sigBlock.includes("___");
  const hasNameField = /name|print/i.test(sigBlock);
  const hasTitleField = /title|position|role/i.test(sigBlock);
  const hasDateField = /date/i.test(sigBlock);

  const fieldCount = [hasSignatureLine, hasNameField, hasTitleField, hasDateField].filter(Boolean).length;

  if (fieldCount >= 4) {
    score += 3;
  } else if (fieldCount >= 3) {
    score += 2;
    const missing = [];
    if (!hasSignatureLine) missing.push("signature line");
    if (!hasNameField) missing.push("printed name");
    if (!hasTitleField) missing.push("title");
    if (!hasDateField) missing.push("date");
    issues.push(`Missing signature block field(s): ${missing.join(", ")}`);
    recommendations.push("Add missing fields to signature block");
  } else {
    score += 1;
    issues.push("Signature block is incomplete");
    recommendations.push("Include: signature line, printed name, title, and date fields for each party");
  }

  // Check for witness/notary provisions (2 points)
  const hasWitness = /witness/i.test(sigBlock);
  const hasNotary = /notary|notarize|acknowledge/i.test(sigBlock);

  if (hasWitness || hasNotary) {
    score += 2;
  } else {
    score += 1; // Give partial credit as not always required
    recommendations.push("Consider adding witness or notary acknowledgment for important IP transfers");
  }

  // Check formatting (2 points)
  const hasProperFormatting = sigBlock.length > 100 &&
    (sigBlock.includes("\n") || sigBlock.includes("<br") || sigBlock.includes("__"));

  if (hasProperFormatting) {
    score += 2;
  } else {
    issues.push("Signature block formatting could be improved");
    recommendations.push("Format signature block with clear visual separation between parties and fields");
  }

  return { score, maxScore, issues, recommendations };
}

function calculateGrade(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

function assessTemplate(template: Template): TemplateAssessment {
  const content = template.content;

  const legalCompleteness = assessLegalCompleteness(content);
  const jurisdictionAccuracy = assessJurisdictionAccuracy(content, template.jurisdiction);
  const placeholderQuality = assessPlaceholderQuality(content);
  const clauseStructure = assessClauseStructure(content);
  const signatureBlock = assessSignatureBlock(content);

  const overallScore = legalCompleteness.score + jurisdictionAccuracy.score +
    placeholderQuality.score + clauseStructure.score + signatureBlock.score;
  const overallMax = legalCompleteness.maxScore + jurisdictionAccuracy.maxScore +
    placeholderQuality.maxScore + clauseStructure.maxScore + signatureBlock.maxScore;

  return {
    templateId: template.id,
    title: template.title,
    jurisdiction: template.jurisdiction,
    legalCompleteness,
    jurisdictionAccuracy,
    placeholderQuality,
    clauseStructure,
    signatureBlock,
    overallScore,
    overallMax,
    grade: calculateGrade(overallScore, overallMax)
  };
}

function printAssessment(assessment: TemplateAssessment): void {
  console.log("\n" + "=".repeat(80));
  console.log(`TEMPLATE: ${assessment.title}`);
  console.log(`Jurisdiction: ${assessment.jurisdiction}`);
  console.log(`Template ID: ${assessment.templateId}`);
  console.log("=".repeat(80));

  console.log(`\nOVERALL SCORE: ${assessment.overallScore}/${assessment.overallMax} (${((assessment.overallScore/assessment.overallMax)*100).toFixed(1)}%) - Grade: ${assessment.grade}`);

  const categories = [
    { name: "Legal Completeness", data: assessment.legalCompleteness },
    { name: "Jurisdiction Accuracy", data: assessment.jurisdictionAccuracy },
    { name: "Placeholder Quality", data: assessment.placeholderQuality },
    { name: "Clause Structure", data: assessment.clauseStructure },
    { name: "Signature Block", data: assessment.signatureBlock }
  ];

  for (const cat of categories) {
    console.log(`\n--- ${cat.name}: ${cat.data.score}/${cat.data.maxScore} ---`);

    if (cat.data.issues.length > 0) {
      console.log("Issues:");
      for (const issue of cat.data.issues) {
        console.log(`  - ${issue}`);
      }
    }

    if (cat.data.recommendations.length > 0) {
      console.log("Recommendations:");
      for (const rec of cat.data.recommendations) {
        console.log(`  * ${rec}`);
      }
    }
  }
}

async function main() {
  console.log("IP Assignment Template Quality Assessment");
  console.log("=========================================\n");
  console.log("Querying Supabase for IP Assignment templates...\n");

  const { data: templates, error } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("contract_type", "ip_assignment")
    .order("jurisdiction");

  if (error) {
    console.error("Error fetching templates:", error);
    return;
  }

  if (!templates || templates.length === 0) {
    console.log("No IP Assignment templates found in the database.");
    console.log("\nChecking all available contract types...");

    const { data: allTypes, error: typesError } = await supabase
      .from("contract_templates")
      .select("contract_type, jurisdiction, title")
      .order("contract_type");

    if (typesError) {
      console.error("Error fetching contract types:", typesError);
      return;
    }

    console.log("\nAvailable templates in database:");
    const typeGroups: Record<string, string[]> = {};
    for (const t of allTypes || []) {
      if (!typeGroups[t.contract_type]) {
        typeGroups[t.contract_type] = [];
      }
      typeGroups[t.contract_type].push(`${t.jurisdiction}: ${t.title}`);
    }

    for (const [type, templates] of Object.entries(typeGroups)) {
      console.log(`\n${type}:`);
      for (const t of templates) {
        console.log(`  - ${t}`);
      }
    }

    return;
  }

  console.log(`Found ${templates.length} IP Assignment template(s).\n`);

  const assessments: TemplateAssessment[] = [];

  for (const templateDB of templates) {
    const template = normalizeTemplate(templateDB as TemplateDB);
    const assessment = assessTemplate(template);
    assessments.push(assessment);
    printAssessment(assessment);
  }

  // Summary
  console.log("\n\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  console.log("\nTemplate Scores:");
  console.log("-".repeat(80));
  console.log("Jurisdiction     | Legal | Jurisd | Placeholder | Clause | Signature | Total | Grade");
  console.log("-".repeat(80));

  for (const a of assessments) {
    console.log(
      `${a.jurisdiction.padEnd(16)} | ${String(a.legalCompleteness.score).padStart(5)} | ${String(a.jurisdictionAccuracy.score).padStart(6)} | ${String(a.placeholderQuality.score).padStart(11)} | ${String(a.clauseStructure.score).padStart(6)} | ${String(a.signatureBlock.score).padStart(9)} | ${String(a.overallScore).padStart(5)} | ${a.grade}`
    );
  }

  // Calculate averages
  const avgScores = {
    legal: assessments.reduce((s, a) => s + a.legalCompleteness.score, 0) / assessments.length,
    jurisdiction: assessments.reduce((s, a) => s + a.jurisdictionAccuracy.score, 0) / assessments.length,
    placeholder: assessments.reduce((s, a) => s + a.placeholderQuality.score, 0) / assessments.length,
    clause: assessments.reduce((s, a) => s + a.clauseStructure.score, 0) / assessments.length,
    signature: assessments.reduce((s, a) => s + a.signatureBlock.score, 0) / assessments.length,
    overall: assessments.reduce((s, a) => s + a.overallScore, 0) / assessments.length
  };

  console.log("-".repeat(80));
  console.log(
    `${"AVERAGE".padEnd(16)} | ${avgScores.legal.toFixed(1).padStart(5)} | ${avgScores.jurisdiction.toFixed(1).padStart(6)} | ${avgScores.placeholder.toFixed(1).padStart(11)} | ${avgScores.clause.toFixed(1).padStart(6)} | ${avgScores.signature.toFixed(1).padStart(9)} | ${avgScores.overall.toFixed(1).padStart(5)} | ${calculateGrade(avgScores.overall, 50)}`
  );

  // Common issues across all templates
  console.log("\n\nCOMMON ISSUES ACROSS ALL TEMPLATES:");
  console.log("-".repeat(80));

  const allIssues: Record<string, number> = {};
  for (const a of assessments) {
    for (const cat of [a.legalCompleteness, a.jurisdictionAccuracy, a.placeholderQuality, a.clauseStructure, a.signatureBlock]) {
      for (const issue of cat.issues) {
        allIssues[issue] = (allIssues[issue] || 0) + 1;
      }
    }
  }

  const sortedIssues = Object.entries(allIssues).sort((a, b) => b[1] - a[1]);
  for (const [issue, count] of sortedIssues) {
    const percentage = ((count / assessments.length) * 100).toFixed(0);
    console.log(`[${count}/${assessments.length}] (${percentage}%) ${issue}`);
  }

  // Priority recommendations
  console.log("\n\nPRIORITY RECOMMENDATIONS:");
  console.log("-".repeat(80));

  const allRecs: Record<string, number> = {};
  for (const a of assessments) {
    for (const cat of [a.legalCompleteness, a.jurisdictionAccuracy, a.placeholderQuality, a.clauseStructure, a.signatureBlock]) {
      for (const rec of cat.recommendations) {
        allRecs[rec] = (allRecs[rec] || 0) + 1;
      }
    }
  }

  const sortedRecs = Object.entries(allRecs).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (let i = 0; i < sortedRecs.length; i++) {
    const [rec, count] = sortedRecs[i];
    console.log(`${i + 1}. [Affects ${count} template(s)] ${rec}`);
  }
}

main().catch(console.error);
