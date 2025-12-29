# Lexport Universal

A universal React Native app that runs on **Web**, **iOS**, and **Android** from a single codebase.

## Tech Stack

- **Framework**: Expo SDK 52 + Expo Router
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Auth**: Supabase + SecureStore
- **State**: TanStack Query
- **Language**: TypeScript

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/pobor/Downloads/lexport-universal
bun install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials from your existing project:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create Placeholder Assets

Create simple placeholder images in the `assets/` folder:

```bash
# On macOS, create simple placeholder PNGs
# Or download placeholder images
```

For now, you can create empty placeholder files or download icons from https://docs.expo.dev/develop/user-interface/assets/

### 4. Run the App

**Web:**
```bash
bun run dev:web
```
Opens at http://localhost:8081

**iOS Simulator:**
```bash
bun run dev:ios
```

**Android Emulator:**
```bash
bun run dev:android
```

**All platforms (pick in terminal):**
```bash
bun run dev
```

## Project Structure

```
lexport-universal/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout with providers
│   ├── index.tsx          # Entry (redirects based on auth)
│   ├── (auth)/            # Auth screens (login, register)
│   └── (dashboard)/       # Protected screens with tabs
├── src/
│   ├── components/ui/     # Reusable UI components
│   ├── hooks/             # Custom hooks (useAuth, etc.)
│   ├── lib/               # Utilities (supabase, cn)
│   └── styles/            # Global CSS for NativeWind
├── assets/                # Images, icons, fonts
└── package.json
```

## What's Included in This POC

- [x] Auth flow (login, register, Google OAuth)
- [x] Dashboard with tabs navigation
- [x] Contracts list view
- [x] Signatures tracking view
- [x] Settings screen
- [x] Reusable UI components (Button, Input, Card)
- [x] NativeWind styling (Tailwind syntax)
- [x] Supabase integration with secure storage

## What's NOT Included (Next Steps)

- [ ] Contract creation wizard
- [ ] AI contract generation
- [ ] Contract editor
- [ ] Signature canvas
- [ ] PDF viewer
- [ ] Push notifications
- [ ] Actual API integration (using mock data)

## Testing the POC

1. **Web Feel**: Does the web version feel acceptable for a SaaS dashboard?
2. **Mobile Feel**: Does the iOS/Android version feel native?
3. **Code Sharing**: Review how components work across platforms
4. **Performance**: Is there noticeable lag or jank?

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Expo dev server |
| `bun run dev:web` | Start web only |
| `bun run dev:ios` | Start iOS simulator |
| `bun run dev:android` | Start Android emulator |
| `bun run build:web` | Export static web build |
| `bun run typecheck` | Run TypeScript check |

## Notes

- Uses Expo's managed workflow (no native code to manage)
- NativeWind v4 compiles Tailwind to native styles
- Auth tokens stored in SecureStore (native) or localStorage (web)
- Same screens render on all platforms with platform-specific adjustments
