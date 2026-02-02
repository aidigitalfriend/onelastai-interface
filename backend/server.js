/**
 * NEURAL LINK BACKEND SERVER
 * Standalone Express API for the Neural Link AI Platform (maula.onelastai.co)
 * 
 * Features:
 * - Independent authentication system (signup/login)
 * - Credits-based billing system
 * - Multi-provider AI chat (Anthropic, OpenAI, Gemini, Mistral, xAI, Groq, Cerebras)
 * - Usage tracking & analytics
 * - Stripe integration for credit purchases
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as jose from 'jose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Express
const app = express();
const PORT = process.env.NEURAL_LINK_PORT || 3200;
const JWT_SECRET = process.env.NEURAL_LINK_JWT_SECRET || process.env.JWT_SECRET || 'neural-link-secret-key-2026';

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: false, // Disable CSP to allow inline scripts in HTML pages
}));

// CORS - Allow only maula.onelastai.co (independent site)
const allowedOrigins = [
  'https://maula.onelastai.co',
  process.env.FRONTEND_URL || 'http://localhost:3100',
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => origin.includes(allowed.replace('https://', '').replace('http://', '')))) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Stripe webhook needs raw body - MUST be before express.json()
import Stripe from 'stripe';
const stripeClient = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripeClient) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && sig) {
      event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // For testing - parse raw body
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Process OneLast AI payments (both 'onelastai' and 'neural-link' sources)
    if (session.metadata?.source !== 'neural-link' && session.metadata?.source !== 'onelastai') {
      console.log('[Webhook] Skipping non-onelastai payment');
      return res.json({ received: true });
    }

    const userId = session.metadata?.userId || session.client_reference_id;
    const credits = parseInt(session.metadata?.credits || '0', 10);
    const packageId = session.metadata?.packageId;
    const appId = session.metadata?.appId || 'neural-chat';
    const appName = session.metadata?.appName || 'Neural Chat';

    console.log(`[Webhook] Payment completed: user=${userId}, app=${appId}, credits=${credits}`);

    if (userId && credits > 0) {
      try {
        await prisma.$transaction(async (tx) => {
          const userCredits = await tx.userCredits.upsert({
            where: { userId },
            create: { userId, balance: credits, lifetimeSpent: 0 },
            update: { balance: { increment: credits } },
          });

          await tx.creditTransaction.create({
            data: {
              userCreditsId: userCredits.id,
              type: 'PURCHASE',
              amount: credits,
              balanceAfter: userCredits.balance,
              description: `${appName}: Purchased ${credits} credits (${packageId})`,
              referenceId: session.id,
              referenceType: 'stripe_checkout',
            },
          });

          console.log(`[Webhook] Credits added: ${credits} to user ${userId} for ${appName}`);
        });
      } catch (error) {
        console.error('[Webhook] Failed to add credits:', error);
        return res.status(500).json({ error: 'Failed to process payment' });
      }
    }
  }

  res.json({ received: true });
});

// Body parsing (AFTER webhook route)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Landing page with Login/Signup
app.get('/', (req, res) => {
  const error = req.query.error;
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neural Link - AI Chat Interface</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: #0a0a0f; 
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      color: white;
      position: relative;
      overflow: hidden;
    }
    
    /* Animated background */
    body::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.1) 0%, transparent 40%);
      animation: pulse 8s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
    
    .container { 
      text-align: center; 
      padding: 2rem; 
      max-width: 420px; 
      width: 100%; 
      position: relative; 
      z-index: 1;
    }
    
    .logo-container {
      margin-bottom: 2rem;
    }
    
    .brain-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      display: block;
      animation: float 3s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    .logo { 
      font-size: 2rem; 
      font-weight: 700;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .subtitle { 
      font-size: 0.95rem; 
      color: #64748b; 
      margin-top: 0.5rem;
    }
    
    .auth-box { 
      background: rgba(15, 15, 25, 0.8); 
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08); 
      border-radius: 1.25rem; 
      padding: 2rem; 
      margin-bottom: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    
    .tabs { 
      display: flex; 
      margin-bottom: 1.5rem; 
      border-radius: 0.75rem; 
      overflow: hidden; 
      background: rgba(0,0,0,0.4);
      padding: 0.25rem;
    }
    
    .tab { 
      flex: 1; 
      padding: 0.75rem 1rem; 
      cursor: pointer; 
      transition: all 0.3s ease; 
      background: transparent; 
      border: none; 
      color: #64748b; 
      font-size: 0.9rem;
      font-weight: 500;
      border-radius: 0.5rem;
    }
    
    .tab.active { 
      background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%); 
      color: white;
      box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
    }
    
    .tab:hover:not(.active) { color: #a0aec0; }
    
    .form-group { margin-bottom: 1.25rem; text-align: left; }
    
    .form-group label { 
      display: block; 
      font-size: 0.8rem; 
      color: #94a3b8; 
      margin-bottom: 0.5rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .form-group input { 
      width: 100%; 
      padding: 0.875rem 1rem; 
      background: rgba(0,0,0,0.4); 
      border: 1px solid rgba(255,255,255,0.08); 
      border-radius: 0.75rem; 
      color: white; 
      font-size: 1rem; 
      outline: none; 
      transition: all 0.3s ease;
    }
    
    .form-group input:focus { 
      border-color: #00d4ff;
      box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
    }
    
    .form-group input::placeholder { color: #475569; }
    
    .btn { 
      display: block; 
      width: 100%; 
      padding: 1rem; 
      background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%); 
      color: white; 
      border: none; 
      border-radius: 0.75rem; 
      font-weight: 600; 
      font-size: 1rem; 
      cursor: pointer; 
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .btn:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 10px 40px rgba(0, 212, 255, 0.4);
    }
    
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    
    .error { 
      background: rgba(239, 68, 68, 0.15); 
      border: 1px solid rgba(239, 68, 68, 0.3); 
      color: #fca5a5; 
      padding: 0.875rem; 
      border-radius: 0.75rem; 
      margin-bottom: 1rem; 
      font-size: 0.875rem;
    }
    
    .success { 
      background: rgba(34, 197, 94, 0.15); 
      border: 1px solid rgba(34, 197, 94, 0.3); 
      color: #86efac; 
      padding: 0.875rem; 
      border-radius: 0.75rem; 
      margin-bottom: 1rem; 
      font-size: 0.875rem;
    }
    
    .hidden { display: none; }
    
    .divider { 
      display: flex; 
      align-items: center; 
      margin: 1.5rem 0; 
      gap: 1rem; 
    }
    
    .divider span { color: #475569; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
    
    .sso-btn { 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      gap: 0.5rem; 
      width: 100%; 
      padding: 0.875rem; 
      background: rgba(255,255,255,0.03); 
      border: 1px solid rgba(255,255,255,0.1); 
      border-radius: 0.75rem; 
      color: #94a3b8; 
      font-size: 0.9rem; 
      cursor: pointer; 
      transition: all 0.3s ease; 
      text-decoration: none;
    }
    
    .sso-btn:hover { 
      border-color: #00d4ff; 
      color: white;
      background: rgba(0, 212, 255, 0.05);
    }
    
    .status { 
      margin-top: 1.5rem; 
      font-size: 0.8rem; 
      color: #22c55e;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: blink 2s ease-in-out infinite;
    }
    
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .free-credits { 
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(124, 58, 237, 0.1)); 
      border: 1px solid rgba(0, 212, 255, 0.2); 
      padding: 0.875rem; 
      border-radius: 0.75rem; 
      margin-bottom: 1.5rem; 
      font-size: 0.9rem; 
      color: #7dd3fc;
    }
    
    .features {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .feature {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #64748b;
    }
    
    .feature-icon {
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <span class="brain-icon">🧠</span>
      <div class="logo">Neural Link</div>
      <p class="subtitle">Advanced AI Chat Interface</p>
    </div>
    
    <div class="auth-box">
      <div class="tabs">
        <button class="tab active" onclick="showTab('login')">Sign In</button>
        <button class="tab" onclick="showTab('signup')">Create Account</button>
      </div>
      
      <div id="message"></div>
      
      <div class="free-credits">🎁 Get 5 free AI credits when you sign up!</div>
      
      <!-- Login Form -->
      <form id="loginForm" onsubmit="handleLogin(event)">
        <div class="form-group">
          <label for="loginEmail">Email Address</label>
          <input type="email" id="loginEmail" placeholder="you@example.com" required autocomplete="email">
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" placeholder="Enter your password" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn" id="loginBtn">Sign In</button>
      </form>
      
      <!-- Signup Form -->
      <form id="signupForm" class="hidden" onsubmit="handleSignup(event)">
        <div class="form-group">
          <label for="signupName">Full Name</label>
          <input type="text" id="signupName" placeholder="Your name (optional)" autocomplete="name">
        </div>
        <div class="form-group">
          <label for="signupEmail">Email Address</label>
          <input type="email" id="signupEmail" placeholder="you@example.com" required autocomplete="email">
        </div>
        <div class="form-group">
          <label for="signupPassword">Password</label>
          <input type="password" id="signupPassword" placeholder="Minimum 6 characters" required minlength="6" autocomplete="new-password">
        </div>
        <button type="submit" class="btn" id="signupBtn">Create Account</button>
      </form>
      
      <div class="divider"><span>or</span></div>
      
      <a href="https://onelastai.co/dashboard" class="sso-btn">
        Continue with One Last AI Account →
      </a>
    </div>
    
    <div class="status">
      <span class="status-dot"></span>
      All Systems Operational
    </div>
    
    <div class="features">
      <div class="feature"><span class="feature-icon">⚡</span> GPT-4, Claude & Gemini</div>
      <div class="feature"><span class="feature-icon">🔒</span> Secure & Private</div>
      <div class="feature"><span class="feature-icon">💎</span> Pay-as-you-go</div>
    </div>
  </div>
  
  <script>
    function showTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.tab:' + (tab === 'login' ? 'first-child' : 'last-child')).classList.add('active');
      document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
      document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
      document.getElementById('message').innerHTML = '';
    }
    
    function showMessage(text, isError = false) {
      document.getElementById('message').innerHTML = '<div class="' + (isError ? 'error' : 'success') + '">' + text + '</div>';
    }
    
    async function handleLogin(e) {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      btn.disabled = true;
      btn.textContent = 'Signing in...';
      
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value,
          }),
        });
        
        const data = await res.json();
        
        if (data.success) {
          showMessage('Login successful! Redirecting...');
          setTimeout(() => window.location.href = '/app', 500);
        } else {
          showMessage(data.error || 'Login failed', true);
        }
      } catch (err) {
        showMessage('Connection error. Please try again.', true);
      }
      
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
    
    async function handleSignup(e) {
      e.preventDefault();
      const btn = document.getElementById('signupBtn');
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: document.getElementById('signupName').value,
            email: document.getElementById('signupEmail').value,
            password: document.getElementById('signupPassword').value,
          }),
        });
        
        const data = await res.json();
        
        if (data.success) {
          showMessage('Account created! Redirecting...');
          setTimeout(() => window.location.href = '/app', 500);
        } else {
          showMessage(data.error || 'Signup failed', true);
        }
      } catch (err) {
        showMessage('Connection error. Please try again.', true);
      }
      
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
    
    // Show error from URL if any
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      const messages = {
        'not_authenticated': 'Please sign in to continue',
        'user_not_found': 'User account not found',
        'session_expired': 'Your session has expired. Please sign in again.',
        'invalid_token': 'Invalid authentication token',
        'auth_failed': 'Authentication failed',
      };
      showMessage(messages[error] || error, true);
    }
  </script>
</body>
</html>
  `);
});

// Main App Interface - requires authentication
app.get('/app', async (req, res) => {
  const sessionToken = req.cookies.neural_link_session;
  
  if (!sessionToken) {
    return res.redirect('/?error=not_authenticated');
  }

  try {
    const secret = new TextEncoder().encode(SUBDOMAIN_SECRET);
    const { payload } = await jose.jwtVerify(sessionToken, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { credits: true },
    });

    if (!user) {
      res.clearCookie('neural_link_session');
      return res.redirect('/?error=user_not_found');
    }

    // Serve the Neural Link app
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neural Link - AI Chat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f0f23; min-height: 100vh; color: white; }
    .app-container { display: flex; flex-direction: column; height: 100vh; max-width: 900px; margin: 0 auto; }
    
    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15, 15, 35, 0.95); }
    .logo { display: flex; align-items: center; gap: 0.75rem; }
    .logo h1 { font-size: 1.25rem; background: linear-gradient(90deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .user-info { display: flex; align-items: center; gap: 1rem; }
    .credits { background: linear-gradient(90deg, #7c3aed, #3b82f6); padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.875rem; font-weight: 600; }
    .user-name { color: #a0aec0; font-size: 0.875rem; }
    .logout-btn { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #a0aec0; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem; transition: all 0.2s; }
    .logout-btn:hover { border-color: #f472b6; color: #f472b6; }
    
    /* Chat Area */
    .chat-area { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .message { max-width: 85%; padding: 1rem 1.25rem; border-radius: 1rem; line-height: 1.6; }
    .message.user { align-self: flex-end; background: linear-gradient(135deg, #7c3aed, #3b82f6); }
    .message.assistant { align-self: flex-start; background: rgba(255,255,255,0.1); }
    .welcome-message { text-align: center; color: #a0aec0; padding: 3rem 1rem; }
    .welcome-message h2 { font-size: 1.5rem; margin-bottom: 0.5rem; color: white; }
    .welcome-message p { margin-bottom: 1.5rem; }
    .suggestion-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
    .suggestion-chip { background: rgba(124, 58, 237, 0.2); border: 1px solid rgba(124, 58, 237, 0.4); padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; color: #c4b5fd; }
    .suggestion-chip:hover { background: rgba(124, 58, 237, 0.4); border-color: #7c3aed; }
    
    /* Input Area */
    .input-area { padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(15, 15, 35, 0.95); }
    .input-container { display: flex; gap: 0.75rem; }
    .input-container textarea { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; padding: 0.875rem 1rem; color: white; font-size: 1rem; resize: none; outline: none; transition: border-color 0.2s; font-family: inherit; }
    .input-container textarea:focus { border-color: #7c3aed; }
    .input-container textarea::placeholder { color: #64748b; }
    .send-btn { background: linear-gradient(90deg, #7c3aed, #3b82f6); border: none; border-radius: 0.75rem; padding: 0 1.5rem; cursor: pointer; font-size: 1rem; color: white; font-weight: 600; transition: transform 0.2s, box-shadow 0.2s; }
    .send-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    
    /* Provider Selector */
    .provider-selector { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .provider-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; cursor: pointer; color: #a0aec0; transition: all 0.2s; }
    .provider-btn.active { background: rgba(124, 58, 237, 0.3); border-color: #7c3aed; color: white; }
    .provider-btn:hover { border-color: #7c3aed; }
    
    /* Loading */
    .typing-indicator { display: flex; gap: 0.25rem; padding: 1rem; }
    .typing-dot { width: 8px; height: 8px; background: #7c3aed; border-radius: 50%; animation: typing 1.4s infinite; }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-10px); } }
  </style>
</head>
<body>
  <div class="app-container">
    <header class="header">
      <div class="logo">
        <span style="font-size: 1.5rem;">🧠</span>
        <h1>Neural Link</h1>
      </div>
      <div class="user-info">
        <span class="credits">💎 ${user.credits?.balance?.toFixed(1) || '0.0'} credits</span>
        <span class="user-name">${user.name || user.email}</span>
        <button class="logout-btn" onclick="logout()">Logout</button>
      </div>
    </header>
    
    <div class="chat-area" id="chatArea">
      <div class="welcome-message">
        <h2>Welcome to Neural Link! 👋</h2>
        <p>Your AI-powered learning companion. Ask me anything!</p>
        <div class="suggestion-chips">
          <span class="suggestion-chip" onclick="sendSuggestion(this)">Explain quantum computing</span>
          <span class="suggestion-chip" onclick="sendSuggestion(this)">Help me learn Python</span>
          <span class="suggestion-chip" onclick="sendSuggestion(this)">Write a creative story</span>
          <span class="suggestion-chip" onclick="sendSuggestion(this)">Solve a math problem</span>
        </div>
      </div>
    </div>
    
    <div class="input-area">
      <div class="provider-selector">
        <button class="provider-btn active" data-provider="anthropic">Claude</button>
        <button class="provider-btn" data-provider="openai">GPT-4</button>
        <button class="provider-btn" data-provider="gemini">Gemini</button>
      </div>
      <div class="input-container">
        <textarea id="messageInput" placeholder="Type your message..." rows="1" onkeydown="handleKeydown(event)"></textarea>
        <button class="send-btn" id="sendBtn" onclick="sendMessage()">Send</button>
      </div>
    </div>
  </div>
  
  <script>
    let selectedProvider = 'anthropic';
    let isLoading = false;
    const messages = [];
    
    // Provider selection
    document.querySelectorAll('.provider-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedProvider = btn.dataset.provider;
      });
    });
    
    function handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }
    
    function sendSuggestion(chip) {
      document.getElementById('messageInput').value = chip.textContent;
      sendMessage();
    }
    
    async function sendMessage() {
      const input = document.getElementById('messageInput');
      const message = input.value.trim();
      if (!message || isLoading) return;
      
      isLoading = true;
      input.value = '';
      document.getElementById('sendBtn').disabled = true;
      
      // Clear welcome message on first message
      const welcome = document.querySelector('.welcome-message');
      if (welcome) welcome.remove();
      
      // Add user message
      addMessage('user', message);
      messages.push({ role: 'user', content: message });
      
      // Show typing indicator
      const chatArea = document.getElementById('chatArea');
      const typingDiv = document.createElement('div');
      typingDiv.className = 'message assistant typing-indicator';
      typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
      chatArea.appendChild(typingDiv);
      chatArea.scrollTop = chatArea.scrollHeight;
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            messages: messages,
            provider: selectedProvider,
            model: getModelForProvider(selectedProvider),
          }),
        });
        
        typingDiv.remove();
        
        if (!response.ok) {
          const error = await response.json();
          addMessage('assistant', 'Sorry, something went wrong: ' + (error.error || 'Unknown error'));
        } else {
          const data = await response.json();
          addMessage('assistant', data.content || data.message || 'No response');
          messages.push({ role: 'assistant', content: data.content || data.message });
          
          // Update credits display
          if (data.creditsRemaining !== undefined) {
            document.querySelector('.credits').textContent = '💎 ' + data.creditsRemaining.toFixed(1) + ' credits';
          }
        }
      } catch (error) {
        typingDiv.remove();
        addMessage('assistant', 'Connection error. Please try again.');
      }
      
      isLoading = false;
      document.getElementById('sendBtn').disabled = false;
      input.focus();
    }
    
    function addMessage(role, content) {
      const chatArea = document.getElementById('chatArea');
      const div = document.createElement('div');
      div.className = 'message ' + role;
      div.textContent = content;
      chatArea.appendChild(div);
      chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    function getModelForProvider(provider) {
      const models = {
        anthropic: 'claude-sonnet-4-20250514',
        openai: 'gpt-4o',
        gemini: 'gemini-2.0-flash',
      };
      return models[provider] || 'claude-sonnet-4-20250514';
    }
    
    function logout() {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .then(() => window.location.href = '/');
    }
    
    // Auto-resize textarea
    const textarea = document.getElementById('messageInput');
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });
  </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('[App] Session verification failed:', error);
    res.clearCookie('neural_link_session');
    res.redirect('/?error=session_expired');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'neural-link-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Status
app.get('/api/status', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      success: true,
      status: 'operational',
      database: 'connected',
      providers: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        mistral: !!process.env.MISTRAL_API_KEY,
        xai: !!process.env.XAI_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        cerebras: !!process.env.CEREBRAS_API_KEY,
      },
      stripe: !!process.env.STRIPE_SECRET_KEY,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'degraded',
      error: error.message,
    });
  }
});

// ============================================================================
// AUTH ROUTES - Independent authentication (maula.onelastai.co)
// ============================================================================

// Get current user (uses only local session)
app.get('/api/auth/me', async (req, res) => {
  try {
    const sessionToken = req.cookies?.neural_link_session;
    
    if (!sessionToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(sessionToken, secret);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { credits: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: parseFloat(user.credits?.balance || 0),
        lifetimeSpent: parseFloat(user.credits?.lifetimeSpent || 0),
      },
    });

  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid session' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('neural_link_session');
  res.json({ success: true });
});

// Login (email + password)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { credits: true },
    });
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    if (!user.passwordHash) {
      return res.status(401).json({ 
        success: false, 
        error: 'Please set a password for your account.',
        needsPasswordSetup: true 
      });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Create session token
    const secret = new TextEncoder().encode(JWT_SECRET);
    const sessionToken = await new jose.SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);
    
    // Set cookie
    res.cookie('neural_link_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    console.log(`[Auth] User ${user.email} logged in successfully`);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: Number(user.credits?.balance) || 0,
      },
    });
    
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Signup (create new account)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user with credits
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
        isVerified: true, // Auto-verify for simplicity
        credits: {
          create: {
            balance: 5.0, // 5 free credits to start
            freeCreditsMax: 5.0,
          },
        },
      },
      include: { credits: true },
    });
    
    // Create session token
    const secret = new TextEncoder().encode(JWT_SECRET);
    const sessionToken = await new jose.SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);
    
    // Set cookie
    res.cookie('neural_link_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    console.log(`[Auth] New user created: ${user.email}`);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: Number(user.credits?.balance) || 5,
      },
    });
    
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    res.status(500).json({ success: false, error: 'Signup failed' });
  }
});

// Set/Change password
app.post('/api/auth/set-password', async (req, res) => {
  try {
    const sessionToken = req.cookies?.neural_link_session;
    
    if (!sessionToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(sessionToken, secret);
    
    const passwordHash = await bcrypt.hash(password, 12);
    
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash },
    });
    
    console.log(`[Auth] Password set for user ${payload.email}`);
    
    res.json({ success: true, message: 'Password set successfully' });
    
  } catch (error) {
    console.error('[Auth] Set password error:', error);
    res.status(500).json({ success: false, error: 'Failed to set password' });
  }
});

// ============================================================================
// CREDITS ROUTES
// ============================================================================

// Auth middleware
const requireAuth = async (req, res, next) => {
  try {
    const sessionToken = req.cookies?.neural_link_session;
    
    if (!sessionToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
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
    res.status(401).json({ success: false, error: 'Invalid session' });
  }
};

// Get credit balance
app.get('/api/credits/balance', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      credits: {
        balance: req.user.credits?.balance || 0,
        lifetimeEarned: req.user.credits?.lifetimeEarned || 0,
        lifetimeSpent: req.user.credits?.lifetimeSpent || 0,
        freeCreditsUsed: req.user.credits?.freeCreditsUsed || 0,
        freeCreditsMax: req.user.credits?.freeCreditsMax || 5,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get balance' });
  }
});

// Get credit transaction history
app.get('/api/credits/history', requireAuth, async (req, res) => {
  try {
    const transactions = await prisma.creditTransaction.findMany({
      where: { userCreditsId: req.user.credits?.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

// Get credit packages (for purchase)
app.get('/api/credits/packages', async (req, res) => {
  try {
    const packages = await prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get packages' });
  }
});

// ============================================================================
// CHAT ROUTES - Main Chat Endpoint
// ============================================================================

// Get available providers (Custom branded display names)
app.get('/api/chat/providers', (req, res) => {
  const providers = [
    { 
      id: 'anthropic', 
      name: 'Maula AI', 
      models: [
        { id: 'claude-sonnet-4-20250514', name: 'Code Expert Pro' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Deep Thinker' }
      ], 
      available: !!process.env.ANTHROPIC_API_KEY 
    },
    { 
      id: 'openai', 
      name: 'One Last AI', 
      models: [
        { id: 'gpt-4o', name: 'Vision Master' },
        { id: 'gpt-4o-mini', name: 'Fast Code' }
      ], 
      available: !!process.env.OPENAI_API_KEY 
    },
    { 
      id: 'gemini', 
      name: 'Planner', 
      models: [
        { id: 'gemini-2.0-flash', name: 'Flash Think' },
        { id: 'gemini-1.5-pro', name: 'Strategic Mind' }
      ], 
      available: !!process.env.GEMINI_API_KEY 
    },
    { 
      id: 'mistral', 
      name: 'Code Expert', 
      models: [
        { id: 'mistral-large-latest', name: 'Master Coder' }
      ], 
      available: !!process.env.MISTRAL_API_KEY 
    },
    { 
      id: 'groq', 
      name: 'Speed AI', 
      models: [
        { id: 'llama-3.3-70b-versatile', name: 'Ultra Fast' }
      ], 
      available: !!process.env.GROQ_API_KEY 
    },
  ];
  res.json({ success: true, providers: providers.filter(p => p.available) });
});

// Main chat endpoint
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { messages, provider = 'anthropic', model } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'Messages required' });
    }
    
    // Check credits
    const credits = Number(req.user.credits?.balance) || 0;
    if (credits <= 0) {
      return res.status(402).json({ success: false, error: 'Insufficient credits' });
    }
    
    // Route to provider
    let response;
    const selectedModel = model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 
                                    provider === 'openai' ? 'gpt-4o' :
                                    provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o');
    
    if (provider === 'anthropic') {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 4096,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await anthropicRes.json();
      response = data.content?.[0]?.text || data.error?.message || 'No response';
    } else if (provider === 'openai') {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages,
        }),
      });
      const data = await openaiRes.json();
      response = data.choices?.[0]?.message?.content || data.error?.message || 'No response';
    } else if (provider === 'gemini') {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        }),
      });
      const data = await geminiRes.json();
      response = data.candidates?.[0]?.content?.parts?.[0]?.text || data.error?.message || 'No response';
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported provider' });
    }
    
    // Deduct credits (0.1 per message)
    const creditCost = 0.1;
    await prisma.userCredits.update({
      where: { userId: req.user.id },
      data: {
        balance: { decrement: creditCost },
        lifetimeSpent: { increment: creditCost },
      },
    });
    
    res.json({
      success: true,
      content: response,
      message: response,
      creditsRemaining: credits - creditCost,
    });
    
  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({ success: false, error: 'Chat failed' });
  }
});

// ============================================================================
// SPEECH-TO-SPEECH (STS) ROUTES
// ============================================================================

import OpenAI from 'openai';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Dedicated API key for voice features - Use environment variable
const VOICE_API_KEY = process.env.OPENAI_VOICE_API_KEY || process.env.OPENAI_API_KEY;

const openaiClient = new OpenAI({ apiKey: VOICE_API_KEY });

// Voice options for TTS
const VOICE_OPTIONS = {
  'nova': { name: 'Nova', description: 'Warm & conversational', gender: 'female' },
  'alloy': { name: 'Alloy', description: 'Balanced & versatile', gender: 'neutral' },
  'echo': { name: 'Echo', description: 'Smooth & clear', gender: 'male' },
  'fable': { name: 'Fable', description: 'Expressive & dramatic', gender: 'male' },
  'onyx': { name: 'Onyx', description: 'Deep & authoritative', gender: 'male' },
  'shimmer': { name: 'Shimmer', description: 'Bright & energetic', gender: 'female' },
};

// Get available voices
app.get('/api/speech/voices', (req, res) => {
  res.json({ 
    success: true, 
    voices: VOICE_OPTIONS,
    available: true
  });
});

// Speech-to-Text (STT) - Transcribe audio
app.post('/api/speech/transcribe', requireAuth, async (req, res) => {
  try {
    // Handle base64 audio or file upload
    const { audio, language = 'en' } = req.body;
    
    if (!audio) {
      return res.status(400).json({ success: false, error: 'Audio data required' });
    }

    // Check credits
    const credits = Number(req.user.credits?.balance) || 0;
    if (credits < 0.5) {
      return res.status(402).json({ success: false, error: 'Insufficient credits for transcription' });
    }

    // Decode base64 audio to buffer
    const audioBuffer = Buffer.from(audio.replace(/^data:audio\/\w+;base64,/, ''), 'base64');
    
    // Create temp file for OpenAI
    const tempPath = path.join(os.tmpdir(), `audio_${Date.now()}.webm`);
    fs.writeFileSync(tempPath, audioBuffer);

    // Transcribe with Whisper
    const transcription = await openaiClient.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language,
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);

    // Deduct credits
    await prisma.userCredits.update({
      where: { userId: req.user.id },
      data: { balance: { decrement: 0.2 } },
    });

    res.json({ 
      success: true, 
      text: transcription.text,
      language,
      creditsUsed: 0.2
    });

  } catch (error) {
    console.error('[STT] Error:', error);
    res.status(500).json({ success: false, error: 'Transcription failed' });
  }
});

// Text-to-Speech (TTS) - Generate speech from text
app.post('/api/speech/synthesize', requireAuth, async (req, res) => {
  try {
    const { text, voice = 'nova', speed = 1.0 } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text required' });
    }

    // Check credits
    const credits = Number(req.user.credits?.balance) || 0;
    if (credits < 0.3) {
      return res.status(402).json({ success: false, error: 'Insufficient credits for speech synthesis' });
    }

    // Generate speech
    const response = await openaiClient.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      speed: Math.max(0.25, Math.min(4.0, speed)),
    });

    // Convert to base64
    const buffer = Buffer.from(await response.arrayBuffer());
    const audioBase64 = buffer.toString('base64');

    // Deduct credits
    await prisma.userCredits.update({
      where: { userId: req.user.id },
      data: { balance: { decrement: 0.3 } },
    });

    res.json({ 
      success: true, 
      audio: `data:audio/mp3;base64,${audioBase64}`,
      voice,
      creditsUsed: 0.3
    });

  } catch (error) {
    console.error('[TTS] Error:', error);
    res.status(500).json({ success: false, error: 'Speech synthesis failed' });
  }
});

// Full Speech-to-Speech (STS) - Complete voice conversation flow
app.post('/api/speech/conversation', requireAuth, async (req, res) => {
  try {
    const { 
      audio, 
      voice = 'nova', 
      provider = 'openai', 
      model,
      systemPrompt,
      conversationHistory = []
    } = req.body;
    
    if (!audio) {
      return res.status(400).json({ success: false, error: 'Audio data required' });
    }

    // Check credits (STT + Chat + TTS = ~1 credit)
    const credits = Number(req.user.credits?.balance) || 0;
    if (credits < 1) {
      return res.status(402).json({ success: false, error: 'Insufficient credits for voice conversation' });
    }

    // Step 1: Transcribe audio (STT)
    const audioBuffer = Buffer.from(audio.replace(/^data:audio\/\w+;base64,/, ''), 'base64');
    const tempPath = path.join(os.tmpdir(), `sts_${Date.now()}.webm`);
    fs.writeFileSync(tempPath, audioBuffer);

    const transcription = await openaiClient.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
    });
    fs.unlinkSync(tempPath);

    const userText = transcription.text;
    console.log('[STS] Transcribed:', userText);

    // Step 2: Get AI response (Chat)
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...conversationHistory,
      { role: 'user', content: userText }
    ];

    let aiResponse;
    const selectedModel = model || 'gpt-4o-mini';

    if (provider === 'openai' || !process.env.ANTHROPIC_API_KEY) {
      const completion = await openaiClient.chat.completions.create({
        model: selectedModel,
        messages,
        max_tokens: 500, // Keep responses concise for voice
      });
      aiResponse = completion.choices[0].message.content;
    } else if (provider === 'anthropic') {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: messages.filter(m => m.role !== 'system'),
          system: systemPrompt,
        }),
      });
      const data = await anthropicRes.json();
      aiResponse = data.content?.[0]?.text || 'Sorry, I could not process that.';
    }

    console.log('[STS] AI Response:', aiResponse?.substring(0, 100));

    // Step 3: Convert response to speech (TTS)
    const speechResponse = await openaiClient.audio.speech.create({
      model: 'tts-1',
      voice,
      input: aiResponse,
      speed: 1.0,
    });

    const speechBuffer = Buffer.from(await speechResponse.arrayBuffer());
    const speechBase64 = speechBuffer.toString('base64');

    // Deduct credits (1 credit for full STS cycle)
    await prisma.userCredits.update({
      where: { userId: req.user.id },
      data: { balance: { decrement: 1 } },
    });

    res.json({ 
      success: true,
      userText,
      aiText: aiResponse,
      audio: `data:audio/mp3;base64,${speechBase64}`,
      voice,
      creditsUsed: 1
    });

  } catch (error) {
    console.error('[STS] Error:', error);
    res.status(500).json({ success: false, error: 'Voice conversation failed' });
  }
});

// ============================================================================
// USAGE ROUTES
// ============================================================================

// Get usage statistics
app.get('/api/usage/stats', requireAuth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsage, providerBreakdown, dailyUsage] = await Promise.all([
      // Total usage this month
      prisma.usageLog.aggregate({
        where: {
          userId: req.user.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          totalTokens: true,
          creditsCost: true,
        },
        _count: true,
      }),

      // Usage by provider
      prisma.usageLog.groupBy({
        by: ['provider'],
        where: {
          userId: req.user.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          totalTokens: true,
          creditsCost: true,
        },
        _count: true,
      }),

      // Daily usage for chart
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          SUM(total_tokens) as tokens,
          SUM(credits_cost) as credits,
          COUNT(*) as requests
        FROM usage_logs
        WHERE user_id = ${req.user.id}
          AND created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
    ]);

    res.json({
      success: true,
      stats: {
        total: {
          tokens: totalUsage._sum.totalTokens || 0,
          credits: totalUsage._sum.creditsCost || 0,
          requests: totalUsage._count || 0,
        },
        byProvider: providerBreakdown,
        daily: dailyUsage,
      },
    });
  } catch (error) {
    console.error('[Usage] Stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// ============================================================================
// BILLING ROUTES - Multi-App Credit System
// ============================================================================

// App-specific credit packages
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

const VALID_APPS = Object.keys(APP_CONFIGS);

// Get all apps info
app.get('/api/billing/apps', (req, res) => {
  const apps = Object.entries(APP_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
    icon: config.icon
  }));
  res.json({ success: true, apps });
});

// Get billing plans for all apps
app.get('/api/billing/plans', (req, res) => {
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

// Get packages for a specific app
app.get('/api/billing/packages/:appId', (req, res) => {
  const { appId } = req.params;
  if (!VALID_APPS.includes(appId)) {
    return res.status(400).json({ success: false, error: 'Invalid app ID' });
  }
  const appConfig = APP_CONFIGS[appId];
  res.json({ 
    success: true,
    app: { id: appId, name: appConfig.name, description: appConfig.description, icon: appConfig.icon },
    packages: appConfig.packages,
    stripeMode: process.env.STRIPE_MODE || 'test',
  });
});

// Legacy packages endpoint
app.get('/api/billing/packages', (req, res) => {
  const appId = req.query.app || 'neural-chat';
  const appConfig = APP_CONFIGS[appId] || APP_CONFIGS['neural-chat'];
  res.json({ 
    success: true,
    packages: appConfig.packages,
    stripeMode: process.env.STRIPE_MODE || 'test',
  });
});

// Get user credits
app.get('/api/billing/credits', requireAuth, async (req, res) => {
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

// Get all credits info
app.get('/api/billing/credits-all', requireAuth, async (req, res) => {
  try {
    const credits = await prisma.userCredits.findUnique({
      where: { userId: req.user.id },
    });
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

// Get billing history
app.get('/api/billing/history', requireAuth, async (req, res) => {
  try {
    const history = await prisma.billingHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

// Get transactions
app.get('/api/billing/transactions', requireAuth, async (req, res) => {
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

// Create checkout session for specific app
app.post('/api/billing/checkout/:appId', requireAuth, async (req, res) => {
  try {
    const { appId } = req.params;
    const { packageId } = req.body;
    
    if (!stripeClient) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }
    
    if (!VALID_APPS.includes(appId)) {
      return res.status(400).json({ success: false, error: 'Invalid app ID' });
    }

    const appConfig = APP_CONFIGS[appId];
    const creditPackage = appConfig.packages.find(p => p.id === packageId);
    
    if (!creditPackage) {
      return res.status(400).json({ success: false, error: 'Invalid package' });
    }

    const appUrls = {
      'neural-chat': '/neural-chat/',
      'canvas-studio': '/canvas-studio/',
      'maula-editor': '/maula-editor/'
    };
    const baseUrl = process.env.FRONTEND_URL || 'https://maula.onelastai.co';
    const appPath = appUrls[appId] || '/';

    const session = await stripeClient.checkout.sessions.create({
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
      line_items: [{
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
      }],
      success_url: `${baseUrl}${appPath}?payment=success&credits=${creditPackage.credits}`,
      cancel_url: `${baseUrl}${appPath}?payment=cancelled`,
    });

    console.log(`[Billing] Checkout: ${session.id} | App: ${appId} | User: ${req.user.id} | Credits: ${creditPackage.credits}`);
    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[Billing] Checkout error:', error);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// Legacy checkout endpoint
app.post('/api/billing/checkout', requireAuth, async (req, res) => {
  try {
    const { packageId, appId = 'neural-chat' } = req.body;
    
    if (!stripeClient) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }
    
    const appConfig = APP_CONFIGS[appId] || APP_CONFIGS['neural-chat'];
    let creditPackage = appConfig.packages.find(p => p.id === packageId);
    
    // Try all apps if not found
    if (!creditPackage) {
      for (const [aid, config] of Object.entries(APP_CONFIGS)) {
        const pkg = config.packages.find(p => p.id === packageId);
        if (pkg) {
          creditPackage = pkg;
          break;
        }
      }
    }
    
    if (!creditPackage) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }
    
    const baseUrl = process.env.FRONTEND_URL || 'https://maula.onelastai.co';

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${appConfig.name} - ${creditPackage.name}`,
            description: `${creditPackage.credits} AI Credits`,
          },
          unit_amount: creditPackage.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/neural-chat/?payment=success&credits=${creditPackage.credits}`,
      cancel_url: `${baseUrl}/neural-chat/?payment=cancelled`,
      client_reference_id: req.user.id,
      metadata: {
        userId: req.user.id,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
        source: 'onelastai',
        appId: appId,
      },
    });
    
    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[Billing] Checkout error:', error);
    res.status(500).json({ success: false, error: 'Failed to create checkout' });
  }
});

// Add free credits (testing)
app.post('/api/billing/add-free-credits', requireAuth, async (req, res) => {
  try {
    const { amount = 10, appId = 'neural-chat' } = req.body;
    
    if (amount > 50) {
      return res.status(400).json({ success: false, error: 'Maximum 50 free credits allowed' });
    }

    const userCredits = await prisma.userCredits.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, balance: amount, lifetimeSpent: 0 },
      update: { balance: { increment: amount } },
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

    console.log(`[Billing] Added ${amount} free credits to user ${req.user.id}`);
    res.json({ success: true, credits: userCredits.balance, message: `Added ${amount} free credits!` });
  } catch (error) {
    console.error('[Billing] Add free credits error:', error);
    res.status(500).json({ success: false, error: 'Failed to add credits' });
  }
});

// ============================================================================
// CHAT ROUTES (placeholder - will be expanded)
// ============================================================================

// Note: Routes are defined inline above. Separate route files commented out
// due to missing dependencies on the server.
// import chatRoutes from './routes/chat.js';
// import canvasRoutes from './routes/canvas.js';
// import billingRoutes from './routes/billing.js';
// app.use('/api/chat', chatRoutes);
// app.use('/api/canvas', canvasRoutes);
// app.use('/api/billing', billingRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🧠 NEURAL LINK BACKEND');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   🚀 Server running on port ${PORT}`);
  console.log(`   📊 Health: http://localhost:${PORT}/health`);
  console.log(`   🔗 API: http://localhost:${PORT}/api`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

export default app;
