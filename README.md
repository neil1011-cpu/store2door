# FromStore2Door - Global Logistics OS

A professional, high-performance courier management platform designed for worldwide shipping operations between Florida, USA, and Jamaica.

## Core Modules

- **Customer Hub**: Real-time tracking, pre-alert submissions, and global address management.
- **Admin Command Center**: Complete oversight of users, manifests, and logistics.
- **POS System**: Integrated branch checkout with thermal-optimized receipt printing.
- **Unified Finance**: A centralized ledger for revenue and expenses linked directly to branch checkouts.
- **Logicware Hub Sync**: Seamless integration with global logistics portals via Webhooks and the Connect SDK.

## Technical Specifications

- **Frontend**: Next.js 15 (App Router), React 19, ShadCN UI, Tailwind CSS.
- **Backend**: Firebase Firestore (NoSQL), Firebase Auth, Firebase App Hosting.
- **Intelligence**: Genkit-powered flows for automated document and invoice generation.
- **Email**: Dynamic SMTP delivery system with Gmail/App Password support.

## Security

The application implements strict Firestore Security Rules and administrative route guards to ensure that sensitive logistics data and financial records are only accessible to authorized personnel.