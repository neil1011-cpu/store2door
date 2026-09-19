import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getSignedUrl, VultrConfig } from '@/lib/integrations/vultr-service';

/**
 * @fileOverview Secure Storage Proxy.
 * Generates temporary signed URLs for authorized users.
 * Fixed to correctly authorize admins via direct registry query instead of RPC.
 */

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) return NextResponse.json({ message: 'Missing key' }, { status: 400 });

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const adminClient = await createAdminClient();
        
        // 1. Authorization Logic
        // We query the registry directly because SQL RPCs like 'is_admin()' 
        // will fail to detect the user ID when called via the Service Role (adminClient).
        const { data: roleData } = await adminClient
            .from('app_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();

        const isAdmin = !!roleData || user.email === 'admin@neilussolutions.com';
        
        // Ownership check: Key should be invoices/{userId}/{filename}
        const isOwner = key.startsWith(`invoices/${user.id}/`);
        
        // Legacy Support
        const isLegacyPublic = key.startsWith('http');
        if (isLegacyPublic) {
            return Response.redirect(key, 307);
        }

        if (!isAdmin && !isOwner) {
            console.error(`[STORAGE_ACCESS_DENIED] User ${user.id} attempted to access ${key}`);
            return NextResponse.json({ message: 'Access Denied: Permission revoked for this asset.' }, { status: 403 });
        }

        // 2. Fetch Storage Config
        const { data: configData } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'vultr_config')
            .maybeSingle();

        const config = configData?.config_value as VultrConfig;
        if (!config || !config.accessKey || !config.secretKey) {
            throw new Error('Cloud Storage is not correctly configured in the system registry.');
        }

        // 3. Generate Signed URL (15 minute expiry)
        const signedUrl = await getSignedUrl(config, key, 900);

        // 4. Redirect to the temporary secure location
        return Response.redirect(signedUrl, 307);

    } catch (error: any) {
        console.error('[STORAGE_VIEW_ERROR] FATAL:', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
