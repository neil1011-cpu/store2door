# FromStore2Door - Global Logistics OS Operations Manual

## 1. Introduction

**FromStore2Door** is a high-performance courier management platform designed for worldwide shipping operations between Florida, USA, and Jamaica. This manual serves as the definitive guide for operating the system, covering both the customer-facing experience and the secure administrative command center.

**Authorized Developer:** Neilus Solutions (https://neilussolutions.com)

---

## 2. Customer Portal Guide

### 2.1 US Shipping Address
Upon registration, every user is assigned a unique **FSTD Mailbox Number**. 
*   **Intake Hub Address:** 3507 NW 19th ST, Lauderdale Lake, FL 33311-4224.
*   **Critical Rule:** Users must include their Mailbox Number in "Address Line 2" to ensure immediate registry identification at the Florida warehouse.

### 2.2 Account Standing Logic
The system enforces a strict "Authorized Standing" policy:
*   **Balance Display:** The balance shown in the header and dashboard reflects only unpaid items with the status **"Ready for pick up"**.
*   **TBD Prevention:** If a specific billing cost has not been set by an admin, the system automatically provides a fallback estimate based on the verified package weight (LBS).

### 2.3 Pre-Alert Submission
Customers must notify the warehouse of incoming items by providing:
1.  **Tracking Number:** The carrier ID (e.g., 1Z..., TBA...).
2.  **Contents:** Description of the goods.
3.  **Commercial Invoice:** Uploaded as binary documentation for customs clearance.

---

## 3. Admin Command Center Guide

### 3.1 POS Station (Branch Checkout)
The POS Station is a mobile-friendly, high-contrast terminal optimized for branch staff.

*   **Step 01: Identify Account:** Search for a client by name, email, or mailbox number. The "Current Ready Total" instantly shows the amount due for pickup.
*   **Step 02: Select Parcels:** Choose specific parcels the customer is collecting. You can apply manual **Customs Duties** using the built-in JCA Calculator (for items >$100 USD).
*   **Step 03: Settlement:** Process payment via Cash, Card, or Transfer. 
    *   **Cash Flow:** Enter tendered amount to calculate change.
    *   **Registry Update:** Upon "Clear & Settle", packages move to "Delivered", payment is marked "Paid", and the financial ledger is updated.
*   **Receipts:** Generates a thermal-optimized PDF receipt for every transaction.

### 3.2 Pre-Alert Hub & AI Intake
*   **Hub Sync:** The "Sync Inbound Viewer" pulls viewing records from the Logicware Hub.
*   **AI Smart Analysis:** Use the "Run AI Smart Analysis" button on commercial invoices to automatically extract sender and recipient data using Genkit-powered flows.
*   **Intake Authorization:** Convert a viewing record into an active billable shipment by verifying weight and confirming the calculated cost.

### 3.3 Shipping & Manifests
*   **Active Ledger:** Manage all transits currently between the US and Jamaica.
*   **Bulk Actions:** Select multiple parcels to update status stages or generate a new **Route Manifest** (Flight/Voyage).
*   **Hub Synchronization:** Every status update or manifest creation is pushed to the global Logicware registry via the Connect SDK v0.2.0.

### 3.4 Finance & Ledger
*   **Immutable Ledger:** Every revenue (payment) and expense (shipping fee/adjustment) is recorded in a centralized PostgreSQL ledger.
*   **Sync Triggers:** The database automatically recalculates the user's `wallet_balance` whenever a ledger entry is inserted or modified.

---

## 4. Technical Specifications

### 4.1 Tech Stack
*   **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS.
*   **UI Components:** ShadCN (Radix UI).
*   **Database:** Supabase PostgreSQL with binary `bytea` documentation storage.
*   **AI Intelligence:** Genkit flows with Gemini 2.5 Flash.
*   **Integration:** Logicware Connect SDK (v0.2.0).

### 4.2 Security Architecture
*   **RBAC:** Role-Based Access Control via `app_roles` and the `is_admin()` SQL function.
*   **RLS:** Strict Row Level Security policies ensure users can only access their own shipments and documentation.
*   **Secrets:** Managed via System Configs in the DB; secrets are masked in the browser.

---

## 5. Maintenance & Recovery

### 5.1 System Proof Center
Access `/setup-admin` to:
1.  **Authorize Master Admin:** Confirm the hardcoded `admin@neilussolutions.com` identity.
2.  **Verify Schema:** Scan the `public` schema for all required tables (v5.3).
3.  **Execute SQL:** Deploy or repair the definitive database structure.

### 5.2 Hub Re-Sync
If discrepancies occur between the branch and the Logistics Hub, use the "Bulk Hub Sync" in the Identity Registry to refresh all user profiles.

---
**FromStore2Door OS** - *Professional logistics engineered by Neilus Solutions.*
