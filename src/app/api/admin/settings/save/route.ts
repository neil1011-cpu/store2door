import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Authorized Settings Saver.
 * Implements Delta-Save logic to preserve existing secrets if not changed.
 */

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const adminClient = await createAdminClient();
        
        // Use RPC check to ensure RLS-compliant admin status
        const { data: isAdmin } = await adminClient.rpc('is_admin');
        const isMaster = user.email === 'admin@neilussolutions.com';
        
        if (!isAdmin && !isMaster) {
            return NextResponse.json({ message: 'Access Denied' }, { status: 403 });
        }

        const { key, value } = await request.json();

        // VALIDATION: Ensure only authorized system keys are modified
        const authorizedKeys = ['email_config', 'vultr_config', 'logicware'];
        if (!authorizedKeys.includes(key)) {
            return NextResponse.json({ message: 'Invalid configuration key.' }, { status: 400 });
        }

        // 1. Fetch current config to check for existing secrets
        const { data: current } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', key)
            .maybeSingle();

        const currentVal = current?.config_value || {};
        const newVal = { ...value };
        const secretFields = ['pass', 'secretKey', 'apiKey'];

        // 2. DELTA-SAVE Logic: If a field is '********', keep the original value
        secretFields.forEach(field => {
            if (newVal[field] === '********') {
                newVal[field] = currentVal[field];
            }
        });

        // 3. Persist
        const { error } = await adminClient.from('system_configs').upsert({
            config_key: key,
            config_value: newVal,
            updated_at: new Date().toISOString(),
            updated_by: user.id
        });

        if (error) throw error;

        // 4. Audit Log
        await adminClient.from('system_logs').insert({
            log_type: 'settings_updated',
            description: `System integration [${key}] updated by administrator.`,
            actor_id: user.id,
            metadata: { config_key: key }
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[SETTINGS_SAVE_ERROR]', err.message);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
