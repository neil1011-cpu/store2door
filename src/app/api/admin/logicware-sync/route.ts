import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

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

        if (fetchErr || !profile) throw new Error('Identity not found.');

        const client = await getLogicwareClient();
        if (!client) throw new Error('Hub not configured.');

        let result;
        let operation;

        if (profile.logicware_id) {
            operation = 'update';
            result = await client.shippers.update(profile.logicware_id, {
                name: profile.full_name,
                phone: profile.phone || ''
                // TRN is immutable during update in SDK v0.2.0
            });
        } else {
            operation = 'create';
            if (!profile.trn) throw new Error('TRN required for registration.');
            
            result = await client.shippers.create({
                email: profile.email,
                name: profile.full_name,
                trn: profile.trn,
                phone: profile.phone || '',
                addressCode: profile.mailbox_number,
            });

            if (result?.id) {
                await adminClient.from('profiles').update({ logicware_id: result.id }).eq('id', profileId);
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