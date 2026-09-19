import { S3Client, HeadBucketCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner';

export type VultrConfig = {
    accessKey: string;
    secretKey: string;
    endpoint: string;
    bucket: string;
};

/**
 * @fileOverview Server-side Vultr (S3) Service.
 * Hardened for secure, private document management.
 */

export function getS3Client(config: VultrConfig) {
    if (!config.accessKey || !config.secretKey) {
        throw new Error('Vultr credentials incomplete.');
    }

    return new S3Client({
        region: 'us-east-1',
        endpoint: `https://${config.endpoint || 'ewr1.vultrobjects.com'}`,
        credentials: {
            accessKeyId: config.accessKey,
            secretKeyId: config.secretKey,
        },
        forcePathStyle: true,
    });
}

export async function testVultrConnection(config: VultrConfig) {
    try {
        const client = getS3Client(config);
        await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
        return { success: true, message: 'Cloud Storage Link Established.' };
    } catch (error: any) {
        console.error('[VULTR_TEST_ERROR]', error);
        return { success: false, message: error.message || 'Bucket unreachable or invalid keys.' };
    }
}

/**
 * Generates a temporary signed URL for secure viewing.
 */
export async function getSignedUrl(config: VultrConfig, key: string, expiresIn = 900) {
    const client = getS3Client(config);
    const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
    });

    return s3GetSignedUrl(client, command, { expiresIn });
}

/**
 * Retrieves the raw file buffer from storage.
 */
export async function getFileBuffer(config: VultrConfig, key: string) {
    const client = getS3Client(config);
    const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
    });

    const response = await client.send(command);
    const bytes = await response.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
}
