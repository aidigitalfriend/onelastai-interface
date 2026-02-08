/**
 * NEURAL LINK CHAT ROUTES
 * Handles all chat-related API endpoints
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as jose from 'jose';
import { AIService } from '../services/aiService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Must match the JWT_SECRET used in server.js for login
const JWT_SECRET = process.env.NEURAL_LINK_JWT_SECRET || process.env.JWT_SECRET || 'neural-link-secret-key-2026';

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

const requireAuth = async (req, res, next) => {
  try {
    // PRIORITY 1: Check Neural Link's session cookie
    const sessionToken = req.cookies?.neural_link_session;
    
    if (sessionToken) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jose.jwtVerify(sessionToken, secret);

        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: { credits: true },
        });

        if (user) {
          // Build creditsSummary from per-app credits array
          const creditsArr = user.credits || [];
          const totalBal = creditsArr.reduce((s, c) => s + Number(c.balance || 0), 0);
          user.creditsSummary = { balance: totalBal };
          req.user = user;
          return next();
        }
      } catch (e) {
        console.log('[Auth] Token verification failed:', e.message);
      }
    }

    // PRIORITY 2: Check main site's shared session cookie and link account
    const mainSiteSessionId = req.cookies?.session_id || req.cookies?.sessionId;
    
    if (mainSiteSessionId) {
      // Look up user by onelastai session ID in our user table
      const linkedUser = await prisma.user.findFirst({
        where: { onelastaiUserId: mainSiteSessionId },
        include: { credits: true },
      });
      
      if (linkedUser) {
        const creditsArr = linkedUser.credits || [];
        const totalBal = creditsArr.reduce((s, c) => s + Number(c.balance || 0), 0);
        linkedUser.creditsSummary = { balance: totalBal };
        req.user = linkedUser;
        return next();
      }
    }

    // No valid authentication found - user must login
    return res.status(401).json({ 
      success: false, 
      error: 'Please login to continue',
      requiresLogin: true 
    });
  } catch (error) {
    console.error('[Auth] Error:', error);
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

// ============================================================================
// GET AVAILABLE PROVIDERS
// ============================================================================

router.get('/providers', (req, res) => {
  const providers = AIService.getAvailableProviders();
  res.json({ success: true, providers });
});

// ============================================================================
// CREATE OR GET CHAT SESSION
// ============================================================================

router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const { provider = 'anthropic', model = 'claude-sonnet-4-20250514', title } = req.body;

    const session = await prisma.chatSession.create({
      data: {
        userId: req.user.id,
        provider,
        model,
        name: title || 'New Chat',
      },
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('[Chat] Session create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

// Get user's chat sessions
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { messages: true } },
      },
    });

    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get sessions' });
  }
});

// Get session messages
router.get('/sessions/:sessionId/messages', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: req.user.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, session, messages: session.messages });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// Delete session
router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    await prisma.chatSession.deleteMany({
      where: { id: sessionId, userId: req.user.id },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
});

// ============================================================================
// SEND MESSAGE
// ============================================================================

router.post('/send', requireAuth, async (req, res) => {
  try {
    const { 
      sessionId, 
      message, 
      provider = 'anthropic', 
      model = 'claude-sonnet-4-20250514',
      systemPrompt,
      image, // { data: base64, name: string, mimeType: string }
    } = req.body;

    // Check credits
    if (req.user.creditsSummary?.balance <= 0) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        credits: 0,
      });
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: req.user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId: req.user.id,
          provider,
          model,
          name: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          settings: systemPrompt ? { systemPrompt } : undefined,
        },
        include: { messages: true },
      });
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: message,
      },
    });

    // Build message history
    const messageHistory = [
      ...session.messages.map(m => ({
        role: m.role.toLowerCase(),
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Call AI (with optional image for vision)
    const aiService = new AIService(req.user);
    const response = await aiService.chat(messageHistory, provider, model, {
      sessionId: session.id,
      systemPrompt: systemPrompt || session.settings?.systemPrompt,
      image, // Pass image for vision models
      endpoint: 'chat', // Track as chat usage
    });

    // Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: response.content,
        tokensUsed: response.totalTokens,
        creditsCost: response.creditsCost,
        metadata: {
          provider: response.provider,
          model: response.model,
          latencyMs: response.latencyMs,
        },
      },
    });

    // Update session - only update fields that exist in schema
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        updatedAt: new Date(),
        messageCount: { increment: 1 },
      },
    });

    // Get updated credits (sum across all apps)
    const allAppCredits = await prisma.userCredits.findMany({
      where: { userId: req.user.id },
    });
    const updatedBalance = allAppCredits.reduce((s, c) => s + Number(c.balance || 0), 0);

    res.json({
      success: true,
      sessionId: session.id,
      userMessage,
      assistantMessage,
      response: {
        content: response.content,
        provider: response.provider,
        model: response.model,
        tokens: response.totalTokens,
        credits: response.creditsCost,
        latency: response.latencyMs,
      },
      credits: updatedBalance,
    });

  } catch (error) {
    console.error('[Chat] Send error:', error);
    
    if (error.message === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        credits: 0,
      });
    }

    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// ============================================================================
// STREAM MESSAGE
// ============================================================================

router.post('/stream', requireAuth, async (req, res) => {
  try {
    const { 
      sessionId, 
      message, 
      provider = 'anthropic', 
      model = 'claude-sonnet-4-20250514',
      systemPrompt,
    } = req.body;

    // Check credits
    if ((req.user.creditsSummary?.balance || 0) <= 0) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        credits: 0,
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.flushHeaders();

    // Get or create session
    let session;
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: req.user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId: req.user.id,
          provider,
          model,
          name: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          settings: systemPrompt ? { systemPrompt } : undefined,
        },
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: message,
      },
    });

    // Send session ID
    res.write(`data: ${JSON.stringify({ type: 'session', sessionId: session.id })}\n\n`);

    // Build message history
    const messageHistory = [
      ...session.messages.map(m => ({
        role: m.role.toLowerCase(),
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Stream AI response
    const aiService = new AIService(req.user);
    let finalResponse = null;

    for await (const chunk of aiService.streamChat(messageHistory, provider, model, {
      sessionId: session.id,
      systemPrompt: systemPrompt || session.settings?.systemPrompt,
    })) {
      if (chunk.type === 'text') {
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`);
      } else if (chunk.type === 'done') {
        finalResponse = chunk;
      }
    }

    // Save assistant message
    if (finalResponse) {
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: finalResponse.content,
          tokensUsed: finalResponse.totalTokens,
          creditsCost: finalResponse.creditsCost,
          metadata: {
            provider: finalResponse.provider,
            model: finalResponse.model,
            latencyMs: finalResponse.latencyMs,
          },
        },
      });

      // Update session (increment message count)
      await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          updatedAt: new Date(),
          messageCount: { increment: 1 },
        },
      });

      // Get updated credits (sum across all apps)
      const streamCredits = await prisma.userCredits.findMany({
        where: { userId: req.user.id },
      });
      const streamBalance = streamCredits.reduce((s, c) => s + Number(c.balance || 0), 0);

      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        tokens: finalResponse.totalTokens,
        credits: finalResponse.creditsCost,
        balance: streamBalance,
      })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('[Chat] Stream error:', error);
    
    if (error.message === 'INSUFFICIENT_CREDITS') {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Insufficient credits' })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
    }
    
    res.end();
  }
});

export default router;
