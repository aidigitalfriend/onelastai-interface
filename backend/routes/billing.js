/**
 * NEURAL LINK BILLING ROUTES
 * Handles Stripe payment integration for credit purchases
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

// Credit packages configuration
const CREDIT_PACKAGES = [
  { 
    id: 'pack-50',
    name: '50 Credits',
    credits: 50, 
    price: 500, // $5.00 in cents
    priceDisplay: '$5.00',
    popular: false,
    description: 'Perfect for trying out Neural Link'
  },
  { 
    id: 'pack-100',
    name: '100 Credits',
    credits: 100, 
    price: 999, // $9.99
    priceDisplay: '$9.99',
    popular: false,
    savings: '5% off',
    description: 'Great for regular users'
  },
  { 
    id: 'pack-350',
    name: '350 Credits',
    credits: 350, 
    price: 2999, // $29.99
    priceDisplay: '$29.99',
    popular: true,
    savings: '15% off',
    description: 'Best value for power users'
  },
  { 
    id: 'pack-600',
    name: '600 Credits',
    credits: 600, 
    price: 4999, // $49.99
    priceDisplay: '$49.99',
    popular: false,
    savings: '20% off',
    description: 'For heavy usage'
  },
  { 
    id: 'pack-1500',
    name: '1,500 Credits',
    credits: 1500, 
    price: 9999, // $99.99
    priceDisplay: '$99.99',
    popular: false,
    savings: '35% off',
    description: 'Best for teams and enterprises'
  },
];

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
// GET CREDIT PACKAGES
// ============================================================================

router.get('/packages', (req, res) => {
  res.json({ 
    success: true, 
    packages: CREDIT_PACKAGES,
    stripeMode: process.env.STRIPE_MODE || 'test',
  });
});

// ============================================================================
// GET USER CREDITS
// ============================================================================

router.get('/credits', requireAuth, async (req, res) => {
  try {
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
// CREATE CHECKOUT SESSION
// ============================================================================

router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { packageId } = req.body;

    const creditPackage = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!creditPackage) {
      return res.status(400).json({ success: false, error: 'Invalid package' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      metadata: {
        userId: req.user.id,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
        source: 'neural-link',
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Neural Link - ${creditPackage.name}`,
              description: `${creditPackage.credits} AI Credits for Neural Link`,
              images: ['https://onelastai.co/logo.png'],
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'https://maula.onelastai.co'}/canvas/?payment=success&credits=${creditPackage.credits}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://maula.onelastai.co'}/canvas/?payment=cancelled`,
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
      // For testing without webhook signature
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      // Only process neural-link payments
      if (session.metadata?.source !== 'neural-link') {
        console.log('[Webhook] Skipping non-neural-link payment');
        break;
      }

      const userId = session.metadata?.userId || session.client_reference_id;
      const credits = parseInt(session.metadata?.credits || '0', 10);
      const packageId = session.metadata?.packageId;
      const amountPaid = session.amount_total / 100; // Convert from cents

      console.log(`[Webhook] Payment completed: user=${userId}, credits=${credits}, amount=$${amountPaid}`);

      if (userId && credits > 0) {
        try {
          // Add credits to user
          await prisma.$transaction(async (tx) => {
            // Upsert user credits
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

            // Record transaction
            await tx.creditTransaction.create({
              data: {
                userCreditsId: userCredits.id,
                type: 'PURCHASE',
                amount: credits,
                balanceAfter: userCredits.balance,
                description: `Purchased ${credits} credits (${packageId})`,
                referenceId: session.id,
                referenceType: 'stripe_checkout',
              },
            });

            console.log(`[Webhook] Credits added: ${credits} to user ${userId}, new balance: ${userCredits.balance}`);
          });
        } catch (error) {
          console.error('[Webhook] Failed to add credits:', error);
          return res.status(500).json({ error: 'Failed to process payment' });
        }
      }
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
    const userCredits = await prisma.userCredits.findUnique({
      where: { userId: req.user.id },
    });

    if (!userCredits) {
      return res.json({ success: true, transactions: [] });
    }

    const transactions = await prisma.creditTransaction.findMany({
      where: { userCreditsId: userCredits.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

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
    const { amount = 10 } = req.body;
    
    // Limit free credits
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

    // Record transaction
    await prisma.creditTransaction.create({
      data: {
        userCreditsId: userCredits.id,
        type: 'BONUS',
        amount: amount,
        balanceAfter: userCredits.balance,
        description: 'Free trial credits',
        referenceType: 'demo',
      },
    });

    console.log(`[Billing] Added ${amount} free credits to user ${req.user.id}`);

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

export default router;
