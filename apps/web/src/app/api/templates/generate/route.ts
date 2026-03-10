import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  generateTemplate,
  validateGeneratedTemplate,
} from "@/lib/contracts/template-generator";
import { ContractTypeEnum, JurisdictionEnum } from "@/lib/contracts/schemas";
import {
  buildTemplateSemanticText,
  createEmbedding,
  persistUserTemplateEmbedding,
} from "@/lib/templates/semantic-search";

const GenerateTemplateSchema = z.object({
  contractType: ContractTypeEnum,
  jurisdiction: JurisdictionEnum,
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  includeOptionalClauses: z.boolean().default(true),
  customInstructions: z.string().optional(),
});

// POST /api/templates/generate - Generate a new template with AI
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = GenerateTemplateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      contractType,
      jurisdiction,
      name,
      description,
      isPublic,
      includeOptionalClauses,
      customInstructions,
    } = parseResult.data;

    // Generate the template using GPT-5.2
    console.log(`Generating template: ${contractType} for ${jurisdiction}`);
    const startTime = Date.now();

    const generatedContent = await generateTemplate({
      contractType,
      jurisdiction,
      includeOptionalClauses,
      customInstructions,
    });

    const generationTime = Date.now() - startTime;
    console.log(`Template generated in ${generationTime}ms`);

    // Validate the generated template
    const validation = validateGeneratedTemplate(generatedContent);
    if (!validation.valid) {
      console.error("Template validation failed:", validation.errors);
      return NextResponse.json(
        {
          error: "Generated template failed validation",
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 422 }
      );
    }

    // Log any warnings
    if (validation.warnings.length > 0) {
      console.warn("Template generation warnings:", validation.warnings);
    }

    // Save to database
    const { data: template, error: insertError } = await supabase
      .from("templates")
      .insert({
        name,
        description: description || `AI-generated ${generatedContent.title}`,
        type: contractType,
        jurisdiction,
        content: {
          preamble: generatedContent.preamble,
          recitals: generatedContent.recitals,
          clauses: generatedContent.clauses,
          signatureBlock: generatedContent.signatureBlock,
        },
        is_public: isPublic,
        is_premium: false,
        price: null,
        created_by_id: user.id,
        usage_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving template:", insertError);
      return NextResponse.json(
        { error: "Failed to save template" },
        { status: 500 }
      );
    }

    const semanticText = buildTemplateSemanticText({
      name,
      description: description || `AI-generated ${generatedContent.title}`,
      type: contractType,
      jurisdiction,
      content: {
        preamble: generatedContent.preamble,
        recitals: generatedContent.recitals,
        clauses: generatedContent.clauses,
        signatureBlock: generatedContent.signatureBlock,
      },
    });
    const embedding = await createEmbedding(semanticText);
    if (embedding) {
      await persistUserTemplateEmbedding({
        supabase,
        templateId: template.id,
        semanticText,
        embedding,
      });
    }

    return NextResponse.json(
      {
        template,
        generationTime,
        warnings: validation.warnings,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Template generation error:", error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("OPENAI_API_KEY")) {
        return NextResponse.json(
          { error: "AI service not configured" },
          { status: 503 }
        );
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "AI service rate limited. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
