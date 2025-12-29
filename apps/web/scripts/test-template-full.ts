/**
 * Full template output for quality assessment
 */

import { generateTemplate } from "../src/lib/contracts/template-generator";

async function main() {
  console.log("Generating template for quality review...\n");

  const template = await generateTemplate({
    contractType: "nda_mutual",
    jurisdiction: "us_california",
    includeOptionalClauses: true,
  });

  console.log("=".repeat(80));
  console.log("TITLE:", template.title);
  console.log("=".repeat(80));

  console.log("\n## PREAMBLE\n");
  console.log(template.preamble);

  console.log("\n## RECITALS\n");
  console.log(template.recitals);

  console.log("\n## CLAUSES\n");
  for (const clause of template.clauses) {
    console.log("-".repeat(80));
    console.log(`[${clause.type.toUpperCase()}] ${clause.title}`);
    console.log("-".repeat(80));
    console.log(clause.content);
    console.log("");
  }

  console.log("## SIGNATURE BLOCK\n");
  console.log(template.signatureBlock);
}

main().catch(console.error);
