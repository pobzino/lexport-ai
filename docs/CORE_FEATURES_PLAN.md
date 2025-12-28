# Core Features Implementation Plan

## Overview

Three priority features to complete the core contract workflow:

1. **Signature Field Placement** - Visual drag-drop field positioning on PDF
2. **Template Placeholder System** - Fill placeholders when using templates
3. **PDF Preview** - Preview final PDF before sending

---

## Feature 1: Signature Field Drag-Drop Placement

### Problem
Currently, signature fields use hardcoded positions. Users can't visually place fields where they want them on the contract.

### User Stories
- As a user, I want to drag signature fields onto specific locations in my contract
- As a user, I want to place date fields next to signature lines
- As a user, I want to assign fields to specific signers
- As a user, I want to resize and reposition fields after placing them

### Technical Approach

#### Components
```
src/components/signature-field-editor/
├── SignatureFieldEditor.tsx    # Main editor container
├── PDFViewer.tsx               # PDF rendering with page navigation
├── FieldPalette.tsx            # Draggable field types sidebar
├── PlacedField.tsx             # Individual placed field (draggable/resizable)
├── FieldProperties.tsx         # Field settings panel (signer, required, etc.)
└── types.ts                    # Type definitions
```

#### Field Types
| Type | Icon | Purpose |
|------|------|---------|
| signature | ✍️ | Full signature |
| initials | AI | Initials only |
| date | 📅 | Date picker/auto-fill |
| text | T | Free text input |
| checkbox | ☑️ | Yes/No selection |
| dropdown | ▼ | Select from options |

#### Data Model
```typescript
interface PlacedField {
  id: string;
  type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox' | 'dropdown';
  signerId: string;           // Which signer fills this
  page: number;               // PDF page number (1-indexed)
  x: number;                  // X position (% of page width)
  y: number;                  // Y position (% of page height)
  width: number;              // Width (% of page width)
  height: number;             // Height (% of page height)
  required: boolean;
  label?: string;             // Optional field label
  options?: string[];         // For dropdown type
  placeholder?: string;       // For text type
}
```

#### Database Changes
Existing `signature_fields` table is sufficient:
```sql
-- Already exists in schema
signature_fields (
  id, contract_id, type, signer_id,
  page, x, y, width, height,
  required, label, options, placeholder
)
```

#### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/contracts/[id]/fields` | Get all placed fields |
| PUT | `/api/contracts/[id]/fields` | Save all fields (bulk update) |
| POST | `/api/contracts/[id]/fields/auto` | Auto-detect signature lines |

#### UI Flow
1. User clicks "Place Signature Fields" on contract edit page
2. PDF renders with current fields overlaid
3. Left sidebar shows field palette (drag source)
4. User drags fields onto PDF pages
5. Click field to select → right panel shows properties
6. Drag corners to resize, drag center to move
7. Assign each field to a signer from dropdown
8. Save button persists all field positions

#### Key Libraries
- `react-pdf` - PDF rendering
- `@dnd-kit/core` - Drag and drop
- `re-resizable` - Field resizing

#### Implementation Steps
1. Create PDFViewer component with page navigation
2. Create FieldPalette with draggable field types
3. Implement PlacedField with drag/resize handlers
4. Add field-to-signer assignment UI
5. Create bulk save API endpoint
6. Add "auto-detect" for signature line suggestions
7. Integrate into contract edit page

---

## Feature 2: Template Placeholder System

### Problem
Templates can be saved but when reused, users can't easily fill in variable content (names, dates, amounts). They must manually find and replace text.

### User Stories
- As a user, I want to define placeholders in my template (e.g., {{client_name}})
- As a user, I want a form to fill all placeholders when using a template
- As a user, I want smart suggestions for placeholder values from my contacts
- As a user, I want to see which placeholders are unfilled before sending

### Technical Approach

#### Placeholder Syntax
```
{{placeholder_name}}           # Basic placeholder
{{placeholder_name:default}}   # With default value
{{date:today}}                 # Special: auto-fills current date
{{signer_1_name}}              # Auto-linked to signer
```

#### Standard Placeholders
| Placeholder | Description | Auto-fill Source |
|-------------|-------------|------------------|
| `{{client_name}}` | Client's full name | Signer 1 |
| `{{client_company}}` | Client's company | Signer 1 metadata |
| `{{client_email}}` | Client's email | Signer 1 |
| `{{provider_name}}` | Your name | Current user |
| `{{provider_company}}` | Your company | User profile |
| `{{effective_date}}` | Contract start date | Form input |
| `{{end_date}}` | Contract end date | Form input |
| `{{amount}}` | Payment amount | Form input |
| `{{today}}` | Current date | Auto |

#### Components
```
src/components/templates/
├── PlaceholderEditor.tsx      # Mark text as placeholder in editor
├── PlaceholderFillModal.tsx   # Form to fill all placeholders
├── PlaceholderBadge.tsx       # Visual indicator in text
└── PlaceholderSuggestions.tsx # Contact-based suggestions
```

#### Data Model
```typescript
interface TemplatePlaceholder {
  key: string;              // e.g., "client_name"
  label: string;            // e.g., "Client Name"
  type: 'text' | 'date' | 'number' | 'email' | 'select';
  required: boolean;
  defaultValue?: string;
  options?: string[];       // For select type
  autoFillFrom?: 'signer_1' | 'signer_2' | 'user' | 'today';
}

interface ContractTemplate {
  id: string;
  name: string;
  content: ContractContent;  // With {{placeholders}} in text
  placeholders: TemplatePlaceholder[];
  contractType: string;
  jurisdiction: string;
}
```

#### Database Changes
```sql
-- Add placeholders column to templates
ALTER TABLE contract_templates
ADD COLUMN placeholders JSONB DEFAULT '[]';

-- Or create separate table for more flexibility
CREATE TABLE template_placeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES contract_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  required BOOLEAN DEFAULT true,
  default_value TEXT,
  options JSONB,
  auto_fill_from TEXT,
  sort_order INTEGER DEFAULT 0
);
```

#### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/templates/[id]` | Get template with placeholders |
| POST | `/api/templates/[id]/use` | Create contract from template |
| GET | `/api/templates/[id]/placeholders` | List placeholders |
| PUT | `/api/templates/[id]/placeholders` | Update placeholders |

#### UI Flow
1. **Creating Template:**
   - User edits contract, clicks "Save as Template"
   - System auto-detects `{{...}}` patterns in content
   - Modal shows detected placeholders for configuration
   - User sets labels, types, required status
   - Save template with placeholder metadata

2. **Using Template:**
   - User clicks "Use Template" from template list
   - Modal shows form with all placeholders
   - Auto-fill suggestions from contacts/user profile
   - User fills in values, clicks "Create Contract"
   - New contract created with placeholders replaced

#### Implementation Steps
1. Add placeholder detection regex utility
2. Create PlaceholderFillModal component
3. Update "Save as Template" to detect/configure placeholders
4. Update "Use Template" API to accept placeholder values
5. Add contact suggestions for name/email fields
6. Add placeholder validation (warn if unfilled)
7. Show placeholder badges in editor view

---

## Feature 3: PDF Preview

### Problem
Users can't see the final PDF before sending. They must trust the preview matches what signers receive.

### User Stories
- As a user, I want to preview the exact PDF signers will see
- As a user, I want to see where signature fields are positioned
- As a user, I want to download the PDF before sending
- As a user, I want to see the PDF on mobile before signing

### Technical Approach

#### Components
```
src/components/pdf/
├── PDFPreview.tsx            # Full-screen PDF viewer
├── PDFThumbnails.tsx         # Page thumbnails sidebar
├── PDFDownloadButton.tsx     # Download as PDF
└── PDFFieldOverlay.tsx       # Show field positions on preview
```

#### PDF Generation
Current `/api/contracts/[id]/pdf` endpoint exists. Enhance it:

```typescript
// PDF generation options
interface PDFOptions {
  includeFields: boolean;      // Show field placeholders
  includeWatermark: boolean;   // "PREVIEW" watermark
  format: 'a4' | 'letter';
  includeHeader: boolean;      // Contract title header
  includeFooter: boolean;      // Page numbers
}
```

#### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/contracts/[id]/pdf` | Generate/download PDF |
| GET | `/api/contracts/[id]/pdf/preview` | Get preview URL (cached) |
| GET | `/api/contracts/[id]/pdf/pages` | Get page count & thumbnails |

#### Caching Strategy
```typescript
// Cache PDF by content hash to avoid regeneration
const cacheKey = `pdf:${contractId}:${contentHash}`;
const cachedUrl = await redis.get(cacheKey);
if (cachedUrl) return cachedUrl;

// Generate and cache for 1 hour
const pdfUrl = await generatePDF(contract);
await redis.set(cacheKey, pdfUrl, 'EX', 3600);
```

#### UI Integration Points

1. **Contract Edit Page:**
   - Add "Preview PDF" button in header
   - Opens full-screen modal with PDF viewer
   - Shows signature field positions overlaid

2. **Before Send Modal:**
   - Show PDF preview alongside signer form
   - "Preview what signers will see" link
   - Thumbnail of first page

3. **Signing Page:**
   - Mobile-optimized PDF viewer
   - Pinch-to-zoom support
   - Page navigation dots

#### Implementation Steps
1. Enhance PDF generation with options
2. Create PDFPreview modal component
3. Add preview button to contract edit page
4. Integrate preview into send flow
5. Optimize PDF viewer for mobile
6. Add thumbnail generation for page navigation
7. Implement caching for performance

---

## Implementation Priority

| Week | Feature | Deliverables |
|------|---------|--------------|
| 1 | PDF Preview | Basic preview modal, download button |
| 2 | PDF Preview | Mobile optimization, send flow integration |
| 3 | Signature Fields | PDF viewer with page nav, field palette |
| 4 | Signature Fields | Drag-drop placement, signer assignment |
| 5 | Templates | Placeholder detection, fill modal |
| 6 | Templates | Auto-suggestions, validation |

## Technical Dependencies

| Feature | Dependencies |
|---------|--------------|
| PDF Preview | `react-pdf`, `@react-pdf/renderer` |
| Signature Fields | `@dnd-kit/core`, `re-resizable`, `react-pdf` |
| Templates | None (pure React + existing APIs) |

## Database Migrations Required

```sql
-- Migration: Add template placeholders
ALTER TABLE contract_templates
ADD COLUMN IF NOT EXISTS placeholders JSONB DEFAULT '[]';

-- Migration: Add PDF cache tracking
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS pdf_cache_key TEXT,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;
```

## Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| PDF Preview | Users preview before send | >80% |
| Signature Fields | Fields placed per contract | avg 4+ |
| Templates | Template reuse rate | >30% of contracts |

---

## File Structure After Implementation

```
src/
├── components/
│   ├── pdf/
│   │   ├── PDFPreview.tsx
│   │   ├── PDFThumbnails.tsx
│   │   ├── PDFDownloadButton.tsx
│   │   └── PDFFieldOverlay.tsx
│   ├── signature-field-editor/
│   │   ├── SignatureFieldEditor.tsx
│   │   ├── PDFViewer.tsx
│   │   ├── FieldPalette.tsx
│   │   ├── PlacedField.tsx
│   │   └── FieldProperties.tsx
│   └── templates/
│       ├── PlaceholderEditor.tsx
│       ├── PlaceholderFillModal.tsx
│       ├── PlaceholderBadge.tsx
│       └── PlaceholderSuggestions.tsx
├── app/
│   └── api/
│       └── contracts/
│           └── [id]/
│               ├── pdf/
│               │   ├── route.ts          # Download PDF
│               │   └── preview/route.ts  # Preview URL
│               └── fields/
│                   ├── route.ts          # CRUD fields
│                   └── auto/route.ts     # Auto-detect
└── lib/
    ├── pdf/
    │   ├── generator.ts       # PDF generation
    │   └── cache.ts           # PDF caching
    └── templates/
        ├── placeholders.ts    # Placeholder detection/replacement
        └── suggestions.ts     # Auto-fill suggestions
```
