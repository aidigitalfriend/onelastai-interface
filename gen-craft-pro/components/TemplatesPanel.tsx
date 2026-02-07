import React, { useState } from 'react';
import { Template, ProgrammingLanguage, LanguageOption, TemplateCategory } from '../types';

// Language definitions with icons and colors
export const LANGUAGES: LanguageOption[] = [
  { id: 'html', name: 'HTML', icon: '🌐', color: '#e34c26', fileExtension: 'html', description: 'Web pages & layouts' },
  { id: 'javascript', name: 'JavaScript', icon: '⚡', color: '#f7df1e', fileExtension: 'js', description: 'Dynamic web apps' },
  { id: 'typescript', name: 'TypeScript', icon: '🔷', color: '#3178c6', fileExtension: 'ts', description: 'Type-safe JavaScript' },
  { id: 'python', name: 'Python', icon: '🐍', color: '#3776ab', fileExtension: 'py', description: 'AI, Data, Automation' },
  { id: 'react', name: 'React', icon: '⚛️', color: '#61dafb', fileExtension: 'tsx', description: 'Component-based UI' },
  { id: 'nextjs', name: 'Next.js', icon: '▲', color: '#000000', fileExtension: 'tsx', description: 'Full-stack React' },
  { id: 'vue', name: 'Vue', icon: '💚', color: '#4fc08d', fileExtension: 'vue', description: 'Progressive framework' },
  { id: 'nodejs', name: 'Node.js', icon: '🟢', color: '#339933', fileExtension: 'js', description: 'Server-side JS' },
  { id: 'express', name: 'Express', icon: '🚂', color: '#000000', fileExtension: 'js', description: 'REST APIs' },
  { id: 'sql', name: 'SQL', icon: '🗄️', color: '#336791', fileExtension: 'sql', description: 'Database queries' },
  { id: 'tailwind', name: 'Tailwind', icon: '🎨', color: '#38bdf8', fileExtension: 'html', description: 'Utility-first CSS' },
  { id: 'bash', name: 'Bash', icon: '💻', color: '#4eaa25', fileExtension: 'sh', description: 'Shell scripts' },
];

// Templates organized by language and category
export const TEMPLATES: Template[] = [
  // HTML Templates
  {
    id: 'saas-landing',
    name: 'SaaS Landing Page',
    description: 'Modern landing page with hero, features, pricing, and CTA sections',
    prompt: 'Build a modern SaaS landing page for a productivity tool with a hero section featuring animated gradients, a features grid with hover effects, pricing cards, testimonials carousel, and a call-to-action section. Use modern CSS with smooth animations.',
    language: 'html',
    category: 'landing',
    tags: ['marketing', 'startup', 'business'],
  },
  {
    id: 'portfolio',
    name: 'Developer Portfolio',
    description: 'Clean portfolio site with projects showcase and contact form',
    prompt: 'Create a minimal developer portfolio website with a hero section showing name and title, a projects grid with hover effects and project cards, skills section with animated progress bars, and a contact form. Dark theme with accent color.',
    language: 'html',
    category: 'portfolio',
    tags: ['personal', 'developer', 'showcase'],
  },
  {
    id: 'dashboard-html',
    name: 'Analytics Dashboard',
    description: 'Dark-themed dashboard with charts and stats cards',
    prompt: 'Create a dark-themed analytics dashboard with a sidebar navigation, header with search and notifications, stat cards showing key metrics, placeholder charts area, and a recent activity list. Modern glassmorphism style.',
    language: 'html',
    category: 'dashboard',
    tags: ['admin', 'analytics', 'metrics'],
  },
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store',
    description: 'Product listing page with cart functionality',
    prompt: 'Build an elegant e-commerce storefront with a product grid showing images, prices, and add-to-cart buttons. Include a sticky header with cart icon and item count, filter sidebar, and responsive product cards with hover effects.',
    language: 'html',
    category: 'ecommerce',
    tags: ['shop', 'products', 'retail'],
  },

  // React Templates
  {
    id: 'react-dashboard',
    name: 'React Dashboard',
    description: 'Full-featured admin dashboard with state management',
    prompt: 'Create a React admin dashboard component with useState for managing sidebar toggle, dark mode, and notifications. Include a responsive sidebar, header with user menu, stats cards with icons, and a data table component. Use Tailwind classes.',
    language: 'react',
    category: 'dashboard',
    tags: ['admin', 'spa', 'management'],
  },
  {
    id: 'react-todo',
    name: 'Todo App',
    description: 'Complete todo app with CRUD and filters',
    prompt: 'Build a React todo application with useState and useEffect. Features: add/edit/delete todos, mark complete, filter by status (all/active/completed), local storage persistence, and a clean minimal UI with animations.',
    language: 'react',
    category: 'component',
    tags: ['productivity', 'crud', 'state'],
  },
  {
    id: 'react-auth',
    name: 'Auth Components',
    description: 'Login, signup, and password reset forms',
    prompt: 'Create a set of React authentication components: Login form, Signup form, and Password Reset form. Include form validation, error states, loading states, and social login buttons. Modern card-based design.',
    language: 'react',
    category: 'component',
    tags: ['auth', 'forms', 'security'],
  },

  // Python Templates
  {
    id: 'python-api',
    name: 'FastAPI Backend',
    description: 'REST API with endpoints and models',
    prompt: 'Create a FastAPI backend with CRUD endpoints for a user management system. Include Pydantic models for User, async database operations placeholder, authentication middleware, and proper error handling with HTTPException.',
    language: 'python',
    category: 'api',
    tags: ['backend', 'rest', 'async'],
  },
  {
    id: 'python-scraper',
    name: 'Web Scraper',
    description: 'BeautifulSoup scraper with data extraction',
    prompt: 'Build a Python web scraper using requests and BeautifulSoup. Include functions for fetching pages, parsing HTML, extracting specific data (titles, links, prices), handling pagination, and saving results to CSV.',
    language: 'python',
    category: 'automation',
    tags: ['scraping', 'data', 'automation'],
  },
  {
    id: 'python-ml',
    name: 'ML Pipeline',
    description: 'Machine learning data pipeline with sklearn',
    prompt: 'Create a Python machine learning pipeline using scikit-learn. Include data loading, preprocessing (scaling, encoding), train-test split, model training (Random Forest), evaluation metrics, and prediction function.',
    language: 'python',
    category: 'automation',
    tags: ['ml', 'ai', 'data-science'],
  },
  {
    id: 'python-discord',
    name: 'Discord Bot',
    description: 'Discord bot with commands and events',
    prompt: 'Build a Discord bot using discord.py with command handling, event listeners (on_message, on_ready), slash commands, embed messages, and moderation commands (kick, ban, mute). Include proper error handling.',
    language: 'python',
    category: 'automation',
    tags: ['bot', 'discord', 'chat'],
  },

  // Node.js Templates  
  {
    id: 'express-api',
    name: 'Express REST API',
    description: 'Full REST API with middleware and routes',
    prompt: 'Create an Express.js REST API with routes for users CRUD operations, JWT authentication middleware, error handling middleware, request validation, rate limiting, and CORS configuration. Include proper project structure.',
    language: 'express',
    category: 'api',
    tags: ['backend', 'rest', 'node'],
  },
  {
    id: 'node-cli',
    name: 'CLI Tool',
    description: 'Command-line tool with arguments parsing',
    prompt: 'Build a Node.js CLI tool using commander.js for argument parsing. Include multiple commands, options with defaults, interactive prompts using inquirer, colored output, progress indicators, and help documentation.',
    language: 'nodejs',
    category: 'automation',
    tags: ['cli', 'tool', 'utility'],
  },
  {
    id: 'node-websocket',
    name: 'WebSocket Server',
    description: 'Real-time WebSocket server with rooms',
    prompt: 'Create a Node.js WebSocket server using ws library. Include connection handling, room/channel management, broadcast messaging, private messages, heartbeat/ping-pong, and connection cleanup.',
    language: 'nodejs',
    category: 'api',
    tags: ['realtime', 'websocket', 'chat'],
  },

  // TypeScript Templates
  {
    id: 'ts-types',
    name: 'Type Definitions',
    description: 'TypeScript interfaces and type utilities',
    prompt: 'Create a comprehensive TypeScript type definitions file with interfaces for User, Product, Order entities. Include utility types, generic types, discriminated unions, type guards, and mapped types examples.',
    language: 'typescript',
    category: 'component',
    tags: ['types', 'interfaces', 'utility'],
  },

  // SQL Templates
  {
    id: 'sql-schema',
    name: 'Database Schema',
    description: 'Complete database schema with relationships',
    prompt: 'Create a SQL database schema for an e-commerce system. Include tables for users, products, categories, orders, order_items, reviews, and addresses. Add proper foreign keys, indexes, and constraints.',
    language: 'sql',
    category: 'database',
    tags: ['schema', 'database', 'relations'],
  },
  {
    id: 'sql-queries',
    name: 'Advanced Queries',
    description: 'Complex SQL queries with joins and aggregations',
    prompt: 'Write advanced SQL queries including: complex JOINs across multiple tables, subqueries, CTEs (Common Table Expressions), window functions, aggregations with GROUP BY and HAVING, and performance-optimized queries.',
    language: 'sql',
    category: 'database',
    tags: ['queries', 'joins', 'analytics'],
  },

  // Next.js Templates
  {
    id: 'nextjs-blog',
    name: 'Blog with MDX',
    description: 'Next.js blog with markdown support',
    prompt: 'Create a Next.js 14 blog application with App Router. Include a home page listing posts, individual post pages with MDX rendering, categories, search functionality, and SEO metadata. Use Server Components.',
    language: 'nextjs',
    category: 'fullstack',
    tags: ['blog', 'mdx', 'seo'],
  },
  {
    id: 'nextjs-saas',
    name: 'SaaS Starter',
    description: 'Full SaaS boilerplate with auth and billing',
    prompt: 'Create a Next.js 14 SaaS starter with App Router. Include authentication pages, dashboard layout, subscription/pricing page, settings page, and API route handlers. Use TypeScript and Tailwind.',
    language: 'nextjs',
    category: 'fullstack',
    tags: ['saas', 'auth', 'subscription'],
  },

  // Tailwind Templates
  {
    id: 'tailwind-components',
    name: 'UI Component Library',
    description: 'Reusable Tailwind components collection',
    prompt: 'Create a collection of reusable Tailwind CSS components: buttons (variants), input fields, cards, modals, dropdowns, navigation bar, footer, alert/toast notifications, badges, and avatar components.',
    language: 'tailwind',
    category: 'component',
    tags: ['ui', 'components', 'library'],
  },

  // Game Templates
  {
    id: 'html-game',
    name: 'Canvas Game',
    description: 'Simple HTML5 canvas game',
    prompt: 'Create an HTML5 canvas game - a simple space shooter. Include player movement with arrow keys, shooting with spacebar, enemy spawning, collision detection, score tracking, and game over state.',
    language: 'html',
    category: 'game',
    tags: ['game', 'canvas', 'interactive'],
  },
];

// Category metadata
const CATEGORIES: { id: TemplateCategory; name: string; icon: string }[] = [
  { id: 'landing', name: 'Landing Pages', icon: '🚀' },
  { id: 'dashboard', name: 'Dashboards', icon: '📊' },
  { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
  { id: 'portfolio', name: 'Portfolios', icon: '💼' },
  { id: 'api', name: 'APIs & Backend', icon: '⚡' },
  { id: 'database', name: 'Database', icon: '🗄️' },
  { id: 'automation', name: 'Automation', icon: '🤖' },
  { id: 'component', name: 'Components', icon: '🧩' },
  { id: 'fullstack', name: 'Full-Stack', icon: '🔥' },
  { id: 'game', name: 'Games', icon: '🎮' },
];

interface TemplatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: Template) => void;
  selectedLanguage: ProgrammingLanguage | 'all';
  onLanguageChange: (language: ProgrammingLanguage | 'all') => void;
}

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({
  isOpen,
  onClose,
  onUseTemplate,
  selectedLanguage,
  onLanguageChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  // Filter templates by language, category, and search
  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesLanguage = selectedLanguage === 'all' || template.language === selectedLanguage;
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLanguage && matchesCategory && matchesSearch;
  });

  // Get language color
  const getLanguageColor = (langId: ProgrammingLanguage) => {
    const lang = LANGUAGES.find(l => l.id === langId);
    return lang?.color || '#6366f1';
  };

  const getLanguageIcon = (langId: ProgrammingLanguage) => {
    const lang = LANGUAGES.find(l => l.id === langId);
    return lang?.icon || '📄';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[480px] bg-zinc-950 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-blue-900/20 to-emerald-900/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-200">Templates</h2>
              <p className="text-sm text-zinc-500 mt-1">Choose a template to get started</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-violet-500/10 rounded-xl transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Language Filter */}
        <div className="px-6 py-4 border-b border-zinc-800 overflow-x-auto">
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => onLanguageChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedLanguage === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-violet-500/10 border border-zinc-800'
              }`}
            >
              All Languages
            </button>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => onLanguageChange(lang.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedLanguage === lang.id
                    ? 'text-white shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-violet-500/10 border border-zinc-800'
                }`}
                style={selectedLanguage === lang.id ? { backgroundColor: lang.color } : {}}
              >
                <span>{lang.icon}</span>
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-6 py-3 border-b border-zinc-800">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-50 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No templates found</p>
              <p className="text-xs mt-1">Try a different filter or search</p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-blue-500/30 hover:shadow-lg transition-all duration-200 ${
                  hoveredTemplate === template.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
              >
                {/* Template Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: getLanguageColor(template.language) }}
                    >
                      {getLanguageIcon(template.language)}
                    </span>
                    <div>
                      <h3 className="font-semibold text-zinc-200 text-sm">{template.name}</h3>
                      <p className="text-xs text-zinc-500">
                        {LANGUAGES.find(l => l.id === template.language)?.name}
                      </p>
                    </div>
                  </div>
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                    style={{ 
                      backgroundColor: `${getLanguageColor(template.language)}15`,
                      color: getLanguageColor(template.language)
                    }}
                  >
                    {CATEGORIES.find(c => c.id === template.category)?.name}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{template.description}</p>

                {/* Tags */}
                {template.tags && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-blue-900/20 text-zinc-400 rounded text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Use Button */}
                <button
                  onClick={() => onUseTemplate(template)}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Use Template
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900">
          <p className="text-xs text-zinc-500 text-center">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>
    </>
  );
};

export default TemplatesPanel;
