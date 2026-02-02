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

const SUBDOMAIN_SECRET = process.env.SUBDOMAIN_TOKEN_SECRET || process.env.JWT_SECRET || 'neural-link-secret';

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

const requireAuth = async (req, res, next) => {
  try {
    // PRIORITY 1: Check main site's shared session cookie
    const mainSiteSessionId = req.cookies?.session_id || req.cookies?.sessionId;
    
    if (mainSiteSessionId) {
      // Look up user in main database by session ID
      const mainUser = await prisma.$queryRaw`
        SELECT id, email, name, "sessionId", "sessionExpiry" 
        FROM "User" 
        WHERE "sessionId" = ${mainSiteSessionId} 
        AND ("sessionExpiry" IS NULL OR "sessionExpiry" > NOW())
        LIMIT 1
      `;
      
      if (mainUser && mainUser.length > 0) {
        const foundUser = mainUser[0];
        
        // Find or create Neural Link user
        let nlUser = await prisma.user.findUnique({
          where: { onelastaiUserId: foundUser.id },
          include: { credits: true },
        });
        
        if (!nlUser) {
          nlUser = await prisma.user.create({
            data: {
              email: foundUser.email,
              name: foundUser.name || null,
              onelastaiUserId: foundUser.id,
              isVerified: true,
              credits: {
                create: {
                  balance: 5.0,
                  freeCreditsMax: 5.0,
                },
              },
            },
            include: { credits: true },
          });
        }
        
        req.user = nlUser;
        return next();
      }
    }
    
    // PRIORITY 2: Neural Link's own session cookie (legacy/fallback)
    const sessionToken = req.cookies?.neural_link_session;
    
    if (!sessionToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const secret = new TextEncoder().encode(SUBDOMAIN_SECRET);
    const { payload } = await jose.jwtVerify(sessionToken, secret);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { credits: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Error:', error);
    res.status(401).json({ success: false, error: 'Invalid session' });
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
    const { provider = 'anthropic', model = 'claude-3-5-sonnet-20241022', title } = req.body;

    const session = await prisma.chatSession.create({
      data: {
        userId: req.user.id,
        provider,
        model,
        title: title || 'New Chat',
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
      model = 'claude-3-5-sonnet-20241022',
      systemPrompt,
      image, // { data: base64, name: string, mimeType: string }
    } = req.body;

    // Check credits
    if (req.user.credits?.balance <= 0) {
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
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
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

    // Update session
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        updatedAt: new Date(),
        totalTokens: { increment: response.totalTokens },
        totalCost: { increment: response.creditsCost },
      },
    });

    // Get updated credits
    const updatedCredits = await prisma.userCredits.findUnique({
      where: { userId: req.user.id },
    });

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
      credits: updatedCredits?.balance || 0,
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
      model = 'claude-3-5-sonnet-20241022',
      systemPrompt,
    } = req.body;

    // Check credits
    if (req.user.credits?.balance <= 0) {
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
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
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

      // Update session
      await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          updatedAt: new Date(),
          totalTokens: { increment: finalResponse.totalTokens },
          totalCost: { increment: finalResponse.creditsCost },
        },
      });

      // Get updated credits
      const updatedCredits = await prisma.userCredits.findUnique({
        where: { userId: req.user.id },
      });

      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        tokens: finalResponse.totalTokens,
        credits: finalResponse.creditsCost,
        balance: updatedCredits?.balance || 0,
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
