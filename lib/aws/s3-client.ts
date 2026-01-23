import { S3Client } from '@aws-sdk/client-s3'

const region = process.env.AWS_REGION || 'us-east-2'

// Create S3 client with credentials from environment variables
export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!
