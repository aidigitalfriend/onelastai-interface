/**
 * Pre-built Full Application Templates
 * Complete ready-to-use application templates
 */

import { ProjectTemplate } from '../types';

export interface PrebuiltTemplate extends ProjectTemplate {
  thumbnail?: string;
  features: string[];
  techStack: string[];
}

export const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  // ==================== LANDING PAGES ====================
  {
    id: 'landing-saas',
    name: 'SaaS Landing Page',
    description: 'Modern SaaS product landing page with hero, features, pricing, and CTA sections',
    icon: '🚀',
    category: 'landing',
    features: ['Hero Section', 'Features Grid', 'Pricing Table', 'Testimonials', 'FAQ', 'Contact Form'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SaaSify - Modern SaaS Landing</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-900 text-white">
  <!-- Navigation -->
  <nav class="fixed w-full bg-gray-900/95 backdrop-blur-sm z-50 border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🚀</span>
          <span class="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">SaaSify</span>
        </div>
        <div class="hidden md:flex items-center gap-8">
          <a href="#features" class="text-gray-300 hover:text-white transition">Features</a>
          <a href="#pricing" class="text-gray-300 hover:text-white transition">Pricing</a>
          <a href="#testimonials" class="text-gray-300 hover:text-white transition">Testimonials</a>
          <a href="#faq" class="text-gray-300 hover:text-white transition">FAQ</a>
        </div>
        <div class="flex items-center gap-4">
          <button class="text-gray-300 hover:text-white transition">Sign In</button>
          <button class="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition">Get Started</button>
        </div>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="pt-32 pb-20 px-4">
    <div class="max-w-7xl mx-auto text-center">
      <div class="inline-block mb-4 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20">
        <span class="text-purple-400 text-sm">✨ Introducing SaaSify 2.0</span>
      </div>
      <h1 class="text-5xl md:text-7xl font-bold mb-6">
        Build amazing products
        <span class="block bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">10x faster</span>
      </h1>
      <p class="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
        The all-in-one platform for teams to collaborate, design, and ship beautiful products. Start free, scale infinitely.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button class="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-xl font-medium text-lg hover:opacity-90 transition shadow-lg shadow-purple-500/25">
          Start Free Trial →
        </button>
        <button class="border border-gray-700 px-8 py-4 rounded-xl font-medium text-lg hover:bg-gray-800 transition">
          Watch Demo
        </button>
      </div>
      <div class="mt-12 flex items-center justify-center gap-8 text-gray-400 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-green-400">✓</span> No credit card required
        </div>
        <div class="flex items-center gap-2">
          <span class="text-green-400">✓</span> 14-day free trial
        </div>
        <div class="flex items-center gap-2">
          <span class="text-green-400">✓</span> Cancel anytime
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section id="features" class="py-20 px-4 bg-gray-800/50">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">Powerful Features</h2>
        <p class="text-gray-400 text-lg">Everything you need to build, ship, and scale your product</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition">
          <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-2xl mb-4">⚡</div>
          <h3 class="text-xl font-semibold mb-2">Lightning Fast</h3>
          <p class="text-gray-400">Built on cutting-edge technology for blazing fast performance and instant results.</p>
        </div>
        <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-pink-500/50 transition">
          <div class="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center text-2xl mb-4">🔒</div>
          <h3 class="text-xl font-semibold mb-2">Enterprise Security</h3>
          <p class="text-gray-400">Bank-level encryption and security protocols to keep your data safe.</p>
        </div>
        <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition">
          <div class="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl mb-4">🤝</div>
          <h3 class="text-xl font-semibold mb-2">Team Collaboration</h3>
          <p class="text-gray-400">Real-time collaboration tools to keep your team in sync and productive.</p>
        </div>
        <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-green-500/50 transition">
          <div class="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl mb-4">📊</div>
          <h3 class="text-xl font-semibold mb-2">Advanced Analytics</h3>
          <p class="text-gray-400">Deep insights and analytics to make data-driven decisions.</p>
        </div>
        <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-yellow-500/50 transition">
          <div class="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-2xl mb-4">🔌</div>
          <h3 class="text-xl font-semibold mb-2">API & Integrations</h3>
          <p class="text-gray-400">Connect with 100+ tools and build custom integrations with our API.</p>
        </div>
        <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 hover:border-red-500/50 transition">
          <div class="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-2xl mb-4">💬</div>
          <h3 class="text-xl font-semibold mb-2">24/7 Support</h3>
          <p class="text-gray-400">Round-the-clock support from our expert team whenever you need help.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section id="pricing" class="py-20 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">Simple Pricing</h2>
        <p class="text-gray-400 text-lg">Choose the plan that works for you</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700">
          <h3 class="text-xl font-semibold mb-2">Starter</h3>
          <p class="text-gray-400 mb-6">Perfect for individuals</p>
          <div class="mb-6">
            <span class="text-4xl font-bold">$9</span>
            <span class="text-gray-400">/month</span>
          </div>
          <ul class="space-y-3 mb-8 text-gray-300">
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> 5 Projects</li>
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Basic Analytics</li>
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Email Support</li>
          </ul>
          <button class="w-full py-3 border border-gray-600 rounded-xl hover:bg-gray-700 transition">Get Started</button>
        </div>
        <div class="bg-gradient-to-b from-purple-900/50 to-gray-800 p-8 rounded-2xl border-2 border-purple-500 relative">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 px-4 py-1 rounded-full text-sm font-medium">Most Popular</div>
          <h3 class="text-xl font-semibold mb-2">Pro</h3>
          <p class="text-gray-400 mb-6">For growing teams</p>
          <div class="mb-6">
            <span class="text-4xl font-bold">$29</span>
            <span class="text-gray-400">/month</span>
          </div>
          <ul class="space-y-3 mb-8 text-gray-300">
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Unlimited Projects</li>
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Advanced Analytics</li>
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Priority Support</li>
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Team Collaboration</li>
          </ul>
          <button class="w-full py-3 bg-purple-500 rounded-xl hover:bg-purple-600 transition font-medium">Get Started</button>
        </div>
        <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700">
          <h3 class="text-xl font-semibold mb-2">Enterprise</h3>
          <p class="text-gray-400 mb-6">For large organizations</p>
          <div class="mb-6">
            <span class="text-4xl font-bold">$99</span>
            <span class="text-gray-400">/month</span>
          </div>
          <ul class="space-y-3 mb-8 text-gray-300">
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Everything in Pro</li>
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Custom Integrations</li>
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Dedicated Support</li>
            <li class="flex items-center gap-2"><span class="text-green-400">✓</span> SLA Guarantee</li>
          </ul>
          <button class="w-full py-3 border border-gray-600 rounded-xl hover:bg-gray-700 transition">Contact Sales</button>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 px-4 border-t border-gray-800">
    <div class="max-w-7xl mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🚀</span>
          <span class="text-xl font-bold">SaaSify</span>
        </div>
        <p class="text-gray-400 text-sm">© 2024 SaaSify. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `/* Custom animations */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1f2937;
}

::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}`,
      'script.js': `// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 50) {
    nav.classList.add('shadow-lg');
  } else {
    nav.classList.remove('shadow-lg');
  }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

console.log('🚀 SaaSify Landing Page Loaded!');`,
    },
  },

  // Landing Page 2: Agency Landing
  {
    id: 'landing-agency',
    name: 'Agency Landing',
    description: 'Creative digital agency landing page with portfolio showcase',
    icon: '🎨',
    category: 'landing',
    features: ['Hero Animation', 'Services Grid', 'Portfolio', 'Team Section', 'Contact'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pixel Studio - Creative Agency</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white">
  <nav class="fixed w-full bg-black/90 backdrop-blur z-50 py-4">
    <div class="max-w-6xl mx-auto px-6 flex justify-between items-center">
      <span class="text-2xl font-bold text-orange-500">PIXEL</span>
      <div class="hidden md:flex gap-8">
        <a href="#work" class="hover:text-orange-500 transition">Work</a>
        <a href="#services" class="hover:text-orange-500 transition">Services</a>
        <a href="#about" class="hover:text-orange-500 transition">About</a>
        <a href="#contact" class="hover:text-orange-500 transition">Contact</a>
      </div>
      <button class="bg-orange-500 px-6 py-2 rounded-full font-medium hover:bg-orange-600">Let's Talk</button>
    </div>
  </nav>
  <section class="min-h-screen flex items-center pt-20">
    <div class="max-w-6xl mx-auto px-6">
      <p class="text-orange-500 mb-4 tracking-widest">CREATIVE AGENCY</p>
      <h1 class="text-6xl md:text-8xl font-bold mb-6 leading-tight">We craft<br/><span class="text-orange-500">digital</span> experiences</h1>
      <p class="text-xl text-gray-400 max-w-xl mb-8">Award-winning agency helping brands stand out in the digital landscape.</p>
      <div class="flex gap-4">
        <button class="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-gray-200">View Work</button>
        <button class="border border-white px-8 py-4 rounded-full hover:bg-white hover:text-black transition">Watch Reel</button>
      </div>
    </div>
  </section>
  <section id="services" class="py-20 bg-zinc-900">
    <div class="max-w-6xl mx-auto px-6">
      <h2 class="text-4xl font-bold mb-12">Services</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="p-8 border border-zinc-800 rounded-2xl hover:border-orange-500 transition">
          <span class="text-4xl">🎨</span>
          <h3 class="text-xl font-bold mt-4 mb-2">Brand Identity</h3>
          <p class="text-gray-400">Logo design, brand guidelines, visual identity systems</p>
        </div>
        <div class="p-8 border border-zinc-800 rounded-2xl hover:border-orange-500 transition">
          <span class="text-4xl">💻</span>
          <h3 class="text-xl font-bold mt-4 mb-2">Web Development</h3>
          <p class="text-gray-400">Custom websites, e-commerce, web applications</p>
        </div>
        <div class="p-8 border border-zinc-800 rounded-2xl hover:border-orange-500 transition">
          <span class="text-4xl">📱</span>
          <h3 class="text-xl font-bold mt-4 mb-2">Mobile Apps</h3>
          <p class="text-gray-400">iOS, Android, cross-platform development</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 border-t border-zinc-800">
    <div class="max-w-6xl mx-auto px-6 text-center text-gray-500">
      <p>© 2024 Pixel Studio. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Landing Page 3: App Landing
  {
    id: 'landing-app',
    name: 'Mobile App Landing',
    description: 'Modern mobile app landing page with app store badges',
    icon: '📱',
    category: 'landing',
    features: ['App Preview', 'Feature List', 'Download Badges', 'Reviews', 'FAQ'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FitTrack - Your Fitness Companion</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-b from-emerald-900 to-gray-900 text-white min-h-screen">
  <nav class="py-6 px-6">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-2xl font-bold">🏃 FitTrack</span>
      <button class="bg-emerald-500 px-6 py-2 rounded-full font-medium">Download</button>
    </div>
  </nav>
  <section class="py-20 px-6">
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <div class="inline-block bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm mb-6">#1 Fitness App 2024</div>
        <h1 class="text-5xl md:text-6xl font-bold mb-6">Your personal<br/>fitness journey<br/>starts here</h1>
        <p class="text-xl text-gray-300 mb-8">Track workouts, count calories, achieve goals. Join 2M+ users transforming their lives.</p>
        <div class="flex gap-4 mb-8">
          <button class="bg-black px-6 py-3 rounded-xl flex items-center gap-3 hover:bg-gray-900">
            <span class="text-2xl">🍎</span>
            <div class="text-left"><div class="text-xs">Download on</div><div class="font-semibold">App Store</div></div>
          </button>
          <button class="bg-black px-6 py-3 rounded-xl flex items-center gap-3 hover:bg-gray-900">
            <span class="text-2xl">▶️</span>
            <div class="text-left"><div class="text-xs">Get it on</div><div class="font-semibold">Google Play</div></div>
          </button>
        </div>
        <div class="flex items-center gap-4 text-gray-400">
          <div class="flex -space-x-2">
            <div class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">😊</div>
            <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">💪</div>
            <div class="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">🔥</div>
          </div>
          <span>2M+ Active Users</span>
        </div>
      </div>
      <div class="relative">
        <div class="bg-gray-800 rounded-[3rem] p-4 shadow-2xl max-w-xs mx-auto">
          <div class="bg-gray-900 rounded-[2.5rem] p-6 aspect-[9/16] flex flex-col">
            <div class="text-center mb-4">
              <span class="text-4xl">🏋️</span>
              <h3 class="font-bold mt-2">Today's Workout</h3>
            </div>
            <div class="space-y-3 flex-1">
              <div class="bg-emerald-500/20 p-3 rounded-xl"><span>✅</span> Morning Run - 5km</div>
              <div class="bg-gray-800 p-3 rounded-xl"><span>⏳</span> Weight Training</div>
              <div class="bg-gray-800 p-3 rounded-xl"><span>⏳</span> Evening Yoga</div>
            </div>
            <div class="mt-4 bg-emerald-500 p-4 rounded-2xl text-center font-bold">Start Workout</div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="py-20 px-6 bg-gray-900/50">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Why Choose FitTrack?</h2>
      <div class="grid md:grid-cols-4 gap-6">
        <div class="text-center p-6"><span class="text-4xl">📊</span><h3 class="font-bold mt-4">Smart Analytics</h3><p class="text-gray-400 mt-2">AI-powered insights</p></div>
        <div class="text-center p-6"><span class="text-4xl">🎯</span><h3 class="font-bold mt-4">Goal Setting</h3><p class="text-gray-400 mt-2">Personalized targets</p></div>
        <div class="text-center p-6"><span class="text-4xl">👥</span><h3 class="font-bold mt-4">Community</h3><p class="text-gray-400 mt-2">Join challenges</p></div>
        <div class="text-center p-6"><span class="text-4xl">⌚</span><h3 class="font-bold mt-4">Sync Devices</h3><p class="text-gray-400 mt-2">All wearables</p></div>
      </div>
    </div>
  </section>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Landing Page 4: Startup Landing
  {
    id: 'landing-startup',
    name: 'Startup Landing',
    description: 'Minimalist startup landing page with waitlist signup',
    icon: '🌟',
    category: 'landing',
    features: ['Waitlist Form', 'Feature Preview', 'Social Proof', 'Newsletter'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus AI - The Future of Work</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white min-h-screen">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(76,29,149,0.1),transparent_50%)]"></div>
  <div class="relative">
    <nav class="py-6 px-6">
      <div class="max-w-4xl mx-auto flex justify-between items-center">
        <span class="text-xl font-bold flex items-center gap-2">◆ Nexus</span>
        <div class="flex items-center gap-6">
          <a href="#" class="text-gray-400 hover:text-white">About</a>
          <a href="#" class="text-gray-400 hover:text-white">Blog</a>
          <button class="bg-violet-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">Join Waitlist</button>
        </div>
      </div>
    </nav>
    <section class="py-32 px-6 text-center">
      <div class="max-w-4xl mx-auto">
        <div class="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-full text-sm text-violet-400 mb-8">
          <span class="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></span>
          Launching Q2 2024
        </div>
        <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          AI that works<br/>
          <span class="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">alongside you</span>
        </h1>
        <p class="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">Meet your new AI colleague. Automate repetitive tasks, get instant insights, and focus on what matters most.</p>
        <form class="max-w-md mx-auto flex gap-2 mb-8">
          <input type="email" placeholder="Enter your email" class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500">
          <button class="bg-violet-600 hover:bg-violet-700 px-6 py-3 rounded-xl font-medium whitespace-nowrap">Get Early Access</button>
        </form>
        <p class="text-gray-500 text-sm">Join 5,000+ on the waitlist · No spam, ever</p>
        <div class="flex justify-center gap-8 mt-16">
          <div><div class="text-3xl font-bold">50K+</div><div class="text-gray-500">Waitlist</div></div>
          <div class="w-px bg-slate-800"></div>
          <div><div class="text-3xl font-bold">$10M</div><div class="text-gray-500">Raised</div></div>
          <div class="w-px bg-slate-800"></div>
          <div><div class="text-3xl font-bold">Y-Com</div><div class="text-gray-500">Backed</div></div>
        </div>
      </div>
    </section>
    <section class="py-20 px-6 border-t border-slate-900">
      <div class="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
        <div class="text-center p-6">
          <div class="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">🤖</div>
          <h3 class="font-semibold mb-2">Smart Automation</h3>
          <p class="text-gray-400 text-sm">AI learns your workflows and automates repetitive tasks</p>
        </div>
        <div class="text-center p-6">
          <div class="w-12 h-12 bg-fuchsia-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">⚡</div>
          <h3 class="font-semibold mb-2">Instant Insights</h3>
          <p class="text-gray-400 text-sm">Get real-time analytics and actionable recommendations</p>
        </div>
        <div class="text-center p-6">
          <div class="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">🔒</div>
          <h3 class="font-semibold mb-2">Enterprise Ready</h3>
          <p class="text-gray-400 text-sm">SOC2 compliant with end-to-end encryption</p>
        </div>
      </div>
    </section>
  </div>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Landing Page 5: Product Launch
  {
    id: 'landing-product',
    name: 'Product Launch',
    description: 'Bold product launch page with countdown and pre-order',
    icon: '🎁',
    category: 'landing',
    features: ['Countdown Timer', 'Product Gallery', 'Pre-order', 'Specs'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AuraSound Pro - Premium Headphones</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-white min-h-screen">
  <nav class="py-6 px-6">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold tracking-wider">AURA<span class="text-amber-500">SOUND</span></span>
      <button class="bg-amber-500 text-black px-6 py-2 rounded-full font-bold hover:bg-amber-400">Pre-order Now</button>
    </div>
  </nav>
  <section class="py-20 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <div class="text-amber-500 font-medium mb-4">INTRODUCING</div>
      <h1 class="text-6xl md:text-8xl font-bold mb-6">AuraSound<br/><span class="text-amber-500">Pro</span></h1>
      <p class="text-xl text-gray-400 mb-8 max-w-xl mx-auto">Premium wireless headphones with spatial audio, 40-hour battery, and active noise cancellation.</p>
      <div class="text-8xl mb-12">🎧</div>
      <div class="flex justify-center gap-6 mb-12">
        <div class="bg-zinc-900 p-6 rounded-2xl text-center min-w-[100px]">
          <div class="text-3xl font-bold text-amber-500" id="days">07</div>
          <div class="text-gray-500 text-sm">Days</div>
        </div>
        <div class="bg-zinc-900 p-6 rounded-2xl text-center min-w-[100px]">
          <div class="text-3xl font-bold text-amber-500" id="hours">12</div>
          <div class="text-gray-500 text-sm">Hours</div>
        </div>
        <div class="bg-zinc-900 p-6 rounded-2xl text-center min-w-[100px]">
          <div class="text-3xl font-bold text-amber-500" id="mins">45</div>
          <div class="text-gray-500 text-sm">Minutes</div>
        </div>
        <div class="bg-zinc-900 p-6 rounded-2xl text-center min-w-[100px]">
          <div class="text-3xl font-bold text-amber-500" id="secs">30</div>
          <div class="text-gray-500 text-sm">Seconds</div>
        </div>
      </div>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button class="bg-amber-500 text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-amber-400">Pre-order $299</button>
        <button class="border border-zinc-700 px-8 py-4 rounded-full hover:bg-zinc-900">Watch Video</button>
      </div>
    </div>
  </section>
  <section class="py-20 px-6 bg-zinc-900">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Premium Features</h2>
      <div class="grid md:grid-cols-4 gap-6">
        <div class="text-center p-6 bg-zinc-800 rounded-2xl">
          <span class="text-3xl">🔊</span>
          <h3 class="font-bold mt-4">Spatial Audio</h3>
          <p class="text-gray-400 text-sm mt-2">360° immersive sound</p>
        </div>
        <div class="text-center p-6 bg-zinc-800 rounded-2xl">
          <span class="text-3xl">🔋</span>
          <h3 class="font-bold mt-4">40hr Battery</h3>
          <p class="text-gray-400 text-sm mt-2">All-day listening</p>
        </div>
        <div class="text-center p-6 bg-zinc-800 rounded-2xl">
          <span class="text-3xl">🔇</span>
          <h3 class="font-bold mt-4">ANC Pro</h3>
          <p class="text-gray-400 text-sm mt-2">Active noise cancel</p>
        </div>
        <div class="text-center p-6 bg-zinc-800 rounded-2xl">
          <span class="text-3xl">📱</span>
          <h3 class="font-bold mt-4">Smart Connect</h3>
          <p class="text-gray-400 text-sm mt-2">Seamless pairing</p>
        </div>
      </div>
    </div>
  </section>
  <script>
    setInterval(() => {
      const s = document.getElementById('secs');
      let val = parseInt(s.textContent);
      s.textContent = String(val > 0 ? val - 1 : 59).padStart(2, '0');
    }, 1000);
  </script>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // ==================== RESTAURANT ====================
  {
    id: 'restaurant-website',
    name: 'Restaurant Website',
    description: 'Beautiful restaurant website with menu, gallery, reservations, and contact',
    icon: '🍽️',
    category: 'business',
    features: ['Menu Display', 'Image Gallery', 'Reservation Form', 'Contact Info', 'Opening Hours', 'Social Links'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>La Maison - Fine Dining Restaurant</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
  <style>
    .font-playfair { font-family: 'Playfair Display', serif; }
    .font-lato { font-family: 'Lato', sans-serif; }
  </style>
</head>
<body class="font-lato bg-stone-900 text-stone-100">
  <!-- Navigation -->
  <nav class="fixed w-full bg-stone-900/95 backdrop-blur-sm z-50 border-b border-stone-800">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex justify-between items-center">
        <h1 class="font-playfair text-2xl text-amber-400">La Maison</h1>
        <div class="hidden md:flex items-center gap-8">
          <a href="#menu" class="hover:text-amber-400 transition">Menu</a>
          <a href="#about" class="hover:text-amber-400 transition">About</a>
          <a href="#gallery" class="hover:text-amber-400 transition">Gallery</a>
          <a href="#contact" class="hover:text-amber-400 transition">Contact</a>
        </div>
        <a href="#reservation" class="bg-amber-600 hover:bg-amber-700 px-6 py-2 rounded transition">Reserve</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="h-screen flex items-center justify-center relative" style="background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920') center/cover;">
    <div class="text-center px-4">
      <p class="text-amber-400 tracking-[0.3em] mb-4">WELCOME TO</p>
      <h1 class="font-playfair text-6xl md:text-8xl mb-6">La Maison</h1>
      <p class="text-xl text-stone-300 mb-8 max-w-xl mx-auto">Experience exquisite French cuisine in an elegant atmosphere</p>
      <div class="flex gap-4 justify-center">
        <a href="#menu" class="bg-amber-600 hover:bg-amber-700 px-8 py-3 rounded transition">View Menu</a>
        <a href="#reservation" class="border border-amber-400 hover:bg-amber-400/10 px-8 py-3 rounded transition">Book a Table</a>
      </div>
    </div>
  </section>

  <!-- Menu Section -->
  <section id="menu" class="py-20 px-4 bg-stone-800">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <p class="text-amber-400 tracking-widest mb-2">OUR SPECIALTIES</p>
        <h2 class="font-playfair text-5xl">The Menu</h2>
      </div>
      
      <div class="grid md:grid-cols-2 gap-12">
        <!-- Starters -->
        <div>
          <h3 class="font-playfair text-2xl text-amber-400 mb-6 pb-2 border-b border-stone-700">Starters</h3>
          <div class="space-y-6">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold text-lg">French Onion Soup</h4>
                <p class="text-stone-400 text-sm">Caramelized onions, gruyère cheese, toasted baguette</p>
              </div>
              <span class="text-amber-400 font-semibold">$14</span>
            </div>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold text-lg">Escargots de Bourgogne</h4>
                <p class="text-stone-400 text-sm">Burgundy snails in garlic herb butter</p>
              </div>
              <span class="text-amber-400 font-semibold">$18</span>
            </div>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold text-lg">Foie Gras Terrine</h4>
                <p class="text-stone-400 text-sm">With fig compote and brioche toast</p>
              </div>
              <span class="text-amber-400 font-semibold">$24</span>
            </div>
          </div>
        </div>
        
        <!-- Main Courses -->
        <div>
          <h3 class="font-playfair text-2xl text-amber-400 mb-6 pb-2 border-b border-stone-700">Main Courses</h3>
          <div class="space-y-6">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold text-lg">Coq au Vin</h4>
                <p class="text-stone-400 text-sm">Braised chicken in red wine with mushrooms and pearl onions</p>
              </div>
              <span class="text-amber-400 font-semibold">$32</span>
            </div>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold text-lg">Beef Bourguignon</h4>
                <p class="text-stone-400 text-sm">Slow-braised beef in burgundy wine sauce</p>
              </div>
              <span class="text-amber-400 font-semibold">$38</span>
            </div>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold text-lg">Duck Confit</h4>
                <p class="text-stone-400 text-sm">With roasted potatoes and orange glaze</p>
              </div>
              <span class="text-amber-400 font-semibold">$36</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Reservation Section -->
  <section id="reservation" class="py-20 px-4">
    <div class="max-w-2xl mx-auto">
      <div class="text-center mb-12">
        <p class="text-amber-400 tracking-widest mb-2">BOOK YOUR EXPERIENCE</p>
        <h2 class="font-playfair text-5xl">Reservation</h2>
      </div>
      
      <form class="space-y-6 bg-stone-800 p-8 rounded-2xl">
        <div class="grid md:grid-cols-2 gap-6">
          <input type="text" placeholder="Your Name" class="w-full bg-stone-700 border border-stone-600 rounded-lg px-4 py-3 focus:border-amber-400 outline-none transition">
          <input type="email" placeholder="Email Address" class="w-full bg-stone-700 border border-stone-600 rounded-lg px-4 py-3 focus:border-amber-400 outline-none transition">
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <input type="date" class="w-full bg-stone-700 border border-stone-600 rounded-lg px-4 py-3 focus:border-amber-400 outline-none transition">
          <input type="time" class="w-full bg-stone-700 border border-stone-600 rounded-lg px-4 py-3 focus:border-amber-400 outline-none transition">
          <select class="w-full bg-stone-700 border border-stone-600 rounded-lg px-4 py-3 focus:border-amber-400 outline-none transition">
            <option>2 Guests</option>
            <option>3 Guests</option>
            <option>4 Guests</option>
            <option>5+ Guests</option>
          </select>
        </div>
        <textarea placeholder="Special Requests" rows="4" class="w-full bg-stone-700 border border-stone-600 rounded-lg px-4 py-3 focus:border-amber-400 outline-none transition resize-none"></textarea>
        <button type="submit" class="w-full bg-amber-600 hover:bg-amber-700 py-4 rounded-lg font-semibold transition">Book a Table</button>
      </form>
    </div>
  </section>

  <!-- Contact -->
  <section id="contact" class="py-20 px-4 bg-stone-800">
    <div class="max-w-6xl mx-auto">
      <div class="grid md:grid-cols-3 gap-12 text-center">
        <div>
          <div class="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">📍</span>
          </div>
          <h3 class="font-playfair text-xl mb-2">Location</h3>
          <p class="text-stone-400">123 Gourmet Street<br>New York, NY 10001</p>
        </div>
        <div>
          <div class="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">🕐</span>
          </div>
          <h3 class="font-playfair text-xl mb-2">Hours</h3>
          <p class="text-stone-400">Tue-Sun: 5:00 PM - 11:00 PM<br>Monday: Closed</p>
        </div>
        <div>
          <div class="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl">📞</span>
          </div>
          <h3 class="font-playfair text-xl mb-2">Contact</h3>
          <p class="text-stone-400">(212) 555-0123<br>info@lamaison.com</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-8 px-4 border-t border-stone-800">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <h1 class="font-playfair text-xl text-amber-400">La Maison</h1>
      <p class="text-stone-500 text-sm">© 2024 La Maison. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`,
      'style.css': `/* Smooth scrolling */
html { scroll-behavior: smooth; }`,
      'script.js': `console.log('🍽️ La Maison Restaurant');`,
    },
  },

  // Business 2: Law Firm
  {
    id: 'business-lawfirm',
    name: 'Law Firm Website',
    description: 'Professional law firm website with practice areas and attorney profiles',
    icon: '⚖️',
    category: 'business',
    features: ['Practice Areas', 'Attorney Profiles', 'Case Results', 'Contact Form'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sterling & Associates - Attorneys at Law</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white">
  <nav class="bg-slate-950 py-4 border-b border-slate-800">
    <div class="max-w-6xl mx-auto px-6 flex justify-between items-center">
      <span class="text-xl font-bold text-amber-500">STERLING & ASSOCIATES</span>
      <div class="hidden md:flex gap-8">
        <a href="#practice" class="hover:text-amber-500">Practice Areas</a>
        <a href="#team" class="hover:text-amber-500">Our Team</a>
        <a href="#contact" class="hover:text-amber-500">Contact</a>
      </div>
      <button class="bg-amber-600 px-6 py-2 rounded hover:bg-amber-700">Free Consultation</button>
    </div>
  </nav>
  <section class="py-24 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h1 class="text-5xl font-bold mb-6">Experienced Legal<br/><span class="text-amber-500">Representation</span></h1>
        <p class="text-xl text-gray-400 mb-8">Over 30 years of combined experience fighting for our clients' rights.</p>
        <div class="flex gap-4">
          <button class="bg-amber-600 px-8 py-3 rounded font-semibold hover:bg-amber-700">Get Started</button>
          <button class="border border-slate-700 px-8 py-3 rounded hover:bg-slate-800">Call Now</button>
        </div>
      </div>
      <div class="text-center text-8xl">⚖️</div>
    </div>
  </section>
  <section id="practice" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Practice Areas</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-amber-500 transition">
          <span class="text-3xl">👨‍👩‍👧</span>
          <h3 class="font-bold mt-4 mb-2">Family Law</h3>
          <p class="text-gray-400 text-sm">Divorce, custody, support matters</p>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-amber-500 transition">
          <span class="text-3xl">🏢</span>
          <h3 class="font-bold mt-4 mb-2">Corporate Law</h3>
          <p class="text-gray-400 text-sm">Business formation, contracts</p>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-amber-500 transition">
          <span class="text-3xl">🏠</span>
          <h3 class="font-bold mt-4 mb-2">Real Estate</h3>
          <p class="text-gray-400 text-sm">Property transactions, disputes</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 border-t border-slate-800 text-center text-gray-500">
    <p>© 2024 Sterling & Associates. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Business 3: Consulting
  {
    id: 'business-consulting',
    name: 'Consulting Firm',
    description: 'Modern consulting firm website with services and case studies',
    icon: '📊',
    category: 'business',
    features: ['Services', 'Case Studies', 'Team', 'Testimonials', 'Contact'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apex Consulting - Business Strategy</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-gray-900">
  <nav class="py-4 px-6 border-b">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-blue-600">APEX</span>
      <div class="hidden md:flex gap-8">
        <a href="#services" class="hover:text-blue-600">Services</a>
        <a href="#work" class="hover:text-blue-600">Our Work</a>
        <a href="#about" class="hover:text-blue-600">About</a>
      </div>
      <button class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Contact Us</button>
    </div>
  </nav>
  <section class="py-24 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <h1 class="text-5xl md:text-6xl font-bold mb-6">Transform Your<br/><span class="text-blue-600">Business</span></h1>
      <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">Strategic consulting that drives measurable results. We help companies unlock their full potential.</p>
      <button class="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700">Schedule a Call</button>
    </div>
  </section>
  <section id="services" class="py-20 px-6 bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Our Services</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white p-8 rounded-xl shadow-lg">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-2xl">📈</div>
          <h3 class="font-bold text-xl mb-2">Growth Strategy</h3>
          <p class="text-gray-600">Develop actionable plans to accelerate your business growth</p>
        </div>
        <div class="bg-white p-8 rounded-xl shadow-lg">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 text-2xl">⚙️</div>
          <h3 class="font-bold text-xl mb-2">Operations</h3>
          <p class="text-gray-600">Optimize processes and improve operational efficiency</p>
        </div>
        <div class="bg-white p-8 rounded-xl shadow-lg">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-2xl">💡</div>
          <h3 class="font-bold text-xl mb-2">Digital Transform</h3>
          <p class="text-gray-600">Navigate the digital landscape with confidence</p>
        </div>
      </div>
    </div>
  </section>
  <section class="py-20 px-6">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-8">Trusted by Industry Leaders</h2>
      <div class="flex justify-center gap-12 text-4xl opacity-50">
        <span>🏢</span><span>🏦</span><span>🏭</span><span>🏬</span><span>🏥</span>
      </div>
    </div>
  </section>
  <footer class="py-8 border-t text-center text-gray-500">
    <p>© 2024 Apex Consulting. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Business 4: Real Estate
  {
    id: 'business-realestate',
    name: 'Real Estate Agency',
    description: 'Real estate agency website with property listings and search',
    icon: '🏠',
    category: 'business',
    features: ['Property Listings', 'Search Filter', 'Agent Profiles', 'Contact'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HomeFind - Find Your Dream Home</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900">
  <nav class="bg-white py-4 px-6 shadow-sm">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-emerald-600">🏠 HomeFind</span>
      <div class="hidden md:flex gap-6">
        <a href="#listings" class="hover:text-emerald-600">Listings</a>
        <a href="#sell" class="hover:text-emerald-600">Sell</a>
        <a href="#agents" class="hover:text-emerald-600">Agents</a>
      </div>
      <button class="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">List Property</button>
    </div>
  </nav>
  <section class="py-20 px-6 bg-emerald-600 text-white">
    <div class="max-w-6xl mx-auto text-center">
      <h1 class="text-5xl font-bold mb-6">Find Your Perfect Home</h1>
      <p class="text-xl mb-8 opacity-90">Discover thousands of properties across the country</p>
      <div class="bg-white rounded-xl p-2 max-w-3xl mx-auto flex flex-wrap gap-2">
        <input type="text" placeholder="Enter location..." class="flex-1 px-4 py-3 text-gray-900 rounded-lg outline-none min-w-[200px]">
        <select class="px-4 py-3 text-gray-600 rounded-lg bg-gray-100">
          <option>Property Type</option>
          <option>House</option>
          <option>Apartment</option>
          <option>Condo</option>
        </select>
        <button class="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700">Search</button>
      </div>
    </div>
  </section>
  <section id="listings" class="py-16 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold mb-8">Featured Properties</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-white rounded-xl overflow-hidden shadow-lg">
          <div class="h-48 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-6xl">🏡</div>
          <div class="p-6">
            <div class="text-emerald-600 font-bold text-xl">$425,000</div>
            <h3 class="font-semibold mt-1">Modern Family Home</h3>
            <p class="text-gray-500 text-sm mt-1">📍 123 Oak Street, Austin, TX</p>
            <div class="flex gap-4 mt-4 text-sm text-gray-600">
              <span>🛏️ 4 beds</span>
              <span>🚿 3 baths</span>
              <span>📐 2,400 sqft</span>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl overflow-hidden shadow-lg">
          <div class="h-48 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-6xl">🏢</div>
          <div class="p-6">
            <div class="text-emerald-600 font-bold text-xl">$275,000</div>
            <h3 class="font-semibold mt-1">Downtown Condo</h3>
            <p class="text-gray-500 text-sm mt-1">📍 456 Main Ave, Denver, CO</p>
            <div class="flex gap-4 mt-4 text-sm text-gray-600">
              <span>🛏️ 2 beds</span>
              <span>🚿 2 baths</span>
              <span>📐 1,200 sqft</span>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl overflow-hidden shadow-lg">
          <div class="h-48 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-6xl">🏘️</div>
          <div class="p-6">
            <div class="text-emerald-600 font-bold text-xl">$650,000</div>
            <h3 class="font-semibold mt-1">Luxury Villa</h3>
            <p class="text-gray-500 text-sm mt-1">📍 789 Palm Dr, Miami, FL</p>
            <div class="flex gap-4 mt-4 text-sm text-gray-600">
              <span>🛏️ 5 beds</span>
              <span>🚿 4 baths</span>
              <span>📐 3,800 sqft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-gray-900 text-white text-center">
    <p>© 2024 HomeFind. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Business 5: Medical/Clinic
  {
    id: 'business-medical',
    name: 'Medical Clinic',
    description: 'Healthcare clinic website with services and appointment booking',
    icon: '🏥',
    category: 'business',
    features: ['Services', 'Doctors', 'Appointment Booking', 'Contact'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HealthCare Plus - Your Health, Our Priority</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-gray-900">
  <nav class="bg-white py-4 px-6 shadow-sm sticky top-0 z-50">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-cyan-600">🏥 HealthCare Plus</span>
      <div class="hidden md:flex gap-6">
        <a href="#services" class="hover:text-cyan-600">Services</a>
        <a href="#doctors" class="hover:text-cyan-600">Our Doctors</a>
        <a href="#contact" class="hover:text-cyan-600">Contact</a>
      </div>
      <button class="bg-cyan-600 text-white px-6 py-2 rounded-full hover:bg-cyan-700">Book Appointment</button>
    </div>
  </nav>
  <section class="py-20 px-6 bg-gradient-to-br from-cyan-50 to-blue-50">
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h1 class="text-5xl font-bold mb-6">Quality Healthcare<br/><span class="text-cyan-600">For Everyone</span></h1>
        <p class="text-xl text-gray-600 mb-8">Comprehensive medical care with compassion. We're here to help you live your healthiest life.</p>
        <div class="flex gap-4">
          <button class="bg-cyan-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-cyan-700">Book Now</button>
          <button class="border-2 border-cyan-600 text-cyan-600 px-8 py-3 rounded-full hover:bg-cyan-50">Call Us</button>
        </div>
      </div>
      <div class="text-center text-9xl">👨‍⚕️</div>
    </div>
  </section>
  <section id="services" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Our Services</h2>
      <div class="grid md:grid-cols-4 gap-6">
        <div class="p-6 bg-cyan-50 rounded-xl text-center hover:shadow-lg transition">
          <span class="text-4xl">🩺</span>
          <h3 class="font-bold mt-4">General Care</h3>
          <p class="text-gray-600 text-sm mt-2">Primary healthcare</p>
        </div>
        <div class="p-6 bg-blue-50 rounded-xl text-center hover:shadow-lg transition">
          <span class="text-4xl">❤️</span>
          <h3 class="font-bold mt-4">Cardiology</h3>
          <p class="text-gray-600 text-sm mt-2">Heart specialists</p>
        </div>
        <div class="p-6 bg-green-50 rounded-xl text-center hover:shadow-lg transition">
          <span class="text-4xl">🦷</span>
          <h3 class="font-bold mt-4">Dental</h3>
          <p class="text-gray-600 text-sm mt-2">Oral health care</p>
        </div>
        <div class="p-6 bg-purple-50 rounded-xl text-center hover:shadow-lg transition">
          <span class="text-4xl">👁️</span>
          <h3 class="font-bold mt-4">Eye Care</h3>
          <p class="text-gray-600 text-sm mt-2">Vision specialists</p>
        </div>
      </div>
    </div>
  </section>
  <section class="py-16 px-6 bg-cyan-600 text-white">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-4">Need Immediate Care?</h2>
      <p class="text-xl mb-6 opacity-90">Our emergency services are available 24/7</p>
      <button class="bg-white text-cyan-600 px-8 py-3 rounded-full font-bold hover:bg-gray-100">📞 Call Emergency</button>
    </div>
  </section>
  <footer class="py-8 bg-gray-900 text-white text-center">
    <p>© 2024 HealthCare Plus. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // ==================== HOTEL BOOKING ====================
  {
    id: 'hotel-booking',
    name: 'Hotel Booking Website',
    description: 'Luxury hotel website with room listings, amenities, and booking system',
    icon: '🏨',
    category: 'hospitality',
    features: ['Room Listings', 'Booking Form', 'Amenities', 'Photo Gallery', 'Testimonials', 'Location Map'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grand Azure - Luxury Hotel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    .font-cormorant { font-family: 'Cormorant Garamond', serif; }
    .font-mont { font-family: 'Montserrat', sans-serif; }
  </style>
</head>
<body class="font-mont bg-slate-50">
  <!-- Navigation -->
  <nav class="fixed w-full bg-white/95 backdrop-blur-sm z-50 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex justify-between items-center">
        <h1 class="font-cormorant text-3xl font-bold text-blue-900">Grand Azure</h1>
        <div class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#rooms" class="hover:text-blue-600 transition">Rooms</a>
          <a href="#amenities" class="hover:text-blue-600 transition">Amenities</a>
          <a href="#dining" class="hover:text-blue-600 transition">Dining</a>
          <a href="#contact" class="hover:text-blue-600 transition">Contact</a>
        </div>
        <a href="#booking" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-medium transition">Book Now</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="h-screen flex items-center relative" style="background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920') center/cover;">
    <div class="max-w-7xl mx-auto px-4 text-white">
      <p class="text-blue-300 tracking-[0.3em] mb-4 text-sm">LUXURY REDEFINED</p>
      <h1 class="font-cormorant text-6xl md:text-8xl font-bold mb-6">Grand Azure</h1>
      <p class="text-xl text-slate-200 mb-8 max-w-xl">Where timeless elegance meets modern comfort. Experience luxury on the shores of paradise.</p>
      
      <!-- Booking Widget -->
      <div class="bg-white rounded-2xl p-6 max-w-4xl shadow-2xl">
        <form class="grid md:grid-cols-5 gap-4 items-end">
          <div>
            <label class="block text-slate-500 text-xs mb-2 font-medium">CHECK IN</label>
            <input type="date" class="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:border-blue-500 outline-none">
          </div>
          <div>
            <label class="block text-slate-500 text-xs mb-2 font-medium">CHECK OUT</label>
            <input type="date" class="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:border-blue-500 outline-none">
          </div>
          <div>
            <label class="block text-slate-500 text-xs mb-2 font-medium">GUESTS</label>
            <select class="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:border-blue-500 outline-none">
              <option>1 Guest</option>
              <option>2 Guests</option>
              <option>3 Guests</option>
              <option>4+ Guests</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-500 text-xs mb-2 font-medium">ROOM TYPE</label>
            <select class="w-full border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:border-blue-500 outline-none">
              <option>Deluxe</option>
              <option>Suite</option>
              <option>Presidential</option>
            </select>
          </div>
          <button class="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition">Check Availability</button>
        </form>
      </div>
    </div>
  </section>

  <!-- Rooms Section -->
  <section id="rooms" class="py-20 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <p class="text-blue-600 tracking-widest text-sm mb-2">ACCOMMODATIONS</p>
        <h2 class="font-cormorant text-5xl text-slate-800">Our Rooms & Suites</h2>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <div class="group">
          <div class="relative overflow-hidden rounded-2xl mb-4">
            <img src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600" alt="Deluxe Room" class="w-full h-72 object-cover group-hover:scale-105 transition duration-500">
            <div class="absolute bottom-4 left-4 bg-white px-4 py-2 rounded-full text-sm font-medium text-slate-800">From $299/night</div>
          </div>
          <h3 class="font-cormorant text-2xl text-slate-800 mb-2">Deluxe Room</h3>
          <p class="text-slate-500 text-sm mb-4">45 sqm • King Bed • City View • Free WiFi</p>
          <a href="#booking" class="text-blue-600 font-medium text-sm hover:underline">Book Now →</a>
        </div>
        
        <div class="group">
          <div class="relative overflow-hidden rounded-2xl mb-4">
            <img src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600" alt="Executive Suite" class="w-full h-72 object-cover group-hover:scale-105 transition duration-500">
            <div class="absolute bottom-4 left-4 bg-white px-4 py-2 rounded-full text-sm font-medium text-slate-800">From $499/night</div>
          </div>
          <h3 class="font-cormorant text-2xl text-slate-800 mb-2">Executive Suite</h3>
          <p class="text-slate-500 text-sm mb-4">75 sqm • King Bed • Ocean View • Lounge Access</p>
          <a href="#booking" class="text-blue-600 font-medium text-sm hover:underline">Book Now →</a>
        </div>
        
        <div class="group">
          <div class="relative overflow-hidden rounded-2xl mb-4">
            <img src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600" alt="Presidential Suite" class="w-full h-72 object-cover group-hover:scale-105 transition duration-500">
            <div class="absolute bottom-4 left-4 bg-white px-4 py-2 rounded-full text-sm font-medium text-slate-800">From $999/night</div>
          </div>
          <h3 class="font-cormorant text-2xl text-slate-800 mb-2">Presidential Suite</h3>
          <p class="text-slate-500 text-sm mb-4">150 sqm • 2 Bedrooms • Private Terrace • Butler Service</p>
          <a href="#booking" class="text-blue-600 font-medium text-sm hover:underline">Book Now →</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Amenities -->
  <section id="amenities" class="py-20 px-4 bg-blue-900 text-white">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <p class="text-blue-300 tracking-widest text-sm mb-2">WORLD-CLASS</p>
        <h2 class="font-cormorant text-5xl">Hotel Amenities</h2>
      </div>
      
      <div class="grid md:grid-cols-4 gap-8">
        <div class="text-center">
          <div class="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🏊</div>
          <h3 class="font-medium mb-2">Infinity Pool</h3>
          <p class="text-blue-300 text-sm">Stunning rooftop pool with panoramic views</p>
        </div>
        <div class="text-center">
          <div class="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">💆</div>
          <h3 class="font-medium mb-2">Luxury Spa</h3>
          <p class="text-blue-300 text-sm">Full-service spa with signature treatments</p>
        </div>
        <div class="text-center">
          <div class="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🍽️</div>
          <h3 class="font-medium mb-2">Fine Dining</h3>
          <p class="text-blue-300 text-sm">Award-winning restaurants and bars</p>
        </div>
        <div class="text-center">
          <div class="w-20 h-20 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🏋️</div>
          <h3 class="font-medium mb-2">Fitness Center</h3>
          <p class="text-blue-300 text-sm">State-of-the-art equipment 24/7</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 px-4 bg-slate-900 text-white">
    <div class="max-w-7xl mx-auto text-center">
      <h1 class="font-cormorant text-3xl mb-4">Grand Azure</h1>
      <p class="text-slate-400 mb-6">123 Oceanfront Drive, Paradise Bay • +1 (555) 123-4567</p>
      <p class="text-slate-500 text-sm">© 2024 Grand Azure Hotel. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`,
      'style.css': `html { scroll-behavior: smooth; }`,
      'script.js': `console.log('🏨 Grand Azure Hotel');`,
    },
  },

  // Hospitality 2: Spa & Wellness
  {
    id: 'hospitality-spa',
    name: 'Spa & Wellness',
    description: 'Luxury spa and wellness center website',
    icon: '🧘',
    category: 'hospitality',
    features: ['Services Menu', 'Booking', 'Packages', 'Gallery'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Serenity Spa - Relax & Rejuvenate</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-stone-100 text-stone-800">
  <nav class="bg-white/80 backdrop-blur py-4 px-6 fixed w-full z-50">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-light tracking-widest text-rose-600">SERENITY</span>
      <div class="hidden md:flex gap-8 text-sm">
        <a href="#services" class="hover:text-rose-600">Services</a>
        <a href="#packages" class="hover:text-rose-600">Packages</a>
        <a href="#about" class="hover:text-rose-600">About</a>
      </div>
      <button class="bg-rose-600 text-white px-6 py-2 rounded-full text-sm hover:bg-rose-700">Book Now</button>
    </div>
  </nav>
  <section class="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-stone-100 pt-20">
    <div class="text-center px-6">
      <p class="text-rose-600 tracking-widest mb-4">LUXURY SPA & WELLNESS</p>
      <h1 class="text-5xl md:text-7xl font-light mb-6">Find Your<br/><span class="text-rose-600">Inner Peace</span></h1>
      <p class="text-xl text-stone-600 max-w-xl mx-auto mb-8">Experience tranquility with our premium spa treatments and wellness programs</p>
      <button class="bg-rose-600 text-white px-10 py-4 rounded-full hover:bg-rose-700">Explore Treatments</button>
    </div>
  </section>
  <section id="services" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-light text-center mb-12">Our Services</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white p-8 rounded-2xl text-center shadow-sm hover:shadow-lg transition">
          <span class="text-5xl">💆</span>
          <h3 class="text-xl font-medium mt-4 mb-2">Massage Therapy</h3>
          <p class="text-stone-600">Deep tissue, Swedish, hot stone</p>
          <p class="text-rose-600 font-medium mt-4">From $80</p>
        </div>
        <div class="bg-white p-8 rounded-2xl text-center shadow-sm hover:shadow-lg transition">
          <span class="text-5xl">✨</span>
          <h3 class="text-xl font-medium mt-4 mb-2">Facial Treatments</h3>
          <p class="text-stone-600">Anti-aging, hydrating, cleansing</p>
          <p class="text-rose-600 font-medium mt-4">From $120</p>
        </div>
        <div class="bg-white p-8 rounded-2xl text-center shadow-sm hover:shadow-lg transition">
          <span class="text-5xl">🧘</span>
          <h3 class="text-xl font-medium mt-4 mb-2">Yoga & Meditation</h3>
          <p class="text-stone-600">Private and group sessions</p>
          <p class="text-rose-600 font-medium mt-4">From $40</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-stone-800 text-white text-center">
    <p class="font-light tracking-widest">SERENITY SPA</p>
    <p class="text-stone-400 text-sm mt-2">© 2024 All rights reserved</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Hospitality 3: Resort
  {
    id: 'hospitality-resort',
    name: 'Beach Resort',
    description: 'Tropical beach resort website with villa bookings',
    icon: '🏝️',
    category: 'hospitality',
    features: ['Villa Listings', 'Activities', 'Dining', 'Booking'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paradise Cove - Tropical Resort</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-sky-50 text-gray-900">
  <nav class="bg-white/90 backdrop-blur py-4 px-6 fixed w-full z-50 shadow-sm">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-sky-600">🏝️ Paradise Cove</span>
      <div class="hidden md:flex gap-6">
        <a href="#villas" class="hover:text-sky-600">Villas</a>
        <a href="#activities" class="hover:text-sky-600">Activities</a>
        <a href="#dining" class="hover:text-sky-600">Dining</a>
      </div>
      <button class="bg-sky-600 text-white px-6 py-2 rounded-full hover:bg-sky-700">Book Stay</button>
    </div>
  </nav>
  <section class="min-h-screen flex items-center bg-gradient-to-b from-sky-400 to-sky-600 text-white pt-20">
    <div class="max-w-6xl mx-auto px-6 text-center">
      <p class="tracking-widest mb-4">TROPICAL PARADISE AWAITS</p>
      <h1 class="text-5xl md:text-7xl font-bold mb-6">Your Dream<br/>Getaway</h1>
      <p class="text-xl opacity-90 max-w-xl mx-auto mb-8">Private beach villas, crystal clear waters, and unforgettable memories</p>
      <div class="flex justify-center gap-4">
        <button class="bg-white text-sky-600 px-8 py-3 rounded-full font-semibold hover:bg-sky-50">Explore Villas</button>
        <button class="border-2 border-white px-8 py-3 rounded-full hover:bg-white/10">Watch Video</button>
      </div>
    </div>
  </section>
  <section id="villas" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Our Villas</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl overflow-hidden shadow-lg">
          <div class="h-48 bg-gradient-to-r from-sky-400 to-cyan-400 flex items-center justify-center text-6xl">🏖️</div>
          <div class="p-6">
            <h3 class="font-bold text-xl">Beach Villa</h3>
            <p class="text-gray-600 mt-2">Private beach access, ocean view</p>
            <p class="text-sky-600 font-bold mt-4">$450/night</p>
          </div>
        </div>
        <div class="bg-white rounded-2xl overflow-hidden shadow-lg">
          <div class="h-48 bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center justify-center text-6xl">🌴</div>
          <div class="p-6">
            <h3 class="font-bold text-xl">Garden Villa</h3>
            <p class="text-gray-600 mt-2">Tropical garden, private pool</p>
            <p class="text-sky-600 font-bold mt-4">$350/night</p>
          </div>
        </div>
        <div class="bg-white rounded-2xl overflow-hidden shadow-lg">
          <div class="h-48 bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center text-6xl">🌅</div>
          <div class="p-6">
            <h3 class="font-bold text-xl">Sunset Suite</h3>
            <p class="text-gray-600 mt-2">Best sunset views, rooftop terrace</p>
            <p class="text-sky-600 font-bold mt-4">$550/night</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-sky-900 text-white text-center">
    <p>© 2024 Paradise Cove Resort. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Hospitality 4: Cafe/Coffee Shop
  {
    id: 'hospitality-cafe',
    name: 'Coffee Shop',
    description: 'Cozy coffee shop website with menu and locations',
    icon: '☕',
    category: 'hospitality',
    features: ['Menu', 'Locations', 'Online Order', 'Loyalty Program'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brew & Bean - Artisan Coffee</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-amber-50 text-stone-800">
  <nav class="bg-stone-900 text-white py-4 px-6">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold">☕ Brew & Bean</span>
      <div class="hidden md:flex gap-6">
        <a href="#menu" class="hover:text-amber-400">Menu</a>
        <a href="#locations" class="hover:text-amber-400">Locations</a>
        <a href="#about" class="hover:text-amber-400">About</a>
      </div>
      <button class="bg-amber-600 px-6 py-2 rounded-full hover:bg-amber-700">Order Online</button>
    </div>
  </nav>
  <section class="py-24 px-6 bg-stone-900 text-white">
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h1 class="text-5xl font-bold mb-6">Artisan Coffee,<br/><span class="text-amber-400">Made Fresh Daily</span></h1>
        <p class="text-xl text-stone-400 mb-8">Ethically sourced beans, expertly roasted, served with love since 2015.</p>
        <button class="bg-amber-600 px-8 py-3 rounded-full font-semibold hover:bg-amber-700">View Menu</button>
      </div>
      <div class="text-center text-9xl">☕</div>
    </div>
  </section>
  <section id="menu" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Our Menu</h2>
      <div class="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <div class="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
          <div><h3 class="font-semibold">Espresso</h3><p class="text-stone-500 text-sm">Double shot, rich & bold</p></div>
          <span class="text-amber-600 font-bold">$3.50</span>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
          <div><h3 class="font-semibold">Cappuccino</h3><p class="text-stone-500 text-sm">Espresso with steamed milk</p></div>
          <span class="text-amber-600 font-bold">$4.50</span>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
          <div><h3 class="font-semibold">Latte</h3><p class="text-stone-500 text-sm">Smooth and creamy</p></div>
          <span class="text-amber-600 font-bold">$5.00</span>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
          <div><h3 class="font-semibold">Cold Brew</h3><p class="text-stone-500 text-sm">24-hour slow drip</p></div>
          <span class="text-amber-600 font-bold">$4.75</span>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-stone-900 text-white text-center">
    <p>© 2024 Brew & Bean Coffee Co.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Hospitality 5: Event Venue
  {
    id: 'hospitality-venue',
    name: 'Event Venue',
    description: 'Event venue and banquet hall website',
    icon: '🎪',
    category: 'hospitality',
    features: ['Venue Gallery', 'Packages', 'Catering', 'Booking'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Grand Hall - Premium Event Venue</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-neutral-100 text-neutral-800">
  <nav class="bg-neutral-900 text-white py-4 px-6">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-light tracking-widest">THE GRAND HALL</span>
      <div class="hidden md:flex gap-6 text-sm">
        <a href="#venues" class="hover:text-amber-400">Venues</a>
        <a href="#services" class="hover:text-amber-400">Services</a>
        <a href="#gallery" class="hover:text-amber-400">Gallery</a>
      </div>
      <button class="border border-white px-6 py-2 hover:bg-white hover:text-neutral-900 transition">Inquire Now</button>
    </div>
  </nav>
  <section class="min-h-[80vh] flex items-center bg-gradient-to-r from-neutral-900 to-neutral-800 text-white">
    <div class="max-w-6xl mx-auto px-6 text-center">
      <p class="tracking-[0.3em] text-amber-400 mb-6">UNFORGETTABLE MOMENTS</p>
      <h1 class="text-5xl md:text-7xl font-light mb-6">Where Dreams<br/>Become Reality</h1>
      <p class="text-xl text-neutral-400 max-w-2xl mx-auto mb-8">Host your wedding, corporate event, or celebration in our stunning venues</p>
      <button class="bg-amber-600 px-10 py-4 text-lg hover:bg-amber-700">Plan Your Event</button>
    </div>
  </section>
  <section id="venues" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-light text-center mb-12">Our Venues</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white rounded-xl overflow-hidden shadow-lg">
          <div class="h-48 bg-gradient-to-r from-amber-300 to-amber-500 flex items-center justify-center text-6xl">💒</div>
          <div class="p-6">
            <h3 class="font-semibold text-xl">Grand Ballroom</h3>
            <p class="text-neutral-600 mt-2">Capacity: 500 guests</p>
            <p class="text-neutral-500 text-sm mt-2">Perfect for weddings & galas</p>
          </div>
        </div>
        <div class="bg-white rounded-xl overflow-hidden shadow-lg">
          <div class="h-48 bg-gradient-to-r from-violet-300 to-violet-500 flex items-center justify-center text-6xl">🎤</div>
          <div class="p-6">
            <h3 class="font-semibold text-xl">Conference Center</h3>
            <p class="text-neutral-600 mt-2">Capacity: 200 guests</p>
            <p class="text-neutral-500 text-sm mt-2">Corporate events & seminars</p>
          </div>
        </div>
        <div class="bg-white rounded-xl overflow-hidden shadow-lg">
          <div class="h-48 bg-gradient-to-r from-rose-300 to-rose-500 flex items-center justify-center text-6xl">🌸</div>
          <div class="p-6">
            <h3 class="font-semibold text-xl">Garden Terrace</h3>
            <p class="text-neutral-600 mt-2">Capacity: 150 guests</p>
            <p class="text-neutral-500 text-sm mt-2">Outdoor ceremonies & cocktails</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-neutral-900 text-white text-center">
    <p class="font-light tracking-widest">THE GRAND HALL</p>
    <p class="text-neutral-500 text-sm mt-2">© 2024 All rights reserved</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // ==================== PORTFOLIO ====================
  {
    id: 'portfolio-developer',
    name: 'Developer Portfolio',
    description: 'Modern developer portfolio with projects, skills, and contact sections',
    icon: '👨‍💻',
    category: 'portfolio',
    features: ['About Section', 'Skills Display', 'Project Showcase', 'Contact Form', 'Resume Download', 'Social Links'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>John Doe - Full Stack Developer</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-gray-100">
  <!-- Navigation -->
  <nav class="fixed w-full bg-gray-950/90 backdrop-blur-sm z-50 border-b border-gray-800">
    <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
      <span class="text-xl font-bold text-emerald-400">&lt;JD /&gt;</span>
      <div class="flex items-center gap-6">
        <a href="#about" class="text-gray-400 hover:text-white transition text-sm">About</a>
        <a href="#skills" class="text-gray-400 hover:text-white transition text-sm">Skills</a>
        <a href="#projects" class="text-gray-400 hover:text-white transition text-sm">Projects</a>
        <a href="#contact" class="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg text-sm transition">Contact</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="min-h-screen flex items-center px-4 pt-20">
    <div class="max-w-6xl mx-auto">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p class="text-emerald-400 mb-4">Hi, my name is</p>
          <h1 class="text-5xl md:text-7xl font-bold mb-4">John Doe</h1>
          <h2 class="text-3xl md:text-4xl text-gray-400 mb-6">I build things for the web.</h2>
          <p class="text-gray-400 mb-8 max-w-lg leading-relaxed">
            I'm a full-stack developer specializing in building exceptional digital experiences. 
            Currently focused on building accessible, human-centered products.
          </p>
          <div class="flex gap-4">
            <a href="#projects" class="bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-lg transition">View My Work</a>
            <a href="#contact" class="border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 px-6 py-3 rounded-lg transition">Get In Touch</a>
          </div>
        </div>
        <div class="flex justify-center">
          <div class="w-72 h-72 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-8xl">
            👨‍💻
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Skills -->
  <section id="skills" class="py-20 px-4">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold mb-12 flex items-center gap-4">
        <span class="text-emerald-400">02.</span> Skills & Technologies
      </h2>
      <div class="grid md:grid-cols-4 gap-6">
        <div class="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-emerald-500/50 transition">
          <h3 class="font-semibold mb-4 text-emerald-400">Frontend</h3>
          <ul class="space-y-2 text-gray-400 text-sm">
            <li>React / Next.js</li>
            <li>TypeScript</li>
            <li>Tailwind CSS</li>
            <li>Vue.js</li>
          </ul>
        </div>
        <div class="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-emerald-500/50 transition">
          <h3 class="font-semibold mb-4 text-emerald-400">Backend</h3>
          <ul class="space-y-2 text-gray-400 text-sm">
            <li>Node.js / Express</li>
            <li>Python / FastAPI</li>
            <li>PostgreSQL</li>
            <li>MongoDB</li>
          </ul>
        </div>
        <div class="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-emerald-500/50 transition">
          <h3 class="font-semibold mb-4 text-emerald-400">DevOps</h3>
          <ul class="space-y-2 text-gray-400 text-sm">
            <li>Docker</li>
            <li>AWS / GCP</li>
            <li>CI/CD</li>
            <li>Kubernetes</li>
          </ul>
        </div>
        <div class="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-emerald-500/50 transition">
          <h3 class="font-semibold mb-4 text-emerald-400">Tools</h3>
          <ul class="space-y-2 text-gray-400 text-sm">
            <li>Git / GitHub</li>
            <li>Figma</li>
            <li>VS Code</li>
            <li>Postman</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Projects -->
  <section id="projects" class="py-20 px-4 bg-gray-900">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold mb-12 flex items-center gap-4">
        <span class="text-emerald-400">03.</span> Featured Projects
      </h2>
      <div class="grid md:grid-cols-2 gap-8">
        <div class="bg-gray-800 rounded-xl overflow-hidden group">
          <div class="h-48 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-6xl">🛒</div>
          <div class="p-6">
            <h3 class="text-xl font-semibold mb-2">E-Commerce Platform</h3>
            <p class="text-gray-400 text-sm mb-4">Full-stack e-commerce solution with payment integration, inventory management, and admin dashboard.</p>
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="px-3 py-1 bg-gray-700 rounded-full text-xs text-emerald-400">React</span>
              <span class="px-3 py-1 bg-gray-700 rounded-full text-xs text-emerald-400">Node.js</span>
              <span class="px-3 py-1 bg-gray-700 rounded-full text-xs text-emerald-400">PostgreSQL</span>
            </div>
            <div class="flex gap-4">
              <a href="#" class="text-gray-400 hover:text-white text-sm">GitHub →</a>
              <a href="#" class="text-gray-400 hover:text-white text-sm">Live Demo →</a>
            </div>
          </div>
        </div>
        <div class="bg-gray-800 rounded-xl overflow-hidden group">
          <div class="h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-6xl">📊</div>
          <div class="p-6">
            <h3 class="text-xl font-semibold mb-2">Analytics Dashboard</h3>
            <p class="text-gray-400 text-sm mb-4">Real-time analytics dashboard with data visualization, custom reports, and team collaboration features.</p>
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="px-3 py-1 bg-gray-700 rounded-full text-xs text-emerald-400">Next.js</span>
              <span class="px-3 py-1 bg-gray-700 rounded-full text-xs text-emerald-400">D3.js</span>
              <span class="px-3 py-1 bg-gray-700 rounded-full text-xs text-emerald-400">FastAPI</span>
            </div>
            <div class="flex gap-4">
              <a href="#" class="text-gray-400 hover:text-white text-sm">GitHub →</a>
              <a href="#" class="text-gray-400 hover:text-white text-sm">Live Demo →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Contact -->
  <section id="contact" class="py-20 px-4">
    <div class="max-w-2xl mx-auto text-center">
      <p class="text-emerald-400 mb-4">04. What's Next?</p>
      <h2 class="text-4xl font-bold mb-6">Get In Touch</h2>
      <p class="text-gray-400 mb-8">
        I'm currently looking for new opportunities. Whether you have a question or just want to say hi, 
        I'll try my best to get back to you!
      </p>
      <a href="mailto:hello@johndoe.com" class="inline-block bg-emerald-500 hover:bg-emerald-600 px-8 py-4 rounded-lg font-medium transition">
        Say Hello 👋
      </a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-8 border-t border-gray-800 text-center text-gray-500 text-sm">
    <p>Designed & Built by John Doe</p>
  </footer>
</body>
</html>`,
      'style.css': `html { scroll-behavior: smooth; }`,
      'script.js': `console.log('👨‍💻 Portfolio Ready!');`,
    },
  },

  // Portfolio 2: Designer Portfolio
  {
    id: 'portfolio-designer',
    name: 'Designer Portfolio',
    description: 'Creative designer portfolio with visual showcase',
    icon: '🎨',
    category: 'portfolio',
    features: ['Project Gallery', 'About', 'Process', 'Contact'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sarah Chen - UI/UX Designer</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-neutral-950 text-white">
  <nav class="fixed w-full py-6 px-8 z-50">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-lg font-medium">Sarah Chen</span>
      <div class="flex gap-8">
        <a href="#work" class="text-neutral-400 hover:text-white">Work</a>
        <a href="#about" class="text-neutral-400 hover:text-white">About</a>
        <a href="#contact" class="text-neutral-400 hover:text-white">Contact</a>
      </div>
    </div>
  </nav>
  <section class="min-h-screen flex items-center px-8">
    <div class="max-w-6xl mx-auto">
      <p class="text-pink-500 mb-4">UI/UX DESIGNER</p>
      <h1 class="text-6xl md:text-8xl font-bold mb-6">I design<br/>digital<br/>experiences</h1>
      <p class="text-xl text-neutral-400 max-w-md">Creating beautiful, user-centered designs for startups and enterprises.</p>
    </div>
  </section>
  <section id="work" class="py-20 px-8">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold mb-12">Selected Work</h2>
      <div class="grid md:grid-cols-2 gap-8">
        <div class="group cursor-pointer">
          <div class="h-64 bg-gradient-to-br from-pink-500 to-violet-600 rounded-2xl mb-4 flex items-center justify-center text-6xl group-hover:scale-105 transition">🎨</div>
          <h3 class="text-xl font-medium">Banking App Redesign</h3>
          <p class="text-neutral-500">Mobile App Design</p>
        </div>
        <div class="group cursor-pointer">
          <div class="h-64 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4 flex items-center justify-center text-6xl group-hover:scale-105 transition">✨</div>
          <h3 class="text-xl font-medium">E-commerce Platform</h3>
          <p class="text-neutral-500">Web Design</p>
        </div>
        <div class="group cursor-pointer">
          <div class="h-64 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 flex items-center justify-center text-6xl group-hover:scale-105 transition">💎</div>
          <h3 class="text-xl font-medium">Health & Fitness</h3>
          <p class="text-neutral-500">App & Web Design</p>
        </div>
        <div class="group cursor-pointer">
          <div class="h-64 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 flex items-center justify-center text-6xl group-hover:scale-105 transition">🚀</div>
          <h3 class="text-xl font-medium">SaaS Dashboard</h3>
          <p class="text-neutral-500">Product Design</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-12 px-8 border-t border-neutral-800">
    <div class="max-w-6xl mx-auto text-center">
      <p class="text-neutral-500">© 2024 Sarah Chen. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Portfolio 3: Photographer Portfolio
  {
    id: 'portfolio-photographer',
    name: 'Photographer Portfolio',
    description: 'Minimal photography portfolio with fullscreen gallery',
    icon: '📷',
    category: 'portfolio',
    features: ['Photo Gallery', 'Categories', 'About', 'Contact'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>James Miller Photography</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white">
  <nav class="fixed w-full py-6 px-8 z-50 bg-black/50 backdrop-blur">
    <div class="max-w-7xl mx-auto flex justify-between items-center">
      <span class="text-lg tracking-widest">JAMES MILLER</span>
      <div class="flex gap-8 text-sm tracking-wider">
        <a href="#portfolio" class="hover:text-amber-400">PORTFOLIO</a>
        <a href="#about" class="hover:text-amber-400">ABOUT</a>
        <a href="#contact" class="hover:text-amber-400">CONTACT</a>
      </div>
    </div>
  </nav>
  <section class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <p class="tracking-[0.5em] text-amber-400 mb-4">PHOTOGRAPHY</p>
      <h1 class="text-7xl font-light mb-6">Capturing<br/>Moments</h1>
      <p class="text-neutral-400 tracking-wider">PORTRAIT • LANDSCAPE • COMMERCIAL</p>
    </div>
  </section>
  <section id="portfolio" class="py-12 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div class="aspect-square bg-gradient-to-br from-amber-600 to-orange-800 flex items-center justify-center text-6xl hover:opacity-80 cursor-pointer">🌅</div>
        <div class="aspect-square bg-gradient-to-br from-blue-600 to-purple-800 flex items-center justify-center text-6xl hover:opacity-80 cursor-pointer">🏔️</div>
        <div class="aspect-square bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-6xl hover:opacity-80 cursor-pointer">🌲</div>
        <div class="aspect-square bg-gradient-to-br from-pink-600 to-rose-800 flex items-center justify-center text-6xl hover:opacity-80 cursor-pointer">🌸</div>
        <div class="aspect-square bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-6xl hover:opacity-80 cursor-pointer">🏙️</div>
        <div class="aspect-square bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center text-6xl hover:opacity-80 cursor-pointer">✨</div>
      </div>
    </div>
  </section>
  <footer class="py-12 text-center border-t border-neutral-900">
    <p class="tracking-widest text-sm text-neutral-500">© 2024 JAMES MILLER PHOTOGRAPHY</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Portfolio 4: Writer/Author Portfolio
  {
    id: 'portfolio-writer',
    name: 'Writer Portfolio',
    description: 'Elegant portfolio for writers and authors',
    icon: '✍️',
    category: 'portfolio',
    features: ['Published Works', 'About', 'Blog', 'Contact'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emily Rose - Author & Storyteller</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@300;400&display=swap" rel="stylesheet">
</head>
<body class="bg-stone-50 text-stone-800" style="font-family: 'Inter', sans-serif;">
  <nav class="py-6 px-8">
    <div class="max-w-4xl mx-auto flex justify-between items-center">
      <span style="font-family: 'Playfair Display', serif;" class="text-xl">Emily Rose</span>
      <div class="flex gap-8 text-sm">
        <a href="#books" class="hover:text-amber-700">Books</a>
        <a href="#about" class="hover:text-amber-700">About</a>
        <a href="#contact" class="hover:text-amber-700">Contact</a>
      </div>
    </div>
  </nav>
  <section class="py-24 px-8">
    <div class="max-w-4xl mx-auto text-center">
      <p class="text-amber-700 mb-4 tracking-wider text-sm">BESTSELLING AUTHOR</p>
      <h1 style="font-family: 'Playfair Display', serif;" class="text-5xl md:text-6xl mb-6">Stories that<br/>touch the soul</h1>
      <p class="text-xl text-stone-600 max-w-xl mx-auto">Award-winning author of contemporary fiction exploring human connection and hope.</p>
    </div>
  </section>
  <section id="books" class="py-20 px-8 bg-white">
    <div class="max-w-4xl mx-auto">
      <h2 style="font-family: 'Playfair Display', serif;" class="text-3xl mb-12 text-center">Published Works</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="text-center">
          <div class="bg-gradient-to-b from-rose-200 to-rose-300 h-72 rounded-lg mb-4 flex items-center justify-center text-6xl shadow-lg">📕</div>
          <h3 class="font-semibold">The Last Summer</h3>
          <p class="text-stone-500 text-sm">Novel • 2024</p>
        </div>
        <div class="text-center">
          <div class="bg-gradient-to-b from-blue-200 to-blue-300 h-72 rounded-lg mb-4 flex items-center justify-center text-6xl shadow-lg">📘</div>
          <h3 class="font-semibold">Echoes of Home</h3>
          <p class="text-stone-500 text-sm">Novel • 2022</p>
        </div>
        <div class="text-center">
          <div class="bg-gradient-to-b from-amber-200 to-amber-300 h-72 rounded-lg mb-4 flex items-center justify-center text-6xl shadow-lg">📙</div>
          <h3 class="font-semibold">Between the Lines</h3>
          <p class="text-stone-500 text-sm">Short Stories • 2021</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-12 text-center border-t">
    <p class="text-stone-500 text-sm">© 2024 Emily Rose. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Portfolio 5: Video Producer
  {
    id: 'portfolio-video',
    name: 'Video Producer',
    description: 'Video producer and filmmaker portfolio',
    icon: '🎬',
    category: 'portfolio',
    features: ['Video Reel', 'Projects', 'Services', 'Contact'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ryan Studios - Video Production</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-white">
  <nav class="fixed w-full py-6 px-8 z-50 bg-zinc-950/80 backdrop-blur">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-red-500">RYAN STUDIOS</span>
      <div class="flex gap-8">
        <a href="#work" class="hover:text-red-500">Work</a>
        <a href="#services" class="hover:text-red-500">Services</a>
        <a href="#contact" class="hover:text-red-500">Contact</a>
      </div>
    </div>
  </nav>
  <section class="min-h-screen flex items-center px-8 bg-gradient-to-b from-zinc-900 to-zinc-950">
    <div class="max-w-6xl mx-auto text-center">
      <p class="text-red-500 mb-4 tracking-wider">VIDEO PRODUCTION</p>
      <h1 class="text-6xl md:text-8xl font-bold mb-6">Stories<br/>In Motion</h1>
      <p class="text-xl text-zinc-400 max-w-xl mx-auto mb-8">Award-winning video production for brands, films, and commercials</p>
      <button class="bg-red-600 px-8 py-4 rounded-lg font-semibold hover:bg-red-700 flex items-center gap-2 mx-auto">
        <span>▶</span> Watch Reel
      </button>
    </div>
  </section>
  <section id="work" class="py-20 px-8">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold mb-12">Featured Work</h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="relative group cursor-pointer">
          <div class="aspect-video bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center text-6xl">🎬</div>
          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-xl">
            <span class="text-4xl">▶</span>
          </div>
          <h3 class="mt-4 font-semibold">Nike Campaign</h3>
          <p class="text-zinc-500">Commercial</p>
        </div>
        <div class="relative group cursor-pointer">
          <div class="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-6xl">🎥</div>
          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-xl">
            <span class="text-4xl">▶</span>
          </div>
          <h3 class="mt-4 font-semibold">Music Video - Lunar</h3>
          <p class="text-zinc-500">Music Video</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-12 border-t border-zinc-800 text-center">
    <p class="text-zinc-500">© 2024 Ryan Studios. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // ==================== SCHOOL / EDUCATION ====================
  {
    id: 'school-website',
    name: 'School/Education Website',
    description: 'Educational institution website with courses, faculty, admissions, and events',
    icon: '🎓',
    category: 'education',
    features: ['Course Catalog', 'Faculty Profiles', 'Admissions Form', 'Events Calendar', 'News Section', 'Gallery'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bright Future Academy</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white">
  <!-- Navigation -->
  <nav class="bg-blue-900 text-white">
    <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <span class="text-3xl">🎓</span>
        <div>
          <h1 class="font-bold text-lg">Bright Future Academy</h1>
          <p class="text-blue-300 text-xs">Excellence in Education</p>
        </div>
      </div>
      <div class="hidden md:flex items-center gap-6 text-sm">
        <a href="#about" class="hover:text-blue-300 transition">About</a>
        <a href="#programs" class="hover:text-blue-300 transition">Programs</a>
        <a href="#faculty" class="hover:text-blue-300 transition">Faculty</a>
        <a href="#admissions" class="hover:text-blue-300 transition">Admissions</a>
        <a href="#contact" class="bg-yellow-500 hover:bg-yellow-600 text-blue-900 px-4 py-2 rounded-lg font-medium transition">Apply Now</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="relative h-[600px] flex items-center" style="background: linear-gradient(rgba(30,58,138,0.8), rgba(30,58,138,0.8)), url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920') center/cover;">
    <div class="max-w-7xl mx-auto px-4 text-white">
      <h1 class="text-5xl md:text-6xl font-bold mb-6">Shaping Tomorrow's<br>Leaders Today</h1>
      <p class="text-xl text-blue-200 mb-8 max-w-xl">Providing world-class education with a focus on innovation, creativity, and character development since 1985.</p>
      <div class="flex gap-4">
        <a href="#programs" class="bg-yellow-500 hover:bg-yellow-600 text-blue-900 px-6 py-3 rounded-lg font-medium transition">Explore Programs</a>
        <a href="#contact" class="border border-white hover:bg-white/10 px-6 py-3 rounded-lg transition">Schedule a Visit</a>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section class="bg-blue-900 py-12">
    <div class="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
      <div>
        <div class="text-4xl font-bold text-yellow-400">2500+</div>
        <div class="text-blue-300 text-sm">Students Enrolled</div>
      </div>
      <div>
        <div class="text-4xl font-bold text-yellow-400">150+</div>
        <div class="text-blue-300 text-sm">Expert Faculty</div>
      </div>
      <div>
        <div class="text-4xl font-bold text-yellow-400">40+</div>
        <div class="text-blue-300 text-sm">Years of Excellence</div>
      </div>
      <div>
        <div class="text-4xl font-bold text-yellow-400">98%</div>
        <div class="text-blue-300 text-sm">Graduation Rate</div>
      </div>
    </div>
  </section>

  <!-- Programs -->
  <section id="programs" class="py-20 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-blue-900 mb-4">Our Programs</h2>
        <p class="text-gray-600 max-w-2xl mx-auto">Comprehensive educational programs designed to nurture young minds and prepare them for future success.</p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
          <div class="h-48 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-6xl">📚</div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-blue-900 mb-2">Primary Education</h3>
            <p class="text-gray-600 text-sm mb-4">Grades K-5: Building strong foundations in reading, writing, mathematics, and critical thinking.</p>
            <a href="#" class="text-blue-600 font-medium text-sm hover:underline">Learn More →</a>
          </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
          <div class="h-48 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-6xl">🔬</div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-blue-900 mb-2">Middle School</h3>
            <p class="text-gray-600 text-sm mb-4">Grades 6-8: Expanding horizons with STEM, arts, and leadership development programs.</p>
            <a href="#" class="text-blue-600 font-medium text-sm hover:underline">Learn More →</a>
          </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
          <div class="h-48 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-6xl">🎯</div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-blue-900 mb-2">High School</h3>
            <p class="text-gray-600 text-sm mb-4">Grades 9-12: College prep with AP courses, career guidance, and extracurricular excellence.</p>
            <a href="#" class="text-blue-600 font-medium text-sm hover:underline">Learn More →</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Admissions CTA -->
  <section id="admissions" class="py-20 px-4 bg-yellow-400">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-4xl font-bold text-blue-900 mb-4">Join Our Community</h2>
      <p class="text-blue-800 mb-8 text-lg">Admissions for the 2024-2025 academic year are now open. Limited seats available!</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="#" class="bg-blue-900 hover:bg-blue-800 text-white px-8 py-4 rounded-lg font-medium transition">Apply Online</a>
        <a href="#" class="border-2 border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white px-8 py-4 rounded-lg font-medium transition">Download Brochure</a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-blue-900 text-white py-12 px-4">
    <div class="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
      <div>
        <div class="flex items-center gap-2 mb-4">
          <span class="text-2xl">🎓</span>
          <span class="font-bold">Bright Future Academy</span>
        </div>
        <p class="text-blue-300 text-sm">Empowering students to reach their full potential since 1985.</p>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Quick Links</h4>
        <ul class="space-y-2 text-blue-300 text-sm">
          <li><a href="#" class="hover:text-white transition">About Us</a></li>
          <li><a href="#" class="hover:text-white transition">Academics</a></li>
          <li><a href="#" class="hover:text-white transition">Admissions</a></li>
          <li><a href="#" class="hover:text-white transition">Campus Life</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Contact</h4>
        <ul class="space-y-2 text-blue-300 text-sm">
          <li>📍 123 Education Lane</li>
          <li>📞 (555) 123-4567</li>
          <li>✉️ info@brightfuture.edu</li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-4">Office Hours</h4>
        <p class="text-blue-300 text-sm">Mon-Fri: 8:00 AM - 4:00 PM<br>Sat: 9:00 AM - 12:00 PM</p>
      </div>
    </div>
    <div class="max-w-7xl mx-auto pt-8 mt-8 border-t border-blue-800 text-center text-blue-400 text-sm">
      © 2024 Bright Future Academy. All rights reserved.
    </div>
  </footer>
</body>
</html>`,
      'style.css': `html { scroll-behavior: smooth; }`,
      'script.js': `console.log('🎓 School Website Ready!');`,
    },
  },

  // Education 2: Online Course Platform
  {
    id: 'education-courses',
    name: 'Online Courses',
    description: 'Online course and learning platform',
    icon: '📚',
    category: 'education',
    features: ['Course Catalog', 'Categories', 'Instructor Profiles', 'Enrollment'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SkillBoost - Learn New Skills</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900">
  <nav class="bg-white shadow-sm py-4 px-6">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-violet-600">📚 SkillBoost</span>
      <div class="hidden md:flex gap-6">
        <a href="#courses" class="hover:text-violet-600">Courses</a>
        <a href="#categories" class="hover:text-violet-600">Categories</a>
        <a href="#instructors" class="hover:text-violet-600">Instructors</a>
      </div>
      <div class="flex gap-3">
        <button class="text-violet-600 px-4 py-2 hover:bg-violet-50 rounded-lg">Sign In</button>
        <button class="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700">Get Started</button>
      </div>
    </div>
  </nav>
  <section class="py-20 px-6 bg-gradient-to-b from-violet-600 to-purple-700 text-white">
    <div class="max-w-6xl mx-auto text-center">
      <h1 class="text-5xl font-bold mb-6">Learn Anything,<br/>Anytime, Anywhere</h1>
      <p class="text-xl opacity-90 mb-8 max-w-2xl mx-auto">Access 10,000+ courses taught by industry experts. Start your learning journey today.</p>
      <div class="bg-white rounded-xl p-2 max-w-xl mx-auto flex">
        <input type="text" placeholder="What do you want to learn?" class="flex-1 px-4 py-3 text-slate-900 rounded-lg outline-none">
        <button class="bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700">Search</button>
      </div>
    </div>
  </section>
  <section id="courses" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold mb-8">Popular Courses</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
          <div class="h-40 bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center text-5xl">💻</div>
          <div class="p-6">
            <span class="text-xs text-violet-600 bg-violet-100 px-2 py-1 rounded">Development</span>
            <h3 class="font-bold mt-2">Web Development Bootcamp</h3>
            <p class="text-slate-600 text-sm mt-2">Learn HTML, CSS, JavaScript & React</p>
            <div class="flex justify-between items-center mt-4">
              <span class="font-bold text-violet-600">$49.99</span>
              <span class="text-sm text-slate-500">⭐ 4.9 (2.5k)</span>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
          <div class="h-40 bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-5xl">📊</div>
          <div class="p-6">
            <span class="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Data Science</span>
            <h3 class="font-bold mt-2">Python for Data Science</h3>
            <p class="text-slate-600 text-sm mt-2">Master Python, Pandas & ML basics</p>
            <div class="flex justify-between items-center mt-4">
              <span class="font-bold text-violet-600">$59.99</span>
              <span class="text-sm text-slate-500">⭐ 4.8 (1.8k)</span>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
          <div class="h-40 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-5xl">🎨</div>
          <div class="p-6">
            <span class="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">Design</span>
            <h3 class="font-bold mt-2">UI/UX Design Masterclass</h3>
            <p class="text-slate-600 text-sm mt-2">Design beautiful interfaces</p>
            <div class="flex justify-between items-center mt-4">
              <span class="font-bold text-violet-600">$39.99</span>
              <span class="text-sm text-slate-500">⭐ 4.9 (3.2k)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-slate-900 text-white text-center">
    <p>© 2024 SkillBoost. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Education 3: Tutoring Service
  {
    id: 'education-tutoring',
    name: 'Tutoring Service',
    description: 'Private tutoring and coaching service website',
    icon: '👩‍🏫',
    category: 'education',
    features: ['Subjects', 'Tutor Profiles', 'Booking', 'Pricing'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TutorPro - Expert Tutoring</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-gray-900">
  <nav class="py-4 px-6 border-b">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-blue-600">👩‍🏫 TutorPro</span>
      <div class="hidden md:flex gap-6">
        <a href="#subjects" class="hover:text-blue-600">Subjects</a>
        <a href="#tutors" class="hover:text-blue-600">Our Tutors</a>
        <a href="#pricing" class="hover:text-blue-600">Pricing</a>
      </div>
      <button class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Book Session</button>
    </div>
  </nav>
  <section class="py-20 px-6">
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h1 class="text-5xl font-bold mb-6">Expert Tutoring<br/><span class="text-blue-600">Made Simple</span></h1>
        <p class="text-xl text-gray-600 mb-8">Connect with top tutors for personalized 1-on-1 learning. All subjects, all levels.</p>
        <div class="flex gap-4">
          <button class="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700">Find a Tutor</button>
          <button class="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50">Learn More</button>
        </div>
      </div>
      <div class="text-center text-9xl">📖</div>
    </div>
  </section>
  <section id="subjects" class="py-20 px-6 bg-blue-50">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Subjects We Cover</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition">
          <span class="text-4xl">➕</span>
          <h3 class="font-semibold mt-3">Math</h3>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition">
          <span class="text-4xl">🔬</span>
          <h3 class="font-semibold mt-3">Science</h3>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition">
          <span class="text-4xl">📝</span>
          <h3 class="font-semibold mt-3">English</h3>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition">
          <span class="text-4xl">💻</span>
          <h3 class="font-semibold mt-3">Coding</h3>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-gray-900 text-white text-center">
    <p>© 2024 TutorPro. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Education 4: Coding Bootcamp
  {
    id: 'education-bootcamp',
    name: 'Coding Bootcamp',
    description: 'Intensive coding bootcamp website',
    icon: '🖥️',
    category: 'education',
    features: ['Programs', 'Curriculum', 'Career Services', 'Apply'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeCraft Academy - Learn to Code</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white">
  <nav class="py-4 px-6 border-b border-slate-800">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-green-500">{'</>'} CodeCraft</span>
      <div class="hidden md:flex gap-6">
        <a href="#programs" class="hover:text-green-500">Programs</a>
        <a href="#outcomes" class="hover:text-green-500">Outcomes</a>
        <a href="#admissions" class="hover:text-green-500">Admissions</a>
      </div>
      <button class="bg-green-600 px-6 py-2 rounded-lg hover:bg-green-700">Apply Now</button>
    </div>
  </nav>
  <section class="py-24 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <div class="inline-block bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm mb-6">Now Enrolling for 2024</div>
      <h1 class="text-5xl md:text-6xl font-bold mb-6">Become a<br/><span class="text-green-500">Software Engineer</span></h1>
      <p class="text-xl text-slate-400 max-w-2xl mx-auto mb-8">12-week intensive bootcamp. No experience required. 95% job placement rate.</p>
      <div class="flex justify-center gap-4">
        <button class="bg-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-green-700">Start Application</button>
        <button class="border border-slate-700 px-8 py-4 rounded-lg hover:bg-slate-800">Download Syllabus</button>
      </div>
    </div>
  </section>
  <section id="programs" class="py-20 px-6 bg-slate-900">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Our Programs</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-slate-800 p-8 rounded-xl border border-slate-700 hover:border-green-500 transition">
          <span class="text-4xl">🌐</span>
          <h3 class="text-xl font-bold mt-4 mb-2">Full-Stack Web</h3>
          <p class="text-slate-400 text-sm">React, Node.js, PostgreSQL</p>
          <p class="text-green-500 font-bold mt-4">12 weeks • $15,000</p>
        </div>
        <div class="bg-slate-800 p-8 rounded-xl border border-slate-700 hover:border-green-500 transition">
          <span class="text-4xl">📊</span>
          <h3 class="text-xl font-bold mt-4 mb-2">Data Science</h3>
          <p class="text-slate-400 text-sm">Python, ML, TensorFlow</p>
          <p class="text-green-500 font-bold mt-4">14 weeks • $17,000</p>
        </div>
        <div class="bg-slate-800 p-8 rounded-xl border border-slate-700 hover:border-green-500 transition">
          <span class="text-4xl">📱</span>
          <h3 class="text-xl font-bold mt-4 mb-2">Mobile Dev</h3>
          <p class="text-slate-400 text-sm">React Native, iOS, Android</p>
          <p class="text-green-500 font-bold mt-4">12 weeks • $15,000</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 border-t border-slate-800 text-center text-slate-500">
    <p>© 2024 CodeCraft Academy. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Education 5: Language Learning
  {
    id: 'education-language',
    name: 'Language School',
    description: 'Language learning school website',
    icon: '🌍',
    category: 'education',
    features: ['Languages', 'Courses', 'Levels', 'Pricing'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinguaWorld - Learn Languages</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-indigo-50 text-gray-900">
  <nav class="bg-white py-4 px-6 shadow-sm">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-indigo-600">🌍 LinguaWorld</span>
      <div class="hidden md:flex gap-6">
        <a href="#languages" class="hover:text-indigo-600">Languages</a>
        <a href="#courses" class="hover:text-indigo-600">Courses</a>
        <a href="#pricing" class="hover:text-indigo-600">Pricing</a>
      </div>
      <button class="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700">Start Free</button>
    </div>
  </nav>
  <section class="py-20 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <h1 class="text-5xl font-bold mb-6">Learn Any<br/><span class="text-indigo-600">Language</span></h1>
      <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">Master a new language with interactive lessons, native speakers, and AI-powered practice.</p>
      <button class="bg-indigo-600 text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-indigo-700">Start Learning Free</button>
    </div>
  </section>
  <section id="languages" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Popular Languages</h2>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition cursor-pointer">
          <span class="text-4xl">🇪🇸</span>
          <h3 class="font-semibold mt-3">Spanish</h3>
          <p class="text-gray-500 text-sm">500M+ speakers</p>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition cursor-pointer">
          <span class="text-4xl">🇫🇷</span>
          <h3 class="font-semibold mt-3">French</h3>
          <p class="text-gray-500 text-sm">280M+ speakers</p>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition cursor-pointer">
          <span class="text-4xl">🇩🇪</span>
          <h3 class="font-semibold mt-3">German</h3>
          <p class="text-gray-500 text-sm">130M+ speakers</p>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition cursor-pointer">
          <span class="text-4xl">🇯🇵</span>
          <h3 class="font-semibold mt-3">Japanese</h3>
          <p class="text-gray-500 text-sm">125M+ speakers</p>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition cursor-pointer">
          <span class="text-4xl">🇨🇳</span>
          <h3 class="font-semibold mt-3">Chinese</h3>
          <p class="text-gray-500 text-sm">1.1B+ speakers</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-indigo-900 text-white text-center">
    <p>© 2024 LinguaWorld. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // ==================== E-COMMERCE ====================
  {
    id: 'ecommerce-store',
    name: 'E-Commerce Store',
    description: 'Modern online store with product listings, cart, and checkout',
    icon: '🛒',
    category: 'ecommerce',
    features: ['Product Grid', 'Shopping Cart', 'Search & Filter', 'Product Details', 'Checkout Flow', 'Responsive Design'],
    techStack: ['React', 'TypeScript', 'Tailwind CSS'],
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.0.0',
      'vite': '^5.0.0',
      'typescript': '^5.0.0',
      'tailwindcss': '^3.4.0',
    },
    scripts: {
      'dev': 'vite',
      'build': 'vite build',
    },
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShopStyle - Modern E-Commerce</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
      'src/App.tsx': `import { useState } from 'react'

interface Product {
  id: number
  name: string
  price: number
  image: string
  category: string
}

interface CartItem extends Product {
  quantity: number
}

const products: Product[] = [
  { id: 1, name: 'Classic White T-Shirt', price: 29, image: '👕', category: 'Clothing' },
  { id: 2, name: 'Wireless Headphones', price: 149, image: '🎧', category: 'Electronics' },
  { id: 3, name: 'Leather Backpack', price: 89, image: '🎒', category: 'Accessories' },
  { id: 4, name: 'Running Shoes', price: 119, image: '👟', category: 'Footwear' },
  { id: 5, name: 'Smart Watch', price: 299, image: '⌚', category: 'Electronics' },
  { id: 6, name: 'Denim Jacket', price: 79, image: '🧥', category: 'Clothing' },
  { id: 7, name: 'Sunglasses', price: 59, image: '🕶️', category: 'Accessories' },
  { id: 8, name: 'Canvas Sneakers', price: 65, image: '👞', category: 'Footwear' },
]

function App() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'All' || p.category === category
    return matchesSearch && matchesCategory
  })

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">🛍️ ShopStyle</h1>
          
          <div className="flex-1 max-w-xl mx-8">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 hover:bg-gray-100 rounded-lg"
          >
            <span className="text-2xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Categories */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={\`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap \${
                category === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }\`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition group">
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-6xl">
                {product.image}
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-400 mb-1">{product.category}</p>
                <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-indigo-600">\${product.price}</span>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm transition"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsCartOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Shopping Cart ({cartCount})</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-4 flex-1 overflow-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your cart is empty</p>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                      <span className="text-3xl">{item.image}</span>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">\${item.price * item.quantity}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t">
                <div className="flex justify-between mb-4">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold">\${cartTotal}</span>
                </div>
                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition">
                  Checkout →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App`,
      'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
      'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}`,
      'package.json': '',
    },
  },

  // E-commerce 2: Fashion Store
  {
    id: 'ecommerce-fashion',
    name: 'Fashion Store',
    description: 'Stylish fashion e-commerce landing page',
    icon: '👗',
    category: 'ecommerce',
    features: ['Collections', 'New Arrivals', 'Sale', 'Lookbook'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOIR - Fashion Boutique</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-gray-900">
  <nav class="py-6 px-8 border-b">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-2xl font-light tracking-[0.3em]">NOIR</span>
      <div class="hidden md:flex gap-8 text-sm tracking-wider">
        <a href="#new" class="hover:text-gray-500">NEW</a>
        <a href="#women" class="hover:text-gray-500">WOMEN</a>
        <a href="#men" class="hover:text-gray-500">MEN</a>
        <a href="#sale" class="text-red-500">SALE</a>
      </div>
      <div class="flex gap-4">
        <button>🔍</button>
        <button>❤️</button>
        <button>🛒</button>
      </div>
    </div>
  </nav>
  <section class="h-[80vh] bg-neutral-100 flex items-center justify-center">
    <div class="text-center">
      <p class="tracking-[0.5em] text-sm mb-4">NEW COLLECTION</p>
      <h1 class="text-6xl font-light mb-8">Spring 2024</h1>
      <button class="bg-black text-white px-12 py-4 tracking-wider hover:bg-gray-800">SHOP NOW</button>
    </div>
  </section>
  <section id="new" class="py-20 px-8">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-2xl font-light tracking-wider text-center mb-12">NEW ARRIVALS</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="group cursor-pointer">
          <div class="aspect-[3/4] bg-neutral-100 mb-4 flex items-center justify-center text-6xl group-hover:bg-neutral-200 transition">👕</div>
          <h3 class="text-sm">Linen Shirt</h3>
          <p class="text-gray-500">$89</p>
        </div>
        <div class="group cursor-pointer">
          <div class="aspect-[3/4] bg-neutral-100 mb-4 flex items-center justify-center text-6xl group-hover:bg-neutral-200 transition">👖</div>
          <h3 class="text-sm">Wide Leg Pants</h3>
          <p class="text-gray-500">$120</p>
        </div>
        <div class="group cursor-pointer">
          <div class="aspect-[3/4] bg-neutral-100 mb-4 flex items-center justify-center text-6xl group-hover:bg-neutral-200 transition">👗</div>
          <h3 class="text-sm">Midi Dress</h3>
          <p class="text-gray-500">$150</p>
        </div>
        <div class="group cursor-pointer">
          <div class="aspect-[3/4] bg-neutral-100 mb-4 flex items-center justify-center text-6xl group-hover:bg-neutral-200 transition">🧥</div>
          <h3 class="text-sm">Trench Coat</h3>
          <p class="text-gray-500">$220</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-12 bg-black text-white">
    <div class="max-w-6xl mx-auto px-8 text-center">
      <p class="tracking-[0.3em] text-sm">NOIR</p>
      <p class="text-gray-500 text-sm mt-4">© 2024 All rights reserved</p>
    </div>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // E-commerce 3: Electronics Store
  {
    id: 'ecommerce-electronics',
    name: 'Electronics Store',
    description: 'Tech and electronics e-commerce site',
    icon: '📱',
    category: 'ecommerce',
    features: ['Categories', 'Featured Products', 'Deals', 'Reviews'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechZone - Electronics Store</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 text-gray-900">
  <nav class="bg-blue-600 text-white py-4 px-6">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold">⚡ TechZone</span>
      <div class="flex-1 max-w-xl mx-8">
        <input type="text" placeholder="Search products..." class="w-full px-4 py-2 rounded-lg text-gray-900">
      </div>
      <div class="flex gap-4 items-center">
        <button class="hover:text-blue-200">👤 Account</button>
        <button class="hover:text-blue-200 relative">🛒 Cart <span class="absolute -top-2 -right-2 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">3</span></button>
      </div>
    </div>
  </nav>
  <section class="py-12 px-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
      <div>
        <span class="bg-red-500 text-sm px-3 py-1 rounded-full">HOT DEAL</span>
        <h1 class="text-4xl font-bold mt-4 mb-4">Latest Smartphone<br/>30% OFF</h1>
        <p class="text-blue-100 mb-6">Limited time offer. Don't miss out!</p>
        <button class="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50">Shop Now</button>
      </div>
      <div class="text-center text-9xl">📱</div>
    </div>
  </section>
  <section class="py-16 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-2xl font-bold mb-8">Shop by Category</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition cursor-pointer">
          <span class="text-4xl">📱</span>
          <h3 class="font-semibold mt-3">Phones</h3>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition cursor-pointer">
          <span class="text-4xl">💻</span>
          <h3 class="font-semibold mt-3">Laptops</h3>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition cursor-pointer">
          <span class="text-4xl">🎧</span>
          <h3 class="font-semibold mt-3">Audio</h3>
        </div>
        <div class="bg-white p-6 rounded-xl text-center hover:shadow-lg transition cursor-pointer">
          <span class="text-4xl">⌚</span>
          <h3 class="font-semibold mt-3">Wearables</h3>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-gray-900 text-white text-center">
    <p>© 2024 TechZone. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // E-commerce 4: Food Delivery
  {
    id: 'ecommerce-food',
    name: 'Food Delivery',
    description: 'Food ordering and delivery website',
    icon: '🍔',
    category: 'ecommerce',
    features: ['Restaurant List', 'Menu', 'Cart', 'Order Tracking'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FoodDash - Food Delivery</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-orange-50 text-gray-900">
  <nav class="bg-white py-4 px-6 shadow-sm">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-orange-500">🍔 FoodDash</span>
      <div class="flex-1 max-w-md mx-8">
        <input type="text" placeholder="Enter delivery address" class="w-full px-4 py-2 border rounded-lg">
      </div>
      <div class="flex gap-4">
        <button class="text-gray-600 hover:text-orange-500">Sign In</button>
        <button class="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600">🛒 Cart</button>
      </div>
    </div>
  </nav>
  <section class="py-16 px-6">
    <div class="max-w-6xl mx-auto text-center">
      <h1 class="text-5xl font-bold mb-4">Delicious food,<br/><span class="text-orange-500">delivered fast</span></h1>
      <p class="text-xl text-gray-600 mb-8">Order from your favorite restaurants</p>
      <div class="flex justify-center gap-4 flex-wrap">
        <span class="bg-white px-4 py-2 rounded-full shadow-sm cursor-pointer hover:shadow-md">🍕 Pizza</span>
        <span class="bg-white px-4 py-2 rounded-full shadow-sm cursor-pointer hover:shadow-md">🍔 Burgers</span>
        <span class="bg-white px-4 py-2 rounded-full shadow-sm cursor-pointer hover:shadow-md">🍣 Sushi</span>
        <span class="bg-white px-4 py-2 rounded-full shadow-sm cursor-pointer hover:shadow-md">🥗 Salads</span>
        <span class="bg-white px-4 py-2 rounded-full shadow-sm cursor-pointer hover:shadow-md">🌮 Mexican</span>
      </div>
    </div>
  </section>
  <section class="py-16 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-2xl font-bold mb-8">Popular Near You</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition">
          <div class="h-40 bg-gradient-to-r from-red-400 to-orange-400 flex items-center justify-center text-6xl">🍕</div>
          <div class="p-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold">Mario's Pizza</h3>
                <p class="text-gray-500 text-sm">Italian • $$</p>
              </div>
              <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">4.8 ⭐</span>
            </div>
            <p class="text-gray-500 text-sm mt-2">25-35 min • $2.99 delivery</p>
          </div>
        </div>
        <div class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition">
          <div class="h-40 bg-gradient-to-r from-yellow-400 to-amber-400 flex items-center justify-center text-6xl">🍔</div>
          <div class="p-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold">Burger Joint</h3>
                <p class="text-gray-500 text-sm">American • $$</p>
              </div>
              <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">4.6 ⭐</span>
            </div>
            <p class="text-gray-500 text-sm mt-2">20-30 min • $1.99 delivery</p>
          </div>
        </div>
        <div class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition">
          <div class="h-40 bg-gradient-to-r from-pink-400 to-rose-400 flex items-center justify-center text-6xl">🍣</div>
          <div class="p-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold">Sushi Master</h3>
                <p class="text-gray-500 text-sm">Japanese • $$$</p>
              </div>
              <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">4.9 ⭐</span>
            </div>
            <p class="text-gray-500 text-sm mt-2">30-45 min • $3.99 delivery</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-gray-900 text-white text-center">
    <p>© 2024 FoodDash. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // E-commerce 5: Subscription Box
  {
    id: 'ecommerce-subscription',
    name: 'Subscription Box',
    description: 'Subscription box service landing page',
    icon: '📦',
    category: 'ecommerce',
    features: ['Plans', 'How It Works', 'Reviews', 'FAQ'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BoxJoy - Monthly Surprises</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-pink-50 text-gray-900">
  <nav class="py-4 px-6">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-pink-600">📦 BoxJoy</span>
      <div class="hidden md:flex gap-6">
        <a href="#how" class="hover:text-pink-600">How It Works</a>
        <a href="#plans" class="hover:text-pink-600">Plans</a>
        <a href="#reviews" class="hover:text-pink-600">Reviews</a>
      </div>
      <button class="bg-pink-600 text-white px-6 py-2 rounded-full hover:bg-pink-700">Subscribe Now</button>
    </div>
  </nav>
  <section class="py-20 px-6">
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h1 class="text-5xl font-bold mb-6">Monthly surprises<br/><span class="text-pink-600">delivered to you</span></h1>
        <p class="text-xl text-gray-600 mb-8">Curated boxes of beauty, wellness, and lifestyle products. Cancel anytime.</p>
        <div class="flex gap-4">
          <button class="bg-pink-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-pink-700">Get Started</button>
          <button class="border-2 border-pink-600 text-pink-600 px-8 py-4 rounded-full hover:bg-pink-50">See Past Boxes</button>
        </div>
      </div>
      <div class="text-center text-9xl">🎁</div>
    </div>
  </section>
  <section id="plans" class="py-20 px-6 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Choose Your Plan</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="border-2 border-gray-200 rounded-2xl p-8 text-center hover:border-pink-500 transition">
          <h3 class="text-xl font-bold mb-2">Monthly</h3>
          <div class="text-4xl font-bold text-pink-600 mb-4">$29<span class="text-lg text-gray-500">/mo</span></div>
          <ul class="text-gray-600 space-y-2 mb-6">
            <li>5-7 full-size products</li>
            <li>Free shipping</li>
            <li>Cancel anytime</li>
          </ul>
          <button class="w-full bg-pink-600 text-white py-3 rounded-full hover:bg-pink-700">Subscribe</button>
        </div>
        <div class="border-2 border-pink-500 rounded-2xl p-8 text-center relative">
          <span class="absolute -top-4 left-1/2 -translate-x-1/2 bg-pink-500 text-white px-4 py-1 rounded-full text-sm">BEST VALUE</span>
          <h3 class="text-xl font-bold mb-2">6 Months</h3>
          <div class="text-4xl font-bold text-pink-600 mb-4">$24<span class="text-lg text-gray-500">/mo</span></div>
          <ul class="text-gray-600 space-y-2 mb-6">
            <li>5-7 full-size products</li>
            <li>Free shipping</li>
            <li>Bonus gift</li>
          </ul>
          <button class="w-full bg-pink-600 text-white py-3 rounded-full hover:bg-pink-700">Subscribe</button>
        </div>
        <div class="border-2 border-gray-200 rounded-2xl p-8 text-center hover:border-pink-500 transition">
          <h3 class="text-xl font-bold mb-2">Annual</h3>
          <div class="text-4xl font-bold text-pink-600 mb-4">$19<span class="text-lg text-gray-500">/mo</span></div>
          <ul class="text-gray-600 space-y-2 mb-6">
            <li>5-7 full-size products</li>
            <li>Free shipping</li>
            <li>2 bonus gifts</li>
          </ul>
          <button class="w-full bg-pink-600 text-white py-3 rounded-full hover:bg-pink-700">Subscribe</button>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-pink-900 text-white text-center">
    <p>© 2024 BoxJoy. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // ==================== EVENT / TICKETING ====================
  {
    id: 'event-ticketing',
    name: 'Event Ticketing',
    description: 'Event landing page with countdown, ticket selection, and booking',
    icon: '🎫',
    category: 'events',
    features: ['Event Countdown', 'Ticket Tiers', 'Schedule', 'Speakers/Artists', 'Venue Info', 'FAQ'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechConf 2024 - The Future of Innovation</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white">
  <!-- Navigation -->
  <nav class="fixed w-full bg-gray-900/95 backdrop-blur-sm z-50 border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <span class="text-xl font-bold text-cyan-400">🎫 TechConf 2024</span>
      <div class="hidden md:flex items-center gap-8 text-sm">
        <a href="#schedule" class="hover:text-cyan-400 transition">Schedule</a>
        <a href="#speakers" class="hover:text-cyan-400 transition">Speakers</a>
        <a href="#tickets" class="hover:text-cyan-400 transition">Tickets</a>
        <a href="#tickets" class="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg transition">Get Tickets</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="min-h-screen flex items-center justify-center px-4 pt-20 relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-gray-900 to-cyan-900/50"></div>
    <div class="relative text-center max-w-4xl">
      <p class="text-cyan-400 tracking-widest mb-4">MARCH 15-17, 2024 • SAN FRANCISCO</p>
      <h1 class="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        TechConf 2024
      </h1>
      <p class="text-xl text-gray-300 mb-8">The world's premier technology conference. 3 days, 100+ speakers, endless possibilities.</p>
      
      <!-- Countdown -->
      <div class="flex justify-center gap-4 mb-12">
        <div class="bg-gray-800/50 backdrop-blur px-6 py-4 rounded-xl border border-gray-700">
          <div id="days" class="text-4xl font-bold text-cyan-400">45</div>
          <div class="text-gray-400 text-sm">Days</div>
        </div>
        <div class="bg-gray-800/50 backdrop-blur px-6 py-4 rounded-xl border border-gray-700">
          <div id="hours" class="text-4xl font-bold text-purple-400">12</div>
          <div class="text-gray-400 text-sm">Hours</div>
        </div>
        <div class="bg-gray-800/50 backdrop-blur px-6 py-4 rounded-xl border border-gray-700">
          <div id="minutes" class="text-4xl font-bold text-pink-400">30</div>
          <div class="text-gray-400 text-sm">Minutes</div>
        </div>
        <div class="bg-gray-800/50 backdrop-blur px-6 py-4 rounded-xl border border-gray-700">
          <div id="seconds" class="text-4xl font-bold text-yellow-400">00</div>
          <div class="text-gray-400 text-sm">Seconds</div>
        </div>
      </div>

      <a href="#tickets" class="inline-block bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 px-8 py-4 rounded-xl font-medium text-lg transition shadow-lg shadow-cyan-500/25">
        Get Your Tickets Now →
      </a>
    </div>
  </section>

  <!-- Speakers -->
  <section id="speakers" class="py-20 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">Featured Speakers</h2>
        <p class="text-gray-400">Learn from industry leaders and innovators</p>
      </div>
      
      <div class="grid md:grid-cols-4 gap-8">
        <div class="text-center group">
          <div class="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-5xl">👩‍💻</div>
          <h3 class="font-semibold text-lg">Sarah Chen</h3>
          <p class="text-cyan-400 text-sm">CEO, TechVentures</p>
        </div>
        <div class="text-center group">
          <div class="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-5xl">👨‍🔬</div>
          <h3 class="font-semibold text-lg">Michael Roberts</h3>
          <p class="text-purple-400 text-sm">AI Research Lead, Google</p>
        </div>
        <div class="text-center group">
          <div class="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-yellow-500 flex items-center justify-center text-5xl">👩‍🚀</div>
          <h3 class="font-semibold text-lg">Lisa Park</h3>
          <p class="text-pink-400 text-sm">CTO, SpaceX</p>
        </div>
        <div class="text-center group">
          <div class="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-500 to-cyan-500 flex items-center justify-center text-5xl">👨‍💼</div>
          <h3 class="font-semibold text-lg">James Wilson</h3>
          <p class="text-yellow-400 text-sm">Founder, Blockchain Inc</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Tickets -->
  <section id="tickets" class="py-20 px-4 bg-gray-800">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">Choose Your Pass</h2>
        <p class="text-gray-400">Early bird pricing ends soon!</p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-gray-900 p-8 rounded-2xl border border-gray-700 hover:border-cyan-500/50 transition">
          <h3 class="text-xl font-semibold mb-2">Standard Pass</h3>
          <p class="text-gray-400 text-sm mb-6">Perfect for first-time attendees</p>
          <div class="mb-6">
            <span class="text-4xl font-bold">$299</span>
            <span class="text-gray-400 line-through ml-2">$399</span>
          </div>
          <ul class="space-y-3 mb-8 text-gray-300 text-sm">
            <li class="flex items-center gap-2">✓ All keynote sessions</li>
            <li class="flex items-center gap-2">✓ Workshop access</li>
            <li class="flex items-center gap-2">✓ Lunch included</li>
            <li class="flex items-center gap-2">✓ Event swag bag</li>
          </ul>
          <button class="w-full py-3 border border-cyan-500 text-cyan-400 rounded-xl hover:bg-cyan-500/10 transition">Select</button>
        </div>
        
        <div class="bg-gradient-to-b from-cyan-900/50 to-gray-900 p-8 rounded-2xl border-2 border-cyan-500 relative">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 px-4 py-1 rounded-full text-sm font-medium">Most Popular</div>
          <h3 class="text-xl font-semibold mb-2">VIP Pass</h3>
          <p class="text-gray-400 text-sm mb-6">The complete experience</p>
          <div class="mb-6">
            <span class="text-4xl font-bold">$599</span>
            <span class="text-gray-400 line-through ml-2">$799</span>
          </div>
          <ul class="space-y-3 mb-8 text-gray-300 text-sm">
            <li class="flex items-center gap-2">✓ Everything in Standard</li>
            <li class="flex items-center gap-2">✓ VIP lounge access</li>
            <li class="flex items-center gap-2">✓ Speaker meet & greet</li>
            <li class="flex items-center gap-2">✓ Priority seating</li>
            <li class="flex items-center gap-2">✓ After-party access</li>
          </ul>
          <button class="w-full py-3 bg-cyan-500 hover:bg-cyan-600 rounded-xl font-medium transition">Select</button>
        </div>
        
        <div class="bg-gray-900 p-8 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition">
          <h3 class="text-xl font-semibold mb-2">Team Pass</h3>
          <p class="text-gray-400 text-sm mb-6">Bring your whole team</p>
          <div class="mb-6">
            <span class="text-4xl font-bold">$1,999</span>
            <span class="text-gray-400 ml-2">for 5 people</span>
          </div>
          <ul class="space-y-3 mb-8 text-gray-300 text-sm">
            <li class="flex items-center gap-2">✓ 5 VIP passes</li>
            <li class="flex items-center gap-2">✓ Private meeting room</li>
            <li class="flex items-center gap-2">✓ Team photo op</li>
            <li class="flex items-center gap-2">✓ Dedicated concierge</li>
          </ul>
          <button class="w-full py-3 border border-purple-500 text-purple-400 rounded-xl hover:bg-purple-500/10 transition">Select</button>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 px-4 border-t border-gray-800">
    <div class="max-w-7xl mx-auto text-center">
      <p class="text-gray-500">© 2024 TechConf. All rights reserved.</p>
    </div>
  </footer>

  <script>
    // Countdown Timer
    function updateCountdown() {
      const eventDate = new Date('2024-03-15T09:00:00').getTime();
      const now = new Date().getTime();
      const diff = eventDate - now;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      document.getElementById('days').textContent = days > 0 ? days : '0';
      document.getElementById('hours').textContent = hours > 0 ? hours : '0';
      document.getElementById('minutes').textContent = minutes > 0 ? minutes : '0';
      document.getElementById('seconds').textContent = seconds > 0 ? seconds : '0';
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();
  </script>
</body>
</html>`,
      'style.css': `html { scroll-behavior: smooth; }`,
      'script.js': `console.log('🎫 TechConf 2024');`,
    },
  },

  // Events 2: Music Festival
  {
    id: 'event-music-festival',
    name: 'Music Festival',
    description: 'Music festival landing page with lineup and tickets',
    icon: '🎸',
    category: 'events',
    features: ['Lineup', 'Schedule', 'Tickets', 'Gallery'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SoundWave Festival 2024</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white">
  <nav class="fixed w-full bg-black/80 backdrop-blur-sm z-50 py-4 px-6">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-2xl font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">🎸 SOUNDWAVE</span>
      <div class="hidden md:flex gap-6">
        <a href="#lineup" class="hover:text-pink-500">Lineup</a>
        <a href="#schedule" class="hover:text-pink-500">Schedule</a>
        <a href="#tickets" class="hover:text-pink-500">Tickets</a>
      </div>
      <button class="bg-gradient-to-r from-pink-500 to-yellow-500 px-6 py-2 rounded-full font-bold">Buy Tickets</button>
    </div>
  </nav>
  <section class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-pink-900 relative">
    <div class="text-center px-4">
      <p class="text-pink-400 tracking-widest mb-4">JUNE 21-23, 2024 • DESERT VALLEY</p>
      <h1 class="text-7xl md:text-9xl font-black mb-6">SOUNDWAVE</h1>
      <p class="text-2xl text-gray-300 mb-8">3 Days • 50+ Artists • 1 Legendary Weekend</p>
      <button class="bg-gradient-to-r from-pink-500 to-yellow-500 px-12 py-4 rounded-full text-xl font-bold hover:scale-105 transition">Get Tickets</button>
    </div>
    <div class="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black to-transparent"></div>
  </section>
  <section id="lineup" class="py-20 px-6 bg-black">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-5xl font-black text-center mb-4">THE LINEUP</h2>
      <p class="text-gray-400 text-center mb-12">Three days of incredible performances</p>
      <div class="space-y-8">
        <div class="text-center">
          <h3 class="text-pink-500 mb-4">HEADLINERS</h3>
          <div class="flex justify-center gap-8 flex-wrap">
            <span class="text-4xl font-bold">THE ELECTRIC DREAMS</span>
            <span class="text-4xl font-bold">NOVA SYNDICATE</span>
            <span class="text-4xl font-bold">MIDNIGHT SUN</span>
          </div>
        </div>
        <div class="text-center">
          <h3 class="text-yellow-500 mb-4">FEATURING</h3>
          <div class="flex justify-center gap-6 flex-wrap text-xl text-gray-300">
            <span>Bass Collective</span>
            <span>•</span>
            <span>The Wanderers</span>
            <span>•</span>
            <span>Echo Chamber</span>
            <span>•</span>
            <span>Stellar Wave</span>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section id="tickets" class="py-20 px-6 bg-gradient-to-b from-black to-purple-900">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-4xl font-black text-center mb-12">GET YOUR PASS</h2>
      <div class="grid md:grid-cols-2 gap-8">
        <div class="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
          <h3 class="text-2xl font-bold mb-4">General Admission</h3>
          <div class="text-5xl font-black text-pink-500 mb-4">$199</div>
          <p class="text-gray-400 mb-6">3-day access to all stages</p>
          <button class="w-full bg-white text-black py-3 rounded-full font-bold hover:bg-pink-500 hover:text-white transition">Buy Now</button>
        </div>
        <div class="bg-gradient-to-br from-pink-500/20 to-yellow-500/20 backdrop-blur rounded-2xl p-8 text-center border-2 border-pink-500">
          <h3 class="text-2xl font-bold mb-4">VIP Experience</h3>
          <div class="text-5xl font-black text-yellow-500 mb-4">$499</div>
          <p class="text-gray-400 mb-6">Front stage + exclusive lounge</p>
          <button class="w-full bg-gradient-to-r from-pink-500 to-yellow-500 py-3 rounded-full font-bold hover:scale-105 transition">Buy Now</button>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-black text-center text-gray-500">
    <p>© 2024 SoundWave Festival. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Events 3: Wedding Invitation
  {
    id: 'event-wedding',
    name: 'Wedding Invitation',
    description: 'Elegant wedding invitation website',
    icon: '💒',
    category: 'events',
    features: ['Couple Story', 'Event Details', 'RSVP', 'Gallery'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sarah & Michael - Wedding</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    .font-serif { font-family: 'Cormorant Garamond', serif; }
  </style>
</head>
<body class="bg-amber-50 text-stone-800">
  <section class="min-h-screen flex items-center justify-center px-4 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23d4a574\" fill-opacity=\"0.1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]">
    <div class="text-center">
      <p class="text-amber-600 tracking-[0.5em] text-sm mb-8">YOU ARE INVITED TO CELEBRATE</p>
      <h1 class="font-serif text-7xl md:text-9xl mb-4">Sarah <span class="text-amber-600">&</span> Michael</h1>
      <p class="font-serif text-2xl text-stone-600 mb-12">are getting married</p>
      <div class="inline-block border border-amber-300 px-12 py-6">
        <p class="text-amber-600 text-sm tracking-widest mb-2">SAVE THE DATE</p>
        <p class="font-serif text-3xl">September 15, 2024</p>
      </div>
    </div>
  </section>
  <section class="py-20 px-6 bg-white">
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="font-serif text-4xl mb-8">Our Story</h2>
      <p class="text-lg text-stone-600 leading-relaxed mb-8">We met in a coffee shop on a rainy Tuesday morning. Sarah's umbrella was broken, Michael offered to share his, and three years later, here we are—ready to begin our forever together.</p>
      <div class="flex justify-center gap-8 text-6xl">
        <span>💕</span>
      </div>
    </div>
  </section>
  <section class="py-20 px-6 bg-amber-50">
    <div class="max-w-4xl mx-auto">
      <h2 class="font-serif text-4xl text-center mb-12">Event Details</h2>
      <div class="grid md:grid-cols-2 gap-8">
        <div class="bg-white p-8 text-center rounded-lg shadow-sm">
          <span class="text-4xl">⛪</span>
          <h3 class="font-serif text-2xl mt-4 mb-2">Ceremony</h3>
          <p class="text-stone-600">3:00 PM</p>
          <p class="text-stone-600">St. Mary's Chapel</p>
          <p class="text-stone-500 text-sm mt-2">123 Garden Lane, Willowbrook</p>
        </div>
        <div class="bg-white p-8 text-center rounded-lg shadow-sm">
          <span class="text-4xl">🥂</span>
          <h3 class="font-serif text-2xl mt-4 mb-2">Reception</h3>
          <p class="text-stone-600">5:00 PM</p>
          <p class="text-stone-600">Rose Garden Estate</p>
          <p class="text-stone-500 text-sm mt-2">456 Blossom Way, Willowbrook</p>
        </div>
      </div>
    </div>
  </section>
  <section class="py-20 px-6 bg-white">
    <div class="max-w-md mx-auto text-center">
      <h2 class="font-serif text-4xl mb-8">RSVP</h2>
      <p class="text-stone-600 mb-8">Kindly respond by August 15, 2024</p>
      <form class="space-y-4">
        <input type="text" placeholder="Your Name" class="w-full px-4 py-3 border border-stone-300 rounded focus:border-amber-500 focus:outline-none">
        <input type="email" placeholder="Email Address" class="w-full px-4 py-3 border border-stone-300 rounded focus:border-amber-500 focus:outline-none">
        <select class="w-full px-4 py-3 border border-stone-300 rounded focus:border-amber-500 focus:outline-none text-stone-600">
          <option>Will you attend?</option>
          <option>Joyfully Accept</option>
          <option>Regretfully Decline</option>
        </select>
        <button class="w-full bg-amber-600 text-white py-3 rounded hover:bg-amber-700 transition">Send RSVP</button>
      </form>
    </div>
  </section>
  <footer class="py-8 bg-amber-100 text-center">
    <p class="font-serif text-xl text-amber-800">Sarah & Michael</p>
    <p class="text-amber-600 text-sm mt-2">September 15, 2024</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Events 4: Conference Landing
  {
    id: 'event-conference',
    name: 'Business Conference',
    description: 'Professional conference landing page',
    icon: '🎤',
    category: 'events',
    features: ['Agenda', 'Speakers', 'Sponsors', 'Registration'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Summit 2024 - Business Conference</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900">
  <nav class="bg-white shadow-sm py-4 px-6">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <span class="text-xl font-bold text-indigo-600">SUMMIT 2024</span>
      <div class="hidden md:flex gap-6">
        <a href="#agenda" class="hover:text-indigo-600">Agenda</a>
        <a href="#speakers" class="hover:text-indigo-600">Speakers</a>
        <a href="#sponsors" class="hover:text-indigo-600">Sponsors</a>
      </div>
      <button class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Register</button>
    </div>
  </nav>
  <section class="py-24 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
    <div class="max-w-4xl mx-auto text-center">
      <span class="bg-white/20 px-4 py-1 rounded-full text-sm">OCTOBER 10-12, 2024 • NEW YORK</span>
      <h1 class="text-5xl md:text-7xl font-bold mt-8 mb-6">SUMMIT 2024</h1>
      <p class="text-xl text-indigo-100 mb-8">The premier business conference for leaders and innovators</p>
      <div class="flex justify-center gap-4">
        <button class="bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold hover:bg-indigo-50">Register Now</button>
        <button class="border border-white px-8 py-4 rounded-lg hover:bg-white/10">View Agenda</button>
      </div>
    </div>
  </section>
  <section id="agenda" class="py-20 px-6">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Conference Agenda</h2>
      <div class="space-y-4">
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-600">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-indigo-600 text-sm font-semibold">Day 1 • 9:00 AM</span>
              <h3 class="font-bold text-lg mt-1">Opening Keynote: The Future of Business</h3>
              <p class="text-slate-600">John Smith, CEO of TechCorp</p>
            </div>
            <span class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">Main Stage</span>
          </div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-600">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-purple-600 text-sm font-semibold">Day 1 • 11:00 AM</span>
              <h3 class="font-bold text-lg mt-1">Panel: Digital Transformation</h3>
              <p class="text-slate-600">Industry leaders discuss strategies</p>
            </div>
            <span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">Panel Room</span>
          </div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-600">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-green-600 text-sm font-semibold">Day 1 • 2:00 PM</span>
              <h3 class="font-bold text-lg mt-1">Workshop: Leadership Skills</h3>
              <p class="text-slate-600">Interactive session with experts</p>
            </div>
            <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">Workshop</span>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section id="sponsors" class="py-20 px-6 bg-slate-100">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-12">Our Sponsors</h2>
      <div class="grid grid-cols-4 gap-8 items-center opacity-60">
        <div class="text-4xl">🏢</div>
        <div class="text-4xl">🏦</div>
        <div class="text-4xl">🏭</div>
        <div class="text-4xl">🏛️</div>
      </div>
    </div>
  </section>
  <footer class="py-8 bg-slate-900 text-white text-center">
    <p>© 2024 Summit Conference. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // Events 5: Webinar Landing
  {
    id: 'event-webinar',
    name: 'Webinar Registration',
    description: 'Online webinar registration page',
    icon: '💻',
    category: 'events',
    features: ['Registration Form', 'Speaker Bio', 'Topics', 'Countdown'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Free Webinar - Master Digital Marketing</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white">
  <section class="min-h-screen py-16 px-6">
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        <span class="bg-green-500/20 text-green-400 px-4 py-1 rounded-full text-sm">FREE LIVE WEBINAR</span>
        <h1 class="text-4xl md:text-5xl font-bold mt-6 mb-6">Master Digital Marketing in 2024</h1>
        <p class="text-gray-400 text-lg mb-8">Learn proven strategies to grow your business online. Join 500+ marketers in this exclusive live session.</p>
        <div class="flex items-center gap-4 mb-8">
          <div class="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-3xl">👩‍💼</div>
          <div>
            <p class="font-semibold">Jane Marketing</p>
            <p class="text-gray-400 text-sm">CMO at GrowthCo • 15+ years experience</p>
          </div>
        </div>
        <div class="space-y-4 text-gray-300">
          <div class="flex items-center gap-3">
            <span class="text-green-500">✓</span>
            <span>SEO strategies that work in 2024</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-green-500">✓</span>
            <span>Social media marketing secrets</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-green-500">✓</span>
            <span>Email marketing automation</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-green-500">✓</span>
            <span>Live Q&A session</span>
          </div>
        </div>
      </div>
      <div class="bg-gray-800 p-8 rounded-2xl">
        <div class="text-center mb-6">
          <p class="text-gray-400 mb-2">WEBINAR STARTS IN</p>
          <div class="flex justify-center gap-4">
            <div class="bg-gray-700 px-4 py-3 rounded-lg">
              <span class="text-3xl font-bold text-green-400">3</span>
              <p class="text-xs text-gray-400">DAYS</p>
            </div>
            <div class="bg-gray-700 px-4 py-3 rounded-lg">
              <span class="text-3xl font-bold text-green-400">12</span>
              <p class="text-xs text-gray-400">HOURS</p>
            </div>
            <div class="bg-gray-700 px-4 py-3 rounded-lg">
              <span class="text-3xl font-bold text-green-400">45</span>
              <p class="text-xs text-gray-400">MINS</p>
            </div>
          </div>
        </div>
        <form class="space-y-4">
          <input type="text" placeholder="Full Name" class="w-full bg-gray-700 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
          <input type="email" placeholder="Email Address" class="w-full bg-gray-700 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
          <input type="tel" placeholder="Phone (optional)" class="w-full bg-gray-700 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
          <button class="w-full bg-green-500 text-white py-4 rounded-lg font-bold hover:bg-green-600 transition">Reserve My Spot →</button>
          <p class="text-center text-gray-500 text-sm">🔒 Your information is secure</p>
        </form>
        <div class="mt-6 pt-6 border-t border-gray-700 text-center">
          <p class="text-gray-400 text-sm">📅 Thursday, Jan 25 at 2PM EST</p>
          <p class="text-gray-500 text-sm mt-1">Can't make it live? Register anyway for the replay!</p>
        </div>
      </div>
    </div>
  </section>
  <footer class="py-8 text-center text-gray-600">
    <p>© 2024 GrowthCo. All rights reserved.</p>
  </footer>
</body>
</html>`,
      'style.css': `/* Custom styles */`,
    },
  },

  // ==================== DIGITAL BUSINESS CARD ====================
  {
    id: 'digital-card',
    name: 'Digital Business Card',
    description: 'Modern digital visiting card with contact info, social links, and vCard download',
    icon: '📇',
    category: 'business',
    features: ['Profile Photo', 'Contact Info', 'Social Links', 'vCard Download', 'QR Code', 'Dark/Light Theme'],
    techStack: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alex Johnson - Digital Card</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Card -->
    <div class="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
      <!-- Header -->
      <div class="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-center relative">
        <div class="w-28 h-28 mx-auto rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center text-6xl">
          👨‍💼
        </div>
        <h1 class="text-2xl font-bold text-white mt-4">Alex Johnson</h1>
        <p class="text-purple-200">Senior Product Designer</p>
        <p class="text-purple-300 text-sm mt-1">TechCorp Inc.</p>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-4 -mt-6 relative z-10 px-4">
        <a href="tel:+1234567890" class="bg-white rounded-xl shadow-lg p-4 text-center hover:scale-105 transition mx-1">
          <span class="text-2xl">📞</span>
          <p class="text-xs text-gray-600 mt-1">Call</p>
        </a>
        <a href="mailto:alex@example.com" class="bg-white rounded-xl shadow-lg p-4 text-center hover:scale-105 transition mx-1">
          <span class="text-2xl">✉️</span>
          <p class="text-xs text-gray-600 mt-1">Email</p>
        </a>
        <a href="https://linkedin.com" target="_blank" class="bg-white rounded-xl shadow-lg p-4 text-center hover:scale-105 transition mx-1">
          <span class="text-2xl">💼</span>
          <p class="text-xs text-gray-600 mt-1">LinkedIn</p>
        </a>
        <a href="https://twitter.com" target="_blank" class="bg-white rounded-xl shadow-lg p-4 text-center hover:scale-105 transition mx-1">
          <span class="text-2xl">🐦</span>
          <p class="text-xs text-gray-600 mt-1">Twitter</p>
        </a>
      </div>

      <!-- Contact Info -->
      <div class="p-6 pt-8 space-y-4">
        <div class="flex items-center gap-4 text-white">
          <span class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">📧</span>
          <div>
            <p class="text-purple-300 text-xs">Email</p>
            <p class="font-medium">alex@example.com</p>
          </div>
        </div>
        
        <div class="flex items-center gap-4 text-white">
          <span class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">📱</span>
          <div>
            <p class="text-purple-300 text-xs">Phone</p>
            <p class="font-medium">+1 (555) 123-4567</p>
          </div>
        </div>
        
        <div class="flex items-center gap-4 text-white">
          <span class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">🌐</span>
          <div>
            <p class="text-purple-300 text-xs">Website</p>
            <p class="font-medium">www.alexjohnson.design</p>
          </div>
        </div>
        
        <div class="flex items-center gap-4 text-white">
          <span class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">📍</span>
          <div>
            <p class="text-purple-300 text-xs">Location</p>
            <p class="font-medium">San Francisco, CA</p>
          </div>
        </div>
      </div>

      <!-- Save Contact Button -->
      <div class="p-6 pt-0">
        <button onclick="downloadVCard()" class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2">
          <span>💾</span> Save Contact
        </button>
      </div>

      <!-- Social Links -->
      <div class="p-6 pt-0">
        <div class="flex justify-center gap-4">
          <a href="#" class="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition">📘</a>
          <a href="#" class="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition">📸</a>
          <a href="#" class="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition">🎵</a>
          <a href="#" class="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 transition">▶️</a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <p class="text-center text-purple-300/50 text-sm mt-6">
      Powered by Digital Card ✨
    </p>
  </div>

  <script>
    function downloadVCard() {
      const vcard = \`BEGIN:VCARD
VERSION:3.0
FN:Alex Johnson
TITLE:Senior Product Designer
ORG:TechCorp Inc.
TEL:+15551234567
EMAIL:alex@example.com
URL:https://www.alexjohnson.design
ADR:;;San Francisco;CA;;USA
END:VCARD\`;

      const blob = new Blob([vcard], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'alex-johnson.vcf';
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`,
      'style.css': `/* Additional styles if needed */`,
      'script.js': `console.log('📇 Digital Card Ready!');`,
    },
  },
];

export const getPrebuiltTemplateById = (id: string): PrebuiltTemplate | undefined => {
  return PREBUILT_TEMPLATES.find(t => t.id === id);
};

export const PREBUILT_CATEGORIES = [
  { id: 'landing', name: 'Landing Pages', icon: '🚀' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'ecommerce', name: 'E-Commerce', icon: '🛒' },
  { id: 'portfolio', name: 'Portfolio', icon: '👨‍💻' },
  { id: 'education', name: 'Education', icon: '🎓' },
  { id: 'hospitality', name: 'Hospitality', icon: '🏨' },
  { id: 'events', name: 'Events', icon: '🎫' },
];
