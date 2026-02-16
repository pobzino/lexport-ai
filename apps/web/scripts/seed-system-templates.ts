#!/usr/bin/env bun
/**
 * Seed script for system contract templates
 * Loads pre-generated templates from generated-templates/ into contract_templates table
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

interface TemplateData {
  contract_type: string;
  jurisdiction: string;
  version: number;
  title: string;
  preamble: string;
  recitals: string;
  clauses: Array<{
    id: string;
    title: string;
    content: string;
    type?: string;
    order?: number;
  }>;
  signature_block: string;
  placeholders: Array<{
    id: string;
    token: string;
    label: string;
    description: string;
    category: string;
    type: string;
    required: boolean;
    autofillKey?: string;
  }>;
  is_active: boolean;
  metadata: Record<string, unknown>;
}

interface ContractTemplateRecord {
  contract_type: string;
  jurisdiction: string;
  version: number;
  title: string;
  description: string;
  preamble: string;
  recitals: string;
  clauses: TemplateData["clauses"];
  signature_block: string;
  placeholders: TemplateData["placeholders"];
  is_active: boolean;
  is_public: boolean;
  metadata: Record<string, unknown>;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Map contract types to human-readable descriptions
const typeDescriptions: Record<string, string> = {
  nda_mutual: "Mutual NDA for protecting confidential information shared between two parties. Both parties agree to keep shared information confidential.",
  nda_one_way: "One-way NDA for protecting confidential information disclosed by one party to another. Used when only one party shares sensitive information.",
  independent_contractor: "Agreement for hiring independent contractors, defining scope of work, payment terms, and intellectual property rights.",
  consulting_agreement: "Professional consulting agreement covering services, deliverables, payment terms, and consultant obligations.",
  freelance_service: "Service agreement for freelance work, suitable for creative, technical, or professional services.",
  safe_note: "Simple Agreement for Future Equity (SAFE) for startup fundraising with valuation cap and discount rate provisions.",
};

// Map jurisdictions to human-readable names
const jurisdictionNames: Record<string, string> = {
  us_california: "California, USA",
  us_texas: "Texas, USA",
  us_new_york: "New York, USA",
  uk: "United Kingdom",
};

function parseTemplateFilename(filename: string): { type: string; jurisdiction: string } | null {
  // Format: {type}_{jurisdiction}.json or {type}_{subtype}_{jurisdiction}.json
  // Examples:
  //   - consulting_agreement_us_california.json
  //   - nda_mutual_us_california.json
  //   - nda_one_way_uk.json
  
  const match = filename.match(/^(.+)_(us_[a-z_]+|uk)\.json$/);
  if (!match) return null;
  
  const jurisdiction = match[2];
  const typePart = match[1];
  
  // Convert filename format to contract_type
  // nda_one_way -> nda_one_way
  // consulting_agreement -> consulting_agreement
  const type = typePart;
  
  return { type, jurisdiction };
}

function formatContractType(type: string): string {
  const typeNames: Record<string, string> = {
    nda_mutual: "Mutual NDA",
    nda_one_way: "One-Way NDA",
    independent_contractor: "Independent Contractor Agreement",
    consulting_agreement: "Consulting Agreement",
    freelance_service: "Freelance Service Agreement",
    safe_note: "SAFE Note",
  };
  return typeNames[type] || type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

async function seedTemplates(): Promise<void> {
  console.log("🌱 Seeding system contract templates...\n");

  const templatesDir = join(process.cwd(), "..", "..", "generated-templates");
  const files = readdirSync(templatesDir).filter(f => f.endsWith(".json"));

  console.log(`Found ${files.length} template files:\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const filename of files.sort()) {
    const parsed = parseTemplateFilename(filename);
    if (!parsed) {
      console.warn(`⚠️  Skipping unrecognized filename: ${filename}`);
      continue;
    }

    const filePath = join(templatesDir, filename);
    const content = readFileSync(filePath, "utf-8");
    const data: TemplateData = JSON.parse(content);

    // Check if template already exists
    const { data: existing, error: checkError } = await supabase
      .from("contract_templates")
      .select("id")
      .eq("contract_type", data.contract_type)
      .eq("jurisdiction", data.jurisdiction)
      .eq("version", data.version)
      .maybeSingle();

    if (checkError) {
      console.error(`❌ Error checking existing template ${filename}:`, checkError.message);
      errors++;
      continue;
    }

    if (existing) {
      console.log(`⏭️  Skipping ${filename} (already exists)`);
      skipped++;
      continue;
    }

    const jurisdictionDisplay = jurisdictionNames[data.jurisdiction] || data.jurisdiction;
    const description = typeDescriptions[data.contract_type] || `Standard ${formatContractType(data.contract_type)} template for ${jurisdictionDisplay}.`;

    const record: ContractTemplateRecord = {
      contract_type: data.contract_type,
      jurisdiction: data.jurisdiction,
      version: data.version,
      title: data.title,
      description,
      preamble: data.preamble,
      recitals: data.recitals,
      clauses: data.clauses,
      signature_block: data.signature_block,
      placeholders: data.placeholders,
      is_active: data.is_active,
      is_public: true,
      metadata: data.metadata,
    };

    const { error: insertError } = await supabase
      .from("contract_templates")
      .insert(record);

    if (insertError) {
      console.error(`❌ Failed to insert ${filename}:`, insertError.message);
      errors++;
    } else {
      console.log(`✅ Inserted: ${data.title} (${jurisdictionDisplay})`);
      inserted++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Errors:   ${errors}`);
  console.log(`   Total:    ${files.length}`);

  if (errors > 0) {
    process.exit(1);
  }
}

seedTemplates().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
