/**
 * NEURAL LINK CANVAS ROUTES
 * Handles Canvas App AI generation endpoints
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as jose from 'jose';
import { AIService } from '../services/aiService.js';

const router = express.Router();
const prisma = new PrismaClient();

const SUBDOMAIN_SECRET = process.env.SUBDOMAIN_TOKEN_SECRET || process.env.JWT_SECRET || 'neural-link-secret';

// System prompt for code generation
const CODE_GENERATION_PROMPT = `You are a world-class senior frontend engineer and UI/UX designer. 
Your task is to generate or modify a complete, high-quality, single-file HTML application.

Rules for generated code:
1. Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>).
2. Use Lucide icons via CDN (<script src="https://unpkg.com/lucide@latest"></script>).
3. Ensure the design is modern, professional, and mobile-responsive.
4. Include all necessary JavaScript.
5. The output MUST be a single, valid HTML file containing <html>, <head>, and <body> tags.
6. Return ONLY the code. No explanations, no markdown code blocks.
7. Always return the FULL updated file.`;

// ============================================================================
// AUTH MIDDLEWARE (optional for canvas - uses cookies)
// ============================================================================

const optionalAuth = async (req, res, next) => {
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
    
    if (sessionToken) {
      const secret = new TextEncoder().encode(SUBDOMAIN_SECRET);
      const { payload } = await jose.jwtVerify(sessionToken, secret);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { credits: true },
      });

      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth for demo mode
    next();
  }
};

// Map frontend model IDs to backend model IDs
const MODEL_MAPPING = {
  // Anthropic
  'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-3-opus': 'claude-3-opus-20240229',
  // OpenAI
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  // Gemini
  'gemini-1.5-flash': 'gemini-1.5-flash',
  'gemini-1.5-pro': 'gemini-1.5-pro',
  'gemini-2.0-flash': 'gemini-2.0-flash',
  // xAI
  'grok-3': 'grok-2',
  // Groq
  'llama-3.3-70b': 'llama-3.3-70b-versatile',
};

// Map frontend provider names to backend provider IDs
const PROVIDER_MAPPING = {
  'Anthropic': 'anthropic',
  'OpenAI': 'openai',
  'Gemini': 'gemini',
  'xAI': 'xai',
  'Groq': 'groq',
};

// ============================================================================
// GENERATE APP CODE
// ============================================================================

router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const { 
      prompt, 
      provider = 'Anthropic', 
      modelId = 'claude-3-5-sonnet',
      isThinking = false,
      currentCode,
      history = [],
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // Map to backend IDs
    const backendProvider = PROVIDER_MAPPING[provider] || provider.toLowerCase();
    const backendModel = MODEL_MAPPING[modelId] || modelId;

    console.log(`[Canvas] Generate request: provider=${backendProvider}, model=${backendModel}`);

    // Build the full prompt
    let fullPrompt = prompt;
    if (currentCode) {
      fullPrompt = `Current code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nUser request: ${prompt}`;
    }

    // Format messages for AI
    const messages = [];
    
    // Add history if available
    history.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    });
    
    // Add current prompt
    messages.push({ role: 'user', content: fullPrompt });

    // Create mock user for demo mode if not authenticated
    const user = req.user || {
      id: 'demo-user',
      credits: { balance: 100 },
    };

    // Check credits
    if (req.user && req.user.credits?.balance <= 0) {
      return res.status(402).json({ 
        success: false, 
        error: 'Insufficient credits. Please purchase more credits to continue.' 
      });
    }

    // Initialize AI service
    const aiService = new AIService(user);

    // Generate with selected provider
    const result = await aiService.chat(
      messages,
      backendProvider,
      backendModel,
      {
        systemPrompt: CODE_GENERATION_PROMPT,
        maxTokens: 8192,
      }
    );

    // Clean the code output (remove markdown code blocks if present)
    let code = result.content;
    code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

    // Update user credits in response
    let updatedCredits = user.credits?.balance || 0;
    if (req.user) {
      const updatedUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { credits: true },
      });
      updatedCredits = updatedUser?.credits?.balance || 0;
    }

    res.json({ 
      success: true, 
      code,
      usage: {
        provider: result.provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        creditsCost: result.creditsCost,
        latencyMs: result.latencyMs,
      },
      credits: updatedCredits,
    });

  } catch (error) {
    console.error('[Canvas] Generate error:', error);
    
    // Handle specific error types
    if (error.message === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({ 
        success: false, 
        error: 'Insufficient credits. Please purchase more credits to continue.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate code',
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req, res) => {
  res.json({ success: true, service: 'canvas', status: 'operational' });
});

export default router;
