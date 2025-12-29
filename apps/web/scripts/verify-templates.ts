/**
 * Verify enhanced templates
 */
import { config } from "dotenv";
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from("contract_templates")
    .select("jurisdiction, contract_type, title, metadata")
    .in("jurisdiction", ["uk", "us_texas", "us_new_york", "us_california"])
    .order("jurisdiction")
    .order("contract_type");

  if (error) {
    console.error(error);
    return;
  }

  console.log("Enhanced Templates Summary:\n");
  console.log("Jurisdiction  | Contract Type         | Clauses | Words  | Generator");
  console.log("-".repeat(75));

  for (const t of data || []) {
    const m = t.metadata as any;
    console.log(
      `${t.jurisdiction.padEnd(13)} | ${t.contract_type.padEnd(21)} | ${String(m.clause_count || 0).padStart(7)} | ${String(m.word_count || 0).padStart(6)} | ${m.generator_version || "?"}`
    );
  }

  // Calculate averages
  const enhanced = (data || []).filter(t => t.jurisdiction !== "us_california");
  const california = (data || []).filter(t => t.jurisdiction === "us_california");

  const avgEnhanced = enhanced.reduce((sum, t) => sum + ((t.metadata as any).word_count || 0), 0) / enhanced.length;
  const avgCalifornia = california.reduce((sum, t) => sum + ((t.metadata as any).word_count || 0), 0) / california.length;

  console.log("\n" + "=".repeat(75));
  console.log(`Average word count - Enhanced: ${Math.round(avgEnhanced)} words`);
  console.log(`Average word count - California (reference): ${Math.round(avgCalifornia)} words`);
  console.log(`Enhancement ratio: ${(avgEnhanced / avgCalifornia * 100).toFixed(0)}% of California quality`);
}

main().catch(console.error);
