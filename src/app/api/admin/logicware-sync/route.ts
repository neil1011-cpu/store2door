import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Authorized Individual Shipper Sync API.
 * Updated for SDK v0.2.0: trn is removed from updates.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    const payload = await request.json().catch(() => ({}));
    const { profileId } = payload;

    if (!profileId) return NextResponse.json({ message: 'Profile ID required.' }, { status: 400 });

    try {
        // NOTE: profiles.logicware_id is excluded from the query as it is missing from schema.
        const { data: profile, error: fetchErr } = await adminClient
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .maybeSingle();

        if (fetchErr || !profile) throw new Error('Identity not found in registry.');

        const client = await getLogicwareClient();
        if (!client) throw new Error('Hub not configured.');

        // 1. IDENTITY RESOLUTION: Match existing shippers via mailbox/email
        let logicwareId = null;
        const shippersResponse = await client.shippers.list({ pageSize: 100 });
        const shipperList = Array.isArray(shippersResponse) ? shippersResponse : ((shippersResponse as any).data || []);
        const match = shipperList.find((s: any) => 
            s.referenceCode === profile.mailbox_number || 
            s.email?.toLowerCase() === profile.email?.toLowerCase()
        );
        if (match) logicwareId = match.id;

        let operation;

        if (logicwareId) {
            operation = 'update';
            // SDK v0.2.0: TRN is immutable in updates.
            await client.shippers.update(logicwareId, {
                name: profile.full_name,
                phone: profile.phone || ''
            });
        } else {
            operation = 'create';
            if (!profile.trn) throw new Error('TRN required for initial registration.');
            
            const result = await client.shippers.create({
                email: profile.email,
                name: profile.full_name,
                trn: profile.trn,
                phone: profile.phone || '',
                addressCode: profile.mailbox_number,
            });
            logicwareId = result?.id;
        }

        await adminClient.from('system_logs').insert({
            log_type: `logicware_shipper_${operation}`,
            description: `User ${profile.email} synced (${operation}) with Hub.`,
            metadata: { mailbox: profile.mailbox_number, operation, logicwareId }
        });

        return NextResponse.json({ success: true, operation, message: `Shipper ${operation} complete.`, logicwareId });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SYNC] ERROR:', error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
