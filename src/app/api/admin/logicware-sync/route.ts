import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Authorized Individual Shipper Sync API.
 * Corrected to exclude TRN from updates as per SDK v0.2.0 and handle missing logicware_id column safely.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const payload = await request.json().catch(() => ({}));
    const { profileId } = payload;

    if (!profileId) return NextResponse.json({ message: 'Profile ID required.' }, { status: 400 });

    try {
        const { data: profile, error: fetchErr } = await adminClient
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .maybeSingle();

        if (fetchErr || !profile) throw new Error('Identity not found in registry.');

        const client = await getLogicwareClient();
        if (!client) throw new Error('Hub not configured.');

        let result;
        let operation;

        // Safely check for logicware_id since it may be missing from the DB schema
        const profileLogicwareId = (profile as any).logicware_id;

        if (profileLogicwareId) {
            operation = 'update';
            // SDK v0.2.0: TRN is immutable in updates
            result = await client.shippers.update(profileLogicwareId, {
                name: profile.full_name,
                phone: profile.phone || ''
            });
        } else {
            operation = 'create';
            if (!profile.trn) throw new Error('TRN required for initial registration.');
            
            result = await client.shippers.create({
                email: profile.email,
                name: profile.full_name,
                trn: profile.trn,
                phone: profile.phone || '',
                addressCode: profile.mailbox_number,
            });

            if (result?.id) {
                // Attempt update but don't fail if column is missing from the DB
                try {
                    await adminClient.from('profiles').update({ logicware_id: result.id } as any).eq('id', profileId);
                } catch (dbErr) {
                    console.warn('[API:LOGICWARE:SYNC] Could not persist logicware_id locally. Registry column missing.');
                }
            }
        }

        await adminClient.from('system_logs').insert({
            log_type: `logicware_shipper_${operation}`,
            description: `User ${profile.email} synced (${operation}) with Hub.`,
            metadata: { mailbox: profile.mailbox_number, operation }
        });

        return NextResponse.json({ success: true, operation, message: `Shipper ${operation} complete.` });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SYNC] ERROR:', error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
