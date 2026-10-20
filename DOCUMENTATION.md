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

-   **Sign Up (`/signup`)**: New users can create an account.
-   **Sign In (`/signin`)**: Existing users can log in to access their account dashboard.
-   **Account Page (`/account`)**: This is the central hub for logged-in users. It's organized into several tabs:
    -   **Dashboard**: Shows a welcome message and a summary of the user's most recent shipment.
    -   **Pre-Alert**: A form where users can notify the company of an incoming package by providing the tracking number, a description of the contents, and uploading a commercial invoice.
    -   **My Packages**: A table listing all of the user's shipments, their current status, cost, and payment status.
    -   **Support**: A dedicated messaging center.
    -   **My Account**: Displays the user's unique US shipping address.

## 3. Admin Panel

The Admin Panel (`/admin`) is a secure area for managing the entire courier operation.

### 3.1. Admin Access

-   **Admin Login (`/admin-login`)**: A separate login page for administrators.

### 3.2. Core Features

-   **Dashboard (`/admin`)**: The main landing page for the admin panel.
-   **Pre-Alerts (`/admin/pre-alerts`)**: View and process customer documentation. Includes AI-powered analysis of uploaded invoices.
-   **Shipping Status (`/admin/shipping`)**: View and manage all transits in the system. Supports bulk status updates and manifest building.
-   **POS System (`/admin/pos`)**: High-performance checkout station for branch operations.
-   **Finance & Invoices (`/admin/finance`)**: Centralized ledger for revenue and expense auditing.
-   **Users (`/admin/users`)**: Identity management for all registered clients and staff.
-   **Settings (`/admin/settings`)**: Management of system integrations (SMTP, Logicware API).

## 4. Technical Overview

### 4.1. Stack

-   **Framework**: Next.js 15 with React
-   **UI**: ShadCN UI components and Tailwind CSS
-   **Database**: Supabase PostgreSQL (Relational Logistics, Immutable Ledger, Binary Assets)
-   **Generative AI**: Genkit for document analysis.

### 4.2. Storage

The application utilizes the `document_assets` table in PostgreSQL to store commercial invoices and other documentation as `bytea` binary data. This ensures centralized, high-speed access without external cloud storage dependencies.

### 4.3. API Routes

-   **/api/storage/upload**: Stores documentation in the database.
-   **/api/storage/view**: Retrieves documentation from the database.
-   **/api/send-email**: Sends automated correspondence via a configured SMTP relay.
-   **/api/webhooks/logicware**: Receives real-time tracking updates from the external Logistics Hub.

This documentation should provide a clear path for using, managing, and further developing the FromStore2Door application.