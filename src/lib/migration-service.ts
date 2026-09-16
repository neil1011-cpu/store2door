import { adminDb } from './firebaseAdmin';
import { createAdminClient } from './supabase/server';
import type { UserProfile, Shipment, PreAlert, Invoice, Transaction } from './types';

/**
 * @fileOverview Phase 3C: Controlled Firebase to Supabase Data Migration Engine.
 * Hardened for idempotency and strict financial integrity.
 */

export type MigrationStats = {
  attempted: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export type GlobalMigrationReport = {
  profiles: MigrationStats;
  addresses: MigrationStats;
  pickup_personnel: MigrationStats;
  pre_alerts: MigrationStats;
  shipments: MigrationStats;
  invoices: MigrationStats;
  ledger: MigrationStats;
};

export async function runDataMigration(isDryRun: boolean = true): Promise<GlobalMigrationReport> {
  const supabase = await createAdminClient();
  const report: GlobalMigrationReport = {
    profiles: { attempted: 0, migrated: 0, skipped: 0, failed: 0, errors: [] },
    addresses: { attempted: 0, migrated: 0, skipped: 0, failed: 0, errors: [] },
    pickup_personnel: { attempted: 0, migrated: 0, skipped: 0, failed: 0, errors: [] },
    pre_alerts: { attempted: 0, migrated: 0, skipped: 0, failed: 0, errors: [] },
    shipments: { attempted: 0, migrated: 0, skipped: 0, failed: 0, errors: [] },
    invoices: { attempted: 0, migrated: 0, skipped: 0, failed: 0, errors: [] },
    ledger: { attempted: 0, migrated: 0, skipped: 0, failed: 0, errors: [] },
  };

  try {
    // 1. MIGRATION: USERS -> PROFILES
    const usersSnap = await adminDb.collection('users').get();
    report.profiles.attempted = usersSnap.size;

    for (const doc of usersSnap.docs) {
      const data = doc.data() as UserProfile;
      try {
        // Identity Check: Only migrate if Supabase Auth user exists
        const { data: authUser } = await supabase.auth.admin.getUserById(doc.id).catch(() => ({ data: { user: null } }));
        
        if (!authUser.user) {
          report.profiles.skipped++;
          continue;
        }

        if (!isDryRun) {
          const { error } = await supabase.from('profiles').upsert({
            id: doc.id,
            full_name: data.full_name || (data as any).fullName || 'Legacy User',
            email: data.email,
            phone: data.phone || null,
            trn: data.trn || null,
            mailbox_number: data.mailbox_number || (data as any).mailboxNumber || `FSTD-LEGACY-${doc.id.slice(0,4)}`,
            wallet_balance: data.wallet_balance || (data as any).walletBalance || 0,
            created_at: data.created_at?.toDate?.() || new Date(),
          });
          if (error) throw error;
        }
        report.profiles.migrated++;

        // 2. MIGRATION: ADDRESSES
        if (data.address) {
          report.addresses.attempted++;
          if (!isDryRun) {
            await supabase.from('addresses').upsert({
              profile_id: doc.id,
              address_line_1: data.address.address1,
              address_line_2: data.address.address2 || null,
              city: data.address.city,
              state_parish: data.address.state,
              zip_code: data.address.zip || null,
              address_type: 'delivery_destination',
              is_default: true
            }, { onConflict: 'profile_id, address_type' });
          }
          report.addresses.migrated++;
        }
      } catch (err: any) {
        report.profiles.failed++;
        report.profiles.errors.push(`Profile ${doc.id}: ${err.message}`);
      }
    }

    // 4. MIGRATION: PRE-ALERTS (Collection Group)
    const preAlertsSnap = await adminDb.collectionGroup('pre_alerts').get();
    report.pre_alerts.attempted = preAlertsSnap.size;
    for (const doc of preAlertsSnap.docs) {
      const data = doc.data() as PreAlert;
      const ownerId = doc.ref.parent.parent?.id; // Get parent user ID
      
      if (!ownerId) {
        report.pre_alerts.skipped++;
        continue;
      }

      try {
        if (!isDryRun) {
          const { error } = await supabase.from('pre_alerts').upsert({
            profile_id: ownerId,
            tracking_number: data.trackingNumber,
            contents: data.contents,
            weight_lbs: data.weight || 0,
            status: data.status || 'Pending',
            invoice_url: data.uploadedInvoiceUrl || null,
            submission_date: data.submissionDate?.toDate?.() || new Date(),
            legacy_firebase_id: doc.id
          }, { onConflict: 'legacy_firebase_id' });
          if (error) throw error;
        }
        report.pre_alerts.migrated++;
      } catch (err: any) {
        report.pre_alerts.failed++;
        report.pre_alerts.errors.push(`PreAlert ${doc.id}: ${err.message}`);
      }
    }

    // 5. MIGRATION: SHIPMENTS (Collection Group)
    const shipmentsSnap = await adminDb.collectionGroup('shipments').get();
    report.shipments.attempted = shipmentsSnap.size;
    for (const doc of shipmentsSnap.docs) {
      const data = doc.data() as Shipment;
      const ownerId = doc.ref.parent.parent?.id;

      if (!ownerId) {
        report.shipments.skipped++;
        continue;
      }

      try {
        if (!isDryRun) {
          const { error } = await supabase.from('shipments').upsert({
            profile_id: ownerId,
            tracking_number: data.trackingNumber,
            contents: data.contents,
            weight_lbs: data.weight || 0,
            status: data.status || 'Processed',
            total_cost_jmd: data.total_cost_jmd || (data as any).cost || 0,
            payment_status: data.paymentStatus || 'Unpaid',
            shipping_date: data.shippingDate?.toDate?.() || null,
            legacy_firebase_id: doc.id
          }, { onConflict: 'legacy_firebase_id' });
          if (error) throw error;
        }
        report.shipments.migrated++;
      } catch (err: any) {
        report.shipments.failed++;
        report.shipments.errors.push(`Shipment ${doc.id}: ${err.message}`);
      }
    }
  } catch (globalErr: any) {
    console.error('[MIGRATION SERVICE FATAL]', globalErr);
  }

  return report;
}
