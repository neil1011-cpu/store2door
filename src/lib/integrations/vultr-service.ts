import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

export type VultrConfig = {
    accessKey: string;
    secretKey: string;
    endpoint: string;
    bucket: string;
};

/**
 * @fileOverview Server-side Vultr (S3) Service.
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
