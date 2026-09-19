import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getSignedUrl, VultrConfig } from '@/lib/integrations/vultr-service';

/**
 * @fileOverview Secure Storage Proxy.
 * Generates temporary signed URLs for authorized users.
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
        const { data: isAdmin } = await adminClient.rpc('is_admin');
        const isOwner = key.includes(`invoices/${user.id}/`);
        const isLegacyPublic = key.startsWith('http');

        if (isLegacyPublic) {
            return Response.redirect(key, 307);
        }

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ message: 'Access Denied: You do not have permission to view this document.' }, { status: 403 });
        }

        // 2. Fetch Storage Config
        const { data: configData } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'vultr_config')
            .maybeSingle();

        const config = configData?.config_value as VultrConfig;
        if (!config) throw new Error('Storage configuration missing.');

        // 3. Generate Signed URL
        const signedUrl = await getSignedUrl(config, key);

        // 4. Redirect to the temporary secure location
        return Response.redirect(signedUrl, 307);

    } catch (error: any) {
        console.error('[STORAGE_VIEW_ERROR]', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
