/**
 * AWS S3 Storage Service
 * Handles file uploads, downloads, and management for AI Digital Friend Zone
 */

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const crypto = require('crypto');
const path = require('path');
const stream = require('stream');

// Configuration
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET || 'ai-friend-zone-storage',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

// S3 Client
const s3Client = new S3Client({
  region: config.region,
  credentials: config.credentials,
});

// ============== STORAGE PATHS ==============

const StoragePaths = {
  PROJECTS: 'projects',
  USER_FILES: 'user-files',
  ASSETS: 'assets',
  DEPLOYMENTS: 'deployments',
  BACKUPS: 'backups',
  TEMP: 'temp',
  EXTENSIONS: 'extensions',
  MEDIA: 'media',
  AVATARS: 'avatars',
  SCREENSHOTS: 'screenshots',
};

// ============== MIME TYPE HELPERS ==============

const mimeTypes = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  
  // Videos
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  
  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  
  // Code files
  '.js': 'application/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript-jsx',
  '.jsx': 'text/jsx',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.scss': 'text/x-scss',
  '.less': 'text/x-less',
  '.py': 'text/x-python',
  '.java': 'text/x-java-source',
  '.cpp': 'text/x-c++src',
  '.c': 'text/x-csrc',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.rb': 'text/x-ruby',
  '.php': 'text/x-php',
  '.sql': 'text/x-sql',
  '.md': 'text/markdown',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'application/xml',
  
  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.rar': 'application/x-rar-compressed',
  
  // Default
  default: 'application/octet-stream',
};

const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return mimeTypes[ext] || mimeTypes.default;
};

// ============== UPLOAD FUNCTIONS ==============

/**
 * Upload a file to S3
 */
const uploadFile = async (options) => {
  const {
    buffer,
    stream: fileStream,
    key,
    folder = StoragePaths.USER_FILES,
    userId,
    filename,
    contentType,
    metadata = {},
    acl = 'private',
    cacheControl,
  } = options;

  // Generate unique key if not provided
  const fileKey = key || generateFileKey(folder, userId, filename);
  const mimeType = contentType || getMimeType(filename);

  const uploadParams = {
    Bucket: config.bucket,
    Key: fileKey,
    Body: buffer || fileStream,
    ContentType: mimeType,
    Metadata: {
      ...metadata,
      userId: userId || 'anonymous',
      originalName: filename,
      uploadedAt: new Date().toISOString(),
    },
  };

  if (cacheControl) {
    uploadParams.CacheControl = cacheControl;
  }

  // Use multipart upload for large files or streams
  if (fileStream || (buffer && buffer.length > 5 * 1024 * 1024)) {
    const upload = new Upload({
      client: s3Client,
      params: uploadParams,
      queueSize: 4,
      partSize: 5 * 1024 * 1024, // 5MB parts
      leavePartsOnError: false,
    });

    upload.on('httpUploadProgress', (progress) => {
      console.log(`Upload progress: ${progress.loaded}/${progress.total}`);
    });

    const result = await upload.done();
    return {
      success: true,
      key: fileKey,
      location: result.Location,
      bucket: config.bucket,
      etag: result.ETag,
    };
  }

  // Simple upload for small files
  const command = new PutObjectCommand(uploadParams);
  const result = await s3Client.send(command);

  return {
    success: true,
    key: fileKey,
    location: `https://${config.bucket}.s3.${config.region}.amazonaws.com/${fileKey}`,
    bucket: config.bucket,
    etag: result.ETag,
  };
};

/**
 * Upload project files (batch)
 */
const uploadProjectFiles = async (projectId, userId, files) => {
  const results = [];
  const folder = `${StoragePaths.PROJECTS}/${projectId}`;

  for (const file of files) {
    try {
      const result = await uploadFile({
        buffer: file.buffer,
        folder,
        userId,
        filename: file.path || file.name,
        contentType: file.contentType,
        metadata: {
          projectId,
          filePath: file.path,
        },
      });
      results.push({ ...result, path: file.path });
    } catch (error) {
      results.push({
        success: false,
        path: file.path,
        error: error.message,
      });
    }
  }

  return results;
};

/**
 * Upload deployment artifact (ZIP)
 */
const uploadDeploymentArtifact = async (deploymentId, userId, buffer, filename) => {
  const key = `${StoragePaths.DEPLOYMENTS}/${userId}/${deploymentId}/${filename}`;
  
  return uploadFile({
    buffer,
    key,
    userId,
    filename,
    contentType: 'application/zip',
    metadata: {
      deploymentId,
      type: 'deployment-artifact',
    },
  });
};

// ============== DOWNLOAD FUNCTIONS ==============

/**
 * Get file from S3
 */
const getFile = async (key) => {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  // Convert stream to buffer
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  
  return {
    buffer: Buffer.concat(chunks),
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    metadata: response.Metadata,
    etag: response.ETag,
  };
};

/**
 * Get file as stream
 */
const getFileStream = async (key) => {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  return {
    stream: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    metadata: response.Metadata,
  };
};

/**
 * Generate presigned URL for download
 */
const getPresignedDownloadUrl = async (key, expiresIn = 3600, filename = null) => {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ...(filename && {
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  
  return {
    url,
    expiresIn,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
};

/**
 * Generate presigned URL for upload
 */
const getPresignedUploadUrl = async (key, contentType, expiresIn = 3600, metadata = {}) => {
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
    Metadata: metadata,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  
  return {
    url,
    key,
    bucket: config.bucket,
    expiresIn,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    method: 'PUT',
    contentType,
  };
};

// ============== DELETE FUNCTIONS ==============

/**
 * Delete a single file
 */
const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  await s3Client.send(command);
  
  return { success: true, key };
};

/**
 * Delete multiple files
 */
const deleteFiles = async (keys) => {
  if (keys.length === 0) return { deleted: [], errors: [] };

  // S3 allows max 1000 keys per request
  const batches = [];
  for (let i = 0; i < keys.length; i += 1000) {
    batches.push(keys.slice(i, i + 1000));
  }

  const results = { deleted: [], errors: [] };

  for (const batch of batches) {
    const command = new DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: {
        Objects: batch.map(key => ({ Key: key })),
        Quiet: false,
      },
    });

    const response = await s3Client.send(command);
    
    if (response.Deleted) {
      results.deleted.push(...response.Deleted.map(d => d.Key));
    }
    if (response.Errors) {
      results.errors.push(...response.Errors);
    }
  }

  return results;
};

/**
 * Delete folder (all files with prefix)
 */
const deleteFolder = async (prefix) => {
  const files = await listFiles(prefix, { recursive: true });
  
  if (files.length === 0) {
    return { success: true, deleted: 0 };
  }

  const keys = files.map(f => f.key);
  const result = await deleteFiles(keys);
  
  return {
    success: result.errors.length === 0,
    deleted: result.deleted.length,
    errors: result.errors,
  };
};

/**
 * Delete project files
 */
const deleteProjectFiles = async (projectId) => {
  return deleteFolder(`${StoragePaths.PROJECTS}/${projectId}/`);
};

// ============== LIST FUNCTIONS ==============

/**
 * List files in a folder
 */
const listFiles = async (prefix, options = {}) => {
  const {
    recursive = false,
    maxKeys = 1000,
    continuationToken = null,
  } = options;

  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
    ...(continuationToken && { ContinuationToken: continuationToken }),
    ...(!recursive && { Delimiter: '/' }),
  });

  const response = await s3Client.send(command);
  
  const files = (response.Contents || []).map(item => ({
    key: item.Key,
    size: item.Size,
    lastModified: item.LastModified,
    etag: item.ETag,
    storageClass: item.StorageClass,
  }));

  const folders = (response.CommonPrefixes || []).map(prefix => ({
    key: prefix.Prefix,
    isFolder: true,
  }));

  return {
    files: [...folders, ...files],
    isTruncated: response.IsTruncated,
    nextContinuationToken: response.NextContinuationToken,
    totalCount: files.length + folders.length,
  };
};

/**
 * List project files
 */
const listProjectFiles = async (projectId, subPath = '') => {
  const prefix = `${StoragePaths.PROJECTS}/${projectId}/${subPath}`;
  return listFiles(prefix, { recursive: true });
};

/**
 * Get folder size
 */
const getFolderSize = async (prefix) => {
  let totalSize = 0;
  let totalFiles = 0;
  let continuationToken = null;

  do {
    const result = await listFiles(prefix, {
      recursive: true,
      continuationToken,
    });
    
    for (const file of result.files) {
      if (!file.isFolder) {
        totalSize += file.size;
        totalFiles++;
      }
    }
    
    continuationToken = result.nextContinuationToken;
  } while (continuationToken);

  return {
    totalSize,
    totalFiles,
    formattedSize: formatFileSize(totalSize),
  };
};

// ============== COPY/MOVE FUNCTIONS ==============

/**
 * Copy file
 */
const copyFile = async (sourceKey, destinationKey, metadata = {}) => {
  const command = new CopyObjectCommand({
    Bucket: config.bucket,
    CopySource: `${config.bucket}/${sourceKey}`,
    Key: destinationKey,
    MetadataDirective: Object.keys(metadata).length > 0 ? 'REPLACE' : 'COPY',
    ...(Object.keys(metadata).length > 0 && { Metadata: metadata }),
  });

  const result = await s3Client.send(command);
  
  return {
    success: true,
    sourceKey,
    destinationKey,
    etag: result.CopyObjectResult?.ETag,
  };
};

/**
 * Move file (copy then delete)
 */
const moveFile = async (sourceKey, destinationKey, metadata = {}) => {
  await copyFile(sourceKey, destinationKey, metadata);
  await deleteFile(sourceKey);
  
  return {
    success: true,
    sourceKey,
    destinationKey,
  };
};

/**
 * Copy folder
 */
const copyFolder = async (sourcePrefix, destinationPrefix) => {
  const files = await listFiles(sourcePrefix, { recursive: true });
  const results = [];

  for (const file of files.files) {
    if (!file.isFolder) {
      const relativePath = file.key.substring(sourcePrefix.length);
      const destinationKey = `${destinationPrefix}${relativePath}`;
      
      try {
        const result = await copyFile(file.key, destinationKey);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          sourceKey: file.key,
          error: error.message,
        });
      }
    }
  }

  return {
    success: results.every(r => r.success),
    copied: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
};

// ============== FILE INFO ==============

/**
 * Check if file exists
 */
const fileExists = async (key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * Get file metadata
 */
const getFileMetadata = async (key) => {
  const command = new HeadObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  return {
    key,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    etag: response.ETag,
    metadata: response.Metadata,
    storageClass: response.StorageClass,
  };
};

// ============== BACKUP FUNCTIONS ==============

/**
 * Create project backup
 */
const createProjectBackup = async (projectId, userId) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPrefix = `${StoragePaths.BACKUPS}/${userId}/${projectId}/${timestamp}/`;
  const sourcePrefix = `${StoragePaths.PROJECTS}/${projectId}/`;
  
  const result = await copyFolder(sourcePrefix, backupPrefix);
  
  return {
    ...result,
    backupId: timestamp,
    backupPrefix,
  };
};

/**
 * List backups for project
 */
const listProjectBackups = async (projectId, userId) => {
  const prefix = `${StoragePaths.BACKUPS}/${userId}/${projectId}/`;
  const result = await listFiles(prefix, { recursive: false });
  
  const backups = result.files
    .filter(f => f.isFolder)
    .map(f => {
      const backupId = f.key.split('/').filter(Boolean).pop();
      return {
        backupId,
        createdAt: backupId.replace(/-/g, (m, i) => i < 10 ? '-' : i < 13 ? 'T' : i < 16 ? ':' : '.'),
        prefix: f.key,
      };
    });
  
  return backups;
};

/**
 * Restore project from backup
 */
const restoreProjectFromBackup = async (projectId, backupId, userId) => {
  const backupPrefix = `${StoragePaths.BACKUPS}/${userId}/${projectId}/${backupId}/`;
  const destinationPrefix = `${StoragePaths.PROJECTS}/${projectId}/`;
  
  // Delete current project files
  await deleteFolder(destinationPrefix);
  
  // Copy backup to project folder
  const result = await copyFolder(backupPrefix, destinationPrefix);
  
  return {
    ...result,
    restoredFrom: backupId,
  };
};

// ============== HELPER FUNCTIONS ==============

/**
 * Generate unique file key
 */
const generateFileKey = (folder, userId, filename) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${folder}/${userId || 'anonymous'}/${timestamp}-${random}-${safeName}${ext}`;
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate file type
 */
const validateFileType = (filename, allowedTypes = null) => {
  const mimeType = getMimeType(filename);
  
  if (!allowedTypes) {
    // Default allowed types
    allowedTypes = [
      'image/', 'video/', 'audio/',
      'text/', 'application/json', 'application/javascript',
      'application/pdf', 'application/zip',
    ];
  }
  
  return allowedTypes.some(type => mimeType.startsWith(type) || mimeType === type);
};

// ============== CDN/CLOUDFRONT ==============

/**
 * Get CDN URL for file
 */
const getCDNUrl = (key) => {
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
  
  if (cdnDomain) {
    return `https://${cdnDomain}/${key}`;
  }
  
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
};

/**
 * Invalidate CDN cache
 */
const invalidateCDNCache = async (paths) => {
  const cloudfront = require('@aws-sdk/client-cloudfront');
  const client = new cloudfront.CloudFrontClient({ region: config.region });
  
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (!distributionId) {
    console.warn('CloudFront distribution ID not configured');
    return null;
  }
  
  const command = new cloudfront.CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `invalidation-${Date.now()}`,
      Paths: {
        Quantity: paths.length,
        Items: paths.map(p => p.startsWith('/') ? p : `/${p}`),
      },
    },
  });
  
  const result = await client.send(command);
  return result.Invalidation;
};

// ============== EXPORT ==============

module.exports = {
  // Config
  s3Client,
  config,
  StoragePaths,
  
  // Upload
  uploadFile,
  uploadProjectFiles,
  uploadDeploymentArtifact,
  getPresignedUploadUrl,
  
  // Download
  getFile,
  getFileStream,
  getPresignedDownloadUrl,
  
  // Delete
  deleteFile,
  deleteFiles,
  deleteFolder,
  deleteProjectFiles,
  
  // List
  listFiles,
  listProjectFiles,
  getFolderSize,
  
  // Copy/Move
  copyFile,
  moveFile,
  copyFolder,
  
  // Info
  fileExists,
  getFileMetadata,
  
  // Backup
  createProjectBackup,
  listProjectBackups,
  restoreProjectFromBackup,
  
  // Helpers
  generateFileKey,
  formatFileSize,
  validateFileType,
  getMimeType,
  
  // CDN
  getCDNUrl,
  invalidateCDNCache,
};
