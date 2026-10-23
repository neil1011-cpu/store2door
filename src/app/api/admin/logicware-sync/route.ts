import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Authorized Individual Shipper Sync API.
 * Hardened to match existing shippers via mailbox/email if logicware_id is missing.
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

        // 1. DUAL IDENTITY RESOLUTION
        let logicwareId = (profile as any).logicware_id;
        if (!logicwareId) {
            const shippersResponse = await client.shippers.list({ pageSize: 100 });
            const shipperList = Array.isArray(shippersResponse) ? shippersResponse : ((shippersResponse as any).data || []);
            const match = shipperList.find((s: any) => 
                s.referenceCode === profile.mailbox_number || 
                s.email?.toLowerCase() === profile.email?.toLowerCase()
            );
            if (match) logicwareId = match.id;
        }

        let result;
        let operation;

        if (logicwareId) {
            operation = 'update';
            // SDK v0.2.0: TRN is immutable in updates
            result = await client.shippers.update(logicwareId, {
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
                logicwareId = result.id;
                try {
                    await adminClient.from('profiles').update({ logicware_id: logicwareId } as any).eq('id', profileId);
                } catch (dbErr) {
                    console.warn('[API:LOGICWARE:SYNC] Local persistence skipped.');
                }
            }
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
