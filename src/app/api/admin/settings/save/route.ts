import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Authorized Settings Saver.
 * Implements Delta-Save logic to preserve existing secrets if not changed.
 * Includes strict validation for shipping rate configurations.
 */

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        // Use standard client for RPC to preserve user JWT context
        const { data: isAdmin } = await supabase.rpc('is_admin');
        const isMaster = user.email === 'admin@neilussolutions.com';
        
        if (!isAdmin && !isMaster) {
            return NextResponse.json({ message: 'Access Denied: Administrative authority required.' }, { status: 403 });
        }

        const { key, value } = await request.json();

        // VALIDATION: Ensure only authorized system keys are modified
        const authorizedKeys = ['email_config', 'logicware', 'shipping_rates'];
        if (!authorizedKeys.includes(key)) {
            return NextResponse.json({ message: 'Invalid configuration key.' }, { status: 400 });
        }

        // 1. RATE VALIDATION LOGIC
        if (key === 'shipping_rates') {
            const { tiers } = value;
            if (!tiers || typeof tiers !== 'object') {
                return NextResponse.json({ message: 'Invalid tier structure.' }, { status: 400 });
            }

            for (let i = 1; i <= 30; i++) {
                const price = Number(tiers[i.toString()]);
                if (isNaN(price) || price <= 0 || !Number.isInteger(price)) {
                    return NextResponse.json({ message: `Invalid price for ${i}lb tier. Must be a positive whole number.` }, { status: 400 });
                }
                
                if (i > 1) {
                    const prevPrice = Number(tiers[(i - 1).toString()]);
                    if (price < prevPrice) {
                        return NextResponse.json({ message: `Price conflict: ${i}lb tier ($${price}) cannot be lower than ${i-1}lb tier ($${prevPrice}).` }, { status: 400 });
                    }
                }
            }
        }

        const adminClient = await createAdminClient();

        // 2. Fetch current config to check for existing secrets
        const { data: current } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', key)
            .maybeSingle();

        const currentVal = current?.config_value || {};
        const newVal = { ...value };
        const secretFields = ['pass', 'apiKey', 'webhookSecret'];

        // 3. DELTA-SAVE Logic: If a field is '********', keep the original value
        secretFields.forEach(field => {
            if (newVal[field] === '********') {
                newVal[field] = currentVal[field] || '';
            }
        });

        // 4. Persist
        const { error } = await adminClient.from('system_configs').upsert({
            config_key: key,
            config_value: newVal,
            updated_at: new Date().toISOString(),
            updated_by: user.id
        });

        if (error) throw error;

        // 5. Audit Log
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