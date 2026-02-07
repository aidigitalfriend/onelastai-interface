/**
 * GenCraft Pro — Asset CDN Service
 * Phase 4: Asset Pipeline
 * 
 * Manages asset distribution via CDN (CloudFront/S3).
 * Handles upload, URL generation, cache invalidation,
 * and CDN configuration.
 */

const path = require('path');
const crypto = require('crypto');

// In production:
// const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
// const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

class AssetCDN {
  constructor() {
    this.cdnDomain = process.env.CDN_DOMAIN || 'cdn.maula.ai';
    this.s3Bucket = process.env.ASSET_BUCKET || 'gencraft-assets';
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.distributionId = process.env.CF_DISTRIBUTION_ID || '';
    
    // In-memory asset registry (production: database)
    this.assets = new Map();
    
    // Cache control settings by content type
    this.cacheRules = {
      image: 'public, max-age=31536000, immutable', // 1 year
      video: 'public, max-age=31536000, immutable',
      font: 'public, max-age=31536000, immutable',
      css: 'public, max-age=604800', // 1 week
      js: 'public, max-age=604800',
      html: 'public, max-age=3600, must-revalidate', // 1 hour
      default: 'public, max-age=86400', // 1 day
    };

    // Content type mappings
    this.contentTypes = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', avif: 'image/avif',
      svg: 'image/svg+xml',
      mp4: 'video/mp4', webm: 'video/webm',
      mov: 'video/quicktime',
      woff2: 'font/woff2', woff: 'font/woff',
      ttf: 'font/ttf', otf: 'font/otf',
      eot: 'application/vnd.ms-fontobject',
      css: 'text/css', js: 'application/javascript',
      json: 'application/json',
      pdf: 'application/pdf',
      zip: 'application/zip',
    };
  }

  /**
   * Upload asset to CDN (S3 + CloudFront)
   */
  async upload(filePath, projectId, options = {}) {
    const {
      directory = 'assets',
      fileName = null,
      contentType = null,
      isPublic = true,
    } = options;

    const ext = path.extname(filePath).slice(1).toLowerCase();
    const hash = crypto.randomBytes(8).toString('hex');
    const name = fileName || path.basename(filePath);
    const s3Key = `projects/${projectId}/${directory}/${hash}-${name}`;

    const resolvedContentType = contentType
      || this.contentTypes[ext]
      || 'application/octet-stream';

    const category = this._categorize(ext);
    const cacheControl = this.cacheRules[category] || this.cacheRules.default;

    // In production: upload to S3
    // const s3 = new S3Client({ region: this.region });
    // await s3.send(new PutObjectCommand({
    //   Bucket: this.s3Bucket,
    //   Key: s3Key,
    //   Body: fs.createReadStream(filePath),
    //   ContentType: resolvedContentType,
    //   CacheControl: cacheControl,
    //   ACL: isPublic ? 'public-read' : 'private',
    // }));

    const cdnUrl = `https://${this.cdnDomain}/${s3Key}`;
    const s3Url = `https://${this.s3Bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;

    const asset = {
      id: hash,
      projectId,
      fileName: name,
      s3Key,
      cdnUrl,
      s3Url,
      contentType: resolvedContentType,
      cacheControl,
      category,
      isPublic,
      uploadedAt: new Date().toISOString(),
    };

    this.assets.set(hash, asset);
    console.log(`[AssetCDN] Uploaded ${name} → ${cdnUrl}`);

    return asset;
  }

  /**
   * Generate signed URL for private assets
   */
  generateSignedUrl(assetId, options = {}) {
    const { expiresIn = 3600 } = options; // 1 hour default

    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    // In production: use CloudFront signed URLs
    // const signer = new CloudFrontSigner(keyPairId, privateKey);
    // return signer.getSignedUrl({ url: asset.cdnUrl, dateLessThan: ... });

    const expires = Date.now() + expiresIn * 1000;
    const signature = crypto
      .createHmac('sha256', process.env.CDN_SIGNING_KEY || 'dev-key')
      .update(`${asset.s3Key}:${expires}`)
      .digest('hex');

    return `${asset.cdnUrl}?expires=${expires}&signature=${signature}`;
  }

  /**
   * Generate image variant URLs (on-the-fly resize via CDN)
   */
  generateVariantUrls(assetId, variants = []) {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    if (asset.category !== 'image') {
      return { original: asset.cdnUrl };
    }

    const urls = { original: asset.cdnUrl };

    // CDN image transformation URLs (e.g., CloudFront Functions, Lambda@Edge)
    for (const variant of variants) {
      const params = [];
      if (variant.width) params.push(`w=${variant.width}`);
      if (variant.height) params.push(`h=${variant.height}`);
      if (variant.format) params.push(`f=${variant.format}`);
      if (variant.quality) params.push(`q=${variant.quality}`);

      const queryString = params.join('&');
      urls[variant.name || `${variant.width}w`] = `${asset.cdnUrl}?${queryString}`;
    }

    return urls;
  }

  /**
   * Delete asset from CDN
   */
  async delete(assetId) {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    // In production: delete from S3
    // const s3 = new S3Client({ region: this.region });
    // await s3.send(new DeleteObjectCommand({
    //   Bucket: this.s3Bucket,
    //   Key: asset.s3Key,
    // }));

    // Invalidate CDN cache
    await this.invalidateCache([`/${asset.s3Key}`]);

    this.assets.delete(assetId);
    console.log(`[AssetCDN] Deleted ${asset.fileName}`);

    return { deleted: true, assetId };
  }

  /**
   * Invalidate CDN cache for paths
   */
  async invalidateCache(paths) {
    if (!paths.length) return;

    // In production: CloudFront invalidation
    // const cf = new CloudFrontClient({ region: this.region });
    // await cf.send(new CreateInvalidationCommand({
    //   DistributionId: this.distributionId,
    //   InvalidationBatch: {
    //     CallerReference: Date.now().toString(),
    //     Paths: { Quantity: paths.length, Items: paths },
    //   },
    // }));

    console.log(`[AssetCDN] Invalidated ${paths.length} CDN paths`);
    return { invalidated: paths.length, paths };
  }

  /**
   * Get CDN usage stats for a project
   */
  getProjectStats(projectId) {
    const projectAssets = [...this.assets.values()].filter(a => a.projectId === projectId);

    return {
      projectId,
      totalAssets: projectAssets.length,
      byCategory: projectAssets.reduce((acc, a) => {
        acc[a.category] = (acc[a.category] || 0) + 1;
        return acc;
      }, {}),
      cdnDomain: this.cdnDomain,
    };
  }

  /**
   * Purge all assets for a project
   */
  async purgeProject(projectId) {
    const projectAssets = [...this.assets.values()].filter(a => a.projectId === projectId);
    const paths = projectAssets.map(a => `/${a.s3Key}`);

    for (const asset of projectAssets) {
      this.assets.delete(asset.id);
    }

    if (paths.length) {
      await this.invalidateCache(paths);
    }

    console.log(`[AssetCDN] Purged ${projectAssets.length} assets for project ${projectId}`);
    return { purged: projectAssets.length };
  }

  // ── Private ──

  _categorize(ext) {
    const categories = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'ico', 'tiff'],
      video: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
      font: ['woff2', 'woff', 'ttf', 'otf', 'eot'],
      css: ['css', 'scss', 'less'],
      js: ['js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx'],
      html: ['html', 'htm'],
    };

    for (const [category, exts] of Object.entries(categories)) {
      if (exts.includes(ext)) return category;
    }
    return 'default';
  }
}

const assetCDN = new AssetCDN();
module.exports = { assetCDN, AssetCDN };
