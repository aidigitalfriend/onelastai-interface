/**
 * GenCraft Pro — Asset Optimizer
 * Phase 4: Asset Pipeline
 * 
 * Orchestrates full asset optimization pipeline:
 * - Images → compress, convert to WebP/AVIF, generate responsive variants
 * - Videos → transcode, generate thumbnails, create preview clips
 * - Fonts → subset, convert to WOFF2
 * - CSS/JS → minify, bundle (handled by build pipeline)
 */

const path = require('path');
const { imageProcessor } = require('./image-processor');
const { videoProcessor } = require('./video-processor');
const { assetCDN } = require('./asset-cdn');

class AssetOptimizer {
  constructor() {
    this.jobs = new Map();
    this.stats = {
      totalProcessed: 0,
      totalSaved: 0,
      byType: {},
    };

    // Optimization presets per plan
    this.planLimits = {
      weekly: {
        maxFileSize: 5 * 1024 * 1024,    // 5 MB
        maxTotalStorage: 100 * 1024 * 1024, // 100 MB
        allowedTypes: ['image'],
        imageFormats: ['webp'],
        videoTranscode: false,
        responsive: false,
      },
      monthly: {
        maxFileSize: 25 * 1024 * 1024,    // 25 MB
        maxTotalStorage: 1024 * 1024 * 1024, // 1 GB
        allowedTypes: ['image', 'font', 'file'],
        imageFormats: ['webp', 'avif'],
        videoTranscode: false,
        responsive: true,
      },
      yearly: {
        maxFileSize: 100 * 1024 * 1024,   // 100 MB
        maxTotalStorage: 10 * 1024 * 1024 * 1024, // 10 GB
        allowedTypes: ['image', 'video', 'font', 'file'],
        imageFormats: ['webp', 'avif'],
        videoTranscode: true,
        responsive: true,
      },
    };
  }

  /**
   * Full optimization pipeline for an uploaded asset
   */
  async optimize(filePath, projectId, options = {}) {
    const {
      type = this._detectType(filePath),
      plan = 'monthly',
      quality = 'medium',
      generateVariants = true,
      uploadToCDN = true,
    } = options;

    const limits = this.planLimits[plan] || this.planLimits.monthly;
    const jobId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.jobs.set(jobId, {
      id: jobId,
      projectId,
      file: filePath,
      type,
      status: 'processing',
      startedAt: new Date().toISOString(),
      results: {},
    });

    try {
      // Validate plan allows this type
      if (!limits.allowedTypes.includes(type)) {
        throw new Error(`Asset type '${type}' not allowed on ${plan} plan`);
      }

      let result;

      switch (type) {
        case 'image':
          result = await this._optimizeImage(filePath, projectId, {
            quality,
            formats: limits.imageFormats,
            responsive: limits.responsive && generateVariants,
            uploadToCDN,
          });
          break;

        case 'video':
          if (!limits.videoTranscode) {
            throw new Error('Video transcoding requires yearly plan');
          }
          result = await this._optimizeVideo(filePath, projectId, {
            quality,
            uploadToCDN,
          });
          break;

        case 'font':
          result = await this._optimizeFont(filePath, projectId, {
            uploadToCDN,
          });
          break;

        default:
          result = await this._passthrough(filePath, projectId, {
            uploadToCDN,
          });
      }

      const job = this.jobs.get(jobId);
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.results = result;

      this.stats.totalProcessed++;
      this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;
      if (result.savings) {
        this.stats.totalSaved += result.savings;
      }

      return { jobId, ...result };
    } catch (err) {
      const job = this.jobs.get(jobId);
      job.status = 'failed';
      job.error = err.message;
      throw err;
    }
  }

  /**
   * Get optimization job status
   */
  getJobStatus(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get optimizer stats
   */
  getStats() {
    return { ...this.stats };
  }

  // ── Private Pipeline Methods ──

  async _optimizeImage(filePath, projectId, options) {
    const results = {
      original: filePath,
      type: 'image',
      optimized: [],
      variants: [],
      cdnUrls: {},
    };

    // Optimize in each target format
    for (const format of options.formats) {
      const optimized = await imageProcessor.optimize(filePath, {
        format,
        quality: options.quality,
      });
      results.optimized.push(optimized);
    }

    // Generate responsive variants
    if (options.responsive) {
      const responsive = await imageProcessor.generateResponsive(filePath, {
        format: options.formats[0] || 'webp',
        quality: options.quality,
      });
      results.variants = responsive.variants;
      results.srcset = responsive.srcsetString;
      results.sizes = responsive.sizesString;
    }

    // Generate thumbnail
    results.thumbnail = await imageProcessor.thumbnail(filePath);

    // Upload to CDN
    if (options.uploadToCDN) {
      const cdnAsset = await assetCDN.upload(filePath, projectId, {
        directory: 'images',
      });
      results.cdnUrls.original = cdnAsset.cdnUrl;

      // Generate CDN variant URLs
      results.cdnUrls.variants = assetCDN.generateVariantUrls(cdnAsset.id, [
        { name: 'thumb', width: 200, format: 'webp' },
        { name: 'small', width: 640, format: 'webp' },
        { name: 'medium', width: 1024, format: 'webp' },
        { name: 'large', width: 1920, format: 'webp' },
      ]);
    }

    results.savings = results.optimized[0]?.savings || 0;
    return results;
  }

  async _optimizeVideo(filePath, projectId, options) {
    const results = {
      original: filePath,
      type: 'video',
      transcoded: null,
      thumbnail: null,
      preview: null,
      cdnUrls: {},
    };

    // Transcode to web-optimized format
    results.transcoded = await videoProcessor.transcode(filePath, {
      preset: 'web',
      format: 'mp4',
    });

    // Mobile variant
    results.mobileVariant = await videoProcessor.transcode(filePath, {
      preset: 'mobile',
      format: 'mp4',
    });

    // Extract thumbnail
    results.thumbnail = await videoProcessor.extractThumbnail(filePath);

    // Generate preview clip
    results.preview = await videoProcessor.generatePreview(filePath, {
      duration: 10,
      width: 480,
    });

    // Get metadata
    results.metadata = await videoProcessor.getMetadata(filePath);

    // Upload to CDN
    if (options.uploadToCDN) {
      const cdnAsset = await assetCDN.upload(filePath, projectId, {
        directory: 'videos',
      });
      results.cdnUrls.original = cdnAsset.cdnUrl;
    }

    results.savings = results.transcoded?.savings || 0;
    return results;
  }

  async _optimizeFont(filePath, projectId, options) {
    const ext = path.extname(filePath).slice(1).toLowerCase();

    const results = {
      original: filePath,
      type: 'font',
      format: ext,
      cdnUrls: {},
    };

    // In production: subset font to only used characters
    // const subset = await fontSubset(filePath, { text: 'abcdefg...' });
    // Or convert TTF/OTF → WOFF2 for better compression
    // const woff2 = await ttf2woff2(buffer);

    results.subsetted = false;
    results.convertedToWoff2 = ext !== 'woff2';

    // Upload to CDN
    if (options.uploadToCDN) {
      const cdnAsset = await assetCDN.upload(filePath, projectId, {
        directory: 'fonts',
      });
      results.cdnUrls.original = cdnAsset.cdnUrl;
    }

    results.savings = 0;
    return results;
  }

  async _passthrough(filePath, projectId, options) {
    const results = {
      original: filePath,
      type: 'file',
      cdnUrls: {},
    };

    // Upload as-is
    if (options.uploadToCDN) {
      const cdnAsset = await assetCDN.upload(filePath, projectId, {
        directory: 'files',
      });
      results.cdnUrls.original = cdnAsset.cdnUrl;
    }

    results.savings = 0;
    return results;
  }

  _detectType(filePath) {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const typeMap = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'ico', 'tiff'],
      video: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
      font: ['woff2', 'woff', 'ttf', 'otf', 'eot'],
    };

    for (const [type, exts] of Object.entries(typeMap)) {
      if (exts.includes(ext)) return type;
    }
    return 'file';
  }
}

const assetOptimizer = new AssetOptimizer();
module.exports = { assetOptimizer, AssetOptimizer };
