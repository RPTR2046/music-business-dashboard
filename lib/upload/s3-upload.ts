/**
 * S3 upload utilities
 */

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, BUCKET_NAME } from '../aws/s3-client';
import { generateS3Key } from './validation';

export interface UploadResult {
  success: boolean;
  s3Key?: string;
  error?: string;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  userId: string,
  filename: string,
  content: string | Buffer,
  contentType: string = 'text/csv'
): Promise<UploadResult> {
  const s3Key = generateS3Key(userId, filename);

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: content,
      ContentType: contentType,
      Metadata: {
        'user-id': userId,
        'original-filename': filename,
        'uploaded-at': new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    return {
      success: true,
      s3Key,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file to storage',
    };
  }
}

/**
 * Generate a signed URL for downloading a file from S3
 * URL expires in 15 minutes by default
 */
export async function getSignedDownloadUrl(
  s3Key: string,
  expiresInSeconds: number = 900 // 15 minutes
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Get file content from S3
 */
export async function getFileFromS3(s3Key: string): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);

    if (response.Body) {
      return response.Body.transformToString();
    }

    return null;
  } catch (error) {
    console.error('S3 download error:', error);
    return null;
  }
}
