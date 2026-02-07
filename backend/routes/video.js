/**
 * VIDEO GENERATION API ROUTE
 * Text-to-video generation using fal.ai (Minimax video-01-live)
 * 
 * Endpoints:
 *   POST /api/video/generate — Generate video from text prompt
 *   GET  /api/video/status/:id — Check generation status
 */

import express from 'express';

const router = express.Router();

const FAL_API_KEY = process.env.FAL_API_KEY || '';
const FAL_API_BASE = 'https://queue.fal.run';

// ============================================================================
// GENERATE VIDEO
// ============================================================================

router.post('/generate', async (req, res) => {
  try {
    const { prompt, duration = 5, aspectRatio = '16:9' } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    if (!FAL_API_KEY) {
      return res.status(500).json({ success: false, error: 'Video generation is not configured. FAL_API_KEY is missing.' });
    }

    console.log(`[Video] Generating video: "${prompt.slice(0, 80)}..." (${duration}s, ${aspectRatio})`);

    // Submit to fal.ai queue — using minimax video-01-live (fast text-to-video)
    const submitRes = await fetch(`${FAL_API_BASE}/fal-ai/minimax/video-01-live`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        prompt_optimizer: true,
      }),
    });

    if (!submitRes.ok) {
      const errData = await submitRes.text();
      console.error('[Video] fal.ai submit error:', errData);
      return res.status(502).json({ success: false, error: 'Video generation service error' });
    }

    const data = await submitRes.json();

    // fal.ai queue returns a request_id for async polling
    if (data.request_id) {
      return res.json({
        success: true,
        requestId: data.request_id,
        status: 'IN_QUEUE',
        message: 'Video generation started. Poll status endpoint.',
      });
    }

    // If result is immediate (sync mode)
    if (data.video && data.video.url) {
      return res.json({
        success: true,
        status: 'COMPLETED',
        videoUrl: data.video.url,
        message: 'Video generated successfully!',
      });
    }

    res.json({ success: true, data, status: 'PROCESSING' });
  } catch (error) {
    console.error('[Video] Generate error:', error);
    res.status(500).json({ success: false, error: error.message || 'Video generation failed' });
  }
});

// ============================================================================
// CHECK STATUS
// ============================================================================

router.get('/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!FAL_API_KEY) {
      return res.status(500).json({ success: false, error: 'FAL_API_KEY not configured' });
    }

    const statusRes = await fetch(`${FAL_API_BASE}/fal-ai/minimax/video-01-live/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` },
    });

    if (!statusRes.ok) {
      return res.status(502).json({ success: false, error: 'Failed to check status' });
    }

    const data = await statusRes.json();

    // If completed, fetch the result
    if (data.status === 'COMPLETED') {
      const resultRes = await fetch(`${FAL_API_BASE}/fal-ai/minimax/video-01-live/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${FAL_API_KEY}` },
      });

      if (resultRes.ok) {
        const result = await resultRes.json();
        return res.json({
          success: true,
          status: 'COMPLETED',
          videoUrl: result.video?.url || null,
          message: 'Video ready!',
        });
      }
    }

    res.json({
      success: true,
      status: data.status || 'PROCESSING',
      position: data.queue_position,
      message: data.status === 'IN_QUEUE' 
        ? `Queued (position: ${data.queue_position || '?'})` 
        : 'Processing...',
    });
  } catch (error) {
    console.error('[Video] Status check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
