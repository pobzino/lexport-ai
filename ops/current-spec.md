# Task Spec: LEX-002 — Seed System Templates & Workspace Cleanup

## Context

The template library UI is built (`/templates` page + `TemplateLibrary` component + API routes) but the system templates from `generated-templates/` are not seeded into the database. Users visiting `/templates` will see an empty state.

Additionally, there are duplicate files in the workspace that should be cleaned up:
- `apps/web/src/app/api/contracts/generate/stream/route 2.ts`
- `apps/web/src/lib/contracts/generator-streaming 2.ts`

## Goal

1. Seed the 9 pre-generated templates from `generated-templates/` into the `contract_templates` table
2. Remove duplicate files
3. Verify the template library page loads and displays the seeded templates

## Step-by-Step Instructions

### Step 1: Review existing infrastructure

1. Read `apps/web/src/app/api/templates/route.ts` (~line 90+) to understand how it fetches from `contract_templates` table
2. Check Supabase schema for `contract_templates` table structure (likely has: id, name, description, type, jurisdiction, content, is_active, created_at, etc.)
3. Note: `templates` table = user templates, `contract_templates` table = system templates

### Step 2: Create a seed script for system templates

1. Create `apps/web/scripts/seed-system-templates.ts`
2. Load JSON files from `generated-templates/`:
   - `consulting_agreement_us_california.json`
   - `freelance_service_us_california.json`
   - `independent_contractor_us_california.json`
   - `nda_mutual_us_california.json`
   - `nda_one_way_uk.json`
   - `nda_one_way_us_california.json`
   - `nda_one_way_us_new_york.json`
   - `nda_one_way_us_texas.json`
   - `safe_note_us_california.json`
3. For each JSON file:
   - Parse the template content
   - Determine contract type, jurisdiction, and metadata from filename/content
   - Insert into `contract_templates` table with:
     - `name`: human-readable name (e.g., "Mutual NDA (California)")
     - `description`: 1-2 sentence description
     - `type`: contract type code (e.g., "nda_mutual")
     - `jurisdiction`: jurisdiction code (e.g., "us_california")
     - `content`: the full JSON template structure
     - `is_active`: true
     - `is_public`: true (system templates are public)
4. Use Supabase service role key for insertion
5. Handle duplicates gracefully (upsert or skip if already exists)

### Step 3: Clean up duplicate files

1. Verify these files are true duplicates (compare content):
   - `apps/web/src/app/api/contracts/generate/stream/route 2.ts` vs `route.ts`
   - `apps/web/src/lib/contracts/generator-streaming 2.ts` vs `generator-streaming.ts`
2. If they are duplicates, delete the " 2" versions:
   ```bash
   rm "apps/web/src/app/api/contracts/generate/stream/route 2.ts"
   rm "apps/web/src/lib/contracts/generator-streaming 2.ts"
   ```

### Step 4: Run the seed script

1. Add npm script to `apps/web/package.json`:
   ```json
   "seed:templates": "bun run scripts/seed-system-templates.ts"
   ```
2. Run: `cd apps/web && npm run seed:templates`
3. Verify output shows 9 templates inserted successfully

### Step 5: Verify template library

1. Start dev server: `npm run dev`
2. Navigate to `/templates` (after login)
3. Verify:
   - Templates are displayed in grid
   - Search works
   - Type and jurisdiction filters work
   - Can view/preview templates
   - No console errors

### Step 6: Commit changes

1. Stage: seed script, deleted duplicates, any schema fixes
2. Commit message format:
   ```
   feat(LEX-002): seed system templates and cleanup workspace

   - Add seed-system-templates.ts script to load generated templates
   - Insert 9 pre-generated templates into contract_templates table
   - Remove duplicate route 2.ts and generator-streaming 2.ts files
   - Templates now appear in /templates library on fresh install
   ```

## Acceptance Criteria

- [ ] `apps/web/scripts/seed-system-templates.ts` exists and runs successfully
- [ ] 9 templates inserted into `contract_templates` table
- [ ] Duplicate files removed from workspace
- [ ] `/templates` page shows seeded templates (after login)
- [ ] Template filtering by type and jurisdiction works
- [ ] No TypeScript errors in modified files
- [ ] Clean commit with conventional message format
- [ ] Working tree clean except `ops/`

## DO NOT

- Don't modify the template JSON files themselves
- Don't change the template library UI (already built)
- Don't add new template types beyond what's in `generated-templates/`
- Don't break existing contract generation flow
- Don't commit node_modules or build artifacts

## Files to Touch

### Create:
- `apps/web/scripts/seed-system-templates.ts`

### Read:
- `apps/web/src/app/api/templates/route.ts`
- `generated-templates/*.json` (all 9 files)
- Supabase schema (via Supabase Studio or existing migration files)

### Delete:
- `apps/web/src/app/api/contracts/generate/stream/route 2.ts`
- `apps/web/src/lib/contracts/generator-streaming 2.ts`

### Potentially Update:
- `apps/web/package.json` (add seed script)
