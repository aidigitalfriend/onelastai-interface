/**
 * GenCraft Pro — Database Client (Prisma)
 * 
 * Singleton Prisma client with connection pooling,
 * error handling, and graceful shutdown support.
 */

const { PrismaClient } = require('@prisma/client');

let prisma;

function getDB() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'warn', 'error'] 
        : ['warn', 'error'],
      errorFormat: 'pretty',
    });

    // Connection health logging
    prisma.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();
      
      if (after - before > 1000) {
        console.warn(`[DB] Slow query: ${params.model}.${params.action} took ${after - before}ms`);
      }
      
      return result;
    });
  }
  return prisma;
}

/**
 * Connect to database with retry logic
 */
async function connectDB(retries = 3) {
  const db = getDB();
  for (let i = 0; i < retries; i++) {
    try {
      await db.$connect();
      console.log('✅ Database connected');
      return db;
    } catch (err) {
      console.warn(`[DB] Connection attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
    }
  }
  console.error('[DB] Failed to connect after all retries');
  return null;
}

/**
 * Disconnect gracefully
 */
async function disconnectDB() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log('[DB] Disconnected');
  }
}

/**
 * Health check
 */
async function checkDBHealth() {
  try {
    const db = getDB();
    await db.$queryRaw`SELECT 1`;
    return { status: 'healthy', latency: 0 };
  } catch (err) {
    return { status: 'unhealthy', error: err.message };
  }
}

module.exports = { getDB, connectDB, disconnectDB, checkDBHealth };
