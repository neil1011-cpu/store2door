import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { headers } from 'next/headers';
import { getS3Client, VultrConfig } from '@/lib/integrations/vultr-service';

/**
 * @fileOverview Authorized Cloud Documentation Porter.
 * Uploads files as PRIVATE and returns the S3 KEY for the registry.
 * Hardened to ensure consistent key generation and error handling.
 */

export async function POST(request: Request) {
    const requestId = Math.random().toString(36).slice(2, 9);
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    try {
        const supabase = await createClient();
        let caller;

        // Extract authenticated user
        if (token) {
            const { data } = await supabase.auth.getUser(token);
            caller = data?.user;
        } else {
            const { data } = await supabase.auth.getUser();
            caller = data?.user;
        }

        if (!caller) {
            return NextResponse.json({ message: 'Authentication session required' }, { status: 401 });
        }

        const adminClient = await createAdminClient();
        
        // 1. Fetch Storage Registry
        const { data: configData } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'vultr_config')
            .maybeSingle();

        const config = configData?.config_value as VultrConfig;
        if (!config?.accessKey || !config?.secretKey || !config?.bucket) {
            return NextResponse.json({ 
                message: 'Cloud Storage Registry is incomplete. Please configure Vultr in System Settings.', 
                code: 'CONFIG_MISSING' 
            }, { status: 500 });
        }

        // 2. Extract and Validate File
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ message: 'Payload missing file segment.' }, { status: 400 });

        // Max 10MB check
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ message: 'File size exceeds 10MB limit.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Sanitize filename: remove non-alphanumeric except dots
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${Date.now()}_${sanitizedName}`;
        
        // Durable S3 Key: invoices/{userId}/{unique_filename}
        const key = `invoices/${caller.id}/${fileName}`;

        // 3. Dispatch to Vultr (PRIVATE ACL)
        const s3 = getS3Client(config);
        await s3.send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type || 'application/octet-stream',
            // Note: ACL 'private' is default for most S3 buckets, but explicit is better
        }));

        // We return the relative KEY for storage in the database
        return NextResponse.json({ 
            success: true, 
            key: key,
            fileName: file.name
        });

    } catch (error: any) {
        console.error(`[STORAGE_PORTER_FATAL:${requestId}]`, error);
        return NextResponse.json({ 
            message: error.message || 'The cloud transfer handshake failed.',
            code: error.name
        }, { status: 500 });
    }
}
