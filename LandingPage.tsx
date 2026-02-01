import React, { useState, useEffect } from 'react';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import NewPassword from './pages/NewPassword';

interface AppCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  status: 'live' | 'coming-soon' | 'beta';
  features: string[];
  path: string;
}

interface LandingPageProps {
  onLaunchApp?: (appId: string) => void;
}

type AuthModal = 'none' | 'signin' | 'signup' | 'reset-password' | 'new-password';
type PageView = 'landing' | 'dashboard';

const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageView>('landing');
  const [email, setEmail] = useState('');
  const [authModal, setAuthModal] = useState<AuthModal>('none');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignIn = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    setAuthModal('none');
    setCurrentPage('dashboard'); // Redirect to dashboard after sign in
  };

  const handleSignUp = (email: string) => {
    // After sign up, redirect to sign in page with success message
    setSignUpSuccess(true);
    setAuthModal('signin');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setCurrentPage('landing');
  };

  const goToDashboard = () => {
    if (isLoggedIn) {
      setCurrentPage('dashboard');
    } else {
      setAuthModal('signin');
    }
  };

  const apps: AppCard[] = [
    {
      id: 'neural-chat',
      name: 'Neural Chat',
      description: 'Advanced AI conversation interface with multiple providers. Chat with GPT-4, Claude, Gemini and more.',
      icon: '🧠',
      gradient: 'from-purple-500 to-pink-500',
      status: 'live',
      features: ['Multi-provider AI', 'Voice Chat', 'Real-time Streaming', 'Custom Prompts'],
      path: '/neural-chat'
    },
    {
      id: 'canvas-studio',
      name: 'Canvas Studio',
      description: 'AI-powered code and content generation with live preview. Build websites and apps instantly.',
      icon: '🎨',
      gradient: 'from-cyan-500 to-blue-500',
      status: 'live',
      features: ['Live Preview', 'Code Generation', 'Export Ready', 'Multiple Frameworks'],
      path: '/canvas-app'
    },
    {
      id: 'maula-editor',
      name: 'Maula Editor',
      description: 'Full-featured AI code editor with VS Code-like experience. Intelligent code completion and debugging.',
      icon: '⚡',
      gradient: 'from-green-500 to-emerald-500',
      status: 'live',
      features: ['VS Code Style', 'AI Copilot', 'Git Integration', 'Terminal'],
      path: '/maula-editor'
    }
  ];

  const getStatusBadge = (status: AppCard['status']) => {
    switch (status) {
      case 'live':
        return (
          <span className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-xs font-medium text-green-400">
            Live
          </span>
        );
      case 'beta':
        return (
          <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-xs font-medium text-blue-400">
            Beta
          </span>
        );
      case 'coming-soon':
        return (
          <span className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-xs font-medium text-yellow-400">
            Coming Soon
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden overflow-y-auto" style={{ position: 'relative' }}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-40 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Landing Page Content */}
      {currentPage === 'landing' && (
      <>
      {/* Header / Navbar */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrollY > 50 ? 'backdrop-blur-xl bg-black/70 border-b border-white/5 shadow-2xl' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 via-cyan-400 to-green-400 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-shadow">
                  <span className="text-2xl font-black text-black">O</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[#030303] animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  OneLast AI
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Digital Friend Zone</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#apps" className="text-sm text-gray-400 hover:text-white transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                Apps
              </a>
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                Features
              </a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                Pricing
              </a>
              {isLoggedIn ? (
                <button
                  onClick={goToDashboard}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={() => setAuthModal('signin')}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </button>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 py-4 border-t border-white/10 animate-fadeIn">
              <nav className="flex flex-col gap-4">
                <a href="#apps" className="text-gray-400 hover:text-white transition-colors">Apps</a>
                <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
                {isLoggedIn ? (
                  <button
                    onClick={() => { goToDashboard(); setIsMenuOpen(false); }}
                    className="mt-2 px-5 py-3 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl font-semibold text-sm w-full"
                  >
                    Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => { setAuthModal('signin'); setIsMenuOpen(false); }}
                    className="mt-2 px-5 py-3 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl font-semibold text-sm w-full"
                  >
                    Login
                  </button>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Wrapper - ensures scrolling */}
      <main className="relative z-10">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-20">
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20 mb-8 backdrop-blur-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-green-400">Beta Launch Coming Soon</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[0.9] tracking-tight">
            <span className="block text-white">Your AI</span>
            <span className="block mt-2 bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Digital Friend
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Access powerful AI tools with <span className="text-green-400 font-semibold">pay-as-you-go credits</span>. 
            No subscriptions, no commitments. Use what you need, when you need it.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button 
              onClick={goToDashboard}
              className="group px-8 py-4 bg-gradient-to-r from-green-500 to-cyan-500 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-green-500/30 transition-all transform hover:scale-105 flex items-center gap-3"
            >
              <span>Open Dashboard</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button className="px-8 py-4 border border-white/20 rounded-2xl font-bold text-lg hover:bg-white/5 hover:border-white/40 transition-all flex items-center gap-3 group">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div className="text-center group cursor-default">
              <div className="text-3xl md:text-4xl font-black text-green-400 group-hover:scale-110 transition-transform">3+</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">AI Apps</div>
            </div>
            <div className="text-center border-x border-white/10 group cursor-default">
              <div className="text-3xl md:text-4xl font-black text-cyan-400 group-hover:scale-110 transition-transform">5+</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">AI Models</div>
            </div>
            <div className="text-center group cursor-default">
              <div className="text-3xl md:text-4xl font-black text-purple-400 group-hover:scale-110 transition-transform">∞</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Possibilities</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Apps Section */}
      <section id="apps" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <span className="text-purple-400">🚀</span>
              <span className="text-sm font-medium text-purple-400">Our Apps</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-4">
              <span className="text-white">Powerful </span>
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">AI Tools</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Three incredible apps, one credit system. Use your credits across all our tools seamlessly.
            </p>
          </div>

          {/* Apps Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {apps.map((app, index) => (
              <div 
                key={app.id}
                className="group relative"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${app.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-all duration-500`} />
                
                {/* Card */}
                <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all duration-500 h-full backdrop-blur-sm group-hover:translate-y-[-4px]">
                  {/* Status Badge */}
                  <div className="absolute top-6 right-6">
                    {getStatusBadge(app.status)}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center mb-6 text-3xl shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    {app.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all">
                    {app.name}
                  </h3>
                  <p className="text-gray-400 mb-6 leading-relaxed">{app.description}</p>

                  {/* Features */}
                  <div className="space-y-2 mb-8">
                    {app.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Launch Button */}
                  <button 
                    onClick={() => {
                      if (app.status !== 'coming-soon') {
                        window.location.href = app.path;
                      }
                    }}
                    disabled={app.status === 'coming-soon'}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      app.status === 'coming-soon'
                        ? 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed'
                        : `bg-gradient-to-r ${app.gradient} hover:shadow-lg hover:scale-[1.02]`
                    }`}
                  >
                    {app.status === 'coming-soon' ? (
                      'Launching Soon'
                    ) : (
                      <>
                        Launch App
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-6 bg-gradient-to-b from-transparent via-green-500/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <span className="text-cyan-400">✨</span>
              <span className="text-sm font-medium text-cyan-400">Features</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-4">
              <span className="text-white">Why Choose </span>
              <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">OneLast AI?</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Built for developers, creators, and anyone who wants AI without the hassle.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '💰',
                title: 'Pay As You Go',
                description: 'No monthly subscriptions. Buy credits and use them whenever you want. Your credits never expire.',
                color: 'green'
              },
              {
                icon: '🤖',
                title: 'Multiple AI Models',
                description: 'Access GPT-4, Claude, Gemini, Mistral, and more. Switch between models based on your needs.',
                color: 'cyan'
              },
              {
                icon: '⚡',
                title: 'Lightning Fast',
                description: 'Optimized infrastructure for instant responses. No waiting, no queue, just pure speed.',
                color: 'purple'
              },
              {
                icon: '📊',
                title: 'Unified Dashboard',
                description: 'Manage all your apps, credits, and usage from one beautiful dashboard. Complete transparency.',
                color: 'pink'
              },
              {
                icon: '🛠️',
                title: 'Developer Friendly',
                description: 'API access, webhooks, and integrations. Build your own apps on top of our platform.',
                color: 'orange'
              },
              {
                icon: '🔒',
                title: 'Secure & Private',
                description: 'Your data is encrypted and never used for training. We respect your privacy completely.',
                color: 'emerald'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`group p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-${feature.color}-500/30 transition-all duration-500 hover:translate-y-[-4px]`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-${feature.color}-500/20 to-${feature.color}-500/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-2xl`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <span className="text-green-400">💎</span>
              <span className="text-sm font-medium text-green-400">Simple Pricing</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-4">
              <span className="text-white">Credit </span>
              <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Packages</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Buy once, use anytime. No expiration, no pressure.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all duration-500 hover:translate-y-[-4px]">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black text-white">$5</span>
                <span className="text-gray-500">/ 50 credits</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">Perfect for trying out our tools</p>
              <ul className="space-y-3 mb-8">
                {['50 AI Credits', 'All AI Models', 'All Apps Access', 'Never Expires'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-all cursor-not-allowed text-gray-500">
                Coming Soon
              </button>
            </div>

            {/* Pro - Featured */}
            <div className="relative p-8 rounded-3xl bg-gradient-to-b from-green-500/10 to-cyan-500/5 border border-green-500/30 scale-105 hover:scale-[1.07] transition-all duration-500">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-cyan-500 text-xs font-bold uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black text-white">$30</span>
                <span className="text-gray-500">/ 350 credits</span>
              </div>
              <p className="text-green-400 text-sm mb-6">15% savings • Best value</p>
              <ul className="space-y-3 mb-8">
                {['350 AI Credits', 'All AI Models', 'Priority Support', 'API Access', 'Never Expires'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all cursor-not-allowed opacity-70">
                Coming Soon
              </button>
            </div>

            {/* Enterprise */}
            <div className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all duration-500 hover:translate-y-[-4px]">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black text-white">$100</span>
                <span className="text-gray-500">/ 1500 credits</span>
              </div>
              <p className="text-cyan-400 text-sm mb-6">35% savings • Power users</p>
              <ul className="space-y-3 mb-8">
                {['1500 AI Credits', 'All AI Models', 'Priority Support', 'Full API Access', 'Custom Integrations'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-all cursor-not-allowed text-gray-500">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-[2.5rem] bg-gradient-to-br from-green-500/10 via-cyan-500/10 to-purple-500/10 border border-white/10 backdrop-blur-sm relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
                Join the waitlist and be the first to know when we launch. Early access users get <span className="text-green-400 font-semibold">bonus credits!</span>
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-6 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 text-white placeholder:text-gray-500 transition-all"
                />
                <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl font-bold whitespace-nowrap hover:shadow-lg hover:shadow-green-500/25 transition-all hover:scale-105">
                  Join Waitlist
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-cyan-400 flex items-center justify-center">
                  <span className="text-lg font-black text-black">O</span>
                </div>
                <span className="text-lg font-bold">OneLast AI</span>
              </div>
              <p className="text-gray-500 text-sm max-w-xs">
                Your AI digital friend zone. Access powerful AI tools with simple pay-as-you-go credits.
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#apps" className="hover:text-white transition-colors">Apps</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2026 OneLast AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
      </main>
      </>
      )}

      {/* Full Page Dashboard */}
      {currentPage === 'dashboard' && (
        <FullPageDashboard userEmail={userEmail} onLogout={handleLogout} onBackToHome={() => setCurrentPage('landing')} />
      )}

      {/* Auth Modals */}
      {authModal === 'signin' && (
        <SignIn
          onClose={() => { setAuthModal('none'); setSignUpSuccess(false); }}
          onSignIn={handleSignIn}
          onSwitchToSignUp={() => { setAuthModal('signup'); setSignUpSuccess(false); }}
          onSwitchToResetPassword={() => setAuthModal('reset-password')}
          showSuccessMessage={signUpSuccess}
        />
      )}

      {authModal === 'signup' && (
        <SignUp
          onClose={() => setAuthModal('none')}
          onSignUp={handleSignUp}
          onSwitchToSignIn={() => setAuthModal('signin')}
        />
      )}

      {authModal === 'reset-password' && (
        <ResetPassword
          onClose={() => setAuthModal('none')}
          onSwitchToSignIn={() => setAuthModal('signin')}
        />
      )}

      {authModal === 'new-password' && (
        <NewPassword
          onClose={() => setAuthModal('none')}
          onPasswordReset={() => {}}
          onSwitchToSignIn={() => setAuthModal('signin')}
        />
      )}

      {/* Custom CSS Animations */}
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 6s ease infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// Full Page Dashboard Component
interface FullPageDashboardProps {
  userEmail?: string;
  onLogout?: () => void;
  onBackToHome?: () => void;
}

const FullPageDashboard: React.FC<FullPageDashboardProps> = ({ userEmail = 'user@example.com', onLogout, onBackToHome }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'apps' | 'credits' | 'usage' | 'billing' | 'security' | 'settings'>('overview');
  const creditBalance = 247;
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'apps', label: 'My Apps', icon: '🚀' },
    { id: 'credits', label: 'Credits', icon: '💰' },
    { id: 'usage', label: 'Usage', icon: '📈' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const recentActivity = [
    { app: 'Neural Chat', action: 'Chat conversation', credits: 5, time: '2 min ago', icon: '🧠' },
    { app: 'Canvas Studio', action: 'Generated landing page', credits: 12, time: '15 min ago', icon: '🎨' },
    { app: 'Maula Editor', action: 'Code completion', credits: 3, time: '1 hour ago', icon: '⚡' },
    { app: 'Neural Chat', action: 'Voice conversation', credits: 8, time: '3 hours ago', icon: '🧠' },
  ];

  return (
    <div className="min-h-screen relative z-10">
      {/* Dashboard Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Back */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToHome}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-3 group cursor-pointer" onClick={onBackToHome}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 via-cyan-400 to-green-400 flex items-center justify-center shadow-lg shadow-green-500/20">
                  <span className="text-xl font-black text-black">O</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">OneLast AI</h1>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Dashboard</p>
                </div>
              </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20">
                <span className="text-xl">🪙</span>
                <div>
                  <div className="text-xs text-gray-500">Balance</div>
                  <div className="text-lg font-bold text-green-400">{creditBalance}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center text-lg font-bold">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-white">{userEmail.split('@')[0]}</div>
                  <div className="text-xs text-gray-500">{userEmail}</div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all text-gray-400"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs Navigation */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 overflow-x-auto mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 text-white border border-green-500/30 shadow-lg shadow-green-500/10'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="p-8 rounded-3xl bg-gradient-to-r from-green-500/10 via-cyan-500/5 to-purple-500/10 border border-green-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-full blur-[80px]" />
              <div className="relative">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome back! 👋</h2>
                <p className="text-gray-400 text-lg">Ready to build something amazing today?</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Credits Used Today', value: '28', icon: '⚡', color: 'cyan', change: '+12%' },
                { label: 'Total Requests', value: '156', icon: '📊', color: 'purple', change: '+23%' },
                { label: 'Apps Used', value: '3', icon: '🚀', color: 'pink', change: 'All Active' },
                { label: 'Credits Remaining', value: creditBalance.toString(), icon: '🪙', color: 'green', change: '49%' },
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{stat.icon}</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                  <div className={`text-sm text-${stat.color}-400`}>{stat.change}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-white">Quick Actions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { name: 'Neural Chat', icon: '🧠', desc: 'Start a conversation', gradient: 'from-purple-500 to-pink-500', path: '/neural-chat' },
                  { name: 'Canvas Studio', icon: '🎨', desc: 'Build something new', gradient: 'from-cyan-500 to-blue-500', path: '/canvas-studio' },
                  { name: 'Buy Credits', icon: '🪙', desc: 'Top up your balance', gradient: 'from-green-500 to-emerald-500', path: null },
                ].map((action, i) => (
                  <a
                    key={i}
                    href={action.path || '#'}
                    onClick={(e) => { if (!action.path) { e.preventDefault(); setActiveTab('credits'); }}}
                    className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all group cursor-pointer"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      {action.icon}
                    </div>
                    <h4 className="font-bold text-white text-lg mb-1">{action.name}</h4>
                    <p className="text-sm text-gray-500">{action.desc}</p>
                  </a>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-white">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-2xl">
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white text-lg">{activity.action}</div>
                      <div className="text-sm text-gray-500">{activity.app} • {activity.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-cyan-400">-{activity.credits}</div>
                      <div className="text-xs text-gray-500">credits</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'apps' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">My Apps</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Neural Chat', icon: '🧠', status: 'Active', gradient: 'from-purple-500 to-pink-500', path: '/neural-chat', desc: 'AI conversation interface' },
                { name: 'Canvas Studio', icon: '🎨', status: 'Active', gradient: 'from-cyan-500 to-blue-500', path: '/canvas-studio', desc: 'Visual app builder' },
                { name: 'Maula Editor', icon: '⚡', status: 'Active', gradient: 'from-green-500 to-emerald-500', path: '/maula-editor', desc: 'AI code editor' },
              ].map((app, i) => (
                <div key={i} className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all group">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-${app.gradient.split('-')[1]}-500/20`}>
                    {app.icon}
                  </div>
                  <h4 className="font-bold text-white text-xl mb-2">{app.name}</h4>
                  <p className="text-gray-500 mb-4">{app.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">{app.status}</span>
                    <a href={app.path} className="px-4 py-2 rounded-xl bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">
                      Launch →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'credits' && (
          <div className="space-y-8">
            <div className="p-8 rounded-3xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Current Balance</div>
                  <div className="text-5xl font-black text-green-400">{creditBalance}</div>
                </div>
                <span className="text-7xl">🪙</span>
              </div>
              <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full" style={{ width: '49%' }} />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>0</span>
                <span>500</span>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6 text-white">Buy Credits</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { credits: 50, price: 5, savings: null, popular: false },
                  { credits: 350, price: 30, savings: '15%', popular: true },
                  { credits: 1500, price: 100, savings: '35%', popular: false },
                ].map((pkg, i) => (
                  <button key={i} className={`p-8 rounded-2xl border transition-all text-left relative ${pkg.popular ? 'bg-gradient-to-br from-green-500/10 to-cyan-500/10 border-green-500/30 scale-105' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}>
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-green-500 to-cyan-500 rounded-full text-xs font-bold">
                        MOST POPULAR
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">🪙</span>
                      <span className="text-3xl font-black text-white">{pkg.credits}</span>
                    </div>
                    {pkg.savings && <span className="inline-block px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-bold mb-4">{pkg.savings} OFF</span>}
                    <div className="text-4xl font-black text-cyan-400 mb-2">${pkg.price}</div>
                    <div className="text-sm text-gray-500">${(pkg.price / pkg.credits).toFixed(2)} per credit</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10">
                <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-4">This Week</h4>
                <div className="text-4xl font-black text-white mb-2">156</div>
                <div className="text-lg text-green-400">+23% from last week</div>
              </div>
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10">
                <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-4">Credits Used</h4>
                <div className="text-4xl font-black text-white mb-2">89</div>
                <div className="text-lg text-cyan-400">Avg 12.7 per day</div>
              </div>
            </div>
            
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10">
              <h4 className="text-xl font-bold mb-6 text-white">Usage by App</h4>
              <div className="space-y-6">
                {[
                  { name: 'Neural Chat', percent: 45, color: 'purple' },
                  { name: 'Canvas Studio', percent: 35, color: 'cyan' },
                  { name: 'Maula Editor', percent: 20, color: 'green' },
                ].map((app, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-2">
                      <span className="text-white font-medium">{app.name}</span>
                      <span className="text-gray-400">{app.percent}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                      <div className={`h-full bg-${app.color}-500 rounded-full transition-all`} style={{ width: `${app.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-white">Payment Methods</h3>
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-10 rounded-lg bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold">
                      VISA
                    </div>
                    <div>
                      <div className="text-white font-medium">•••• •••• •••• 4242</div>
                      <div className="text-sm text-gray-500">Expires 12/27</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">Default</span>
                </div>
                <button className="w-full p-6 rounded-2xl border border-dashed border-white/20 text-gray-500 hover:text-white hover:border-green-500/50 transition-all flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Payment Method
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6 text-white">Billing History</h3>
              <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-5 text-sm font-medium text-gray-500">Date</th>
                      <th className="text-left p-5 text-sm font-medium text-gray-500">Description</th>
                      <th className="text-left p-5 text-sm font-medium text-gray-500">Amount</th>
                      <th className="text-left p-5 text-sm font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { date: 'Jan 15, 2026', desc: '350 Credits - Pro Package', amount: '$30.00', status: 'Paid' },
                      { date: 'Dec 20, 2025', desc: '50 Credits - Starter Package', amount: '$5.00', status: 'Paid' },
                      { date: 'Dec 01, 2025', desc: '350 Credits - Pro Package', amount: '$30.00', status: 'Paid' },
                    ].map((item, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="p-5 text-gray-400">{item.date}</td>
                        <td className="p-5 text-white">{item.desc}</td>
                        <td className="p-5 text-cyan-400 font-medium">{item.amount}</td>
                        <td className="p-5">
                          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Password</h4>
                    <p className="text-gray-500">Last changed 30 days ago</p>
                  </div>
                </div>
                <button className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium">
                  Change Password
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Two-Factor Authentication</h4>
                    <p className="text-gray-500">Add an extra layer of security</p>
                  </div>
                </div>
                <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 hover:shadow-lg hover:shadow-green-500/25 transition-all font-medium">
                  Enable 2FA
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
              <h4 className="font-bold text-red-400 text-lg mb-2">Danger Zone</h4>
              <p className="text-gray-500 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
              <button className="px-5 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium">
                Delete Account
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-white">Profile Settings</h3>
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center text-3xl font-bold">
                    {userEmail.charAt(0).toUpperCase()}
                  </div>
                  <button className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium">
                    Change Avatar
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                    <input
                      type="text"
                      defaultValue="John Doe"
                      className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <input
                      type="email"
                      defaultValue={userEmail}
                      className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 text-white"
                    />
                  </div>
                </div>
                <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 hover:shadow-lg hover:shadow-green-500/25 transition-all font-medium">
                  Save Changes
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6 text-white">Notifications</h3>
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-6">
                {[
                  { label: 'Email Notifications', desc: 'Receive emails about your account activity', checked: true },
                  { label: 'Usage Alerts', desc: 'Get notified when credits are running low', checked: true },
                  { label: 'Marketing Emails', desc: 'Receive updates about new features and offers', checked: false },
                  { label: 'Weekly Summary', desc: 'Get a weekly summary of your usage', checked: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-white text-lg">{item.label}</div>
                      <div className="text-gray-500">{item.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                      <div className="w-12 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Dashboard Content Component (kept for reference, may be removed later)
interface DashboardContentProps {
  userEmail?: string;
  onLogout?: () => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ userEmail = 'user@example.com', onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'apps' | 'credits' | 'usage' | 'billing' | 'security' | 'settings'>('overview');
  const creditBalance = 247;
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'apps', label: 'My Apps', icon: '🚀' },
    { id: 'credits', label: 'Credits', icon: '💰' },
    { id: 'usage', label: 'Usage', icon: '📈' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const recentActivity = [
    { app: 'Neural Chat', action: 'Chat conversation', credits: 5, time: '2 min ago', icon: '🧠' },
    { app: 'Canvas Studio', action: 'Generated landing page', credits: 12, time: '15 min ago', icon: '🎨' },
    { app: 'Maula Editor', action: 'Code completion', credits: 3, time: '1 hour ago', icon: '⚡' },
    { app: 'Neural Chat', action: 'Voice conversation', credits: 8, time: '3 hours ago', icon: '🧠' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center text-xl font-bold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            <p className="text-gray-500 text-sm">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20">
            <span className="text-2xl">🪙</span>
            <div>
              <div className="text-xs text-gray-500">Balance</div>
              <div className="text-lg font-bold text-green-400">{creditBalance}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all text-gray-400"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 text-white border border-green-500/30'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Credits Used Today', value: '28', icon: '⚡', color: 'cyan' },
              { label: 'Total Requests', value: '156', icon: '📊', color: 'purple' },
              { label: 'Apps Used', value: '3', icon: '🚀', color: 'pink' },
              { label: 'Credits Remaining', value: creditBalance.toString(), icon: '🪙', color: 'green' },
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{stat.icon}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-xl">
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{activity.action}</div>
                    <div className="text-sm text-gray-500">{activity.app} • {activity.time}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-cyan-400">-{activity.credits}</div>
                    <div className="text-xs text-gray-500">credits</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'apps' && (
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: 'Neural Chat', icon: '🧠', status: 'Active', gradient: 'from-purple-500 to-pink-500' },
            { name: 'Canvas Studio', icon: '🎨', status: 'Active', gradient: 'from-cyan-500 to-blue-500' },
            { name: 'Maula Editor', icon: '⚡', status: 'Active', gradient: 'from-green-500 to-emerald-500' },
          ].map((app, i) => (
            <div key={i} className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all group cursor-pointer">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                {app.icon}
              </div>
              <h4 className="font-bold text-white mb-1">{app.name}</h4>
              <p className="text-sm text-green-400">{app.status}</p>
              <button className="mt-4 w-full py-2 rounded-lg bg-white/5 text-sm font-medium hover:bg-white/10 transition-colors">
                Launch
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'credits' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-500">Current Balance</div>
                <div className="text-4xl font-black text-green-400">{creditBalance}</div>
              </div>
              <span className="text-6xl">🪙</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full" style={{ width: '49%' }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>0</span>
              <span>500</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Buy Credits</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { credits: 50, price: 5, savings: null },
                { credits: 350, price: 30, savings: '15%' },
                { credits: 1500, price: 100, savings: '35%' },
              ].map((pkg, i) => (
                <button key={i} className={`p-4 rounded-xl border transition-all text-left ${i === 1 ? 'bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-green-500/30' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🪙</span>
                    <span className="text-lg font-bold text-white">{pkg.credits}</span>
                    {pkg.savings && <span className="text-xs text-green-400 font-bold">{pkg.savings} OFF</span>}
                  </div>
                  <div className="text-2xl font-black text-cyan-400">${pkg.price}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10">
              <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-4">This Week</h4>
              <div className="text-3xl font-bold text-white mb-2">156</div>
              <div className="text-sm text-green-400">+23% from last week</div>
            </div>
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10">
              <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-4">Credits Used</h4>
              <div className="text-3xl font-bold text-white mb-2">89</div>
              <div className="text-sm text-cyan-400">Avg 12.7 per day</div>
            </div>
          </div>
          
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10">
            <h4 className="font-semibold mb-4 text-white">Usage by App</h4>
            <div className="space-y-4">
              {[
                { name: 'Neural Chat', percent: 45, color: 'purple' },
                { name: 'Canvas Studio', percent: 35, color: 'cyan' },
                { name: 'Maula Editor', percent: 20, color: 'green' },
              ].map((app, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">{app.name}</span>
                    <span className="text-sm text-gray-500">{app.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                    <div className={`h-full bg-${app.color}-500 rounded-full`} style={{ width: `${app.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Payment Methods */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Payment Methods</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center text-white text-xs font-bold">
                    VISA
                  </div>
                  <div>
                    <div className="text-white font-medium">•••• •••• •••• 4242</div>
                    <div className="text-xs text-gray-500">Expires 12/27</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">Default</span>
                  <button className="p-2 text-gray-500 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <button className="w-full p-4 rounded-xl border border-dashed border-white/20 text-gray-500 hover:text-white hover:border-green-500/50 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Payment Method
              </button>
            </div>
          </div>

          {/* Billing History */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Billing History</h3>
            <div className="rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Description</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: 'Jan 15, 2026', desc: '350 Credits - Pro Package', amount: '$30.00', status: 'Paid' },
                    { date: 'Dec 20, 2025', desc: '50 Credits - Starter Package', amount: '$5.00', status: 'Paid' },
                    { date: 'Dec 01, 2025', desc: '350 Credits - Pro Package', amount: '$30.00', status: 'Paid' },
                  ].map((item, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-sm text-gray-400">{item.date}</td>
                      <td className="p-4 text-sm text-white">{item.desc}</td>
                      <td className="p-4 text-sm text-cyan-400">{item.amount}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Password */}
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-white">Password</h4>
                  <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                </div>
              </div>
              <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium">
                Change Password
              </button>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-white">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
              </div>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-cyan-500 hover:shadow-lg hover:shadow-green-500/25 transition-all text-sm font-medium">
                Enable 2FA
              </button>
            </div>
          </div>

          {/* Active Sessions */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Active Sessions</h3>
            <div className="space-y-3">
              {[
                { device: 'MacBook Pro', location: 'San Francisco, CA', current: true, time: 'Now' },
                { device: 'iPhone 15', location: 'San Francisco, CA', current: false, time: '2 hours ago' },
                { device: 'Chrome on Windows', location: 'New York, NY', current: false, time: '1 day ago' },
              ].map((session, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{session.device}</span>
                        {session.current && <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">Current</span>}
                      </div>
                      <p className="text-sm text-gray-500">{session.location} • {session.time}</p>
                    </div>
                  </div>
                  {!session.current && (
                    <button className="text-red-400 hover:text-red-300 text-sm">Revoke</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/20">
            <h4 className="font-medium text-red-400 mb-2">Danger Zone</h4>
            <p className="text-sm text-gray-500 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
            <button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium">
              Delete Account
            </button>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Profile Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Profile Settings</h3>
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center text-2xl font-bold">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium">
                  Change Avatar
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                  <input
                    type="text"
                    defaultValue="John Doe"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={userEmail}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 text-white"
                  />
                </div>
              </div>
              <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-cyan-500 hover:shadow-lg hover:shadow-green-500/25 transition-all text-sm font-medium">
                Save Changes
              </button>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Notifications</h3>
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
              {[
                { label: 'Email Notifications', desc: 'Receive emails about your account activity', checked: true },
                { label: 'Usage Alerts', desc: 'Get notified when credits are running low', checked: true },
                { label: 'Marketing Emails', desc: 'Receive updates about new features and offers', checked: false },
                { label: 'Weekly Summary', desc: 'Get a weekly summary of your usage', checked: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium text-white">{item.label}</div>
                    <div className="text-sm text-gray-500">{item.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Theme & Appearance */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Appearance</h3>
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Dark Mode</div>
                  <div className="text-sm text-gray-500">Use dark theme across all apps</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={true} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
