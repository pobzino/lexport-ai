# Lexport Mobile App - Comprehensive Development Plan

## Executive Summary

This document outlines a complete plan to build a React Native mobile app for Lexport with **full feature parity** to the web application. The mobile app will enable users to create AI-powered contracts, collect e-signatures, and manage legal documents entirely from their mobile devices.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Code Sharing Strategy](#2-code-sharing-strategy)
3. [Feature Breakdown](#3-feature-breakdown)
4. [Technical Implementation](#4-technical-implementation)
5. [Screen-by-Screen Specification](#5-screen-by-screen-specification)
6. [API Integration](#6-api-integration)
7. [Native Capabilities](#7-native-capabilities)
8. [Development Phases](#8-development-phases)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment & Distribution](#10-deployment--distribution)
11. [Team & Resources](#11-team--resources)
12. [Risk Assessment](#12-risk-assessment)
13. [Post-Launch Roadmap](#13-post-launch-roadmap)

---

## 1. Architecture Overview

### 1.1 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React Native 0.76+ with New Architecture | Performance, native feel, code sharing |
| **Dev Environment** | Expo SDK 52+ (managed workflow) | Faster iteration, OTA updates, easier deployment |
| **Navigation** | React Navigation 7 | Industry standard, deep linking support |
| **State Management** | Zustand + TanStack Query | Lightweight global state + server state caching |
| **Styling** | NativeWind v4 | Tailwind syntax parity with web |
| **Forms** | React Hook Form + Zod | Same validation schemas as web |
| **Auth** | Supabase React Native | Direct SDK compatibility |
| **Storage** | Supabase Storage + AsyncStorage | Cloud + local persistence |
| **PDF** | react-native-pdf + react-native-view-shot | View and generate PDFs |
| **Signatures** | react-native-signature-canvas | Drawing signatures |
| **Animations** | Reanimated 3 + Moti | Smooth 60fps animations |

### 1.2 Monorepo Structure

```
lexport/
├── apps/
│   ├── web/                    # Existing Next.js app (moved)
│   │   └── src/
│   └── mobile/                 # New React Native app
│       ├── app/                # Expo Router screens
│       ├── components/         # Mobile-specific components
│       ├── hooks/              # Mobile-specific hooks
│       └── native/             # Native module bridges
├── packages/
│   ├── shared/                 # Shared code
│   │   ├── types/              # TypeScript types
│   │   ├── schemas/            # Zod validation schemas
│   │   ├── constants/          # Contract types, jurisdictions
│   │   ├── utils/              # Pure utility functions
│   │   └── api-client/         # API client (fetch wrapper)
│   ├── ui/                     # Cross-platform UI primitives
│   │   ├── primitives/         # Text, View, Button abstractions
│   │   └── components/         # Shared component logic
│   └── supabase/               # Shared Supabase client config
├── package.json                # Workspace root
└── turbo.json                  # Turborepo config
```

### 1.3 API Architecture

The mobile app will consume the **existing Next.js API routes** deployed on Netlify:

```
Mobile App ──► https://lexport.ai/api/* ──► Supabase PostgreSQL
```

**No backend changes required** - the existing RESTful API is fully compatible.

---

## 2. Code Sharing Strategy

### 2.1 What Can Be Shared (Estimated 40-50% of logic)

| Category | Files | Sharing Method |
|----------|-------|----------------|
| **Types** | `types/contracts.ts`, all interfaces | Direct import from `@lexport/shared` |
| **Validation** | Zod schemas for forms | Direct import |
| **Constants** | Contract types, jurisdictions, plans | Direct import |
| **API Client** | Fetch wrapper, error handling | Shared package with platform adapters |
| **Business Logic** | Contract generation prompts, clause helpers | Direct import |
| **Utilities** | `cn()`, date formatters, hash functions | Direct import |

### 2.2 What Must Be Rebuilt

| Category | Web | Mobile | Effort |
|----------|-----|--------|--------|
| **UI Components** | React DOM + Tailwind | React Native + NativeWind | High |
| **Navigation** | Next.js App Router | React Navigation / Expo Router | Medium |
| **PDF Viewing** | Browser native | react-native-pdf | Medium |
| **Signature Canvas** | HTML5 Canvas | react-native-signature-canvas | Medium |
| **File Handling** | Browser APIs | Expo FileSystem + DocumentPicker | Medium |
| **Auth Flow** | Supabase SSR | Supabase React Native + SecureStore | Medium |
| **Deep Linking** | Next.js routing | Expo Linking + Universal Links | Low |

### 2.3 Shared Package Implementation

```typescript
// packages/shared/types/contracts.ts
export interface Contract {
  id: string;
  title: string;
  type: ContractType;
  jurisdiction: Jurisdiction;
  status: ContractStatus;
  content: ContractContent;
  metadata: ContractMetadata;
  // ... rest of interface
}

// packages/shared/schemas/contract.ts
import { z } from 'zod';

export const createContractSchema = z.object({
  type: z.enum(['nda_mutual', 'nda_one_way', ...]),
  jurisdiction: z.enum(['CA', 'TX', 'NY', 'UK']),
  metadata: z.object({
    disclosingParty: partySchema,
    receivingParty: partySchema,
    // ...
  }),
});

// packages/shared/api-client/contracts.ts
export async function createContract(
  data: CreateContractInput,
  fetch: typeof globalThis.fetch = globalThis.fetch
): Promise<Contract> {
  const response = await fetch('/api/contracts/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

---

## 3. Feature Breakdown

### 3.1 Feature Parity Matrix

| Feature | Web Status | Mobile Priority | Complexity |
|---------|-----------|-----------------|------------|
| **Authentication** | | | |
| Email/Password Login | ✅ | P0 | Low |
| Google OAuth | ✅ | P0 | Medium |
| Session Persistence | ✅ | P0 | Low |
| Biometric Login | ❌ | P1 | Medium |
| **Contract Creation** | | | |
| Type Selection (10 types) | ✅ | P0 | Low |
| Jurisdiction Selection | ✅ | P0 | Low |
| Dynamic Form (metadata) | ✅ | P0 | Medium |
| AI Contract Generation | ✅ | P0 | Low (API call) |
| **Contract Editing** | | | |
| View Contract | ✅ | P0 | Medium |
| Edit Clauses | ✅ | P0 | Medium |
| AI Clause Modification | ✅ | P0 | Low (API call) |
| AI Clause Explanation | ✅ | P0 | Low (API call) |
| Toggle Optional Clauses | ✅ | P0 | Low |
| **E-Signatures** | | | |
| Add Signers | ✅ | P0 | Low |
| Send Signature Requests | ✅ | P0 | Low |
| View Signing Status | ✅ | P0 | Low |
| **Signing Experience** | | | |
| View Contract for Signing | ✅ | P0 | Medium |
| Draw Signature | ✅ | P0 | Medium |
| Type Signature | ✅ | P0 | Low |
| Select Signature Style | ✅ | P0 | Medium |
| Upload Signature Image | ✅ | P1 | Medium |
| Fill Initials/Date/Text | ✅ | P0 | Medium |
| Submit Signature | ✅ | P0 | Low |
| **Document Management** | | | |
| List All Contracts | ✅ | P0 | Low |
| Filter/Search Contracts | ✅ | P0 | Low |
| View PDF | ✅ | P0 | Medium |
| Download PDF | ✅ | P0 | Medium |
| Share PDF | ❌ | P0 | Low |
| **Settings** | | | |
| Profile Management | ✅ | P1 | Low |
| Notification Preferences | ❌ | P1 | Low |
| **Mobile-Only Features** | | | |
| Push Notifications | ❌ | P1 | Medium |
| Offline Mode | ❌ | P2 | High |
| Document Scanner | ❌ | P2 | Medium |
| Face ID / Touch ID | ❌ | P1 | Low |

### 3.2 User Flows

#### Flow 1: Contract Creation
```
Launch App
    ↓
Login (if needed)
    ↓
Dashboard
    ↓
Tap "New Contract"
    ↓
Select Contract Type (10 options)
    ↓
Select Jurisdiction (CA/TX/NY/UK)
    ↓
Fill Contract Details Form
    ↓
[Loading: AI Generating...]
    ↓
Review Generated Contract
    ↓
Edit Clauses (optional)
    ↓
Save as Draft / Send for Signature
```

#### Flow 2: Signing Contract (Signer)
```
Receive Push Notification / Open Link
    ↓
Open Signing Screen (no login required)
    ↓
View Contract (scroll through)
    ↓
Tap "Sign Document"
    ↓
Choose Signature Method:
    ├── Select Style → Pick from 5 fonts
    ├── Draw → Canvas signature pad
    ├── Type → Enter name
    └── Upload → Pick from camera roll
    ↓
Preview Signature
    ↓
Adopt Signature (fills all fields)
    ↓
Agree to Legal Terms
    ↓
Submit Signature
    ↓
Confirmation Screen
```

#### Flow 3: Managing Contracts
```
Dashboard
    ↓
Tap "My Contracts"
    ↓
View List (filter by status)
    ↓
Tap Contract
    ↓
View Details:
    ├── See Status (Draft/Pending/Signed)
    ├── View Signers & Progress
    ├── View/Download PDF
    ├── Edit (if draft)
    └── Send Reminders (if pending)
```

---

## 4. Technical Implementation

### 4.1 Authentication

```typescript
// apps/mobile/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Google OAuth with Expo AuthSession
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'lexport' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (data?.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      const params = new URL(result.url).searchParams;
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }
  }
}
```

### 4.2 Signature Canvas Implementation

```typescript
// apps/mobile/components/SignatureCanvas.tsx
import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

interface SignatureCanvasProps {
  onSave: (signature: string) => void;
  onClear: () => void;
}

export function SignatureCanvas({ onSave, onClear }: SignatureCanvasProps) {
  const signatureRef = useRef<SignatureViewRef>(null);

  const handleSignature = (signature: string) => {
    // signature is a base64 data URI
    onSave(signature);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    onClear();
  };

  return (
    <View style={styles.container}>
      <SignatureScreen
        ref={signatureRef}
        onOK={handleSignature}
        onClear={handleClear}
        autoClear={false}
        descriptionText="Sign above"
        clearText="Clear"
        confirmText="Save"
        webStyle={`
          .m-signature-pad--footer { display: none; }
          .m-signature-pad { box-shadow: none; border: none; }
          body { background-color: #fff; }
        `}
        penColor="#1e293b"
        backgroundColor="#ffffff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
```

### 4.3 PDF Viewer with Signature Fields

```typescript
// apps/mobile/components/ContractPDFViewer.tsx
import React, { useState } from 'react';
import { View, Dimensions } from 'react-native';
import Pdf from 'react-native-pdf';
import { SignatureField } from './SignatureField';

interface ContractPDFViewerProps {
  pdfUrl: string;
  signatureFields: SignatureFieldData[];
  onFieldComplete: (fieldId: string, value: string) => void;
}

export function ContractPDFViewer({
  pdfUrl,
  signatureFields,
  onFieldComplete,
}: ContractPDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);

  return (
    <View style={{ flex: 1 }}>
      <Pdf
        source={{ uri: pdfUrl }}
        style={{ flex: 1 }}
        onPageChanged={(page) => setCurrentPage(page)}
        onScaleChanged={(newScale) => setScale(newScale)}
        enablePaging={true}
        horizontal={false}
      />

      {/* Overlay signature fields on current page */}
      {signatureFields
        .filter((field) => field.page === currentPage)
        .map((field) => (
          <SignatureField
            key={field.id}
            field={field}
            scale={scale}
            onComplete={(value) => onFieldComplete(field.id, value)}
          />
        ))}
    </View>
  );
}
```

### 4.4 NativeWind Styling (Tailwind Parity)

```typescript
// apps/mobile/components/ui/Button.tsx
import { Text, Pressable } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@lexport/shared/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-lg active:opacity-80',
  {
    variants: {
      variant: {
        default: 'bg-violet-600',
        secondary: 'bg-slate-100',
        outline: 'border border-slate-300 bg-transparent',
        ghost: 'bg-transparent',
        destructive: 'bg-red-600',
      },
      size: {
        default: 'h-12 px-6',
        sm: 'h-10 px-4',
        lg: 'h-14 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const textVariants = cva('font-semibold', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-slate-900',
      outline: 'text-slate-900',
      ghost: 'text-slate-900',
      destructive: 'text-white',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  variant,
  size,
  onPress,
  disabled,
  className,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        buttonVariants({ variant, size }),
        disabled && 'opacity-50',
        className
      )}
    >
      <Text className={cn(textVariants({ variant, size }))}>
        {children}
      </Text>
    </Pressable>
  );
}
```

### 4.5 Navigation Structure (Expo Router)

```
apps/mobile/app/
├── _layout.tsx                 # Root layout with providers
├── index.tsx                   # Redirect to dashboard or login
├── (auth)/
│   ├── _layout.tsx            # Auth layout (no header)
│   ├── login.tsx              # Login screen
│   └── register.tsx           # Register screen
├── (dashboard)/
│   ├── _layout.tsx            # Tab navigator layout
│   ├── index.tsx              # Dashboard home
│   ├── contracts/
│   │   ├── index.tsx          # Contract list
│   │   ├── new/
│   │   │   ├── index.tsx      # Select type
│   │   │   ├── [type].tsx     # Select jurisdiction
│   │   │   └── [type]/[jurisdiction].tsx  # Details form
│   │   └── [id]/
│   │       ├── index.tsx      # View contract
│   │       ├── edit.tsx       # Edit clauses
│   │       └── sign.tsx       # Configure signers
│   ├── signatures/
│   │   └── index.tsx          # Signature requests list
│   └── settings/
│       └── index.tsx          # User settings
└── sign/
    └── [token].tsx            # Public signing screen (no auth)
```

---

## 5. Screen-by-Screen Specification

### 5.1 Authentication Screens

#### Login Screen
- **Components**: Email input, password input, "Sign In" button, "Sign in with Google" button, "Create Account" link
- **Validation**: Email format, password minimum length
- **States**: Loading, error (invalid credentials), success
- **Actions**:
  - Email/Password → `supabase.auth.signInWithPassword()`
  - Google → OAuth flow with WebBrowser
- **Navigation**: On success → Dashboard

#### Register Screen
- **Components**: Name input, email input, password input, confirm password, role dropdown, jurisdiction dropdown, "Create Account" button
- **Validation**: Matching passwords, valid email, required fields
- **Actions**: `supabase.auth.signUp()` with user metadata
- **Navigation**: On success → Dashboard

### 5.2 Dashboard Screen

```
┌─────────────────────────────────────┐
│ ← Lexport                    [👤]   │
├─────────────────────────────────────┤
│                                     │
│  Welcome back, {name}!              │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📄 Draft    │ ⏳ Pending │ ✅ Signed ││
│  │     3       │      2     │     5     ││
│  └─────────────────────────────────┘│
│                                     │
│  Quick Actions                      │
│  ┌─────────┐ ┌─────────┐           │
│  │ + NDA   │ │ + Service│           │
│  │         │ │Agreement │           │
│  └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐           │
│  │ +Consult│ │ + SAFE  │           │
│  │ Agreemnt│ │ Note    │           │
│  └─────────┘ └─────────┘           │
│                                     │
│  Recent Contracts                   │
│  ┌─────────────────────────────────┐│
│  │ NDA - Acme Corp          Draft ││
│  │ Created Dec 20, 2024           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Consulting - Startup     Pending││
│  │ 1 of 2 signed                  ││
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│  🏠 Home  │ 📄 Contracts │ ⚙️ Settings │
└─────────────────────────────────────┘
```

### 5.3 Contract Creation Wizard

#### Step 1: Select Type
```
┌─────────────────────────────────────┐
│ ← New Contract                      │
├─────────────────────────────────────┤
│                                     │
│  What type of contract?             │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🔒 NDA (Mutual)                 ││
│  │ Both parties agree to keep...   ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 🔒 NDA (One-Way)                ││
│  │ One party discloses info...     ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 👷 Contractor Agreement         ││
│  │ Hire independent contractors... ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 💼 Consulting Agreement         ││
│  │ Engage consultants for...       ││
│  └─────────────────────────────────┘│
│  ... (scroll for more)              │
│                                     │
└─────────────────────────────────────┘
```

#### Step 2: Select Jurisdiction
```
┌─────────────────────────────────────┐
│ ← NDA (Mutual)                      │
├─────────────────────────────────────┤
│                                     │
│  Select governing law               │
│                                     │
│  🇺🇸 United States                  │
│  ┌─────────────────────────────────┐│
│  │ 🌴 California                   ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ ⭐ Texas                        ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 🗽 New York                     ││
│  └─────────────────────────────────┘│
│                                     │
│  🇬🇧 International                  │
│  ┌─────────────────────────────────┐│
│  │ 🇬🇧 United Kingdom               ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

#### Step 3: Contract Details Form
```
┌─────────────────────────────────────┐
│ ← NDA • California           [Next] │
├─────────────────────────────────────┤
│                                     │
│  First Party                        │
│  ┌─────────────────────────────────┐│
│  │ Name                            ││
│  │ Acme Corporation                ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Address                         ││
│  │ 123 Main St, San Francisco...   ││
│  └─────────────────────────────────┘│
│                                     │
│  Second Party                       │
│  ┌─────────────────────────────────┐│
│  │ Name                            ││
│  │ Startup Inc                     ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Address                         ││
│  │ 456 Oak Ave, Los Angeles...     ││
│  └─────────────────────────────────┘│
│                                     │
│  Terms                              │
│  ┌─────────────────────────────────┐│
│  │ Effective Date                  ││
│  │ Dec 27, 2024               [📅] ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Duration                        ││
│  │ 2 Years                     [▼] ││
│  └─────────────────────────────────┘│
│                                     │
│  [ Generate Contract with AI ]      │
│                                     │
└─────────────────────────────────────┘
```

### 5.4 Contract Editor

```
┌─────────────────────────────────────┐
│ ← Edit Contract          [Preview]  │
├─────────────────────────────────────┤
│                                     │
│  Mutual Non-Disclosure Agreement    │
│  California • Draft                 │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Clauses                            │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 1. Definition of Confidential   ││
│  │    Information           [🤖][✎]││
│  │ ────────────────────────────────││
│  │ "Confidential Information"      ││
│  │ means any information...        ││
│  │                        [Explain]││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 2. Obligations of Receiving  ☑️ ││
│  │    Party                        ││
│  │ ────────────────────────────────││
│  │ The Receiving Party agrees...   ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 3. Non-Compete (Optional)   ☐   ││
│  │    [Tap to enable]              ││
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│  [Save Draft]  [Send for Signature] │
└─────────────────────────────────────┘
```

### 5.5 Signing Screen (Public)

```
┌─────────────────────────────────────┐
│              Lexport                │
├─────────────────────────────────────┤
│                                     │
│  Please review and sign             │
│  Mutual NDA - Acme & Startup        │
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │      [PDF Contract View]        ││
│  │      Scroll to read all         ││
│  │                                 ││
│  │   Page 1 of 3                   ││
│  └─────────────────────────────────┘│
│                                     │
│  ✓ I have read the entire document │
│                                     │
│  ┌─────────────────────────────────┐│
│  │      [ Sign Document ]          ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘

        ↓ Tap "Sign Document" ↓

┌─────────────────────────────────────┐
│ Adopt Your Signature           [✕]  │
├─────────────────────────────────────┤
│                                     │
│  Choose how to sign:                │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ✨ Select Style                 ││
│  │ Choose from signature fonts     ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ ✍️ Draw                          ││
│  │ Draw with your finger           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ ⌨️ Type                          ││
│  │ Type your name                  ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 📷 Upload                        ││
│  │ Use an image                    ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘

        ↓ Select "Draw" ↓

┌─────────────────────────────────────┐
│ Draw Your Signature            [✕]  │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │   [Signature Canvas Area]       ││
│  │                                 ││
│  │   ~~~~~~ John Doe ~~~~~~~       ││
│  │          (drawn)                ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  [Clear]              [Use This]   │
│                                     │
└─────────────────────────────────────┘

        ↓ Tap "Use This" ↓

┌─────────────────────────────────────┐
│ Confirm & Sign                 [✕]  │
├─────────────────────────────────────┤
│                                     │
│  Your signature will be applied     │
│  to all required fields:            │
│                                     │
│  Preview:                           │
│  ┌─────────────────────────────────┐│
│  │   ~~~~~~ John Doe ~~~~~~~       ││
│  └─────────────────────────────────┘│
│                                     │
│  Fields to be filled:               │
│  • Signature (page 3)               │
│  • Initials (pages 1, 2)            │
│  • Date: Dec 27, 2024               │
│                                     │
│  ☑️ I agree that this electronic    │
│     signature is legally binding    │
│                                     │
│  ┌─────────────────────────────────┐│
│  │      [ Adopt & Sign ]           ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## 6. API Integration

### 6.1 API Client Setup

```typescript
// packages/shared/api-client/index.ts
import { supabase } from '../supabase';

interface ApiClientConfig {
  baseUrl: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
    };
  }

  async get<T>(path: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!response.ok) throw new ApiError(response);
    return response.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new ApiError(response);
    return response.json();
  }

  // ... patch, delete methods
}

export const api = new ApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://lexport.ai',
});
```

### 6.2 TanStack Query Hooks

```typescript
// apps/mobile/hooks/useContracts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@lexport/shared/api-client';
import type { Contract, CreateContractInput } from '@lexport/shared/types';

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.get<Contract[]>('/api/contracts'),
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => api.get<Contract>(`/api/contracts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContractInput) =>
      api.post<Contract>('/api/contracts/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useSignContract(token: string) {
  return useMutation({
    mutationFn: (data: SignatureSubmission) =>
      api.post(`/api/sign/${token}`, data),
  });
}
```

---

## 7. Native Capabilities

### 7.1 Push Notifications

```typescript
// apps/mobile/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  // Store token in user's profile
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('users')
      .update({ push_token: token.data })
      .eq('id', user.id);
  }

  return token;
}

// Notification handlers
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

**Notification Types:**
- Signature request received
- Document signed by a party
- All parties have signed (complete)
- Signature request expiring soon
- Signature request declined

### 7.2 Biometric Authentication

```typescript
// apps/mobile/lib/biometrics.ts
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export async function isBiometricsAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access Lexport',
    cancelLabel: 'Use Password',
    disableDeviceFallback: false,
  });

  return result.success;
}

export async function enableBiometricLogin(userId: string): Promise<void> {
  await SecureStore.setItemAsync('biometric_user_id', userId);
}

export async function getBiometricUserId(): Promise<string | null> {
  return SecureStore.getItemAsync('biometric_user_id');
}
```

### 7.3 Document Sharing

```typescript
// apps/mobile/lib/sharing.ts
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export async function sharePDF(contractId: string, title: string): Promise<void> {
  // Download PDF to local cache
  const pdfUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/contracts/${contractId}/pdf`;
  const localUri = `${FileSystem.cacheDirectory}${title.replace(/\s/g, '_')}.pdf`;

  const { uri } = await FileSystem.downloadAsync(pdfUrl, localUri, {
    headers: await getAuthHeaders(),
  });

  // Check if sharing is available
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  // Share the file
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share ${title}`,
  });
}
```

### 7.4 Deep Linking

```typescript
// apps/mobile/app.json
{
  "expo": {
    "scheme": "lexport",
    "ios": {
      "associatedDomains": ["applinks:lexport.ai"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "lexport.ai",
              "pathPrefix": "/sign"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}

// Handle incoming links
// apps/mobile/app/_layout.tsx
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

export default function RootLayout() {
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url);

      // Handle /sign/[token] links
      if (path?.startsWith('sign/')) {
        const token = path.replace('sign/', '');
        router.push(`/sign/${token}`);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle app opened via link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  // ... rest of layout
}
```

---

## 8. Development Phases

### Phase 1: Foundation (Weeks 1-3)

**Week 1: Project Setup**
- [ ] Initialize Expo project with TypeScript
- [ ] Set up monorepo with Turborepo
- [ ] Configure NativeWind v4
- [ ] Set up ESLint, Prettier
- [ ] Create shared packages structure
- [ ] Move existing types/schemas to shared package

**Week 2: Core Infrastructure**
- [ ] Implement Supabase client for React Native
- [ ] Set up React Navigation / Expo Router
- [ ] Create auth flow (login, register, session)
- [ ] Implement Google OAuth with WebBrowser
- [ ] Set up TanStack Query
- [ ] Create API client wrapper

**Week 3: UI Foundation**
- [ ] Build base UI components (Button, Input, Card, etc.)
- [ ] Create layout components
- [ ] Implement bottom tab navigation
- [ ] Build dashboard screen shell
- [ ] Style all components with NativeWind

### Phase 2: Contract Creation (Weeks 4-6)

**Week 4: Contract Wizard - Selection**
- [ ] Contract type selection screen
- [ ] Jurisdiction selection screen
- [ ] Navigation between wizard steps
- [ ] Progress indicator component

**Week 5: Contract Wizard - Forms**
- [ ] Dynamic form renderer for contract metadata
- [ ] Date picker integration
- [ ] Form validation with React Hook Form + Zod
- [ ] Party information inputs
- [ ] Terms & conditions inputs

**Week 6: AI Integration**
- [ ] Contract generation API integration
- [ ] Loading states with animation
- [ ] Error handling and retry logic
- [ ] Generated contract preview
- [ ] Save to draft functionality

### Phase 3: Contract Management (Weeks 7-9)

**Week 7: Contract List & Details**
- [ ] Contracts list screen with filters
- [ ] Pull-to-refresh
- [ ] Contract detail view
- [ ] Status badges and indicators
- [ ] Empty states

**Week 8: Contract Editor**
- [ ] Clause list view
- [ ] Clause editing modal
- [ ] AI clause modification integration
- [ ] AI clause explanation integration
- [ ] Toggle optional clauses
- [ ] Save changes functionality

**Week 9: PDF Integration**
- [ ] react-native-pdf integration
- [ ] PDF generation from API
- [ ] PDF download to device
- [ ] Share PDF functionality
- [ ] PDF caching for offline

### Phase 4: E-Signatures (Weeks 10-13)

**Week 10: Signature Setup**
- [ ] Add signers screen
- [ ] Signer form (name, email, role)
- [ ] Expiration date picker
- [ ] Personal message input
- [ ] Send for signature API integration
- [ ] Share signing links

**Week 11: Signing Experience - Foundation**
- [ ] Public signing screen (no auth)
- [ ] Contract display for signers
- [ ] Read tracking / scroll detection
- [ ] Signature method selection modal

**Week 12: Signature Methods**
- [ ] Styled signature selector (5 fonts)
- [ ] Draw signature canvas (react-native-signature-canvas)
- [ ] Type signature input
- [ ] Upload signature from gallery
- [ ] Signature preview component

**Week 13: Signature Completion**
- [ ] Adopt signature flow
- [ ] Auto-fill all signer fields
- [ ] Legal agreement checkbox
- [ ] Submit signature API
- [ ] Confirmation screen
- [ ] Deep link handling for sign URLs

### Phase 5: Enhanced Features (Weeks 14-16)

**Week 14: Notifications**
- [ ] Push notification registration
- [ ] Notification handlers
- [ ] In-app notification center
- [ ] Notification preferences
- [ ] Backend: Expo push integration

**Week 15: Mobile-Only Features**
- [ ] Biometric authentication
- [ ] Offline contract viewing (cached)
- [ ] App lock with PIN/biometrics
- [ ] Quick actions (3D Touch / shortcuts)

**Week 16: Polish & Optimization**
- [ ] Performance optimization
- [ ] Animation refinements
- [ ] Accessibility audit (VoiceOver/TalkBack)
- [ ] Dark mode support
- [ ] Haptic feedback

### Phase 6: Testing & Launch (Weeks 17-20)

**Week 17: Testing**
- [ ] Unit tests for shared logic
- [ ] Component tests with React Native Testing Library
- [ ] E2E tests with Detox
- [ ] Manual QA on iOS & Android devices
- [ ] Fix bugs from testing

**Week 18: Beta Testing**
- [ ] TestFlight setup for iOS
- [ ] Internal testing track for Android
- [ ] Beta user recruitment
- [ ] Feedback collection system
- [ ] Analytics integration

**Week 19: Launch Prep**
- [ ] App Store assets (screenshots, descriptions)
- [ ] Play Store assets
- [ ] Privacy policy updates
- [ ] App review preparation
- [ ] Marketing materials

**Week 20: Launch**
- [ ] Submit to App Store
- [ ] Submit to Play Store
- [ ] Monitor crash reports
- [ ] Respond to reviews
- [ ] Hotfix releases if needed

---

## 9. Testing Strategy

### 9.1 Unit Testing

```typescript
// packages/shared/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import { createContractSchema } from '../schemas/contract';

describe('createContractSchema', () => {
  it('validates valid contract input', () => {
    const input = {
      type: 'nda_mutual',
      jurisdiction: 'CA',
      metadata: {
        disclosingParty: { name: 'Acme Corp', address: '123 Main St' },
        receivingParty: { name: 'Startup Inc', address: '456 Oak Ave' },
        effectiveDate: '2024-12-27',
        duration: '2 years',
      },
    };

    expect(() => createContractSchema.parse(input)).not.toThrow();
  });

  it('rejects invalid jurisdiction', () => {
    const input = {
      type: 'nda_mutual',
      jurisdiction: 'INVALID',
      metadata: {},
    };

    expect(() => createContractSchema.parse(input)).toThrow();
  });
});
```

### 9.2 Component Testing

```typescript
// apps/mobile/__tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../components/ui/Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button onPress={onPress}>Click me</Button>
    );

    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button onPress={onPress} disabled>Click me</Button>
    );

    fireEvent.press(getByText('Click me'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

### 9.3 E2E Testing (Detox)

```typescript
// apps/mobile/e2e/contractCreation.test.ts
describe('Contract Creation Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginAsTestUser();
  });

  it('creates a new NDA contract', async () => {
    // Navigate to new contract
    await element(by.id('new-contract-button')).tap();

    // Select contract type
    await element(by.id('contract-type-nda_mutual')).tap();

    // Select jurisdiction
    await element(by.id('jurisdiction-CA')).tap();

    // Fill form
    await element(by.id('disclosing-party-name')).typeText('Acme Corp');
    await element(by.id('receiving-party-name')).typeText('Startup Inc');

    // Generate contract
    await element(by.id('generate-contract-button')).tap();

    // Wait for generation
    await waitFor(element(by.id('contract-preview')))
      .toBeVisible()
      .withTimeout(30000);

    // Verify contract was created
    await expect(element(by.text('Mutual Non-Disclosure Agreement'))).toBeVisible();
  });
});
```

### 9.4 Device Matrix

| Device | OS Version | Priority |
|--------|-----------|----------|
| iPhone 15 Pro | iOS 17+ | High |
| iPhone 12 | iOS 16+ | High |
| iPhone SE | iOS 15+ | Medium |
| iPad Pro | iPadOS 17+ | Medium |
| Samsung Galaxy S23 | Android 14 | High |
| Google Pixel 8 | Android 14 | High |
| Samsung Galaxy A54 | Android 13 | Medium |
| OnePlus 11 | Android 13 | Low |

---

## 10. Deployment & Distribution

### 10.1 Environment Configuration

```typescript
// apps/mobile/app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.APP_ENV === 'production' ? 'Lexport' : 'Lexport Dev',
  slug: 'lexport',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'lexport',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#7c3aed',
  },
  updates: {
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/your-project-id',
  },
  runtimeVersion: {
    policy: 'sdkVersion',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier:
      process.env.APP_ENV === 'production'
        ? 'com.lexport.app'
        : 'com.lexport.app.dev',
    associatedDomains: ['applinks:lexport.ai'],
    infoPlist: {
      NSFaceIDUsageDescription: 'Use Face ID to quickly access your contracts',
      NSCameraUsageDescription: 'Take photos of signatures to upload',
      NSPhotoLibraryUsageDescription: 'Select signature images from your library',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#7c3aed',
    },
    package:
      process.env.APP_ENV === 'production'
        ? 'com.lexport.app'
        : 'com.lexport.app.dev',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'lexport.ai', pathPrefix: '/sign' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  extra: {
    eas: {
      projectId: 'your-eas-project-id',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#7c3aed',
      },
    ],
  ],
});
```

### 10.2 EAS Build Configuration

```json
// apps/mobile/eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_ENV": "development",
        "EXPO_PUBLIC_API_URL": "https://dev.lexport.ai"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "APP_ENV": "staging",
        "EXPO_PUBLIC_API_URL": "https://staging.lexport.ai"
      }
    },
    "production": {
      "env": {
        "APP_ENV": "production",
        "EXPO_PUBLIC_API_URL": "https://lexport.ai"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### 10.3 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/mobile-ci.yml
name: Mobile CI/CD

on:
  push:
    branches: [main]
    paths: ['apps/mobile/**', 'packages/**']
  pull_request:
    branches: [main]
    paths: ['apps/mobile/**', 'packages/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test --filter=mobile
      - run: bun run typecheck --filter=mobile

  build-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd apps/mobile && eas build --platform all --profile preview --non-interactive

  build-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd apps/mobile && eas build --platform all --profile production --non-interactive
      - run: cd apps/mobile && eas submit --platform all --profile production --non-interactive
```

### 10.4 OTA Updates

```typescript
// apps/mobile/lib/updates.ts
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export async function checkForUpdates(): Promise<void> {
  if (__DEV__) return;

  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();

      Alert.alert(
        'Update Available',
        'A new version has been downloaded. Restart to apply the update?',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Restart',
            onPress: () => Updates.reloadAsync()
          },
        ]
      );
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}
```

---

## 11. Team & Resources

### 11.1 Recommended Team Structure

| Role | Count | Responsibilities |
|------|-------|-----------------|
| **Tech Lead / Senior RN Dev** | 1 | Architecture, code reviews, complex features |
| **React Native Developer** | 2 | Feature development, UI implementation |
| **Backend Developer** | 0.5 | Push notifications, any API additions |
| **QA Engineer** | 1 | Testing, automation, device testing |
| **UI/UX Designer** | 0.5 | Mobile-specific designs, assets |
| **DevOps** | 0.25 | CI/CD, deployment |

**Total FTEs: 5.25**

### 11.2 Skills Required

**Must Have:**
- React Native 0.72+ experience
- TypeScript proficiency
- State management (Zustand, React Query)
- React Navigation / Expo Router
- REST API integration
- iOS & Android deployment

**Nice to Have:**
- Expo ecosystem experience
- NativeWind / Tailwind CSS
- Canvas / drawing libraries
- PDF libraries
- Biometric authentication
- Push notifications

### 11.3 External Resources

| Resource | Cost | Purpose |
|----------|------|---------|
| **Apple Developer Program** | $99/year | iOS App Store |
| **Google Play Developer** | $25 one-time | Play Store |
| **Expo EAS** | ~$99/month | Build & submit |
| **Sentry** | Free-$26/month | Error tracking |
| **Analytics** | Free | PostHog / Amplitude |

---

## 12. Risk Assessment

### 12.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **PDF rendering issues** | Medium | High | Test react-native-pdf early; have WebView fallback |
| **Signature canvas performance** | Low | Medium | Use optimized canvas library; test on low-end devices |
| **OAuth flow complexity** | Medium | Medium | Use expo-auth-session; test all edge cases |
| **Deep link handling** | Medium | Low | Universal Links setup requires domain verification |
| **Expo SDK breaking changes** | Low | High | Pin SDK version; test upgrades in preview |
| **Large PDF files** | Medium | Medium | Implement pagination; lazy loading |

### 12.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **App Store rejection** | Medium | High | Follow guidelines strictly; prepare appeals |
| **Low adoption** | Medium | Medium | Marketing plan; existing user outreach |
| **Feature scope creep** | High | Medium | Strict MVP definition; phase 2 planning |
| **Resource constraints** | Medium | High | Prioritize P0 features; modular architecture |

### 12.3 Security Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Token theft** | Low | Critical | Use SecureStore; biometric protection |
| **Signature forgery** | Low | Critical | SHA-256 hashing; server-side verification |
| **Data leakage** | Low | High | No sensitive data in logs; proper encryption |
| **MITM attacks** | Low | High | Certificate pinning; HTTPS only |

---

## 13. Post-Launch Roadmap

### Phase 7: Post-Launch Improvements (Months 6-9)

**v1.1 - Enhancements**
- Offline mode with sync
- Document scanner integration
- Template library
- Multi-language support

**v1.2 - Advanced Features**
- Team workspaces
- Role-based permissions
- Audit log viewer
- Advanced search

**v1.3 - Enterprise Features**
- SSO / SAML integration
- Custom branding
- API access for integrations
- Compliance certifications

### Future Considerations

- **Apple Watch**: Quick signature approvals
- **Widgets**: Contract status on home screen
- **Shortcuts/Siri**: Voice commands for common actions
- **iPad Pro**: Optimized layout, Apple Pencil signatures
- **Android Tablets**: Responsive layout

---

## Appendix A: Dependencies

```json
// apps/mobile/package.json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-auth-session": "~6.0.0",
    "expo-crypto": "~14.0.0",
    "expo-document-picker": "~13.0.0",
    "expo-file-system": "~18.0.0",
    "expo-image-picker": "~16.0.0",
    "expo-linking": "~7.0.0",
    "expo-local-authentication": "~15.0.0",
    "expo-notifications": "~0.29.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-sharing": "~13.0.0",
    "expo-status-bar": "~2.0.0",
    "expo-updates": "~0.27.0",
    "expo-web-browser": "~14.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "react-native-pdf": "^6.7.5",
    "react-native-reanimated": "~3.16.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.0.0",
    "react-native-signature-canvas": "^4.7.2",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@tanstack/react-query": "^5.60.0",
    "zustand": "^5.0.0",
    "nativewind": "^4.1.0",
    "react-hook-form": "^7.54.0",
    "zod": "^3.24.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "date-fns": "^4.0.0",
    "moti": "^0.29.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~18.3.0",
    "typescript": "~5.6.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^9.0.0",
    "@testing-library/react-native": "^12.0.0",
    "detox": "^20.0.0"
  }
}
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **EAS** | Expo Application Services - cloud build and submit |
| **OTA** | Over-the-air updates via Expo Updates |
| **Deep Linking** | Opening app via URL (lexport://... or https://lexport.ai/...) |
| **Universal Links** | iOS deep links that work without app prompt |
| **NativeWind** | Tailwind CSS for React Native |
| **Expo Router** | File-based routing for React Native (like Next.js) |
| **SecureStore** | Encrypted key-value storage for sensitive data |

---

*Document Version: 1.0*
*Last Updated: December 27, 2024*
*Author: Claude AI*
