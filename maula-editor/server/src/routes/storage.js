/**
 * AWS Storage Routes - S3 File Operations
 * RESTful API for S3 file management
 */

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const s3Storage = require('../services/s3-storage');

const router = express.Router();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
    files: 10,
  },
});

// Auth middleware placeholder
const authenticate = (req, res, next) => {
  // TODO: Implement actual authentication
  req.userId = req.headers['x-user-id'] || 'anonymous';
  next();
};

// ============== UPLOAD ROUTES ==============

/**
 * Upload single file
 * POST /api/storage/upload
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { folder = 'user-files', projectId } = req.body;
    
    const result = await s3Storage.uploadFile({
      buffer: req.file.buffer,
      folder: projectId ? `projects/${projectId}` : folder,
      userId: req.userId,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      metadata: {
        projectId: projectId || '',
        uploadedBy: req.userId,
      },
    });

    res.json({
      success: true,
      file: {
        key: result.key,
        url: s3Storage.getCDNUrl(result.key),
        size: req.file.size,
        contentType: req.file.mimetype,
        originalName: req.file.originalname,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

/**
 * Upload multiple files
 * POST /api/storage/upload-multiple
 */
router.post('/upload-multiple', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { folder = 'user-files', projectId } = req.body;
    const results = [];

    for (const file of req.files) {
      try {
        const result = await s3Storage.uploadFile({
          buffer: file.buffer,
          folder: projectId ? `projects/${projectId}` : folder,
          userId: req.userId,
          filename: file.originalname,
          contentType: file.mimetype,
        });

        results.push({
          success: true,
          originalName: file.originalname,
          key: result.key,
          url: s3Storage.getCDNUrl(result.key),
        });
      } catch (err) {
        results.push({
          success: false,
          originalName: file.originalname,
          error: err.message,
        });
      }
    }

    res.json({
      success: results.every(r => r.success),
      files: results,
      uploaded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });
  } catch (error) {
    console.error('Multi-upload error:', error);
    res.status(500).json({ error: 'Failed to upload files', details: error.message });
  }
});

/**
 * Get presigned upload URL
 * POST /api/storage/presigned-upload
 */
router.post('/presigned-upload', authenticate, async (req, res) => {
  try {
    const { filename, contentType, folder = 'user-files', projectId } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType are required' });
    }

    const key = s3Storage.generateFileKey(
      projectId ? `projects/${projectId}` : folder,
      req.userId,
      filename
    );

    const result = await s3Storage.getPresignedUploadUrl(key, contentType, 3600, {
      userId: req.userId,
      originalName: filename,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Presigned upload error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL', details: error.message });
  }
});

// ============== DOWNLOAD ROUTES ==============

/**
 * Download file
 * GET /api/storage/download/:key(*)
 */
router.get('/download/*', authenticate, async (req, res) => {
  try {
    const key = req.params[0];

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const file = await s3Storage.getFile(key);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', file.contentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);
    
    res.send(file.buffer);
  } catch (error) {
    console.error('Download error:', error);
    
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.status(500).json({ error: 'Failed to download file', details: error.message });
  }
});

/**
 * Get presigned download URL
 * GET /api/storage/presigned-download
 */
router.get('/presigned-download', authenticate, async (req, res) => {
  try {
    const { key, filename } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const result = await s3Storage.getPresignedDownloadUrl(key, 3600, filename);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Presigned download error:', error);
    res.status(500).json({ error: 'Failed to generate download URL', details: error.message });
  }
});

/**
 * Stream file
 * GET /api/storage/stream/:key(*)
 */
router.get('/stream/*', authenticate, async (req, res) => {
  try {
    const key = req.params[0];

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const file = await s3Storage.getFileStream(key);

    res.setHeader('Content-Type', file.contentType);
    if (file.contentLength) {
      res.setHeader('Content-Length', file.contentLength);
    }

    file.stream.pipe(res);
  } catch (error) {
    console.error('Stream error:', error);
    
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.status(500).json({ error: 'Failed to stream file', details: error.message });
  }
});

// ============== LIST ROUTES ==============

/**
 * List files in folder
 * GET /api/storage/list
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const { prefix = '', recursive = 'false', maxKeys = '100', continuationToken } = req.query;

    const result = await s3Storage.listFiles(prefix, {
      recursive: recursive === 'true',
      maxKeys: parseInt(maxKeys),
      continuationToken: continuationToken || null,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
});

/**
 * List project files
 * GET /api/storage/projects/:projectId/files
 */
router.get('/projects/:projectId/files', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { subPath = '' } = req.query;

    const result = await s3Storage.listProjectFiles(projectId, subPath);

    res.json({
      success: true,
      projectId,
      ...result,
    });
  } catch (error) {
    console.error('List project files error:', error);
    res.status(500).json({ error: 'Failed to list project files', details: error.message });
  }
});

/**
 * Get folder size
 * GET /api/storage/size
 */
router.get('/size', authenticate, async (req, res) => {
  try {
    const { prefix } = req.query;

    if (!prefix) {
      return res.status(400).json({ error: 'Prefix is required' });
    }

    const result = await s3Storage.getFolderSize(prefix);

    res.json({
      success: true,
      prefix,
      ...result,
    });
  } catch (error) {
    console.error('Size error:', error);
    res.status(500).json({ error: 'Failed to get folder size', details: error.message });
  }
});

// ============== DELETE ROUTES ==============

/**
 * Delete file
 * DELETE /api/storage/file
 */
router.delete('/file', authenticate, async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    await s3Storage.deleteFile(key);

    res.json({
      success: true,
      key,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

/**
 * Delete multiple files
 * DELETE /api/storage/files
 */
router.delete('/files', authenticate, async (req, res) => {
  try {
    const { keys } = req.body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Array of file keys is required' });
    }

    const result = await s3Storage.deleteFiles(keys);

    res.json({
      success: result.errors.length === 0,
      ...result,
    });
  } catch (error) {
    console.error('Delete multiple error:', error);
    res.status(500).json({ error: 'Failed to delete files', details: error.message });
  }
});

/**
 * Delete folder
 * DELETE /api/storage/folder
 */
router.delete('/folder', authenticate, async (req, res) => {
  try {
    const { prefix } = req.body;

    if (!prefix) {
      return res.status(400).json({ error: 'Folder prefix is required' });
    }

    const result = await s3Storage.deleteFolder(prefix);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder', details: error.message });
  }
});

// ============== COPY/MOVE ROUTES ==============

/**
 * Copy file
 * POST /api/storage/copy
 */
router.post('/copy', authenticate, async (req, res) => {
  try {
    const { sourceKey, destinationKey } = req.body;

    if (!sourceKey || !destinationKey) {
      return res.status(400).json({ error: 'sourceKey and destinationKey are required' });
    }

    const result = await s3Storage.copyFile(sourceKey, destinationKey);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Copy error:', error);
    res.status(500).json({ error: 'Failed to copy file', details: error.message });
  }
});

/**
 * Move file
 * POST /api/storage/move
 */
router.post('/move', authenticate, async (req, res) => {
  try {
    const { sourceKey, destinationKey } = req.body;

    if (!sourceKey || !destinationKey) {
      return res.status(400).json({ error: 'sourceKey and destinationKey are required' });
    }

    const result = await s3Storage.moveFile(sourceKey, destinationKey);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ error: 'Failed to move file', details: error.message });
  }
});

// ============== METADATA ROUTES ==============

/**
 * Get file metadata
 * GET /api/storage/metadata
 */
router.get('/metadata', authenticate, async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const exists = await s3Storage.fileExists(key);
    
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const metadata = await s3Storage.getFileMetadata(key);

    res.json({
      success: true,
      ...metadata,
      url: s3Storage.getCDNUrl(key),
    });
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: 'Failed to get file metadata', details: error.message });
  }
});

/**
 * Check if file exists
 * GET /api/storage/exists
 */
router.get('/exists', authenticate, async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const exists = await s3Storage.fileExists(key);

    res.json({
      success: true,
      key,
      exists,
    });
  } catch (error) {
    console.error('Exists check error:', error);
    res.status(500).json({ error: 'Failed to check file existence', details: error.message });
  }
});

// ============== BACKUP ROUTES ==============

/**
 * Create project backup
 * POST /api/storage/backup
 */
router.post('/backup', authenticate, async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const result = await s3Storage.createProjectBackup(projectId, req.userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Failed to create backup', details: error.message });
  }
});

/**
 * List project backups
 * GET /api/storage/backups/:projectId
 */
router.get('/backups/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    const backups = await s3Storage.listProjectBackups(projectId, req.userId);

    res.json({
      success: true,
      projectId,
      backups,
      count: backups.length,
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Failed to list backups', details: error.message });
  }
});

/**
 * Restore from backup
 * POST /api/storage/restore
 */
router.post('/restore', authenticate, async (req, res) => {
  try {
    const { projectId, backupId } = req.body;

    if (!projectId || !backupId) {
      return res.status(400).json({ error: 'projectId and backupId are required' });
    }

    const result = await s3Storage.restoreProjectFromBackup(projectId, backupId, req.userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore from backup', details: error.message });
  }
});

module.exports = router;
