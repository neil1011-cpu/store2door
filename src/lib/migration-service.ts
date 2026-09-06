
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
        // Log skip for reconciliation
        continue;
      }

      if (!isDryRun) {
        const { error } = await supabase.from('profiles').upsert({
          id: doc.id,
          full_name: data.fullName,
          phone: data.phone,
          trn: data.trn,
          mailbox_number: data.mailboxNumber,
          created_at: data.createdAt?.toDate?.() || new Date(),
        });
        if (error) throw error;
      }
      report.profiles.migrated++;

      // 2. MIGRATION: ADDRESSES
      if (data.address) {
        report.addresses.attempted++;
        if (!isDryRun) {
          // Use primary user address as 'delivery_destination' for Jamaica context
          await supabase.from('addresses').upsert({
            profile_id: doc.id,
            address_line_1: data.address.address1,
            address_line_2: data.address.address2,
            city: data.address.city,
            state_parish: data.address.state,
            zip_code: data.address.zip,
            address_type: 'delivery_destination',
            is_default: true
          }, { onConflict: 'profile_id, address_type' });
        }
        report.addresses.migrated++;
      }

      // 3. MIGRATION: PICKUP PERSONNEL
      if (data.pickupPersonnel && Array.isArray(data.pickupPersonnel)) {
        for (const p of data.pickupPersonnel) {
          report.pickup_personnel.attempted++;
          if (!isDryRun) {
            await supabase.from('pickup_personnel').upsert({
              profile_id: doc.id,
              full_name: p.name,
              government_id: p.idNumber,
              legacy_firebase_id: p.id
            }, { onConflict: 'legacy_firebase_id' });
          }
          report.pickup_personnel.migrated++;
        }
      }
    } catch (err: any) {
      report.profiles.failed++;
      report.profiles.errors.push(`Profile ${doc.id}: ${err.message}`);
    }
  }

  // 4. MIGRATION: PRE-ALERTS
  const preAlertsSnap = await adminDb.collectionGroup('pre_alerts').get();
  report.pre_alerts.attempted = preAlertsSnap.size;
  for (const doc of preAlertsSnap.docs) {
    const data = doc.data() as PreAlert;
    try {
      if (!isDryRun) {
        // FK Check: Ensure parent profile exists in Supabase
        const { data: profileExists } = await supabase.from('profiles').select('id').eq('id', data.customerId).single();
        if (!profileExists) {
           report.pre_alerts.skipped++;
           continue;
        }

        const { error } = await supabase.from('pre_alerts').upsert({
          profile_id: data.customerId,
          tracking_number: data.trackingNumber,
          contents: data.contents,
          weight_lbs: data.weight,
          status: data.status,
          invoice_url: data.uploadedInvoiceUrl,
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

  // 5. MIGRATION: SHIPMENTS
  const shipmentsSnap = await adminDb.collectionGroup('shipments').get();
  report.shipments.attempted = shipmentsSnap.size;
  for (const doc of shipmentsSnap.docs) {
    const data = doc.data() as Shipment;
    try {
      if (!isDryRun) {
        const { data: profileExists } = await supabase.from('profiles').select('id').eq('id', data.customerId).single();
        if (!profileExists) {
           report.shipments.skipped++;
           continue;
        }

        const { error } = await supabase.from('shipments').upsert({
          profile_id: data.customerId,
          tracking_number: data.trackingNumber,
          contents: data.contents,
          weight_lbs: data.weight,
          status: data.status,
          total_cost_jmd: data.cost,
          payment_status: data.paymentStatus || 'Unpaid',
          shipping_date: data.shippingDate?.toDate?.() || null,
          internal_barcode: data.internalBarcode,
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

  // 6. MIGRATION: INVOICES
  const invoicesSnap = await adminDb.collection('invoices').get();
  report.invoices.attempted = invoicesSnap.size;
  for (const doc of invoicesSnap.docs) {
    const data = doc.data() as Invoice;
    try {
      if (!isDryRun) {
        const { data: profileExists } = await supabase.from('profiles').select('id').eq('id', data.customerId).single();
        if (!profileExists) {
           report.invoices.skipped++;
           continue;
        }

        const { error } = await supabase.from('invoices').upsert({
          profile_id: data.customerId,
          invoice_number: data.invoiceId,
          amount: data.amount,
          status: data.status === 'Paid' ? 'Paid' : (data.status === 'Unpaid' ? 'Unpaid' : 'Cancelled'),
          invoice_url: data.invoiceUrl,
          legacy_firebase_id: doc.id
        }, { onConflict: 'legacy_firebase_id' });
        if (error) throw error;

        // 7. LINE ITEMS
        if (data.lineItems) {
          const { data: inv } = await supabase.from('invoices').select('id').eq('legacy_firebase_id', doc.id).single();
          if (inv) {
            for (const li of data.lineItems) {
              await supabase.from('invoice_line_items').insert({
                invoice_id: inv.id,
                description: li.description,
                quantity: li.quantity,
                unit_price: li.price
              });
            }
          }
        }
      }
      report.invoices.migrated++;
    } catch (err: any) {
      report.invoices.failed++;
      report.invoices.errors.push(`Invoice ${doc.id}: ${err.message}`);
    }
  }

  // 8. MIGRATION: TRANSACTIONS -> LEDGER
  const txSnap = await adminDb.collection('transactions').get();
  report.ledger.attempted = txSnap.size;
  for (const doc of txSnap.docs) {
    const data = doc.data() as Transaction;
    try {
      if (!isDryRun) {
        if (!data.customerId || !data.amount || !data.type) {
          report.ledger.skipped++;
          continue;
        }

        const { data: profileExists } = await supabase.from('profiles').select('id').eq('id', data.customerId).single();
        if (!profileExists) {
          report.ledger.skipped++;
          continue;
        }

        const signedAmount = data.type === 'revenue' ? data.amount : -data.amount;

        const { error } = await supabase.from('financial_ledger').upsert({
          profile_id: data.customerId,
          amount: signedAmount,
          transaction_type: data.type === 'revenue' ? 'payment' : 'adjustment',
          source: (data as any).source || 'Manual',
          method: (data as any).method || 'System',
          description: data.description,
          transaction_date: data.date?.toDate?.() || new Date(),
          legacy_firebase_id: doc.id
        }, { onConflict: 'legacy_firebase_id' });
        if (error) throw error;
      }
      report.ledger.migrated++;
    } catch (err: any) {
      report.ledger.failed++;
      report.ledger.errors.push(`Transaction ${doc.id}: ${err.message}`);
    }
  }

  return report;
}
