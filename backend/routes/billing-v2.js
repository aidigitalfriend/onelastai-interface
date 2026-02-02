/**
 * ONE LASTAI BILLING ROUTES
 * Multi-app billing system with separate credits for each app:
 * - Neural Chat
 * - Canvas Studio  
 * - Maula Editor
 */

import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import * as jose from 'jose';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const SUBDOMAIN_SECRET = process.env.SUBDOMAIN_TOKEN_SECRET || process.env.JWT_SECRET || 'neural-link-secret';

// ============================================================================
// APP-SPECIFIC CREDIT PACKAGES
// Each app has its own credit system
// ============================================================================

const APP_CONFIGS = {
  'neural-chat': {
    name: 'Neural Chat',
    description: 'AI Chat Assistant',
    icon: '💬',
    packages: [
      { id: 'nc-50', name: '50 Credits', credits: 50, price: 500, priceDisplay: '$5.00', description: 'Starter pack' },
      { id: 'nc-100', name: '100 Credits', credits: 100, price: 999, priceDisplay: '$9.99', savings: '5% off', description: 'Regular usage' },
      { id: 'nc-350', name: '350 Credits', credits: 350, price: 2999, priceDisplay: '$29.99', savings: '15% off', popular: true, description: 'Best value' },
      { id: 'nc-600', name: '600 Credits', credits: 600, price: 4999, priceDisplay: '$49.99', savings: '20% off', description: 'Heavy usage' },
      { id: 'nc-1500', name: '1,500 Credits', credits: 1500, price: 9999, priceDisplay: '$99.99', savings: '35% off', description: 'Enterprise' },
    ]
  },
  'canvas-studio': {
    name: 'Canvas Studio',
    description: 'AI Code Generator',
    icon: '🎨',
    packages: [
      { id: 'cs-50', name: '50 Credits', credits: 50, price: 500, priceDisplay: '$5.00', description: 'Starter pack' },
      { id: 'cs-100', name: '100 Credits', credits: 100, price: 999, priceDisplay: '$9.99', savings: '5% off', description: 'Regular usage' },
      { id: 'cs-350', name: '350 Credits', credits: 350, price: 2999, priceDisplay: '$29.99', savings: '15% off', popular: true, description: 'Best value' },
      { id: 'cs-600', name: '600 Credits', credits: 600, price: 4999, priceDisplay: '$49.99', savings: '20% off', description: 'Heavy usage' },
      { id: 'cs-1500', name: '1,500 Credits', credits: 1500, price: 9999, priceDisplay: '$99.99', savings: '35% off', description: 'Enterprise' },
    ]
  },
  'maula-editor': {
    name: 'Maula Editor',
    description: 'AI Code Editor',
    icon: '💻',
    packages: [
      { id: 'me-50', name: '50 Credits', credits: 50, price: 500, priceDisplay: '$5.00', description: 'Starter pack' },
      { id: 'me-100', name: '100 Credits', credits: 100, price: 999, priceDisplay: '$9.99', savings: '5% off', description: 'Regular usage' },
      { id: 'me-350', name: '350 Credits', credits: 350, price: 2999, priceDisplay: '$29.99', savings: '15% off', popular: true, description: 'Best value' },
      { id: 'me-600', name: '600 Credits', credits: 600, price: 4999, priceDisplay: '$49.99', savings: '20% off', description: 'Heavy usage' },
      { id: 'me-1500', name: '1,500 Credits', credits: 1500, price: 9999, priceDisplay: '$99.99', savings: '35% off', description: 'Enterprise' },
    ]
  }
};

// Valid app IDs
const VALID_APPS = Object.keys(APP_CONFIGS);

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

const requireAuth = async (req, res, next) => {
  try {
    // Check main site's shared session cookie
    const mainSiteSessionId = req.cookies?.session_id || req.cookies?.sessionId;
    
    if (mainSiteSessionId) {
      const mainUser = await prisma.$queryRaw`
        SELECT id, email, name, "sessionId", "sessionExpiry" 
        FROM "User" 
        WHERE "sessionId" = ${mainSiteSessionId} 
        AND ("sessionExpiry" IS NULL OR "sessionExpiry" > NOW())
        LIMIT 1
      `;
      
      if (mainUser && mainUser.length > 0) {
        const foundUser = mainUser[0];
        
        // Find or create app user
        let appUser = await prisma.user.findUnique({
          where: { onelastaiUserId: foundUser.id },
          include: { credits: true },
        });
        
        if (!appUser) {
          appUser = await prisma.user.create({
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
        
        req.user = appUser;
        return next();
      }
    }
    
    // Fallback: Neural Link's own session
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
// GET ALL APPS INFO
// ============================================================================

router.get('/apps', (req, res) => {
  const apps = Object.entries(APP_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
    icon: config.icon
  }));
  
  res.json({ success: true, apps });
});

// ============================================================================
// GET CREDIT PACKAGES FOR AN APP
// ============================================================================

router.get('/packages/:appId', (req, res) => {
  const { appId } = req.params;
  
  if (!VALID_APPS.includes(appId)) {
    return res.status(400).json({ success: false, error: 'Invalid app ID' });
  }
  
  const appConfig = APP_CONFIGS[appId];
  
  res.json({ 
    success: true,
    app: {
      id: appId,
      name: appConfig.name,
      description: appConfig.description,
      icon: appConfig.icon
    },
    packages: appConfig.packages,
    stripeMode: process.env.STRIPE_MODE || 'test',
  });
});

// Legacy endpoint - defaults to neural-chat
router.get('/packages', (req, res) => {
  const appId = req.query.app || 'neural-chat';
  const appConfig = APP_CONFIGS[appId] || APP_CONFIGS['neural-chat'];
  
  res.json({ 
    success: true,
    packages: appConfig.packages,
    stripeMode: process.env.STRIPE_MODE || 'test',
  });
});

// ============================================================================
// GET USER CREDITS FOR AN APP
// ============================================================================

router.get('/credits/:appId', requireAuth, async (req, res) => {
  try {
    const { appId } = req.params;
    
    if (!VALID_APPS.includes(appId)) {
      return res.status(400).json({ success: false, error: 'Invalid app ID' });
    }
    
    // Get app-specific credits from metadata or separate table
    const credits = await prisma.userCredits.findUnique({
      where: { userId: req.user.id },
    });

    // For now, using shared credits. Later can split by app.
    // The credits are stored with app-specific metadata
    const appCredits = credits?.appCredits?.[appId] || credits?.balance || 0;

    res.json({ 
      success: true,
      app: appId,
      credits: appCredits,
      lifetimeSpent: credits?.lifetimeSpent || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get credits' });
  }
});

// Legacy endpoint
router.get('/credits', requireAuth, async (req, res) => {
  try {
    const appId = req.query.app || 'neural-chat';
    
    const credits = await prisma.userCredits.findUnique({
      where: { userId: req.user.id },
    });

    res.json({ 
      success: true, 
      credits: credits?.balance || 0,
      lifetimeSpent: credits?.lifetimeSpent || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get credits' });
  }
});

// ============================================================================
// GET ALL USER CREDITS (for all apps)
// ============================================================================

router.get('/credits-all', requireAuth, async (req, res) => {
  try {
    const credits = await prisma.userCredits.findUnique({
      where: { userId: req.user.id },
    });

    // Return credits for all apps
    // For now, all apps share the same credit pool
    // In future, can split into separate balances
    const allCredits = {};
    for (const appId of VALID_APPS) {
      allCredits[appId] = credits?.balance || 0;
    }

    res.json({ 
      success: true,
      credits: allCredits,
      totalBalance: credits?.balance || 0,
      lifetimeSpent: credits?.lifetimeSpent || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get credits' });
  }
});

// ============================================================================
// CREATE CHECKOUT SESSION FOR AN APP
// ============================================================================

router.post('/checkout/:appId', requireAuth, async (req, res) => {
  try {
    const { appId } = req.params;
    const { packageId } = req.body;
    
    if (!VALID_APPS.includes(appId)) {
      return res.status(400).json({ success: false, error: 'Invalid app ID' });
    }

    const appConfig = APP_CONFIGS[appId];
    const creditPackage = appConfig.packages.find(p => p.id === packageId);
    
    if (!creditPackage) {
      return res.status(400).json({ success: false, error: 'Invalid package' });
    }

    // Determine success/cancel URLs based on app
    const appUrls = {
      'neural-chat': '/neural-chat/',
      'canvas-studio': '/canvas-studio/',
      'maula-editor': '/maula-editor/'
    };

    const baseUrl = process.env.FRONTEND_URL || 'https://maula.onelastai.co';
    const appPath = appUrls[appId] || '/';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      metadata: {
        userId: req.user.id,
        appId: appId,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
        source: 'onelastai',
        appName: appConfig.name
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${appConfig.name} - ${creditPackage.name}`,
              description: `${creditPackage.credits} AI Credits for ${appConfig.name}`,
              images: ['https://onelastai.co/logo.png'],
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}${appPath}?payment=success&credits=${creditPackage.credits}`,
      cancel_url: `${baseUrl}${appPath}?payment=cancelled`,
    });

    console.log(`[Billing] Checkout: ${session.id} | App: ${appId} | User: ${req.user.id} | Credits: ${creditPackage.credits}`);

    res.json({ 
      success: true, 
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[Billing] Checkout error:', error);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// Legacy checkout endpoint
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { packageId, appId = 'neural-chat' } = req.body;
    
    const appConfig = APP_CONFIGS[appId] || APP_CONFIGS['neural-chat'];
    const creditPackage = appConfig.packages.find(p => p.id === packageId);
    
    if (!creditPackage) {
      // Try to find in any app config (backward compatibility)
      for (const [aid, config] of Object.entries(APP_CONFIGS)) {
        const pkg = config.packages.find(p => p.id === packageId);
        if (pkg) {
          req.body.appId = aid;
          return router.handle(req, res);
        }
      }
      return res.status(400).json({ success: false, error: 'Invalid package' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://maula.onelastai.co';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      metadata: {
        userId: req.user.id,
        appId: appId,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
        source: 'onelastai',
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${appConfig.name} - ${creditPackage.name}`,
              description: `${creditPackage.credits} AI Credits`,
              images: ['https://onelastai.co/logo.png'],
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/neural-chat/?payment=success&credits=${creditPackage.credits}`,
      cancel_url: `${baseUrl}/neural-chat/?payment=cancelled`,
    });

    console.log(`[Billing] Checkout session created: ${session.id} for user ${req.user.id}`);

    res.json({ 
      success: true, 
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[Billing] Checkout error:', error);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// ============================================================================
// STRIPE WEBHOOK
// ============================================================================

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      // Process OneLast AI payments
      if (session.metadata?.source !== 'onelastai' && session.metadata?.source !== 'neural-link') {
        console.log('[Webhook] Skipping non-onelastai payment');
        break;
      }

      const userId = session.metadata?.userId || session.client_reference_id;
      const credits = parseInt(session.metadata?.credits || '0', 10);
      const packageId = session.metadata?.packageId;
      const appId = session.metadata?.appId || 'neural-chat';
      const amountPaid = session.amount_total / 100;

      console.log(`[Webhook] Payment: user=${userId}, app=${appId}, credits=${credits}, amount=$${amountPaid}`);

      if (userId && credits > 0) {
        try {
          await prisma.$transaction(async (tx) => {
            // Add credits to user (shared pool for now)
            const userCredits = await tx.userCredits.upsert({
              where: { userId },
              create: {
                userId,
                balance: credits,
                lifetimeSpent: 0,
              },
              update: {
                balance: { increment: credits },
              },
            });

            // Record transaction with app info
            await tx.creditTransaction.create({
              data: {
                userCreditsId: userCredits.id,
                type: 'PURCHASE',
                amount: credits,
                balanceAfter: userCredits.balance,
                description: `${APP_CONFIGS[appId]?.name || appId}: Purchased ${credits} credits (${packageId})`,
                referenceId: session.id,
                referenceType: 'stripe_checkout',
              },
            });

            console.log(`[Webhook] Credits added: ${credits} for ${appId}, new balance: ${userCredits.balance}`);
          });
        } catch (error) {
          console.error('[Webhook] Failed to add credits:', error);
          return res.status(500).json({ error: 'Failed to process payment' });
        }
      }
      break;
    }

    case 'payment_intent.succeeded': {
      console.log(`[Webhook] Payment intent succeeded: ${event.data.object.id}`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log('[Webhook] Payment failed:', paymentIntent.id);
      break;
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// ============================================================================
// GET TRANSACTION HISTORY
// ============================================================================

router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const { appId } = req.query;
    
    const userCredits = await prisma.userCredits.findUnique({
      where: { userId: req.user.id },
    });

    if (!userCredits) {
      return res.json({ success: true, transactions: [] });
    }

    let transactions = await prisma.creditTransaction.findMany({
      where: { userCreditsId: userCredits.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Filter by app if specified
    if (appId && VALID_APPS.includes(appId)) {
      transactions = transactions.filter(t => 
        t.description?.includes(APP_CONFIGS[appId]?.name) || 
        !t.description?.includes(':') // Include generic transactions
      );
    }

    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
});

// ============================================================================
// ADD FREE CREDITS (for testing/demo)
// ============================================================================

router.post('/add-free-credits', requireAuth, async (req, res) => {
  try {
    const { amount = 10, appId = 'neural-chat' } = req.body;
    
    if (amount > 50) {
      return res.status(400).json({ success: false, error: 'Maximum 50 free credits allowed' });
    }

    const userCredits = await prisma.userCredits.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        balance: amount,
        lifetimeSpent: 0,
      },
      update: {
        balance: { increment: amount },
      },
    });

    await prisma.creditTransaction.create({
      data: {
        userCreditsId: userCredits.id,
        type: 'BONUS',
        amount: amount,
        balanceAfter: userCredits.balance,
        description: `${APP_CONFIGS[appId]?.name || appId}: Free trial credits`,
        referenceType: 'demo',
      },
    });

    console.log(`[Billing] Added ${amount} free credits for ${appId} to user ${req.user.id}`);

    res.json({ 
      success: true, 
      credits: userCredits.balance,
      message: `Added ${amount} free credits!`,
    });
  } catch (error) {
    console.error('[Billing] Add free credits error:', error);
    res.status(500).json({ success: false, error: 'Failed to add credits' });
  }
});

// ============================================================================
// GET BILLING PLANS (for dashboard display)
// ============================================================================

router.get('/plans', (req, res) => {
  const plans = Object.entries(APP_CONFIGS).map(([appId, config]) => ({
    appId,
    appName: config.name,
    appDescription: config.description,
    appIcon: config.icon,
    packages: config.packages
  }));
  
  res.json({ 
    success: true, 
    plans,
    stripeMode: process.env.STRIPE_MODE || 'test'
  });
});

export default router;
