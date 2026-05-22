import fp from 'fastify-plugin';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    s3: {
      getPresignedPost: (tenderId: string, bidId: string) => Promise<{ url: string; fields: Record<string, string> }>;
    };
  }
}

export default fp(
  async function s3Plugin(fastify: FastifyInstance) {
    const isMock = process.env.NODE_ENV === 'test' || !process.env.AWS_ACCESS_KEY_ID;
    
    let s3Client: S3Client | null = null;
    if (!isMock) {
      s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
      });
    }

    const s3Service = {
      getPresignedPost: async (tenderId: string, bidId: string) => {
        const bucket = 'sealedbid-tenders';
        const key = `tenders/${tenderId}/bids/${bidId}.enc`;

        if (isMock || !s3Client) {
          // Transparent test / sandbox mock
          return {
            url: `https://sealedbid-tenders.s3.amazonaws.com`,
            fields: {
              key,
              'Content-Type': 'application/octet-stream',
              'x-amz-algorithm': 'AWS4-HMAC-SHA256',
              'x-amz-credential': 'mock_aws_access_key/20260522/us-east-1/s3/aws4_request',
              'x-amz-date': '20260522T000000Z',
              policy: 'mock_base64_policy',
              'x-amz-signature': 'mock_signature_hash_bytes',
            },
          };
        }

        const { url, fields } = await createPresignedPost(s3Client, {
          Bucket: bucket,
          Key: key,
          Conditions: [
            ['content-length-range', 1024, 10485760], // 1KB-10MB
            {'content-type': 'application/octet-stream'},
          ],
          Expires: 60, // 60s
        });

        return { url, fields };
      },
    };

    fastify.decorate('s3', s3Service);
  },
  { name: 's3-plugin' }
);
