# Store2Door Migration Audit: Firebase to Supabase

This document outlines the current state of Firebase dependencies in the FromStore2Door application and provides a strategic blueprint for migrating to Supabase.

## A. Firebase Dependency Map

### 1. Firebase Authentication
- **Entry Points**: `src/app/signup`, `src/app/signin`, `src/app/admin-login`, `src/app/forgot-password`.
- **Hooks**: `useUser()`, `useAuth()` (wrappers for `onAuthStateChanged`).
- **Administrative**: `adminAuth` in `src/lib/firebaseAdmin.ts` used for server-side user creation, deletion, and reset link generation.
- **Dependencies**: `firebase/auth` (Client SDK), `firebase-admin/auth` (Admin SDK).

### 2. Cloud Firestore (Primary Database)
- **Data Model**: Subcollection-heavy structure (`users/{uid}/shipments`, `users/{uid}/pre_alerts`).
- **Real-time Hooks**: `useCollection()`, `useDoc()`.
- **Query Logic**: Heavy use of `collectionGroup` for admin dashboards (aggregating pre-alerts and shipments across all users).
- **Atomic Operations**: `writeBatch`, `increment`, and `serverTimestamp` used for financial ledger integrity.
- **Administrative**: `adminDb` in `src/lib/firebaseAdmin.ts` used for batch processing and protected metadata access.

### 3. Firebase Storage (Legacy/Secondary)
- **Status**: Transitioned to Vultr for primary documentation, but `src/firebase/provider.tsx` and `src/firebase/index.ts` still initialize the SDK.
- **Security Rules**: `storage.rules` still defines access for the `/invoices` directory.

### 4. Application Hosting & Functions
- **Hosting**: Configured in `apphosting.yaml`.
- **API Routes**: Next.js API routes in `src/app/api/*` act as serverless functions, utilizing the `firebase-admin` SDK.

## B. Proposed Supabase Architecture

| Component | Supabase Replacement | Notes |
| :--- | :--- | :--- |
| **Authentication** | Supabase Auth (GoTrue) | Built-in JWT handling with GoTrue. |
| **Database** | PostgreSQL | Relational storage with PostgREST for instant APIs. |
| **Real-time** | Supabase Real-time | Uses PostgreSQL replication for live updates. |
| **Storage** | Supabase Storage (S3) | Can act as a fallback or backup to Vultr. |
| **Admin Control** | `service_role` key | Replaces `firebase-admin` for restricted server-side ops. |

## C. Proposed PostgreSQL Schema

### 1. `profiles` (extends `auth.users`)
- `id`: uuid (primary key, references auth.users)
- `full_name`: text
- `email`: text
- `phone`: text
- `mailbox_number`: text (unique)
- `trn`: text
- `address_json`: jsonb (address1, city, state, etc.)
- `wallet_balance`: numeric (default: 0)
- `is_admin`: boolean (default: false)
- `created_at`: timestamptz

### 2. `pre_alerts`
- `id`: uuid (primary key)
- `customer_id`: uuid (references profiles.id)
- `tracking_number`: text
- `contents`: text
- `weight`: numeric
- `status`: text (Pending, Processed)
- `invoice_url`: text
- `submission_date`: timestamptz

### 3. `shipments`
- `id`: uuid (primary key)
- `customer_id`: uuid (references profiles.id)
- `tracking_number`: text
- `status`: text
- `weight`: numeric
- `cost`: numeric
- `invoice_id`: text
- `shipping_date`: timestamptz

### 4. `transactions` (Universal Ledger)
- `id`: uuid (primary key)
- `customer_id`: uuid (references profiles.id)
- `type`: text (revenue, expense)
- `amount`: numeric
- `description`: text
- `source`: text (POS, Manual, Hub)
- `created_at`: timestamptz

## D. Supabase Auth Architecture
- **Provider**: Email/Password.
- **Trigger**: A PostgreSQL function `on_auth_user_created` will automatically insert a row into the `profiles` table when a user signs up.
- **Custom Claims**: Use the `is_admin` column in the `profiles` table rather than JWT custom claims to keep role-switching simple.

## E. Row Level Security (RLS) Policy Plan

### `profiles` table
- **Read**: `auth.uid() = id OR is_admin()`
- **Write**: `auth.uid() = id OR is_admin()`

### `shipments` / `pre_alerts` / `invoices`
- **Read**: `auth.uid() = customer_id OR is_admin()`
- **Insert**: `auth.uid() = customer_id`
- **Update/Delete**: `is_admin()`

### `metadata` / `system_logs` / `transactions`
- **Read/Write**: `is_admin()`

## F. Migration Plan (Zero-Downtime Strategy)

1.  **Phase 1: Shadow Schema (Development)**
    - Initialize Supabase project.
    - Create the PostgreSQL tables and RLS policies.
    - Develop the Supabase Client Provider in a separate branch.

2.  **Phase 2: The "Bridge" API**
    - Update current API routes to "Dual Write" to both Firestore and Supabase.
    - This keeps data synchronized without switching the frontend yet.

3.  **Phase 3: Auth Import**
    - Use Firebase Admin SDK to export users to JSON.
    - Import users into Supabase Auth using the `admin.auth.importUsers` equivalent.

4.  **Phase 4: Frontend Toggle**
    - Swap the `FirebaseClientProvider` for a `SupabaseClientProvider`.
    - Point `useCollection` and `useDoc` hooks to Supabase query wrappers.

5.  **Phase 5: Decommission**
    - Once stability is verified, disable Firebase writes and archive the Firestore data.

---
**Audit Complete.** No code was modified during this phase.