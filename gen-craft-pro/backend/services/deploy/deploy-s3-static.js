/**
 * Deploy S3 Static — Deploy static sites to S3 + CloudFront
 * 
 * Handles:
 *   - Upload build output to S3 bucket
 *   - Configure S3 static website hosting
 *   - Create/update CloudFront distribution
 *   - SSL certificate via ACM
 *   - Cache invalidation
 */

const AWS = require('aws-sdk');
const path = require('path');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const cloudfront = new AWS.CloudFront({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const DEPLOY_BUCKET = process.env.DEPLOY_BUCKET || 'gencraft-deployments';
const CDN_DOMAIN = process.env.CDN_DOMAIN || 'cdn.maula.ai';

/**
 * Deploy static files to S3
 * 
 * @param {Object} config
 * @param {string} config.projectId
 * @param {string} config.version
 * @param {Object[]} config.files - Array of { path, content, contentType }
 * @param {string} [config.indexDocument='index.html']
 * @param {string} [config.errorDocument='index.html']
 * @returns {Object} Deploy result
 */
async function deployToS3(config) {
  const {
    projectId,
    version,
    files,
    indexDocument = 'index.html',
    errorDocument = 'index.html',
  } = config;

  const prefix = `sites/${projectId}/v${version}`;
  const results = [];

  console.log(`[DeployS3] Uploading ${files.length} files to s3://${DEPLOY_BUCKET}/${prefix}/`);

  // Upload files in parallel (batches of 10)
  for (let i = 0; i < files.length; i += 10) {
    const batch = files.slice(i, i + 10);
    const uploads = batch.map(file => {
      const key = `${prefix}/${file.path}`;
      const contentType = file.contentType || mime.lookup(file.path) || 'application/octet-stream';

      return s3.putObject({
        Bucket: DEPLOY_BUCKET,
        Key: key,
        Body: file.content,
        ContentType: contentType,
        CacheControl: file.path.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|webp|avif)$/)
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0, must-revalidate',
        ACL: 'public-read',
      }).promise()
        .then(() => ({ path: file.path, key, status: 'uploaded' }))
        .catch(err => ({ path: file.path, key, status: 'failed', error: err.message }));
    });

    const batchResults = await Promise.all(uploads);
    results.push(...batchResults);
  }

  const failed = results.filter(r => r.status === 'failed');
  if (failed.length > 0) {
    console.error(`[DeployS3] ${failed.length} files failed to upload`);
  }

  // Update latest pointer
  await s3.putObject({
    Bucket: DEPLOY_BUCKET,
    Key: `sites/${projectId}/latest`,
    Body: String(version),
    ContentType: 'text/plain',
  }).promise();

  console.log(`[DeployS3] Deployed ${results.length - failed.length}/${results.length} files`);

  return {
    bucket: DEPLOY_BUCKET,
    prefix,
    url: `https://${CDN_DOMAIN}/${prefix}/index.html`,
    filesUploaded: results.length - failed.length,
    filesFailed: failed.length,
    results,
  };
}

/**
 * Invalidate CloudFront cache for a deployment
 * 
 * @param {string} distributionId
 * @param {string[]} paths - Paths to invalidate
 * @returns {Object} Invalidation result
 */
async function invalidateCache(distributionId, paths = ['/*']) {
  try {
    const result = await cloudfront.createInvalidation({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `gencraft-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    }).promise();

    console.log(`[DeployS3] Cache invalidation created: ${result.Invalidation.Id}`);
    return {
      id: result.Invalidation.Id,
      status: result.Invalidation.Status,
      paths,
    };
  } catch (err) {
    console.error(`[DeployS3] Cache invalidation failed: ${err.message}`);
    throw err;
  }
}

/**
 * Get deploy URL for a project
 */
function getDeployUrl(projectId, environment = 'production') {
  if (environment === 'production') {
    return `https://${projectId}.maula.ai`;
  }
  return `https://${projectId}.preview.maula.ai`;
}

/**
 * Delete deployment files from S3
 */
async function deleteDeployment(projectId, version) {
  const prefix = `sites/${projectId}/v${version}`;

  try {
    // List all objects with prefix
    const listResult = await s3.listObjectsV2({
      Bucket: DEPLOY_BUCKET,
      Prefix: prefix,
    }).promise();

    if (listResult.Contents && listResult.Contents.length > 0) {
      await s3.deleteObjects({
        Bucket: DEPLOY_BUCKET,
        Delete: {
          Objects: listResult.Contents.map(obj => ({ Key: obj.Key })),
        },
      }).promise();

      console.log(`[DeployS3] Deleted ${listResult.Contents.length} files for ${prefix}`);
    }
  } catch (err) {
    console.error(`[DeployS3] Delete failed: ${err.message}`);
    throw err;
  }
}

module.exports = {
  deployToS3,
  invalidateCache,
  getDeployUrl,
  deleteDeployment,
  DEPLOY_BUCKET,
};
