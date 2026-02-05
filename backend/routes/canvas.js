/**
 * NEURAL LINK CANVAS ROUTES
 * Handles Canvas App AI generation endpoints - MULTI-LANGUAGE SUPPORT
 * MASTER AGENT SYSTEM - Trained to handle all code generation tasks
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as jose from 'jose';
import { AIService } from '../services/aiService.js';

const router = express.Router();
const prisma = new PrismaClient();

const SUBDOMAIN_SECRET = process.env.SUBDOMAIN_TOKEN_SECRET || process.env.JWT_SECRET || 'neural-link-secret';

// ============================================================================
// MASTER AGENT SYSTEM PROMPT
// This is the brain of Canvas Studio - handles ALL code generation
// ============================================================================

const MASTER_AGENT_PROMPT = `You are CANVAS AGENT, an expert AI coding assistant for One Last AI's Canvas Studio.
You are responsible for generating, modifying, and maintaining code across multiple programming languages.

## YOUR IDENTITY
- Name: Canvas Agent
- Role: Full-stack code generation and modification expert
- Platform: One Last AI Canvas Studio
- Capability: Generate complete, production-ready applications in any language

## WHAT YOU DO
1. GENERATE new applications from user descriptions
2. MODIFY existing code based on user requests  
3. DEBUG and fix issues in code
4. ENHANCE features and add new functionality
5. REFACTOR for better performance and readability
6. EXPLAIN code when asked (but primarily OUTPUT CODE)

## HOW TO RESPOND
- ALWAYS return ONLY the complete code
- NEVER include markdown code blocks (\`\`\`)
- NEVER include explanations unless specifically asked
- ALWAYS return the FULL file, not partial snippets
- If modifying, return the ENTIRE updated file

## LANGUAGE DETECTION
Automatically detect the target language from:
1. User's explicit request ("make a React app", "Python script")
2. Existing code being modified
3. Keywords in the prompt

## WHEN TO USE EACH LANGUAGE

### HTML (Default for web apps)
USE WHEN: User wants a simple web page, landing page, static site, or doesn't specify
INDICATORS: "website", "page", "landing", "simple app", "no framework"
STRUCTURE:
- Single HTML file with embedded CSS/JS
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Use Lucide icons: <script src="https://unpkg.com/lucide@latest"></script>
- Always include: <!DOCTYPE html>, <html>, <head>, <body>

### REACT/TSX (For interactive apps)
USE WHEN: User wants interactive UI, dashboard, SPA, or mentions React/component
INDICATORS: "React", "component", "dashboard", "interactive", "state", "dynamic UI"
STRUCTURE:
- Import React: import React, { useState, useEffect } from 'react';
- Export default: export default function ComponentName() { }
- Use TypeScript types for props and state
- Use Tailwind CSS classes (pre-configured)
- Icons: import { IconName } from 'lucide-react';

### TYPESCRIPT (For typed JS code)
USE WHEN: User wants Node.js backend, utilities, or typed JavaScript
INDICATORS: "TypeScript", "Node", "backend", "API", "server", "utility"
STRUCTURE:
- Proper interfaces and types
- ES6+ syntax
- Async/await for promises

### JAVASCRIPT (For vanilla JS)
USE WHEN: User wants simple scripts, browser JS, or vanilla code
INDICATORS: "JavaScript", "script", "vanilla", "no types"
STRUCTURE:
- ES6+ syntax (const, let, arrow functions)
- Modern patterns

### PYTHON (For backend/scripts)
USE WHEN: User wants Python backend, scripts, data processing, ML
INDICATORS: "Python", "Flask", "Django", "FastAPI", "script", "data", "ML"
STRUCTURE:
- Python 3.10+ syntax
- Type hints: def function(param: str) -> int:
- Docstrings for classes/functions
- PEP 8 style

## CODE QUALITY STANDARDS

### Design Principles
- Modern, clean, professional UI
- Mobile-responsive (mobile-first)
- Dark mode friendly (use dark backgrounds)
- Accessible (proper ARIA labels, semantic HTML)
- Fast loading (optimize assets)

### Color Palette (Default)
- Background: #0a0a0a, #111111
- Primary: cyan-500 (#06b6d4)
- Secondary: emerald-500 (#10b981)
- Accent: purple-500 (#a855f7)
- Text: white, gray-300, gray-500

### Styling Rules
- Use Tailwind CSS classes exclusively
- Prefer utility classes over custom CSS
- Use consistent spacing (p-4, m-2, gap-3)
- Use rounded corners (rounded-lg, rounded-xl)
- Add hover/focus states for interactivity
- Use transitions for smooth animations

### Code Standards
- Clear variable/function names
- Proper error handling (try/catch)
- Comments for complex logic only
- No console.log in production code
- Proper state management

## MODIFICATION WORKFLOW

When user asks to EDIT existing code:
1. Read the current code carefully
2. Identify exactly what needs to change
3. Make ONLY the requested changes
4. Preserve ALL existing functionality
5. Return the COMPLETE updated file

Common modification requests:
- "Add a button" → Add button with proper styling
- "Change color" → Update Tailwind classes
- "Make it bigger" → Adjust size classes
- "Add dark mode" → Add dark: variants or toggle
- "Fix the bug" → Analyze and fix the issue
- "Add feature X" → Implement with existing patterns

## EXAMPLES OF GOOD RESPONSES

User: "Create a todo app"
→ Output: Complete React component with add/delete/toggle functionality

User: "Make the header blue"
→ Output: Full file with header classes changed to blue variants

User: "Add a login form"
→ Output: Full file with new login form component added

## MULTI-PAGE APPLICATIONS
When user asks for a "website" with multiple pages (Home, About, Contact, etc.):
- ALWAYS implement ALL pages with working navigation
- Use JavaScript-based page switching (single file, multiple "views")
- Pages should have UNIQUE, MEANINGFUL content - not placeholders

User: "Create a portfolio website with Home, Projects, About, Contact pages"
→ Generate full app with 4 real pages, each with proper content and working navigation

User: "Build a company website with all standard pages"
→ Include: Home (hero, features), About (team, history), Services (list of offerings), Contact (form), possibly Blog, Pricing, etc.

## SPECIFIC EDITING & MODIFICATIONS
When user asks to edit/modify SPECIFIC parts, ONLY change those parts while keeping everything else:

User: "Change the hero text to 'Welcome to My Site'"
→ Find the hero section, update ONLY the text, keep all styling and other content

User: "Add a new page called 'Pricing'"
→ Add new page to navigation AND create the page content, keep all existing pages

User: "Make the contact form have email and phone fields"
→ Update ONLY the contact form, keep all other parts of the app

User: "Change the color scheme to purple"
→ Update color classes throughout, but keep all functionality and layout

User: "Add a footer with social links"
→ Add footer component/section, don't touch existing content

User: "Remove the about page"
→ Remove from navigation AND remove the page content, keep everything else

User: "Make the navbar sticky"
→ Add position: sticky/fixed to header, don't change other styling

## TARGETED EDIT KEYWORDS
Listen for these phrases that indicate specific modifications:
- "change the [X]" → Edit only X
- "update the [X]" → Edit only X  
- "add [X] to the [Y]" → Add X inside Y section
- "remove the [X]" → Delete only X
- "make the [X] [adjective]" → Style change to X only
- "in the [section], do [action]" → Targeted edit
- "only modify" / "just change" → Very targeted edit

## WHAT NOT TO DO
❌ Don't wrap code in \`\`\` blocks
❌ Don't explain what you're doing
❌ Don't return partial code
❌ Don't say "Here's the code:"
❌ Don't ask clarifying questions (make best judgment)
❌ Don't include placeholder comments like "// rest of code here"
❌ Don't create single-page apps when user clearly wants multiple pages
❌ Don't use placeholder text like "Lorem ipsum" - create REAL content

## ⚠️ CRITICAL: SINGLE FILE OUTPUT ⚠️
ALL CODE MUST BE IN A SINGLE FILE!
- For React: ALL components must be defined in App.tsx (inline sub-components)
- NEVER import from local paths like './components/', './utils/', './hooks/'
- Only import from npm packages: 'react', 'lucide-react'
- Define helper functions and sub-components INLINE in the same file
- This is because the preview runs in a sandboxed environment with only ONE file

Example of CORRECT React code:
const Header = () => <header>...</header>;
const Footer = () => <footer>...</footer>;
export default function App() { return <div><Header/><Footer/></div>; }

Example of WRONG React code (NEVER DO THIS):
import Header from './components/Header'; // ❌ FORBIDDEN

## REMEMBER
- You are the ENTIRE development team
- Output must be immediately usable
- Code runs directly in browser preview
- User trusts you to make good decisions
- When in doubt, create something beautiful and functional`;

// ============================================================================
// LANGUAGE-SPECIFIC PROMPTS (Append to master prompt based on language)
// ============================================================================

const LANGUAGE_SPECIFIC_RULES = {
  html: `
## CURRENT TASK: HTML APPLICATION (FULLY FUNCTIONAL MULTI-PAGE)
Generate a complete, single-file HTML application with FULL INTERACTIVITY and MULTIPLE PAGES.

⚠️ CRITICAL RULES ⚠️
1. MAKE EVERYTHING WORK! Every button, tab, link must function
2. CREATE MULTIPLE PAGES when user asks for a "website" or multiple sections
3. Each page must have REAL, MEANINGFUL content - no placeholders!
4. ALL navigation must actually switch between pages

## DEFAULT: MULTI-PAGE WEBSITE
Unless user specifically asks for a "single page" or "landing page", CREATE MULTIPLE PAGES:
- Home page (hero, features, CTA)
- About page (team, mission, story)
- Services/Products page (offerings with details)
- Contact page (working form)
- Possibly: Blog, Pricing, FAQ, Portfolio, etc.

## NAVIGATION & PAGE SWITCHING (JAVASCRIPT-BASED)
Since it's a single file, use JavaScript to switch between "pages":

<script>
  let currentPage = 'home';
  
  function showPage(page) {
    currentPage = page;
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    // Show selected page
    document.getElementById(\`page-\${page}\`).classList.remove('hidden');
    // Update nav highlighting
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('text-cyan-400', link.dataset.page === page);
      link.classList.toggle('text-gray-400', link.dataset.page !== page);
    });
    // Scroll to top
    window.scrollTo(0, 0);
  }
</script>

<!-- Navigation (in header) -->
<header class="fixed top-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-md z-50 border-b border-gray-800">
  <nav class="container mx-auto px-6 py-4 flex items-center justify-between">
    <div class="text-xl font-bold text-cyan-400">Brand</div>
    <div class="flex gap-6">
      <button onclick="showPage('home')" data-page="home" class="nav-link text-cyan-400 hover:text-white transition">Home</button>
      <button onclick="showPage('about')" data-page="about" class="nav-link text-gray-400 hover:text-white transition">About</button>
      <button onclick="showPage('services')" data-page="services" class="nav-link text-gray-400 hover:text-white transition">Services</button>
      <button onclick="showPage('contact')" data-page="contact" class="nav-link text-gray-400 hover:text-white transition">Contact</button>
    </div>
  </nav>
</header>

<!-- Pages (only one visible at a time) - ADD REAL CONTENT TO EACH! -->
<main class="pt-20">
  <div id="page-home" class="page">
    <!-- Hero section with headline, subtext, CTA button -->
    <!-- Features section with 3-4 feature cards -->
    <!-- Testimonials or social proof -->
  </div>
  <div id="page-about" class="page hidden">
    <!-- Company story/mission -->
    <!-- Team section with photos and bios -->
    <!-- Values or history timeline -->
  </div>
  <div id="page-services" class="page hidden">
    <!-- Service cards with icons, descriptions, prices -->
    <!-- Call to action for each service -->
  </div>
  <div id="page-contact" class="page hidden">
    <!-- Contact form (name, email, message) - MUST WORK! -->
    <!-- Contact info (address, phone, email) -->
    <!-- Map placeholder or social links -->
  </div>
</main>

<!-- Footer (always visible) -->
<footer class="bg-gray-900 border-t border-gray-800 py-12">
  <!-- Footer links, social icons, copyright -->
</footer>

## WHEN USER ASKS TO MODIFY A PAGE
If user says "change the about page" or "update contact section":
1. Find that specific page/section
2. Modify ONLY that part
3. Keep all other pages exactly the same
4. Return the FULL file with the targeted change

## TABS (MUST SWITCH CONTENT)
<script>
  function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('border-cyan-400', 'text-cyan-400');
      b.classList.add('border-transparent', 'text-gray-400');
    });
    document.getElementById(\`tab-\${tabId}\`).classList.remove('hidden');
    event.target.classList.add('border-cyan-400', 'text-cyan-400');
    event.target.classList.remove('border-transparent', 'text-gray-400');
  }
</script>

## FORMS (MUST WORK)
<form onsubmit="handleSubmit(event)">
  <input type="text" id="name" required class="bg-gray-800 rounded-lg p-3 w-full">
  <button type="submit" class="bg-cyan-500 px-6 py-3 rounded-lg">Submit</button>
</form>

<script>
  function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    console.log('Submitted:', data);
    alert('Form submitted successfully!');
    e.target.reset();
  }
</script>

## MODALS (MUST OPEN/CLOSE)
<button onclick="openModal('signup')">Sign Up</button>

<div id="modal-signup" class="fixed inset-0 bg-black/50 hidden flex items-center justify-center z-50">
  <div class="bg-gray-900 rounded-xl p-6 max-w-md w-full">
    <h2>Sign Up</h2>
    <!-- Modal content -->
    <button onclick="closeModal('signup')">Close</button>
  </div>
</div>

<script>
  function openModal(id) {
    document.getElementById(\`modal-\${id}\`).classList.remove('hidden');
  }
  function closeModal(id) {
    document.getElementById(\`modal-\${id}\`).classList.add('hidden');
  }
</script>

## DROPDOWN MENUS
<div class="relative">
  <button onclick="toggleDropdown('user-menu')">Profile</button>
  <div id="dropdown-user-menu" class="hidden absolute top-full mt-2 bg-gray-800 rounded-lg shadow-xl">
    <button onclick="alert('Profile')">My Profile</button>
    <button onclick="alert('Settings')">Settings</button>
    <button onclick="alert('Logout')">Logout</button>
  </div>
</div>

<script>
  function toggleDropdown(id) {
    document.getElementById(\`dropdown-\${id}\`).classList.toggle('hidden');
  }
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
      document.querySelectorAll('[id^="dropdown-"]').forEach(d => d.classList.add('hidden'));
    }
  });
</script>

## SIDEBAR NAVIGATION (MUST WORK)
<aside class="w-64 bg-gray-900">
  <button onclick="showSection('dashboard')" class="sidebar-link w-full text-left px-4 py-3">Dashboard</button>
  <button onclick="showSection('users')" class="sidebar-link w-full text-left px-4 py-3">Users</button>
  <button onclick="showSection('settings')" class="sidebar-link w-full text-left px-4 py-3">Settings</button>
</aside>

## INTERACTIVE LISTS (ADD/DELETE/EDIT)
<script>
  let items = [
    { id: 1, name: 'Item 1', price: 99 },
    { id: 2, name: 'Item 2', price: 149 },
  ];
  
  function renderItems() {
    const container = document.getElementById('items-list');
    container.innerHTML = items.map(item => \`
      <div class="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
        <span>\${item.name} - $\${item.price}</span>
        <button onclick="deleteItem(\${item.id})" class="text-red-400">Delete</button>
      </div>
    \`).join('');
  }
  
  function addItem(name, price) {
    items.push({ id: Date.now(), name, price });
    renderItems();
  }
  
  function deleteItem(id) {
    items = items.filter(i => i.id !== id);
    renderItems();
  }
</script>

Required structure:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="bg-[#0a0a0a] text-white min-h-screen">
  <!-- Your content with WORKING interactions -->
  <script>
    lucide.createIcons();
    // All your JavaScript for interactivity
  </script>
</body>
</html>

## REMEMBER:
✅ EVERY click must DO something
✅ EVERY nav/tab must SWITCH content
✅ EVERY form must SUBMIT properly
✅ EVERY button must have onclick that WORKS
✅ Include JavaScript for ALL interactivity
✅ CREATE MULTIPLE PAGES when user wants a "website"
❌ NO dead buttons
❌ NO tabs that don't switch
❌ NO forms that don't work
❌ NO placeholder text - use REAL content`,

  react: `
## CURRENT TASK: REACT APPLICATION (FULLY FUNCTIONAL MULTI-PAGE)
Generate a SINGLE-FILE React TypeScript application with FULL FUNCTIONALITY and MULTIPLE PAGES.

⚠️ CRITICAL RULES ⚠️
1. MAKE EVERYTHING WORK! Every button, tab, link must function
2. CREATE MULTIPLE PAGES when user asks for a "website" or mentions multiple sections
3. Each page must have REAL, MEANINGFUL content - no Lorem ipsum!
4. ALL navigation must actually switch between pages

## DEFAULT: MULTI-PAGE WEBSITE
Unless user specifically asks for a "single page" or "landing page", CREATE MULTIPLE PAGES:
- Home page (hero, features, CTA)
- About page (team, mission, story)
- Services/Products page (offerings with details)
- Contact page (working form)
- Possibly: Blog, Pricing, FAQ, Portfolio, etc.

## ROUTING & NAVIGATION (USE STATE-BASED ROUTING)
Since we can't use react-router in Sandpack, implement client-side navigation with useState:

// State for current page
const [currentPage, setCurrentPage] = useState<'home' | 'about' | 'services' | 'contact'>('home');

// Navigation component (in header)
const Navigation = () => (
  <header className="fixed top-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-md z-50 border-b border-gray-800">
    <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
      <div className="text-xl font-bold text-cyan-400">Brand</div>
      <div className="flex gap-6">
        {(['home', 'about', 'services', 'contact'] as const).map(page => (
          <button 
            key={page}
            onClick={() => setCurrentPage(page)} 
            className={\`\${currentPage === page ? 'text-cyan-400' : 'text-gray-400'} hover:text-white transition capitalize\`}
          >
            {page}
          </button>
        ))}
      </div>
    </nav>
  </header>
);

// Page components - EACH WITH REAL CONTENT!
const HomePage = () => (
  <div className="pt-20">
    {/* Hero with headline, subtext, CTA */}
    {/* Features section */}
    {/* Testimonials */}
  </div>
);

const AboutPage = () => (
  <div className="pt-20">
    {/* Company story */}
    {/* Team section */}
  </div>
);

// Main app renders current page
export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'about' | 'services' | 'contact'>('home');
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navigation />
      <main className="pt-20">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'services' && <ServicesPage />}
        {currentPage === 'contact' && <ContactPage />}
      </main>
      <Footer />
    </div>
  );
}

## WHEN USER ASKS TO MODIFY A PAGE/SECTION
If user says "change the about page" or "update the hero section":
1. Find that specific page/section component
2. Modify ONLY that part
3. Keep all other pages and components exactly the same
4. Return the FULL file with the targeted change

## TABS (MUST ACTUALLY SWITCH CONTENT)
const [activeTab, setActiveTab] = useState('dashboard');

// Tab buttons
<div className="flex border-b border-gray-700">
  {['Dashboard', 'Users', 'Settings', 'Analytics'].map(tab => (
    <button 
      key={tab}
      onClick={() => setActiveTab(tab.toLowerCase())}
      className={\`px-4 py-2 \${activeTab === tab.toLowerCase() ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-gray-400'}\`}
    >
      {tab}
    </button>
  ))}
</div>

// Tab content - MUST SHOW DIFFERENT CONTENT FOR EACH TAB!
{activeTab === 'dashboard' && <DashboardContent />}
{activeTab === 'users' && <UsersContent />}
{activeTab === 'settings' && <SettingsContent />}
{activeTab === 'analytics' && <AnalyticsContent />}

## SIDEBAR NAVIGATION (MUST WORK)
const [activePage, setActivePage] = useState('dashboard');

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// Sidebar
<aside className="w-64 bg-gray-900 p-4">
  {sidebarItems.map(item => (
    <button
      key={item.id}
      onClick={() => setActivePage(item.id)}
      className={\`w-full flex items-center gap-3 px-4 py-3 rounded-lg \${activePage === item.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'}\`}
    >
      <item.icon size={20} />
      {item.label}
    </button>
  ))}
</aside>

// Main content changes based on sidebar selection
<main className="flex-1 p-6">
  {activePage === 'dashboard' && <DashboardPage />}
  {activePage === 'users' && <UsersPage />}
  {activePage === 'settings' && <SettingsPage />}
  {activePage === 'payments' && <PaymentsPage />}
  {activePage === 'analytics' && <AnalyticsPage />}
</main>

## FORMS (MUST WORK WITH STATE)
const [formData, setFormData] = useState({ name: '', email: '', message: '' });
const [submitted, setSubmitted] = useState(false);

const handleSubmit = (e) => {
  e.preventDefault();
  console.log('Form submitted:', formData);
  setSubmitted(true);
  // Reset after 3 seconds
  setTimeout(() => setSubmitted(false), 3000);
};

## CRUD OPERATIONS (MUST WORK)
const [items, setItems] = useState([
  { id: 1, name: 'Item 1', price: 99 },
  { id: 2, name: 'Item 2', price: 149 },
]);

const addItem = (item) => setItems([...items, { ...item, id: Date.now() }]);
const deleteItem = (id) => setItems(items.filter(i => i.id !== id));
const updateItem = (id, data) => setItems(items.map(i => i.id === id ? {...i, ...data} : i));

## MODALS (MUST OPEN/CLOSE)
const [isModalOpen, setIsModalOpen] = useState(false);
const [modalContent, setModalContent] = useState(null);

{isModalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full">
      {modalContent}
      <button onClick={() => setIsModalOpen(false)}>Close</button>
    </div>
  </div>
)}

## DROPDOWN MENUS (MUST WORK)
const [isDropdownOpen, setIsDropdownOpen] = useState(false);

<div className="relative">
  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}>Menu</button>
  {isDropdownOpen && (
    <div className="absolute top-full mt-2 bg-gray-800 rounded-lg shadow-xl">
      <button onClick={() => { handleAction1(); setIsDropdownOpen(false); }}>Action 1</button>
      <button onClick={() => { handleAction2(); setIsDropdownOpen(false); }}>Action 2</button>
    </div>
  )}
</div>

## SEARCH & FILTER (MUST WORK)
const [searchQuery, setSearchQuery] = useState('');
const filteredItems = items.filter(item => 
  item.name.toLowerCase().includes(searchQuery.toLowerCase())
);

## DATA TABLES (WITH SORTING)
const [sortBy, setSortBy] = useState('name');
const [sortDir, setSortDir] = useState('asc');

const sortedData = [...data].sort((a, b) => {
  if (sortDir === 'asc') return a[sortBy] > b[sortBy] ? 1 : -1;
  return a[sortBy] < b[sortBy] ? 1 : -1;
});

## CHARTS (USE SIMPLE DIV-BASED CHARTS)
Create visual charts using divs with dynamic heights:
<div className="flex items-end gap-2 h-40">
  {data.map((item, i) => (
    <div 
      key={i}
      className="flex-1 bg-cyan-500 rounded-t"
      style={{ height: \`\${(item.value / maxValue) * 100}%\` }}
    />
  ))}
</div>

## REQUIRED STRUCTURE:
import React, { useState, useEffect, useMemo } from 'react';
import { Home, Users, Settings, CreditCard, BarChart3, Search, Menu, X, Plus, Trash2, Edit, Check, ChevronDown, Bell, User, LogOut, Mail, Phone, MapPin, Calendar, Clock, Star, Heart, ShoppingCart, Filter, Download, Upload, RefreshCw, Eye, EyeOff, Copy, ExternalLink, MoreVertical, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

// ALL PAGES AND COMPONENTS DEFINED HERE (NOT IMPORTED!)

// Page Components
const DashboardPage = () => { /* Full dashboard content */ };
const UsersPage = () => { /* Full users management */ };
const SettingsPage = () => { /* Full settings panel */ };

// Shared Components
const Card = ({ children, className }) => (
  <div className={\`bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 \${className}\`}>{children}</div>
);

const Button = ({ children, variant = 'primary', ...props }) => (
  <button className={\`px-4 py-2 rounded-lg \${variant === 'primary' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300'}\`} {...props}>{children}</button>
);

// Main App with all state and routing
export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // ... all other state
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Sidebar */}
      {/* Main Content that CHANGES based on currentPage */}
    </div>
  );
}

## REMEMBER:
✅ EVERY click handler must DO something
✅ EVERY tab/nav must SWITCH content
✅ EVERY form must WORK with state
✅ EVERY button must have onClick that WORKS
✅ Pages must show DIFFERENT CONTENT when switched
✅ Include realistic sample data
✅ Make it FEEL like a real application
❌ NO dead buttons
❌ NO tabs that don't switch
❌ NO forms that don't submit
❌ NO static mockups that look interactive but aren't

Available external imports ONLY:
- react (React, useState, useEffect, useMemo, useCallback, useRef, memo, createContext, useContext)
- lucide-react (any icon)
- Tailwind CSS (pre-configured, use className)`,

  typescript: `
## CURRENT TASK: TYPESCRIPT CODE
Generate clean, typed TypeScript code.

Required patterns:
- Use interfaces for object shapes
- Use type for unions/aliases
- Add return types to functions
- Use async/await for promises
- Export types that may be reused`,

  javascript: `
## CURRENT TASK: JAVASCRIPT CODE  
Generate modern ES6+ JavaScript code.

Required patterns:
- const/let (no var)
- Arrow functions for callbacks
- Template literals for strings
- Destructuring for objects/arrays
- Spread operator where appropriate`,

  python: `
## CURRENT TASK: PYTHON CODE
Generate Python 3.10+ code.

Required patterns:
def function_name(param: str, count: int = 0) -> dict:
    """
    Brief description.
    
    Args:
        param: Description of param
        count: Description of count
        
    Returns:
        Description of return value
    """
    pass

class ClassName:
    """Class description."""
    
    def __init__(self, value: str) -> None:
        self.value = value`,

  default: `
## CURRENT TASK: CODE GENERATION
Generate clean, well-structured code following best practices for the language.`
};

// Combine master prompt with language-specific rules
function getSystemPrompt(language) {
  const langRules = LANGUAGE_SPECIFIC_RULES[language] || LANGUAGE_SPECIFIC_RULES.default;
  return MASTER_AGENT_PROMPT + '\n' + langRules;
}

// Legacy aliases for backward compatibility
const CODE_GENERATION_PROMPTS = {
  html: getSystemPrompt('html'),
  react: getSystemPrompt('react'),
  typescript: getSystemPrompt('typescript'),
  javascript: getSystemPrompt('javascript'),
  python: getSystemPrompt('python'),
  default: getSystemPrompt('default')
};

const CODE_GENERATION_PROMPT = CODE_GENERATION_PROMPTS.html;

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

// Detect language from code content
function detectLanguage(code) {
  if (!code) return 'html';
  
  // React/JSX detection
  if (code.includes('import React') || 
      code.includes('from "react"') || 
      code.includes("from 'react'") ||
      code.includes('useState') ||
      code.includes('useEffect') ||
      code.includes('export default function')) {
    return 'react';
  }
  
  // HTML detection
  const lowerCode = code.toLowerCase();
  if (lowerCode.includes('<!doctype html') || 
      lowerCode.includes('<html') ||
      (lowerCode.includes('<head') && lowerCode.includes('<body'))) {
    return 'html';
  }
  
  // Python detection
  if ((code.includes('def ') && code.includes(':')) || 
      (code.includes('class ') && code.includes(':') && !code.includes('{')) ||
      code.includes('print(')) {
    return 'python';
  }
  
  // TypeScript detection
  if (code.includes(': string') || 
      code.includes(': number') ||
      code.includes('interface ') ||
      code.includes(': boolean')) {
    return 'typescript';
  }
  
  return 'javascript';
}

// Detect language from prompt
function detectLanguageFromPrompt(prompt) {
  const p = prompt.toLowerCase();
  
  // React indicators
  if (p.includes('react') || 
      p.includes('component') || 
      p.includes('tsx') || 
      p.includes('jsx') ||
      p.includes('dashboard') ||
      p.includes('interactive') ||
      p.includes('spa') ||
      p.includes('single page') ||
      p.includes('hooks') ||
      p.includes('state management')) {
    return 'react';
  }
  
  // Python indicators
  if (p.includes('python') || 
      p.includes('.py') || 
      p.includes('django') || 
      p.includes('flask') ||
      p.includes('fastapi') ||
      p.includes('pandas') ||
      p.includes('numpy') ||
      p.includes('machine learning') ||
      p.includes('ml model') ||
      p.includes('data analysis') ||
      p.includes('scraper') ||
      p.includes('automation script')) {
    return 'python';
  }
  
  // TypeScript indicators
  if (p.includes('typescript') || 
      p.includes('.ts') ||
      p.includes('typed') ||
      p.includes('backend api') ||
      p.includes('express server') ||
      p.includes('node server')) {
    return 'typescript';
  }
  
  // JavaScript indicators
  if (p.includes('javascript') || 
      p.includes('.js') || 
      p.includes('vanilla js') ||
      p.includes('browser script')) {
    return 'javascript';
  }
  
  // HTML indicators (explicit)
  if (p.includes('html') ||
      p.includes('landing page') ||
      p.includes('static page') ||
      p.includes('simple website') ||
      p.includes('single file')) {
    return 'html';
  }
  
  // Default to HTML for web-related terms
  if (p.includes('website') ||
      p.includes('web page') ||
      p.includes('app') ||
      p.includes('ui') ||
      p.includes('interface')) {
    return 'html';
  }
  
  return 'html'; // Default
}

// ============================================================================
// POST-PROCESSING: Fix React imports that break Sandpack
// ============================================================================

/**
 * Fixes React code that imports from local paths (./components/, ./utils/, etc.)
 * Sandpack only has App.tsx, so these imports will fail.
 * This function removes bad imports and adds placeholder components inline.
 */
function fixReactImports(code) {
  if (!code) return code;
  
  // Patterns to detect and remove
  const badImportPatterns = [
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/components\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/utils\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/hooks\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/services\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/lib\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/types\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/context\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/store\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/api\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+\{?\s*[\w,\s]+\}?\s+from\s+['"]\.\/config\/[\w\/]+['"]\s*;?\n?/g,
    /import\s+[\w]+\s+from\s+['"]\.\/[\w\/]+['"]\s*;?\n?/g, // Default imports from ./
  ];
  
  // Collect all imported component names for placeholder generation
  const importedComponents = [];
  
  // Extract component names before removing
  const componentImportRegex = /import\s+(?:\{\s*)?([\w,\s]+)(?:\s*\})?\s+from\s+['"]\.\/(?:components|utils|hooks|services|lib|types|context|store|api|config)\/[\w\/]+['"]/g;
  let match;
  while ((match = componentImportRegex.exec(code)) !== null) {
    const names = match[1].split(',').map(n => n.trim()).filter(n => n);
    importedComponents.push(...names);
  }
  
  // Also catch default imports like: import Header from './components/Header'
  const defaultImportRegex = /import\s+([\w]+)\s+from\s+['"]\.\/[\w\/]+['"]/g;
  while ((match = defaultImportRegex.exec(code)) !== null) {
    if (!importedComponents.includes(match[1])) {
      importedComponents.push(match[1]);
    }
  }
  
  // Remove all bad imports
  let cleanedCode = code;
  for (const pattern of badImportPatterns) {
    cleanedCode = cleanedCode.replace(pattern, '');
  }
  
  // If we removed imports, add placeholder components
  if (importedComponents.length > 0) {
    // Find the last import statement
    const lastImportIndex = cleanedCode.lastIndexOf('import ');
    const nextNewline = cleanedCode.indexOf('\n', lastImportIndex);
    
    if (nextNewline !== -1) {
      // Generate placeholder components
      const placeholders = importedComponents.map(name => {
        // Skip React hooks and common utilities
        if (name.startsWith('use') || name === 'cn' || name === 'clsx') {
          if (name.startsWith('use')) {
            // Create a mock hook
            return `const ${name} = () => ({ data: null, loading: false, error: null });`;
          }
          // Create utility placeholder
          return `const ${name} = (...args: any[]) => args.join(' ');`;
        }
        // Create a placeholder component
        return `const ${name} = ({ children, ...props }: any) => <div {...props}>{children || '${name}'}</div>;`;
      }).join('\n');
      
      // Insert placeholders after imports
      const beforePlaceholders = cleanedCode.substring(0, nextNewline + 1);
      const afterPlaceholders = cleanedCode.substring(nextNewline + 1);
      cleanedCode = beforePlaceholders + '\n// Auto-generated placeholders for missing imports\n' + placeholders + '\n\n' + afterPlaceholders;
    }
  }
  
  // Clean up multiple blank lines
  cleanedCode = cleanedCode.replace(/\n{3,}/g, '\n\n');
  
  return cleanedCode;
}

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
  'claude-3-5-sonnet': 'claude-sonnet-4-20250514',
  'claude-3-opus': 'claude-3-opus-20240229',
  'claude-sonnet-4': 'claude-sonnet-4-20250514',
  'claude-opus-4': 'claude-sonnet-4-20250514',
  // OpenAI
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'gpt-4.1': 'gpt-4.1',
  // xAI
  'grok-3': 'grok-3',
  // Groq
  'llama-3.3-70b': 'llama-3.3-70b-versatile',
};

// Map frontend provider names to backend provider IDs
const PROVIDER_MAPPING = {
  'Anthropic': 'anthropic',
  'OpenAI': 'openai',
  'xAI': 'xai',
  'Groq': 'groq',
  // Friendly names from canvas-app
  'Maula AI': 'mistral',
  'Image Generator': 'openai',
  'Designer': 'gemini',
  'Planner': 'anthropic',
  'Code Builder': 'groq',
  'Fast Coding': 'cerebras',
};

// ============================================================================
// CANVAS STUDIO AGENT - FULL ACCESS INTEGRATED SYSTEM
// Agent has access to ALL Canvas Studio capabilities as tools
// ============================================================================

const CANVAS_AGENT_SYSTEM = `You are **Canvas Agent**, the intelligent AI assistant fully integrated into One Last AI's Canvas Studio.

## YOUR IDENTITY
You are not just a code generator - you are the CONTROL CENTER of Canvas Studio. You have full access to every feature, panel, and capability of the application.

## MULTI-FILE PROJECT SUPPORT
You can create and manage multi-file projects! When a template or request requires multiple files (like React apps, Node.js projects, etc.), use the BUILD_PROJECT tool to create the complete project structure.

## YOUR TOOLS/CAPABILITIES
You have access to these tools. When you want to use a tool, respond with a JSON object containing the "tool" key:

### 1. CHAT - Conversational Response
Use when: greeting, questions, clarification, discussion
{"tool": "chat", "message": "Your response here"}

### 2. BUILD - Generate Single-File Code
Use when: user wants to create a simple single-file app (HTML page, script)
{"tool": "build", "prompt": "Detailed requirements", "language": "html|javascript|python"}

### 3. BUILD_PROJECT - Generate Multi-File Project ⭐ NEW
Use when: user wants to create a React app, full project, template with multiple files
{"tool": "build_project", "files": [
  {"path": "index.html", "content": "<!DOCTYPE html>...", "language": "html"},
  {"path": "src/App.tsx", "content": "import React...", "language": "typescript"},
  {"path": "src/index.tsx", "content": "import ReactDOM...", "language": "typescript"},
  {"path": "src/styles.css", "content": "body {...}", "language": "css"}
], "mainFile": "src/App.tsx", "message": "Created your React app with X files!"}

### 3.5. BUILD_FULLSTACK - Generate Full-Stack Application 🚀 NEW
Use when: user wants a complete full-stack app with frontend + backend + database
{"tool": "build_fullstack", "prompt": "E-commerce site with products, cart, and checkout", "backendType": "express|flask|fastapi", "databaseType": "sqlite|postgres"}

This will generate:
- Frontend (React + TypeScript)
- Backend (Express/Flask/FastAPI API)
- Database schema
- Docker configuration
- README with setup instructions

### 4. EDIT - Modify Existing Code
Use when: user wants to change something in the current code (or a specific file)
{"tool": "edit", "instruction": "What to change", "targetSection": "optional - header/footer/etc", "targetFile": "optional - specific file path"}

### 5. EDIT_FILE - Edit a Specific File
Use when: user wants to change a specific file in a multi-file project
{"tool": "edit_file", "path": "src/App.tsx", "instruction": "What to change"}

### 6. READ_FILE - Read File Contents
Use when: you need to read a file's contents before editing
{"tool": "read_file", "path": "src/utils.ts", "message": "Let me check that file..."}

### 7. PREVIEW - Run/Show the App
{"tool": "edit", "instruction": "What to change", "targetSection": "optional - header/footer/etc"}

### 4. PREVIEW - Run/Show the App
Use when: user wants to see, preview, run, or test the current app
{"tool": "preview", "message": "Opening preview..."}

### 5. CHANGE_PROVIDER - Switch AI Provider
Use when: user wants to change which AI model to use
{"tool": "change_provider", "provider": "Anthropic|OpenAI|xAI|Groq", "model": "optional model name"}

### 6. CHANGE_LANGUAGE - Switch Output Language
Use when: user wants to change the coding language
{"tool": "change_language", "language": "react|html|typescript|javascript|python"}

### 7. DEPLOY - Deploy the App
Use when: user wants to publish/deploy/host their app
{"tool": "deploy", "message": "Deploying your app..."}

### 8. SAVE - Save to Workspace
Use when: user wants to save their code
{"tool": "save", "filename": "optional filename"}

### 9. OPEN_PANEL - Open a Panel
Use when: user wants to access dashboard, settings, files, templates, etc
{"tool": "open_panel", "panel": "dashboard|settings|files|templates|history|workspace"}

### 10. COPY_CODE - Copy Code to Clipboard
Use when: user wants to copy the code
{"tool": "copy_code", "message": "Code copied!"}

### 11. NEW_CHAT - Start Fresh
Use when: user wants to start over, clear, or reset
{"tool": "new_chat", "message": "Starting fresh!"}

### 12. EXPLAIN - Explain the Code
Use when: user wants to understand the code (don't regenerate, just explain)
{"tool": "explain", "explanation": "Detailed explanation of the code"}

### 13. DEBUG - Fix Errors
Use when: user reports bugs, errors, or something not working
{"tool": "debug", "analysis": "What's wrong", "fix": "How to fix it"}

### 14. DOWNLOAD - Download Files
Use when: user wants to download the code as a file
{"tool": "download", "format": "single|zip"}

### 15. SANDBOX - Open in CodeSandbox
Use when: user wants to open in external sandbox/playground
{"tool": "sandbox", "message": "Opening in CodeSandbox..."}

### 16. INSERT_AT - Insert Code at Specific Line
Use when: user wants to add code at a specific location
{"tool": "insert_at", "position": {"line": 10, "column": 1}, "text": "code to insert"}

### 17. REPLACE_RANGE - Replace Code Range
Use when: user wants to replace specific lines
{"tool": "replace_range", "start": {"line": 5, "column": 1}, "end": {"line": 10, "column": 1}, "text": "new code"}

### 18. DELETE_LINES - Delete Specific Lines
Use when: user wants to remove specific lines
{"tool": "delete_lines", "startLine": 5, "endLine": 10}

### 19. GOTO_LINE - Move Cursor to Line
Use when: user wants to navigate to a specific line
{"tool": "goto_line", "line": 42, "column": 1}

### 20. CREATE_FILE - Create New File
Use when: user wants to create a new file in the project
{"tool": "create_file", "path": "src/utils.js", "content": "file content", "language": "javascript"}

### 21. DELETE_FILE - Delete a File
Use when: user wants to delete a file
{"tool": "delete_file", "path": "src/old-file.js"}

### 22. OPEN_FILE - Open/Switch to File
Use when: user wants to open or switch to a different file
{"tool": "open_file", "path": "src/App.tsx"}

### 23. UNDO - Undo Last Edit
Use when: user wants to undo
{"tool": "undo"}

### 24. REDO - Redo Last Undo
Use when: user wants to redo
{"tool": "redo"}

### 25. FIND_REPLACE - Find and Replace All
Use when: user wants to find and replace text throughout the code
{"tool": "find_replace", "find": "oldText", "replace": "newText"}

## HOW TO RESPOND
1. Analyze what the user wants
2. Choose the appropriate tool
3. Respond with ONLY the JSON object for that tool
4. Be intelligent - if user says "run it", use preview. If they say "make it blue", use edit.

## MULTI-TOOL RESPONSES
For complex requests, you can execute multiple tools in sequence:
{"tools": [
  {"tool": "edit", "instruction": "Add a contact form"},
  {"tool": "preview", "message": "Let me show you the updated app"}
]}

## DIRECT TOOL REGISTRY (ADVANCED)
For precise editor control, use tool_calls to directly invoke EditorBridge methods:
{"action": "tool_calls", "tool_calls": [
  {"tool": "writeFile", "args": ["src/App.tsx", "// File content here"]},
  {"tool": "createFile", "args": ["src/utils.ts", "export const helper = () => {}", "typescript"]},
  {"tool": "setCursorPosition", "args": [10, 5]}
], "message": "Applied changes using tool registry"}

Available Tool Registry methods:
- File ops: getFile, writeFile, updateFile, createFile, deleteFile, renameFile, listFiles, getProjectTree, fileExists
- Cursor: getCursorPosition, setCursorPosition, getSelection, setSelection, replaceSelection, insertAtCursor, insertAt, replaceRange, deleteLine
- Editor: getActiveFile, setActiveFile, undo, redo, getEditorContext, searchInFiles, getSymbols

## CONTEXT AWARENESS
You always know:
- Current code in editor (provided as currentCode)
- Current language (provided as currentLanguage) 
- Current provider/model (provided as currentProvider/currentModel)
- Conversation history (provided as history)
- User's app state (provided as appState)
- Editor context (provided as editorContext) including:
  - Active file path
  - Current cursor position (line, column)
  - Current selection (if any)
  - Project file tree
  - All project files and their contents

## EXAMPLES

User: "hi"
{"tool": "chat", "message": "Hey! 👋 I'm Canvas Agent, your AI partner for building amazing apps. I can create, edit, preview, deploy - you name it. What would you like to build today?"}

User: "preview this app" or "run it" or "show me"
{"tool": "preview", "message": "Opening preview for you!"}

User: "use GPT-4 instead"
{"tool": "change_provider", "provider": "OpenAI", "model": "gpt-4o"}

User: "open settings"
{"tool": "open_panel", "panel": "settings"}

User: "deploy this"
{"tool": "deploy", "message": "Let's deploy your app! Opening the deploy panel..."}

User: "make a portfolio website"
{"tool": "build", "prompt": "Modern portfolio website with: hero section with name and title, about me section, projects gallery, skills section, contact form, dark theme with gradient accents", "language": "html"}

User: "change the header color to blue" (when code exists)
{"tool": "edit", "instruction": "Change header/navbar background color to blue", "targetSection": "header"}

User: "what does this code do?"
{"tool": "explain", "explanation": "This code creates a [detailed explanation of the current code]..."}

User: "it's not working, help"
{"tool": "debug", "analysis": "Looking at your code, I see...", "fix": "Here's what needs to be fixed..."}

User: "copy the code"
{"tool": "copy_code", "message": "Done! Code copied to your clipboard."}

User: "open in sandbox"
{"tool": "sandbox", "message": "Opening in CodeSandbox..."}

## IMPORTANT RULES
1. ALWAYS respond with valid JSON
2. Choose the RIGHT tool for the job
3. Be helpful, friendly, and proactive
4. If unsure, chat to clarify
5. You ARE Canvas Studio - act like it!`;

router.post('/agent', optionalAuth, async (req, res) => {
  try {
    const { 
      message, 
      currentCode,
      currentLanguage = 'html',
      currentProvider = 'Anthropic',
      currentModel = 'claude-sonnet-4',
      conversationHistory = [],
      appState = {},
      provider = 'Anthropic', 
      modelId = 'claude-sonnet-4',
      editorContext = null, // 🔗 Editor Bridge Context
    } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    console.log('[Canvas Agent] Received message:', message.substring(0, 50) + '...');

    // Create mock user for demo mode if not authenticated
    const user = req.user || {
      id: 'demo-user',
      credits: { balance: 100 },
    };

    // Initialize AI service
    const aiService = new AIService(user);

    // Build rich context for agent
    let contextInfo = `\n\n## CURRENT STATE`;
    contextInfo += `\n- Code in editor: ${currentCode ? 'YES (' + detectLanguage(currentCode) + ')' : 'EMPTY'}`;
    contextInfo += `\n- Current language: ${currentLanguage}`;
    contextInfo += `\n- Current provider: ${currentProvider}`;
    contextInfo += `\n- Current model: ${currentModel}`;
    if (conversationHistory.length > 0) {
      contextInfo += `\n- Conversation: ${conversationHistory.length} previous messages`;
    }
    
    // 🔗 Include Editor Bridge Context
    if (editorContext) {
      contextInfo += `\n\n## EDITOR CONTEXT`;
      contextInfo += `\n- Active file: ${editorContext.activeFile || 'none'}`;
      contextInfo += `\n- Cursor: line ${editorContext.cursor?.line || 1}, column ${editorContext.cursor?.column || 1}`;
      if (editorContext.selection) {
        contextInfo += `\n- Selection: lines ${editorContext.selection.start.line}-${editorContext.selection.end.line}`;
        if (editorContext.selectedText) {
          const selectedSnippet = editorContext.selectedText.substring(0, 200);
          contextInfo += `\n- Selected text: \`${selectedSnippet}${editorContext.selectedText.length > 200 ? '...' : ''}\``;
        }
      }
      
      // List project files
      if (editorContext.fileList && editorContext.fileList.length > 0) {
        contextInfo += `\n\n### Project Files (${editorContext.fileList.length} files):`;
        editorContext.fileList.forEach(file => {
          contextInfo += `\n- 📄 ${file}`;
        });
      }
      
      // Include ALL file contents so agent can read/modify any file
      if (editorContext.files && Object.keys(editorContext.files).length > 0) {
        contextInfo += `\n\n### FILE CONTENTS (Full project):`;
        for (const [filePath, content] of Object.entries(editorContext.files)) {
          const fileExt = filePath.split('.').pop() || 'txt';
          const truncatedContent = content.length > 3000 ? content.substring(0, 3000) + '\n... (truncated)' : content;
          contextInfo += `\n\n#### ${filePath}\n\`\`\`${fileExt}\n${truncatedContent}\n\`\`\``;
        }
      }
    }
    
    if (currentCode && !editorContext?.files) {
      // Include a snippet of the current code for context
      const codeSnippet = currentCode.substring(0, 500) + (currentCode.length > 500 ? '...' : '');
      contextInfo += `\n\n## CURRENT CODE SNIPPET:\n\`\`\`\n${codeSnippet}\n\`\`\``;
    }

    // Ask agent to decide what to do
    const decisionMessages = [
      { role: 'user', content: message + contextInfo }
    ];

    // Use Anthropic for agent reasoning
    const decisionResult = await aiService.chat(
      decisionMessages,
      'anthropic',
      'claude-sonnet-4-20250514',
      {
        systemPrompt: CANVAS_AGENT_SYSTEM,
        maxTokens: 1024,
        endpoint: 'canvas',
      }
    );

    // Parse agent's decision
    let decision;
    try {
      let cleanResponse = decisionResult.content.trim();
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      decision = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('[Canvas Agent] Failed to parse decision:', decisionResult.content);
      decision = { tool: 'chat', message: decisionResult.content };
    }

    // Handle multi-tool responses
    if (decision.tools && Array.isArray(decision.tools)) {
      console.log('[Canvas Agent] Multi-tool request:', decision.tools.map(t => t.tool).join(', '));
      return res.json({
        success: true,
        actions: decision.tools.map(t => processToolRequest(t)),
      });
    }

    console.log('[Canvas Agent] Tool:', decision.tool || 'chat');

    // Process single tool request
    const result = await processToolRequestWithAI(decision, {
      currentCode,
      currentLanguage,
      provider,
      modelId,
      aiService,
      user,
    });

    return res.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[Canvas Agent] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Agent error',
      action: 'chat',
      message: 'Sorry, I encountered an error. Please try again.',
    });
  }
});

// Process tool requests that don't need AI generation
function processToolRequest(tool) {
  const toolName = tool.tool || 'chat';
  
  switch (toolName) {
    case 'preview':
      return { action: 'preview', message: tool.message || 'Opening preview...' };
    case 'deploy':
      return { action: 'deploy', message: tool.message || 'Opening deploy panel...' };
    case 'save':
      return { action: 'save', filename: tool.filename, message: 'Saving...' };
    case 'open_panel':
      return { action: 'open_panel', panel: tool.panel, message: `Opening ${tool.panel}...` };
    case 'copy_code':
      return { action: 'copy_code', message: tool.message || 'Code copied!' };
    case 'new_chat':
      return { action: 'new_chat', message: tool.message || 'Starting fresh!' };
    case 'download':
      return { action: 'download', format: tool.format || 'single', message: 'Preparing download...' };
    case 'sandbox':
      return { action: 'sandbox', message: tool.message || 'Opening in CodeSandbox...' };
    case 'change_provider':
      return { action: 'change_provider', provider: tool.provider, model: tool.model, message: `Switching to ${tool.provider}...` };
    case 'change_language':
      return { action: 'change_language', language: tool.language, message: `Switching to ${tool.language}...` };
    case 'explain':
      return { action: 'explain', explanation: tool.explanation, message: 'Here\'s what this code does...' };
    case 'debug':
      return { action: 'debug', analysis: tool.analysis, fix: tool.fix, message: 'Found the issue!' };
    
    // 🔗 EDITOR BRIDGE TOOLS
    case 'insert_at':
      return { action: 'insert_at', position: tool.position, text: tool.text, message: tool.message || `Inserting at line ${tool.position?.line}...` };
    case 'replace_range':
      return { action: 'replace_range', start: tool.start, end: tool.end, text: tool.text, message: tool.message || 'Replacing code...' };
    case 'delete_lines':
      return { action: 'delete_lines', startLine: tool.startLine, endLine: tool.endLine, message: tool.message || `Deleting lines ${tool.startLine}-${tool.endLine}...` };
    case 'goto_line':
      return { action: 'goto_line', line: tool.line, column: tool.column || 1, message: tool.message || `Going to line ${tool.line}...` };
    case 'create_file':
      return { action: 'create_file', path: tool.path, content: tool.content || '', language: tool.language, message: tool.message || `Creating ${tool.path}...` };
    case 'delete_file':
      return { action: 'delete_file', path: tool.path, message: tool.message || `Deleting ${tool.path}...` };
    case 'open_file':
      return { action: 'open_file', path: tool.path, message: tool.message || `Opening ${tool.path}...` };
    case 'undo':
      return { action: 'undo', message: tool.message || 'Undoing...' };
    case 'redo':
      return { action: 'redo', message: tool.message || 'Redoing...' };
    case 'find_replace':
      return { action: 'find_replace', find: tool.find, replace: tool.replace, message: tool.message || `Replacing "${tool.find}"...` };
    case 'get_selection':
      return { action: 'get_selection', message: tool.message || 'Getting selection...' };
    
    // � UNIFIED TOOL REGISTRY - Direct EditorBridge invocation
    case 'tool_calls':
      return { 
        action: 'tool_calls', 
        tool_calls: tool.tool_calls || [], 
        message: tool.message || `Executing ${tool.tool_calls?.length || 0} tool commands...` 
      };
    
    // 🔧 SINGLE TOOL - Direct EditorBridge method call
    case 'run_tool':
      return { 
        action: 'run_tool', 
        tool: tool.targetTool || tool.name, 
        args: tool.args || [], 
        message: tool.message || `Running ${tool.targetTool || tool.name}...` 
      };
    
    // �🔗 Multi-file project builder
    case 'build_project':
      return { 
        action: 'build_project', 
        files: tool.files || [], 
        mainFile: tool.mainFile, 
        message: tool.message || `Created project with ${tool.files?.length || 0} files!` 
      };
    
    case 'chat':
    default:
      return { action: 'chat', message: tool.message || 'How can I help?' };
  }
}

// Process tool requests that need AI generation
async function processToolRequestWithAI(tool, context) {
  const { currentCode, currentLanguage, provider, modelId, aiService } = context;
  const toolName = tool.tool || 'chat';

  // Handle tools that don't need additional AI calls (passthrough tools)
  const passthroughTools = [
    'preview', 'save', 'open_panel', 'copy_code', 'new_chat', 
    'download', 'sandbox', 'change_provider', 'change_language',
    // 🔗 Editor Bridge tools (all passthrough)
    'insert_at', 'replace_range', 'delete_lines', 'goto_line',
    'create_file', 'delete_file', 'open_file', 'undo', 'redo',
    'find_replace', 'get_selection',
    // Multi-file project (already has content from agent)
    'build_project',
    // 🔧 Unified Tool Registry (direct EditorBridge invocation)
    'tool_calls', 'run_tool'
  ];
  
  if (passthroughTools.includes(toolName)) {
    return processToolRequest(tool);
  }

  // Handle chat/explain/debug (already have content)
  if (toolName === 'chat' || toolName === 'explain' || toolName === 'debug') {
    return processToolRequest(tool);
  }

  // Handle DEPLOY - trigger deployment workflow
  if (toolName === 'deploy') {
    return {
      action: 'deploy',
      message: tool.message || '🚀 Opening deploy panel... Your app will be live at a unique URL!',
      deployConfig: {
        language: currentLanguage || detectLanguage(currentCode) || 'html',
        suggestedName: tool.appName || 'My Canvas App',
      }
    };
  }

  // Handle BUILD - needs code generation
  if (toolName === 'build') {
    const backendProvider = PROVIDER_MAPPING[provider] || provider.toLowerCase();
    const backendModel = MODEL_MAPPING[modelId] || modelId;
    const language = tool.language || detectLanguageFromPrompt(tool.prompt) || 'html';
    const systemPrompt = getSystemPrompt(language);

    const buildPrompt = `## CREATE NEW APPLICATION

Requirements:
${tool.prompt}

Generate a complete, beautiful, production-ready ${language === 'react' ? 'React TypeScript component' : language.toUpperCase() + ' application'}.
Return ONLY the code, no explanations.`;

    const buildResult = await aiService.chat(
      [{ role: 'user', content: buildPrompt }],
      backendProvider,
      backendModel,
      {
        systemPrompt,
        maxTokens: 16384,
        endpoint: 'canvas',
      }
    );

    let code = buildResult.content;
    code = code.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();
    
    if (language === 'react') {
      code = fixReactImports(code);
    }

    return {
      action: 'build',
      code,
      language,
      message: 'Here\'s your new app! Click preview to see it in action.',
    };
  }

  // Handle BUILD_FULLSTACK - Generate complete full-stack application
  if (toolName === 'build_fullstack') {
    const backendProvider = PROVIDER_MAPPING[provider] || provider.toLowerCase();
    const backendModel = MODEL_MAPPING[modelId] || modelId;
    
    const fullstackPrompt = `## CREATE FULL-STACK APPLICATION

Requirements: ${tool.prompt}

Generate a complete full-stack application with:
1. **Frontend (React + TypeScript)**
2. **Backend (${tool.backendType || 'Express'} API)**
3. **Database schema (${tool.databaseType || 'SQLite'})**

Return ONLY a JSON object with this structure:
{
  "files": [
    {"path": "frontend/package.json", "content": "...", "language": "json"},
    {"path": "frontend/src/App.tsx", "content": "...", "language": "typescript"},
    {"path": "frontend/src/index.tsx", "content": "...", "language": "typescript"},
    {"path": "frontend/src/services/api.ts", "content": "...", "language": "typescript"},
    {"path": "frontend/src/pages/Home.tsx", "content": "...", "language": "typescript"},
    {"path": "backend/package.json", "content": "...", "language": "json"},
    {"path": "backend/server.js", "content": "...", "language": "javascript"},
    {"path": "backend/routes/api.js", "content": "...", "language": "javascript"},
    {"path": "backend/models/schema.sql", "content": "...", "language": "sql"},
    {"path": "docker-compose.yml", "content": "...", "language": "yaml"},
    {"path": "README.md", "content": "...", "language": "markdown"}
  ],
  "mainFile": "frontend/src/App.tsx",
  "backendType": "express",
  "databaseType": "sqlite"
}

Create realistic, production-ready code. Frontend should call backend API endpoints.
Return ONLY the JSON, no markdown or explanations.`;

    const fullstackResult = await aiService.chat(
      [{ role: 'user', content: fullstackPrompt }],
      backendProvider,
      backendModel,
      {
        systemPrompt: `You are a full-stack developer. Generate complete, working code for full-stack applications. Return ONLY valid JSON, no markdown code blocks.`,
        maxTokens: 32000,
        endpoint: 'canvas',
      }
    );

    try {
      let jsonStr = fullstackResult.content.trim();
      jsonStr = jsonStr.replace(/^```json?\n?/gm, '').replace(/```$/gm, '').trim();
      const projectData = JSON.parse(jsonStr);
      
      return {
        action: 'build_project',
        files: projectData.files,
        mainFile: projectData.mainFile,
        projectType: 'FULLSTACK',
        backendType: projectData.backendType || 'express',
        databaseType: projectData.databaseType || 'sqlite',
        message: `✨ Created full-stack app with ${projectData.files.length} files! Frontend + ${projectData.backendType} backend + database ready.`,
      };
    } catch (parseError) {
      console.error('[Canvas Agent] Failed to parse fullstack response:', parseError);
      return {
        action: 'chat',
        message: 'I had trouble generating the full-stack app. Let me try building it piece by piece. What should I start with - the frontend or backend?',
      };
    }
  }

  // Handle EDIT - needs code modification
  if (toolName === 'edit') {
    if (!currentCode) {
      return {
        action: 'chat',
        message: "I don't see any code to edit yet. Would you like me to build something first?",
      };
    }

    const backendProvider = PROVIDER_MAPPING[provider] || provider.toLowerCase();
    const backendModel = MODEL_MAPPING[modelId] || modelId;
    const language = detectLanguage(currentCode);
    const systemPrompt = getSystemPrompt(language);

    const editPrompt = `## MODIFY EXISTING CODE

Current code:
\`\`\`${language}
${currentCode}
\`\`\`

Modification requested:
${tool.instruction}
${tool.targetSection ? `Target section: ${tool.targetSection}` : ''}

Return the COMPLETE updated code with the modification applied. Return ONLY code, no explanations.`;

    const editResult = await aiService.chat(
      [{ role: 'user', content: editPrompt }],
      backendProvider,
      backendModel,
      {
        systemPrompt,
        maxTokens: 16384,
        endpoint: 'canvas',
      }
    );

    let code = editResult.content;
    code = code.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();
    
    if (language === 'react') {
      code = fixReactImports(code);
    }

    return {
      action: 'edit',
      code,
      language,
      message: 'Updated! Click preview to see the changes.',
    };
  }

  // Default to chat
  return {
    action: 'chat',
    message: tool.message || 'How can I help you?',
  };
}

// ============================================================================
// GENERATE APP CODE (Legacy - kept for compatibility)
// ============================================================================

router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const { 
      prompt, 
      provider = 'Anthropic', 
      modelId = 'claude-sonnet-4',
      isThinking = false,
      currentCode,
      history = [],
      targetLanguage, // Optional: force a specific language
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // Map to backend IDs
    const backendProvider = PROVIDER_MAPPING[provider] || provider.toLowerCase();
    const backendModel = MODEL_MAPPING[modelId] || modelId;

    // Detect language: from target, current code, or prompt
    let language = targetLanguage || 'html';
    if (!targetLanguage) {
      if (currentCode) {
        language = detectLanguage(currentCode);
      } else {
        language = detectLanguageFromPrompt(prompt);
      }
    }

    console.log(`[Canvas] Generate request: provider=${backendProvider}, model=${backendModel}, language=${language}`);

    // Get the master agent system prompt with language-specific rules
    const systemPrompt = getSystemPrompt(language);

    // Build the full prompt with language context
    let fullPrompt = prompt;
    if (currentCode) {
      fullPrompt = `## MODIFICATION REQUEST

Current ${language.toUpperCase()} code to modify:
\`\`\`${language}
${currentCode}
\`\`\`

## User's Request:
${prompt}

## Instructions:
1. Analyze the current code
2. Make ONLY the requested changes
3. Return the COMPLETE updated file
4. Do NOT include markdown code blocks in your response`;
    } else {
      // New generation - be more descriptive
      const langDesc = {
        react: 'a React TypeScript component with Tailwind CSS',
        typescript: 'TypeScript code',
        javascript: 'JavaScript code',
        python: 'Python code with type hints',
        html: 'a complete single-file HTML application with Tailwind CSS'
      };
      fullPrompt = `## NEW APPLICATION REQUEST

Create ${langDesc[language] || 'code'} for:
${prompt}

## Instructions:
1. Generate complete, production-ready code
2. Follow all the rules in your system prompt
3. Make it beautiful and functional
4. Return ONLY the code, no explanations`;
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

    // Generate with selected provider - use language-specific system prompt
    const result = await aiService.chat(
      messages,
      backendProvider,
      backendModel,
      {
        systemPrompt: systemPrompt, // Use language-specific prompt
        maxTokens: 8192,
        endpoint: 'canvas', // Track as canvas usage
      }
    );

    // Clean the code output (remove markdown code blocks for any language)
    let code = result.content;
    code = code
      .replace(/```(?:html|tsx?|jsx?|python|py|javascript|typescript|react)?\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    // ========================================================================
    // POST-PROCESSING: Fix bad imports that would break Sandpack
    // ========================================================================
    if (language === 'react') {
      code = fixReactImports(code);
    }

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
      language, // Return detected/used language
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
// INTENT DETECTION - Determines if user wants to chat or build directly
// ============================================================================

// Keywords that indicate direct build intent
const BUILD_KEYWORDS = [
  'build', 'create', 'make', 'generate', 'design', 'develop',
  'landing page', 'website', 'app', 'dashboard', 'portfolio',
  'e-commerce', 'ecommerce', 'store', 'shop', 'blog',
  'todo', 'calculator', 'form', 'login', 'signup',
  'react', 'html', 'python', 'typescript',
  'add', 'change', 'update', 'fix', 'modify', 'remove'
];

// Keywords/patterns that indicate casual chat
const CHAT_KEYWORDS = [
  'hi', 'hello', 'hey', 'yo', 'sup',
  'how are you', 'what can you do', 'help me',
  'what is', 'tell me', 'explain',
  'i want', 'i need', 'i\'m thinking', 'i\'d like',
  'can you', 'could you', 'would you',
  'not sure', 'ideas', 'suggest', 'recommend'
];

function detectIntent(message) {
  const lowerMsg = message.toLowerCase().trim();
  
  // Very short messages are usually greetings/chat
  if (lowerMsg.length < 15) {
    // Check if it's a simple greeting
    const greetings = ['hi', 'hello', 'hey', 'yo', 'sup', 'hola', 'howdy'];
    if (greetings.some(g => lowerMsg === g || lowerMsg.startsWith(g + ' ') || lowerMsg.startsWith(g + '!'))) {
      return 'chat';
    }
  }
  
  // Check for explicit build commands
  const hasBuildKeyword = BUILD_KEYWORDS.some(kw => lowerMsg.includes(kw));
  const hasChatKeyword = CHAT_KEYWORDS.some(kw => lowerMsg.includes(kw));
  
  // If it contains build keywords AND is specific enough, it's a build request
  if (hasBuildKeyword && lowerMsg.length > 20) {
    // Check if it's descriptive enough to build
    if (lowerMsg.includes('with') || lowerMsg.includes('for') || 
        lowerMsg.includes('that') || lowerMsg.includes('landing') ||
        lowerMsg.includes('website') || lowerMsg.includes('dashboard') ||
        lowerMsg.includes('app')) {
      return 'build';
    }
  }
  
  // Vague build requests should start a conversation
  if (hasBuildKeyword && hasChatKeyword) {
    return 'chat';
  }
  
  // Questions are always chat
  if (lowerMsg.includes('?')) {
    return 'chat';
  }
  
  // Short vague messages = chat
  if (lowerMsg.length < 40 && !hasBuildKeyword) {
    return 'chat';
  }
  
  // Long descriptive messages with build keywords = build
  if (hasBuildKeyword && lowerMsg.length > 50) {
    return 'build';
  }
  
  // Default to chat for safety
  return 'chat';
}

// ============================================================================
// CONVERSATIONAL CHAT (Natural conversation before building)
// ============================================================================

const CONVERSATION_SYSTEM_PROMPT = `You are Canvas AI, a friendly and helpful AI assistant for One Last AI's Canvas Studio.

## YOUR ROLE
You're having a natural conversation with the user to understand what they want to build.
- Be friendly, natural, and conversational (like chatting with a friend)
- Ask clarifying questions to understand their needs
- Help them think through their requirements
- When you have enough information, summarize what you'll build and ask for confirmation

## CONVERSATION FLOW
1. **Greet & Understand**: Welcome them and understand their vision
2. **Ask Questions**: Clarify requirements, features, design preferences
3. **Suggest Ideas**: Offer suggestions based on their needs
4. **Summarize**: When ready, provide a clear summary of what you'll build
5. **Confirm**: Ask "Shall I start building this for you?"

## GOOD QUESTIONS TO ASK
- "What's the main purpose of this website/app?"
- "Who is the target audience?"
- "What pages or sections do you need?"
- "Any specific color scheme or style preference?"
- "Any features you must have?"
- "Any websites you like for inspiration?"

## RESPONSE STYLE
- Keep responses concise but helpful (2-4 sentences usually)
- Use emojis occasionally for friendliness 😊
- Be encouraging and positive
- When they're ready to build, end with: "[READY_TO_BUILD]" in your response

## EXAMPLE CONVERSATION
User: "I want a portfolio website"
You: "Great choice! 🎨 A portfolio is perfect for showcasing your work. What field are you in - design, development, photography, or something else? And do you have a preferred style - minimal, bold, creative?"

User: "I'm a photographer, I like minimal style"
You: "Perfect! Minimal works beautifully for photography - lets the images shine. ✨ For your portfolio, I'm thinking:
• Clean hero with your best shot
• Gallery grid for your work
• About section with your story  
• Contact form for inquiries

Any specific pages or features you'd like to add? And any color preferences - classic black/white, or maybe a subtle accent color?"

User: "That sounds good, add a pricing page too"
You: "Excellent! Here's what I'll build for you:

📸 **Photographer Portfolio Website**
- **Home**: Minimal hero with featured work
- **Gallery**: Beautiful grid of your photos
- **About**: Your story and experience
- **Pricing**: Package options for clients
- **Contact**: Simple contact form

Style: Minimal & elegant with black/white + subtle accents

Shall I start building this for you? [READY_TO_BUILD]"

## IMPORTANT
- Do NOT generate any code during conversation
- Do NOT use markdown code blocks
- Stay focused on understanding requirements
- Be patient and helpful`;

// ============================================================================
// DETECT INTENT - Quick endpoint to determine chat vs build
// ============================================================================

router.post('/detect-intent', (req, res) => {
  try {
    const { message, hasCurrentApp } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    
    // If user already has an app, any message is likely an edit request
    if (hasCurrentApp) {
      return res.json({ success: true, intent: 'edit' });
    }
    
    const intent = detectIntent(message);
    console.log(`[Canvas Intent] "${message.substring(0, 50)}..." → ${intent}`);
    
    res.json({ success: true, intent });
  } catch (error) {
    console.error('[Canvas Intent] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CANVAS CHAT - For conversational flow
// ============================================================================

router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { 
      message, 
      conversationHistory = [],
      templateContext, // If started from a template
    } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    console.log('[Canvas Chat] Conversational message received');

    // Build conversation messages
    const messages = [];
    
    // Add template context if provided
    if (templateContext && conversationHistory.length === 0) {
      messages.push({
        role: 'user',
        content: `I'm interested in building something like: "${templateContext}". Help me refine my requirements.`,
      });
    }
    
    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text || msg.content,
      });
    });
    
    // Add current message
    messages.push({ role: 'user', content: message });

    // Create mock user for demo mode if not authenticated
    const user = req.user || {
      id: 'demo-user',
      credits: { balance: 100 },
    };

    // Initialize AI service
    const aiService = new AIService(user);

    // Use Claude for conversational chat
    const result = await aiService.chat(
      messages,
      'anthropic',
      'claude-sonnet-4-20250514',
      {
        systemPrompt: CONVERSATION_SYSTEM_PROMPT,
        maxTokens: 1024,
        endpoint: 'canvas-chat',
      }
    );

    const response = result.content;
    const isReadyToBuild = response.includes('[READY_TO_BUILD]');
    
    // Clean the response (remove the marker)
    const cleanedResponse = response.replace('[READY_TO_BUILD]', '').trim();

    res.json({ 
      success: true, 
      message: cleanedResponse,
      isReadyToBuild,
      usage: {
        provider: result.provider,
        model: result.model,
        creditsCost: result.creditsCost,
      },
    });

  } catch (error) {
    console.error('[Canvas Chat] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Chat failed',
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
