
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

        if (fetchErr || !profile) throw new Error('Identity not found in registry.');

        const client = await getLogicwareClient();
        if (!client) throw new Error('Hub not configured.');

        let logicwareId = null;
        const shRes = await client.shippers.list({ pageSize: 100 });
        const sList = Array.isArray(shRes) ? shRes : ((shRes as any).data || []);

        const match = sList.find((s: any) => {
            const hubM = (s.referenceCode || s.code || '').trim().toUpperCase();
            const hubE = (s.email || '').trim().toLowerCase();
            return (profile.mailbox_number && hubM === profile.mailbox_number.trim().toUpperCase()) || 
                   (profile.email && hubE === profile.email.trim().toLowerCase());
        });

        if (match) logicwareId = match.id;

        let operation;
        if (logicwareId) {
            operation = 'update';
            await client.shippers.update(logicwareId, {
                name: profile.full_name,
                phone: profile.phone || ''
            });
        } else {
            operation = 'create';
            const result = await client.shippers.create({
                email: profile.email,
                name: profile.full_name,
                trn: profile.trn || '000000000',
                phone: profile.phone || '',
                addressCode: profile.mailbox_number,
            });
            logicwareId = result?.id;
        }

        await adminClient.from('system_logs').insert({
            log_type: `logicware_shipper_${operation}`,
            description: `User ${profile.email} synced with Hub.`,
            metadata: { mailbox: profile.mailbox_number, logicwareId }
        });

        return NextResponse.json({ success: true, operation, logicwareId });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SYNC] ERROR:', error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
