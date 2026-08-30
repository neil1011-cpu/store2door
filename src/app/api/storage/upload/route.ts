import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * @fileOverview Secure Document Upload Bridge to Vultr Object Storage.
 * Bypasses Firebase Storage authorization failures by using a standard S3 interface.
 */

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
        }

        const idToken = authHeader.split(' ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // 1. Fetch Vultr Credentials from protected Admin metadata
        const vultrConfigSnap = await adminDb.collection('metadata').doc('vultr_config').get();
        if (!vultrConfigSnap.exists) {
            console.error('[VULTR BRIDGE] Missing configuration doc in metadata/vultr_config');
            return NextResponse.json({ 
                message: 'Vultr Cloud Storage not configured in Admin Settings.',
                code: 'CONFIG_MISSING'
            }, { status: 500 });
        }

        const config = vultrConfigSnap.data();
        if (!config?.accessKey || !config?.secretKey || !config?.bucket) {
             return NextResponse.json({ 
                message: 'Vultr configuration is incomplete. Check Admin Settings.',
                code: 'CONFIG_INCOMPLETE'
            }, { status: 500 });
        }

        const { accessKey, secretKey, endpoint, bucket } = config;

        // 2. Parse Incoming File
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const key = `invoices/${userId}/${fileName}`;

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
        console.error('[VULTR UPLOAD ERROR]:', error);
        return NextResponse.json({
            message: 'Cloud transfer failed: ' + (error.message || 'Unknown S3 error'),
            code: error.code || 'S3_ERROR'
        }, { status: 500 });
    }
}