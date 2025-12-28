/**
 * Debug Opus parsing - generate one template and capture raw output
 */

import { generateTemplate } from "../src/lib/contracts/template-generator";

async function main() {
  console.log("Generating one template with Opus to debug parsing...\n");

  const template = await generateTemplate({
    contractType: "nda_mutual",
    jurisdiction: "us_california",
    includeOptionalClauses: true,
    enhanceWithOpus: true,
    onProgress: (stage, status) => {
      console.log(`${stage}: ${status}`);
    },
  });

  console.log("\n✅ Generation complete");
  console.log(`Clauses: ${template.clauses.length}`);
  console.log(`Check /tmp/opus-debug-*.txt for raw output`);
}

main().catch(console.error);
