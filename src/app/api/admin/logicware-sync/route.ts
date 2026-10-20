import { NextResponse } from 'next/server';
import { getLogicwareClient } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Universal Shipper Sync API.
 * Synchronizes local user profiles with the Logicware Hub as Shippers.
 * Handles both .create() and .update() using logicware_id mapping.
 */

export async function POST(request: Request) {
    const adminClient = await createAdminClient();
    let payload;
    
    try {
        payload = await request.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    const { profileId } = payload;

    if (!profileId) {
        return NextResponse.json({ message: 'Local Profile ID required.' }, { status: 400 });
    }

    try {
        // 1. Fetch Local Profile
        const { data: profile, error: fetchErr } = await adminClient
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .maybeSingle();

        if (fetchErr || !profile) throw new Error('Identity not found in registry.');

        // 2. Initialize Client
        const client = await getLogicwareClient();
        if (!client) throw new Error('Logicware Hub not configured.');

        const syncPayload = {
            email: profile.email,
            name: profile.full_name,
            phone: profile.phone || '',
            addressCode: profile.mailbox_number,
        };

        let result;
        let operation;

        // 3. EXECUTE SYNC
        if (profile.logicware_id) {
            operation = 'update';
            // Update supports optional trn
            result = await client.shippers.update(profile.logicware_id, {
                ...syncPayload,
                trn: profile.trn || undefined
            });
        } else {
            operation = 'create';
            // Create requires trn strictly
            if (!profile.trn) {
                throw new Error('TRN required for Logicware registration. Please update user profile.');
            }
            result = await client.shippers.create({
                ...syncPayload,
                trn: profile.trn
            });
            
            // Save the ID mapping
            if (result?.id) {
                await adminClient
                    .from('profiles')
                    .update({ logicware_id: result.id })
                    .eq('id', profileId);
            }
        }

        // 4. Log the success
        await adminClient.from('system_logs').insert({
            log_type: `logicware_shipper_${operation}_success`,
            description: `User ${profile.email} synchronized (${operation}) with Logicware Hub.`,
            metadata: { 
                logicwareId: profile.logicware_id || result?.id, 
                mailbox: profile.mailbox_number,
                operation
            }
        });

        return NextResponse.json({ 
            success: true, 
            operation,
            logicwareId: profile.logicware_id || result?.id,
            message: `Shipper ${operation} complete.`
        });

    } catch (error: any) {
        console.error('[API:LOGICWARE:SYNC] ERROR:', error);
        
        await adminClient.from('system_logs').insert({
            log_type: 'logicware_sync_failed',
            description: `Shipper Hub sync failed for ${profileId}: ${error.message}`,
            metadata: { error: error.message, profileId }
        });

        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Logicware registration encountered an exception.' 
        }, { status: 500 });
    }
}
