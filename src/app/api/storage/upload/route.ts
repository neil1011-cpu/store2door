import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { headers } from 'next/headers';
import { getS3Client, VultrConfig } from '@/lib/integrations/vultr-service';

/**
 * @fileOverview Authorized Cloud Documentation Porter.
 * Uploads files as PRIVATE and returns the S3 KEY for the registry.
 */

export async function POST(request: Request) {
    const requestId = Math.random().toString(36).slice(2, 9);
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    try {
        const supabase = await createClient();
        let caller;

        if (token) {
            const { data } = await supabase.auth.getUser(token);
            caller = data?.user;
        } else {
            const { data } = await supabase.auth.getUser();
            caller = data?.user;
        }

        if (!caller) return NextResponse.json({ message: 'Authentication required' }, { status: 401 });

        const adminClient = await createAdminClient();
        
        // 1. Fetch Storage Registry
        const { data: configData } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'vultr_config')
            .maybeSingle();

        const config = configData?.config_value as VultrConfig;
        if (!config?.accessKey || !config?.secretKey || !config?.bucket) {
            return NextResponse.json({ message: 'Cloud Registry Incomplete.', code: 'CONFIG_MISSING' }, { status: 500 });
        }

        // 2. Porter Logic
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ message: 'Payload missing file segment.' }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const key = `invoices/${caller.id}/${fileName}`;

        // 3. Dispatch to Cloud (PRIVATE ACL)
        const s3 = getS3Client(config);
        await s3.send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type || 'application/octet-stream'
        }));

        // We return the KEY, not a public URL
        return NextResponse.json({ success: true, key: key });

    } catch (error: any) {
        console.error(`[STORAGE_PORTER:${requestId}] FATAL:`, error);
        return NextResponse.json({ message: error.message || 'Cloud transfer failed.' }, { status: 500 });
    }
}
