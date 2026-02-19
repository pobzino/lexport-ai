# Task Specification: LEX-003 — Contract Dashboard: Folders & Tags

## Task ID
LEX-003

## Context

Lexport AI has completed all launch tasks (LEX-LAUNCH-001 through 014). The contract dashboard currently provides basic contract listing with status filtering. The PRD (section F4) specifies enhanced contract organization features that are P1 priority for post-launch.

**What exists:**
- `/dashboard` page with contract list
- Basic status filtering (draft, pending, signed, etc.)
- Contract detail view with history
- Download signed PDF functionality

**What's missing:**
- Folder organization for contracts
- Tags and labels for categorization
- Expiration/renewal alerts
- Contract analytics (avg sign time, etc.)

## Goal

Implement folder organization and tagging system for contract dashboard. This enables users to organize contracts by client, project, or any custom taxonomy.

## Database Schema Changes

### New Table: `contract_folders`
```sql
CREATE TABLE contract_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6', -- hex color for UI
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_folders_user ON contract_folders(user_id);
```

### New Table: `contract_tags`
```sql
CREATE TABLE contract_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_tags_user ON contract_tags(user_id);
```

### Modified Table: `contracts` (add folder_id)
```sql
ALTER TABLE contracts ADD COLUMN folder_id UUID REFERENCES contract_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_contracts_folder ON contracts(folder_id) WHERE folder_id IS NOT NULL;
```

### New Junction Table: `contract_tag_assignments`
```sql
CREATE TABLE contract_tag_assignments (
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES contract_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contract_id, tag_id)
);

CREATE INDEX idx_tag_assignments_contract ON contract_tag_assignments(contract_id);
CREATE INDEX idx_tag_assignments_tag ON contract_tag_assignments(tag_id);
```

## Implementation Steps

### Step 1: Database Migration

Create `supabase/migrations/2026021900000_contract_folders_tags.sql`:
- Create tables above
- Add RLS policies (users can only access their own folders/tags)
- Add updated_at trigger for contract_folders

### Step 2: Create Folder Management UI

**New Component:** `src/components/dashboard/FolderSidebar.tsx`
- Display list of user's folders with color indicators
- "All Contracts" default view
- "Uncategorized" pseudo-folder for contracts without folder
- Create new folder button with color picker
- Edit/delete folder options (with confirmation)
- Drag-and-drop or click-to-move contracts to folders

**New Component:** `src/components/dashboard/CreateFolderDialog.tsx`
- Modal for creating/editing folders
- Name input with validation
- Color picker (preset palette)

### Step 3: Create Tag Management System

**New Component:** `src/components/dashboard/TagManager.tsx`
- Display tags as colored badges
- Create new tag with color picker
- Tag assignment on contracts (multi-select)
- Filter by tag in dashboard

**New Component:** `src/components/dashboard/TagInput.tsx`
- Combobox for selecting/creating tags
- Typeahead search existing tags
- Create new tag inline if not found
- Visual tag badges in input

### Step 4: Update Contract Dashboard

**Modify:** `src/app/dashboard/page.tsx` or relevant dashboard component
- Add folder sidebar layout (sidebar + main content)
- Show current folder name in header
- Filter contracts by selected folder
- Add tag filters alongside status filters
- Bulk actions: move to folder, add/remove tags

### Step 5: Update Contract Detail View

**Modify:** `src/app/contracts/[id]/page.tsx`
- Display folder badge (click to change)
- Display assigned tags
- Add folder/tag editing in contract settings/actions

### Step 6: API Routes

**New:** `src/app/api/folders/route.ts`
- GET: List user's folders with contract counts
- POST: Create new folder
- PATCH: Update folder name/color
- DELETE: Delete folder (move contracts to uncategorized)

**New:** `src/app/api/tags/route.ts`
- GET: List user's tags
- POST: Create new tag
- PATCH: Update tag
- DELETE: Delete tag (remove from all contracts)

**New:** `src/app/api/contracts/[id]/folder/route.ts`
- PATCH: Move contract to folder (or remove from folder)

**New:** `src/app/api/contracts/[id]/tags/route.ts`
- POST: Add tag to contract
- DELETE: Remove tag from contract

### Step 7: Update Dashboard Contract List

**Modify:** Contract list items to show:
- Folder badge (if in a folder)
- Tag badges (max 3 visible, +N more indicator)
- Quick actions: move folder dropdown, tag dropdown

## Files to Create

1. `supabase/migrations/2026021900000_contract_folders_tags.sql`
2. `src/components/dashboard/FolderSidebar.tsx`
3. `src/components/dashboard/CreateFolderDialog.tsx`
4. `src/components/dashboard/TagManager.tsx`
5. `src/components/dashboard/TagInput.tsx`
6. `src/app/api/folders/route.ts`
7. `src/app/api/tags/route.ts`
8. `src/app/api/contracts/[id]/folder/route.ts`
9. `src/app/api/contracts/[id]/tags/route.ts`

## Files to Modify

1. `src/app/dashboard/page.tsx` — add folder sidebar, tag filters
2. `src/app/contracts/[id]/page.tsx` — show folder/tags, editing UI
3. `src/components/dashboard/ContractList.tsx` or equivalent — show folder/tag badges

## Acceptance Criteria

- [ ] Migration creates all tables with proper indexes and RLS
- [ ] User can create folders with custom colors
- [ ] User can move contracts to folders (drag-drop or dropdown)
- [ ] Folder sidebar shows contract counts per folder
- [ ] User can create tags with custom colors
- [ ] User can assign multiple tags to a contract
- [ ] Dashboard can filter by folder and/or tags
- [ ] Contract detail view shows folder and tags
- [ ] Deleting a folder moves contracts to "uncategorized"
- [ ] All UI updates in real-time (no page refresh needed)
- [ ] TypeScript types for all new entities
- [ ] Clean conventional commit: `feat(LEX-003): add contract folders and tags`

## DO NOT

- Do NOT implement expiration alerts (out of scope for this task)
- Do NOT implement contract analytics (out of scope)
- Do NOT implement nested folders (flat structure only)
- Do NOT break existing dashboard functionality
- Do NOT add folder sharing between users (personal only)
- Do NOT use any external libraries for color picking (use native input type="color" or preset palette)

## UI/UX Notes

- Use shadcn/ui components for consistency
- Sidebar width: ~240px, collapsible on mobile
- Tag badges: pill-shaped with tag color as background
- Folder colors: use for folder icon and left border indicator
- Empty states: show helpful messages for empty folders
