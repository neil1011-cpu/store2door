import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { testSmtpConnection } from '@/lib/integrations/email-service';
import { testVultrConnection } from '@/lib/integrations/vultr-service';
import { testLogicwareConnection } from '@/lib/integrations/logicware-service';

/**
 * @fileOverview Authorized Integration Tester.
 * Tests connections server-side to prevent client credential leakage.
 */

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        // Use standard client for RPC to preserve user JWT context
        const { data: isAdmin } = await supabase.rpc('is_admin');
        if (!isAdmin && user.email !== 'admin@neilussolutions.com') {
            return NextResponse.json({ message: 'Access Denied' }, { status: 403 });
        }

        const { type, config } = await request.json();
        const adminClient = await createAdminClient();
        
        // 1. Fetch persisted secrets if config fields are masked
        const { data: persisted } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', type === 'email' ? 'email_config' : type === 'vultr' ? 'vultr_config' : 'logicware')
            .maybeSingle();
        
        const baseConfig = persisted?.config_value || {};
        const testConfig = { ...config };
        const secretFields = ['pass', 'secretKey', 'apiKey'];
        secretFields.forEach(field => {
            if (testConfig[field] === '********') testConfig[field] = baseConfig[field];
        });

        let result;
        if (type === 'email') result = await testSmtpConnection(testConfig);
        else if (type === 'vultr') result = await testVultrConnection(testConfig);
        else if (type === 'logicware') result = await testLogicwareConnection(testConfig);
        else throw new Error('Invalid test type.');

        // Audit the test
        await adminClient.from('system_logs').insert({
            log_type: 'integration_test',
            description: `Integration test [${type}] executed: ${result.success ? 'PASS' : 'FAIL'}`,
            actor_id: user.id,
            metadata: { type, success: result.success, message: result.message }
        });

        return NextResponse.json(result);
    } catch (err: any) {
        console.error('[SETTINGS_TEST_ERROR]', err.message);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
