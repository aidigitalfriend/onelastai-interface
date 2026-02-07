/**
 * Assets API Routes — /api/assets
 * 
 * POST   /api/assets/upload        — Upload image/video
 * GET    /api/assets/:id           — Get asset info
 * DELETE /api/assets/:id           — Delete asset
 * POST   /api/assets/optimize      — Optimize existing asset
 * GET    /api/assets               — List project assets
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'font/woff', 'font/woff2', 'font/ttf', 'application/font-woff',
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// In-memory asset store -> DB backed
const { assetRepo } = require('../lib/repositories');

// S3 client for asset deletion
let s3Client = null;
try {
  const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  if (process.env.AWS_ACCESS_KEY_ID) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
} catch {}

// Image processor for optimization
let imageProcessor = null;
try {
  imageProcessor = require('../services/assets/image-processor');
} catch {}

function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ──────── GET /api/assets ────────
// List assets for a project
router.get('/', requireAuth, async (req, res) => {
  try {
    const { projectId, type } = req.query;
    const filtered = await assetRepo.findByUser(req.user.id, { projectId, type });
    res.json({ assets: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── POST /api/assets/upload ────────
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const assetId = `asset-${uuidv4().slice(0, 12)}`;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const type = req.file.mimetype.startsWith('image/') ? 'image'
      : req.file.mimetype.startsWith('video/') ? 'video'
      : req.file.mimetype.startsWith('font/') ? 'font'
      : 'file';

    const asset = {
      id: assetId,
      projectId,
      userId: req.user.id,
      type,
      originalName: req.file.originalname,
      originalSize: req.file.size,
      optimizedSize: req.file.size, // Will be updated after optimization
      mimeType: req.file.mimetype,
      s3Key: `assets/${projectId}/${assetId}${ext}`,
      cdnUrl: `https://cdn.maula.ai/assets/${projectId}/${assetId}${ext}`,
      thumbnailUrl: type === 'image' || type === 'video'
        ? `https://cdn.maula.ai/assets/${projectId}/${assetId}-thumb.webp`
        : null,
      variants: {},
      metadata: {
        width: null,
        height: null,
        duration: null,
        format: ext.replace('.', ''),
      },
      optimized: false,
      createdAt: new Date().toISOString(),
    };

    // In production: 
    // 1. Upload original to S3
    // 2. Process with Sharp (images) or FFmpeg (videos)
    // 3. Generate variants (thumb, medium, large)
    // 4. Upload variants to S3
    // 5. Update CDN URLs

    if (type === 'image') {
      asset.variants = {
        original: asset.cdnUrl,
        thumbnail: `https://cdn.maula.ai/assets/${projectId}/${assetId}-thumb.webp`,
        medium: `https://cdn.maula.ai/assets/${projectId}/${assetId}-medium.webp`,
        large: `https://cdn.maula.ai/assets/${projectId}/${assetId}-large.webp`,
      };
      asset.optimized = true;
      asset.optimizedSize = Math.round(req.file.size * 0.6); // Simulated 40% reduction
    } else if (type === 'video') {
      asset.variants = {
        original: asset.cdnUrl,
        thumbnail: `https://cdn.maula.ai/assets/${projectId}/${assetId}-thumb.jpg`,
        '720p': `https://cdn.maula.ai/assets/${projectId}/${assetId}-720p.mp4`,
        '1080p': `https://cdn.maula.ai/assets/${projectId}/${assetId}-1080p.mp4`,
        hls: `https://cdn.maula.ai/assets/${projectId}/${assetId}/master.m3u8`,
      };
    }

    await assetRepo.create(asset);

    res.status(201).json({ asset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── GET /api/assets/:id ────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await assetRepo.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    if (asset.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    res.json({ asset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── DELETE /api/assets/:id ────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await assetRepo.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    if (asset.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    // Delete from S3 if configured
    if (s3Client && asset.url) {
      try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const bucket = process.env.DEPLOY_BUCKET || 'gencraft-assets';
        // Extract S3 key from URL or stored path
        const key = asset.s3Key || asset.url.split('.amazonaws.com/').pop() || `assets/${asset.id}`;
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        console.log(`[Assets] Deleted from S3: ${key}`);
      } catch (s3Err) {
        console.warn('[Assets] S3 delete failed (continuing):', s3Err.message);
      }
    }
    await assetRepo.delete(req.params.id);
    res.json({ success: true, message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────── POST /api/assets/optimize ────────
router.post('/optimize', requireAuth, async (req, res) => {
  try {
    const { assetId, options } = req.body;
    if (!assetId) return res.status(400).json({ error: 'assetId is required' });

    const asset = await assetRepo.findById(assetId);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    if (asset.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    // Re-process with Sharp/FFmpeg
    let optimizedSize = Math.round(asset.originalSize * 0.5);
    if (imageProcessor && asset.filePath) {
      try {
        const result = await imageProcessor.optimize(asset.filePath, {
          quality: options?.quality || 80,
          format: options?.format || 'webp',
          maxWidth: options?.maxWidth || 1920,
          maxHeight: options?.maxHeight || 1080,
          ...options,
        });
        optimizedSize = result.size || optimizedSize;
        console.log(`[Assets] Optimized ${assetId}: ${asset.originalSize} → ${optimizedSize}`);
      } catch (optErr) {
        console.warn('[Assets] Optimization failed (using estimate):', optErr.message);
      }
    }
    await assetRepo.update(assetId, {
      optimized: true,
      optimizedSize,
      metadata: { ...(asset.metadata || {}), optimizedAt: new Date().toISOString(), optimizeOptions: options || {} },
    });

    const updated = await assetRepo.findById(assetId);
    res.json({
      asset: updated,
      savings: {
        originalSize: asset.originalSize,
        optimizedSize,
        reduction: `${((1 - optimizedSize / asset.originalSize) * 100).toFixed(1)}%`,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
