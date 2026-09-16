import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { headers } from 'next/headers';

/**
 * @fileOverview Secure Document Upload Bridge to Vultr Object Storage.
 * Now standardized on Supabase system_configs for credential storage.
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
        
        // 1. Fetch Vultr Credentials from Supabase
        const { data: configData } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'vultr_config')
            .maybeSingle();

        const config = configData?.config_value;
        if (!config?.accessKey || !config?.secretKey || !config?.bucket) {
            return NextResponse.json({ 
                message: 'Vultr Cloud Storage not configured in System Console.',
                code: 'CONFIG_MISSING'
            }, { status: 500 });
        }

        const { accessKey, secretKey, endpoint, bucket } = config;

        // 2. Parse Incoming File
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const key = `invoices/${caller.id}/${fileName}`;

        // 3. Initialize S3 Client (Vultr Compatible)
        const s3Client = new S3Client({
            region: 'us-east-1',
            endpoint: `https://${endpoint || 'ewr1.vultrobjects.com'}`,
            credentials: {
                accessKeyId: accessKey,
                secretKeyId: secretKey,
            },
            forcePathStyle: true,
        });

        // 4. Execute Upload
        await s3Client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type || 'application/octet-stream',
            ACL: 'public-read',
        }));

        const publicUrl = `https://${bucket}.${endpoint || 'ewr1.vultrobjects.com'}/${key}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            key: key
        });

    } catch (error: any) {
        console.error(`[STORAGE_UPLOAD:${requestId}] FATAL:`, error);
        return NextResponse.json({
            message: 'Cloud transfer failed: ' + (error.message || 'Unknown S3 error'),
            code: error.code || 'S3_ERROR'
        }, { status: 500 });
    }
}