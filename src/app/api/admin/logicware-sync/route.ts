import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Authorized Individual Shipper Sync API.
 * Standardized for SDK v0.2.0 (TRN removed from UpdateShipperInput).
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

        let logicwareId = null;
        let matchMethod = 'NONE';

        const normalizedMailbox = profile.mailbox_number?.trim().toUpperCase();
        const normalizedEmail = profile.email?.trim().toLowerCase();

        for (let page = 1; page <= 50; page++) {
            const shippersResponse = await client.shippers.list({ pageSize: 100, page });
            const shipperList = Array.isArray(shippersResponse) ? shippersResponse : ((shippersResponse as any).data || []);
            
            if (shipperList.length === 0) break;

            const match = shipperList.find((s: any) => {
                const hubMailbox = (s.referenceCode || s.code || '').trim().toUpperCase();
                const hubEmail = (s.email || '').trim().toLowerCase();
                
                if (normalizedMailbox && hubMailbox === normalizedMailbox) {
                    matchMethod = 'MAILBOX';
                    return true;
                }
                if (normalizedEmail && hubEmail === normalizedEmail) {
                    matchMethod = 'EMAIL';
                    return true;
                }
                return false;
            });

            if (match) {
                logicwareId = match.id;
                break;
            }

            if (shipperList.length < 100) break;
        }

        let operation;

        if (logicwareId) {
            operation = 'update';
            // SDK v0.2.0: trn is not present in UpdateShipperInput
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
            description: `User ${profile.email} synced (${operation}) with Hub. Match: ${matchMethod}`,
            metadata: { 
                mailbox: profile.mailbox_number, 
                operation, 
                logicwareId,
                matchMethod
            }
        });

        return NextResponse.json({ 
            success: true, 
            operation, 
            message: `Shipper ${operation} complete.`, 
            logicwareId,
            matchMethod 
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SYNC] ERROR:', error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}