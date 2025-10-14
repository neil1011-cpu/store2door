# FromStore2Door - Software Documentation

## 1. Introduction

This document provides a comprehensive overview of the "FromStore2Door" courier management software. This application is a full-featured platform built with Next.js and React, designed to manage shipping operations between Florida, USA, and Jamaica. It consists of two main parts: a **Customer-Facing Website** for users to manage their shipments and a powerful **Admin Panel** for business owners to oversee all operations.

## 2. Customer-Facing Application

This is the public-facing part of the website where customers sign up, track packages, and manage their accounts.

### 2.1. Main Pages

-   **Home Page (`/`)**: The landing page that provides an overview of the services, explains how it works, and encourages users to sign up.
-   **Tracking Page (`/tracking`)**: Allows anyone (with or without an account) to enter a tracking number and view the status and history of their shipment.
-   **Services Page (`/services`)**: Details all the services offered by the company, such as air freight, sea freight, package consolidation, and customs clearance.
-   **Rates Page (`/rates`)**: Provides a transparent pricing table based on package weight and includes a real-time shipping cost estimator.
-   **Contact Page (`/contact`)**: A form for customers to send messages, along with the company's contact details (phone, email, address).

### 2.2. User Account & Authentication

-   **Sign Up (`/signup`)**: New users can create an account by providing their name, email, password, phone number, and TRN. Upon successful sign-up, a unique US mailing address and mailbox number are generated for them.
-   **Sign In (`/signin`)**: Existing users can log in to access their account dashboard.
-   **Account Page (`/account`)**: This is the central hub for logged-in users. It's organized into several tabs:
    -   **Dashboard**: Shows a welcome message and a summary of the user's most recent shipment.
    -   **Pre-Alert**: A form where users can notify the company of an incoming package by providing the tracking number, a description of the contents, and uploading a commercial invoice.
    -   **My Packages**: A table listing all of the user's shipments, their current status, cost, and payment status. Users can pay for shipments and view/download invoices from here.
    -   **Support**: A dedicated messaging center for the user to communicate with the admin/support team.
    -   **My Account**: Displays the user's unique US shipping address. It also allows them to manage their authorized pickup personnel and their delivery addresses in Jamaica.

## 3. Admin Panel

The Admin Panel (`/admin`) is a secure area for managing the entire courier operation.

### 3.1. Admin Access

-   **Admin Login (`/admin-login`)**: A separate login page for administrators. For this prototype, the credentials are `admin@example.com` and `password`.

### 3.2. Core Features

The admin panel is a single-page application with different sections accessible via the sidebar menu.

-   **Dashboard (`/admin`)**: The main landing page for the admin panel, providing quick links to all management features.
-   **Pre-Alerts (`/admin/pre-alerts`)**:
    -   View a table of all pre-alerts submitted by customers.
    -   View the invoice uploaded by the customer.
    -   **Create a Shipment**: Process a pending pre-alert by clicking "Create Shipment". This opens a form pre-filled with the pre-alert data, where the admin can set the shipping cost and officially convert it into an active shipment.
-   **Shipping Status (`/admin/shipping`)**:
    -   View a list of all shipments in the system.
    -   **Edit Shipments**: Click the "Edit" button on any shipment to open a dialog where you can update its status (e.g., from "Processed" to "In Transit" or "Delivered"), contents, or cost.
    -   **Email Customer**: Send a status update email directly to the customer.
-   **Flight Manifests (`/admin/manifests`)**: Manage and view flight manifest documents.
-   **Communications (`/admin/communications`)**:
    -   **Compose Email**: Send promotional emails or updates to specific customers. The system uses an API route to send emails via a professional service (Resend).
    -   **Sent History**: A table logs all emails that have been sent from the system.
-   **Finance & Invoices (`/admin/finance`)**:
    -   **Dashboard**: View financial summaries (Revenue, Expenses, Profit) and a chart visualizing the data.
    -   **Invoice Management**: Create, view, and manage customer invoices. You can generate a PDF invoice and mark invoices as "Paid" or "Unpaid".
    -   **Breakdown Pages**: Includes detailed tables for all revenue and expense transactions.
-   **Users (`/admin/users`)**:
    -   View a table of all registered users.
    -   View each user's assigned mailbox number and US shipping address.
    -   Add new users manually.
-   **Courier Rates (`/admin/rates`)**: View and edit the pricing tiers for shipping based on weight (in lbs).
-   **Customs Calculator (`/admin/customs-calculator`)**: An internal tool to estimate Jamaican customs fees based on item value, weight, and category.
-   **Settings (`/admin/settings`)**:
    -   Manage application appearance (light/dark/system theme).
    -   Manage API keys for third-party integrations.

## 4. Technical Overview

### 4.1. Stack

-   **Framework**: Next.js 15 with React
-   **UI**: ShadCN UI components and Tailwind CSS
-   **Styling**: Theming is controlled via CSS variables in `src/app/globals.css`.
-   **Generative AI**: Genkit for AI-powered flows (e.g., invoice HTML generation).

### 4.2. Data

-   **Mock Data**: The application currently runs on mock data located in `src/lib/mock-data.ts`. For a production environment, this data should be replaced with a real database backend (e.g., PostgreSQL). The schemas defined in `mock-data.ts` can serve as a blueprint for your database tables.

### 4.3. API Routes

The application includes server-side API routes to handle specific backend tasks:

-   **/api/generate-pdf**: Takes HTML content and uses `puppeteer` to generate a PDF file (used for invoices).
-   **/api/send-email**: Sends an email using the **Resend** service. To get this working in a live environment, you must:
    1.  Sign up for a Resend account (the free tier is very generous).
    2.  Get your API key from the Resend dashboard.
    3.  Add the key as an environment variable named `RESEND_API_KEY` on your production server.
-   **/api/notifications**: Provides mock notification data for the admin panel. This would be replaced by a real notification system in production.

This documentation should provide a clear path for using, managing, and further developing the FromStore2Door application.