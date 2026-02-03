# 🎨 Canvas Studio - AI App Builder

> Build fully functional web applications with AI in seconds

Canvas Studio is One Last AI's powerful AI-powered application builder that generates complete, **working** web applications from natural language descriptions.

---

## ✨ Features

### 🤖 AI Generation Engine

| Feature | Details |
|---------|---------|
| 5 AI Providers | Anthropic, OpenAI, Google Gemini, xAI, Groq |
| 8 AI Models | Claude Sonnet 4, Claude Opus 4, GPT-4.1, GPT-4o Mini, Gemini 2.5 Flash/Pro, Grok 3, Llama 3.3 70B |
| Thinking Models | Claude Opus 4 and Gemini 2.5 Pro with advanced reasoning |
| Image-to-Code | Upload screenshots or use camera to generate code |
| Voice Input | Speak your ideas, AI builds them |

### 💻 Supported Languages

- React/TypeScript - Interactive single-page applications
- HTML/CSS/JS - Complete static websites
- Python - Flask APIs, scripts, data processing
- JavaScript - Vanilla JS applications

### 🎯 FULLY FUNCTIONAL APPS (Not Static Mockups!)

Canvas Studio generates working applications where everything is interactive:

| Feature | Status | How It Works |
|---------|--------|--------------|
| Page Navigation | ✅ Working | State-based routing with useState |
| Tab Switching | ✅ Working | Conditional rendering per tab |
| Sidebar Navigation | ✅ Working | Click handlers switch content |
| Forms | ✅ Working | State management + validation |
| Modals/Dialogs | ✅ Working | Open/close with state |
| Dropdowns | ✅ Working | Toggle visibility on click |
| CRUD Operations | ✅ Working | Add, edit, delete items |
| Search/Filter | ✅ Working | Real-time filtering |
| Data Tables | ✅ Working | Sortable columns |
| Charts | ✅ Working | DIV-based visualizations |

---

## 🏗️ How It Works

### 1. User Describes App

"Create an admin dashboard with sidebar navigation - Dashboard, Users, Settings, and Analytics pages. Each page should show different content with stats."

### 2. AI Generates WORKING Code

The AI creates React code with useState for navigation:
- Sidebar buttons have onClick handlers
- Main content renders different components based on state
- Everything is functional, not just visual

### 3. Live Preview = Working App

- Click "Dashboard" → Dashboard content appears
- Click "Users" → User management appears
- Click "Settings" → Settings panel appears
- Everything actually works - no dead buttons!

---

## 📱 Preview System

| Mode | Description |
|------|-------------|
| Live Preview | Real-time Sandpack preview |
| Desktop | Full-width view |
| Tablet | 768px width |
| Mobile | 375px width |
| Code View | Syntax-highlighted editor |
| Split View | Code + Preview side by side |

---

## 🚀 Export and Deploy

| Option | Description |
|--------|-------------|
| Copy Code | One-click copy to clipboard |
| Download | Export as file |
| CodeSandbox | Open in full IDE with terminal |
| GitHub Export | Push to repo via CodeSandbox |
| Deploy | Vercel/Netlify via CodeSandbox |

---

## 📋 Templates

### Quick Start Templates

1. 🚀 SaaS Landing Page - Hero, features, pricing
2. 📊 Analytics Dashboard - Charts, stats, sidebar
3. 🛒 E-commerce Store - Products, cart, filters
4. 🎨 Portfolio Website - Gallery, about, contact
5. 📝 Blog Platform - Articles, categories
6. 📱 Mobile App UI - Fitness tracker design
7. ⚙️ Admin Panel - User management, settings
8. 🍽️ Restaurant Menu - Categories, items, ordering

### Project Templates (Multi-file)

1. 🐍 Python Flask API - REST API with database
2. 🌐 HTML/CSS/JS Website - Complete static site
3. ▲ Next.js Full Stack - React + API routes

---

## 💰 Credit System

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| Claude Sonnet 4 | 0.03 credits | 0.15 credits |
| Claude Opus 4 | 0.15 credits | 0.75 credits |
| GPT-4.1 | 0.05 credits | 0.15 credits |
| Gemini 2.5 Pro | 0.0125 credits | 0.05 credits |
| Gemini 2.5 Flash | 0.00075 credits | 0.003 credits |

10x markup over API cost, minimum 0.01 credits per request

---

## 🔧 Tech Stack

### Frontend
- React 19 - UI framework
- TypeScript - Type safety
- Vite 6 - Build tool
- Tailwind CSS - Styling
- Sandpack - Live code preview

### Backend API
- Express.js - API server
- Prisma - Database ORM
- PostgreSQL - Database

---

## 🚀 Development

```bash
# Install dependencies
cd canvas-studio
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 🔮 Roadmap

### ✅ Phase 1: Core (Complete)
- [x] Multi-provider AI (5 providers, 8 models)
- [x] Live Sandpack preview
- [x] Working navigation/tabs/forms
- [x] Credit-based billing
- [x] CodeSandbox export
- [x] Image-to-code
- [x] Voice input

### 🚧 Phase 2: Hosting (In Progress)
- [ ] One-click deploy to our servers
- [ ] Shareable preview links
- [ ] Custom domain support
- [ ] SSL certificates

### 📋 Phase 3: Backend Features
- [ ] Form submission handling
- [ ] Database storage
- [ ] User authentication for apps
- [ ] API endpoints

### 🔮 Phase 4: Advanced
- [ ] Visual drag and drop editor
- [ ] E-commerce (products, cart, payments)
- [ ] CMS (blog posts, content management)
- [ ] Analytics dashboard for sites

---

## 📄 License

Proprietary - One Last AI © 2026
