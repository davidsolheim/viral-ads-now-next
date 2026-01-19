/**
 * Wasabi Storage Service
 * Handles file uploads to Wasabi S3-compatible storage
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!process.env.WASABI_ACCESS_KEY_ID || !process.env.WASABI_SECRET_ACCESS_KEY) {
      throw new Error('Wasabi credentials are not configured');
    }

    s3Client = new S3Client({
      region: process.env.WASABI_REGION || 'us-east-1',
      endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
      credentials: {
        accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
        secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // Use path-style URLs for Wasabi compatibility
    });
  }

  return s3Client;
}

export type AssetType = 'images' | 'audio' | 'video' | 'master';

export interface UploadOptions {
  file: Buffer | Uint8Array;
  fileName: string;
  contentType: string;
  organizationId?: string;
  projectId?: string;
  assetType?: AssetType;
  folder?: string;
  metadata?: Record<string, string>;
  fetchHeaders?: Record<string, string>; // Optional headers for fetching from URL
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

const USER_MEDIA_ROOT = 'user-media';

function buildStoragePath(
  organizationId: string,
  projectId: string,
  assetType: AssetType
): string {
  return `${USER_MEDIA_ROOT}/${organizationId}/${projectId}/${assetType}`;
}

/**
 * Upload a file to Wasabi storage
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const {
    file,
    fileName,
    contentType,
    organizationId,
    projectId,
    assetType,
    folder,
    metadata = {},
  } = options;

  const bucketName = process.env.WASABI_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('WASABI_BUCKET_NAME is not configured');
  }

  const client = getS3Client();

  const resolvedFolder =
    folder ||
    (organizationId && projectId && assetType
      ? buildStoragePath(organizationId, projectId, assetType)
      : 'uploads');

  // Generate a unique key
  const timestamp = Date.now();
  const hash = crypto.createHash('md5').update(file).digest('hex').substring(0, 8);
  const key = `${resolvedFolder}/${timestamp}-${hash}-${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: metadata,
    });

    await client.send(command);

    // Generate a signed URL for temporary access (7 days)
    const signedUrl = await getPresignedUrl(key, 604800); // 7 days in seconds

    return {
      url: signedUrl,
      key,
      size: file.length,
      contentType,
    };
  } catch (error) {
    console.error('Error uploading file to Wasabi:', error);
    throw error;
  }
}

/**
 * Upload a file from a URL to Wasabi storage
 */
export async function uploadFromUrl(
  url: string,
  options: Partial<UploadOptions> = {}
): Promise<UploadResult> {
  try {
    // Use provided headers or default headers for image fetching
    const defaultHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': new URL(url).origin,
    };
    
    const headers = options.fetchHeaders || defaultHeaders;
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Extract filename from URL or generate one
    const urlPath = new URL(url).pathname;
    const fileName = options.fileName || urlPath.split('/').pop() || `file-${Date.now()}`;

    return await uploadFile({
      file: buffer,
      fileName,
      contentType: options.contentType || contentType,
      organizationId: options.organizationId,
      projectId: options.projectId,
      assetType: options.assetType,
      folder: options.folder,
      metadata: options.metadata,
    });
  } catch (error) {
    console.error('Error uploading file from URL:', error);
    throw error;
  }
}

/**
 * Check if a file exists in Wasabi storage (for deduplication)
 */
export async function checkFileExists(
  fileName: string,
  fileSize: number,
  folder: string = 'uploads'
): Promise<string | null> {
  const bucketName = process.env.WASABI_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('WASABI_BUCKET_NAME is not configured');
  }

  const client = getS3Client();

  try {
    // List objects in the folder
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${folder}/`,
    });

    const response = await client.send(command);

    if (!response.Contents) {
      return null;
    }

    // Find a file with matching name and size
    const match = response.Contents.find((obj) => {
      const objFileName = obj.Key?.split('/').pop();
      return objFileName?.includes(fileName) && obj.Size === fileSize;
    });

    if (match && match.Key) {
      return `${process.env.WASABI_ENDPOINT}/${bucketName}/${match.Key}`;
    }

    return null;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return null;
  }
}

/**
 * Upload with deduplication
 */
export async function uploadWithDeduplication(options: UploadOptions): Promise<UploadResult> {
  const { file, fileName, organizationId, projectId, assetType, folder } = options;
  const resolvedFolder =
    folder ||
    (organizationId && projectId && assetType
      ? buildStoragePath(organizationId, projectId, assetType)
      : 'uploads');

  // Check if file already exists
  const existingUrl = await checkFileExists(fileName, file.length, resolvedFolder);

  if (existingUrl) {
    console.log(`File already exists: ${existingUrl}`);
    return {
      url: existingUrl,
      key: existingUrl.split('/').pop() || '',
      size: file.length,
      contentType: options.contentType,
    };
  }

  // Upload new file
  return await uploadFile(options);
}

/**
 * Generate a presigned URL for temporary access
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const bucketName = process.env.WASABI_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('WASABI_BUCKET_NAME is not configured');
  }

  const client = getS3Client();

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}
