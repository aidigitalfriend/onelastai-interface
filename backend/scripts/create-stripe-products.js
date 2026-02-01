/**
 * CREATE NEURAL LINK STRIPE PRODUCTS
 * Run this to set up credit packages in Stripe
 * 
 * Usage: node create-stripe-products.js
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

const CREDIT_PACKAGES = [
  {
    name: 'Starter Pack',
    description: '10 credits - Perfect for trying out Neural Link',
    credits: 10,
    price: 5.00, // $5 = 10 credits
    bonus: 0,
    sortOrder: 1,
  },
  {
    name: 'Pro Pack',
    description: '50 credits + 5 bonus - Best value for regular users',
    credits: 50,
    price: 20.00, // $20 = 55 credits (10% bonus)
    bonus: 5,
    sortOrder: 2,
  },
  {
    name: 'Power Pack',
    description: '100 credits + 15 bonus - For power users',
    credits: 100,
    price: 35.00, // $35 = 115 credits (15% bonus)
    bonus: 15,
    sortOrder: 3,
  },
  {
    name: 'Enterprise Pack',
    description: '500 credits + 100 bonus - Maximum value',
    credits: 500,
    price: 150.00, // $150 = 600 credits (20% bonus)
    bonus: 100,
    sortOrder: 4,
  },
];

async function createStripeProducts() {
  console.log('🚀 Creating Neural Link Stripe products...\n');

  for (const pkg of CREDIT_PACKAGES) {
    try {
      // Create Stripe product
      const product = await stripe.products.create({
        name: `[Neural Link] ${pkg.name}`,
        description: pkg.description,
        metadata: {
          app: 'neural-link',
          credits: pkg.credits.toString(),
          bonus: pkg.bonus.toString(),
        },
      });

      console.log(`✅ Created product: ${product.name} (${product.id})`);

      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(pkg.price * 100), // Stripe uses cents
        currency: 'usd',
        metadata: {
          app: 'neural-link',
          credits: pkg.credits.toString(),
        },
      });

      console.log(`   💰 Price: $${pkg.price} (${price.id})`);

      // Save to database
      await prisma.creditPackage.create({
        data: {
          name: pkg.name,
          description: pkg.description,
          credits: pkg.credits + pkg.bonus,
          price: pkg.price,
          stripeProductId: product.id,
          stripePriceId: price.id,
          sortOrder: pkg.sortOrder,
          isActive: true,
        },
      });

      console.log(`   📦 Saved to database\n`);

    } catch (error) {
      console.error(`❌ Error creating ${pkg.name}:`, error.message);
    }
  }

  // Create default credit pricing for AI models
  const CREDIT_PRICING = [
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
    { provider: 'anthropic', model: 'claude-3-opus-20240229', inputCostPer1k: 0.015, outputCostPer1k: 0.075 },
    { provider: 'anthropic', model: 'claude-3-haiku-20240307', inputCostPer1k: 0.00025, outputCostPer1k: 0.00125 },
    { provider: 'openai', model: 'gpt-4o', inputCostPer1k: 0.005, outputCostPer1k: 0.015 },
    { provider: 'openai', model: 'gpt-4o-mini', inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 },
    { provider: 'gemini', model: 'gemini-2.0-flash', inputCostPer1k: 0.0, outputCostPer1k: 0.0 },
    { provider: 'gemini', model: 'gemini-1.5-pro', inputCostPer1k: 0.00125, outputCostPer1k: 0.005 },
    { provider: 'mistral', model: 'mistral-large-latest', inputCostPer1k: 0.002, outputCostPer1k: 0.006 },
    { provider: 'groq', model: 'llama-3.3-70b-versatile', inputCostPer1k: 0.00059, outputCostPer1k: 0.00079 },
    { provider: 'xai', model: 'grok-2', inputCostPer1k: 0.002, outputCostPer1k: 0.01 },
  ];

  console.log('\n📊 Creating credit pricing entries...');

  for (const pricing of CREDIT_PRICING) {
    try {
      await prisma.creditPricing.upsert({
        where: {
          provider_model: {
            provider: pricing.provider,
            model: pricing.model,
          },
        },
        update: pricing,
        create: pricing,
      });
      console.log(`   ✅ ${pricing.provider}/${pricing.model}`);
    } catch (error) {
      console.error(`   ❌ ${pricing.provider}/${pricing.model}: ${error.message}`);
    }
  }

  console.log('\n✨ Done! Neural Link Stripe products created successfully.');
  await prisma.$disconnect();
}

createStripeProducts().catch(console.error);
