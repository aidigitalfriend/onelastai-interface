# canvas-app

# 🚀 GenCraft Pro — Full Platform Roadmap & Architecture

> **You code. The agent runs everything else.**

**Version:** 1.0.0
**Last Updated:** February 7, 2026
**Status:** Phase 1 Complete ✅ · Phase 2 In Progress 🔧

---

## Table of Contents

- [Vision](#vision)
- [Core Principles](#core-principles)
- [Current State (What Exists)](#current-state-what-exists)
- [Complete File Tree](#complete-file-tree)
- [Phase 1 — Editor & UI (DONE ✅)](#phase-1--editor--ui-done-)
- [Phase 2 — Sandbox & Build Pipeline](#phase-2--sandbox--build-pipeline)
- [Phase 3 — CI/CD Automation](#phase-3--cicd-automation)
- [Phase 4 — Asset Pipeline](#phase-4--asset-pipeline)
- [Phase 5 — Database & State Management](#phase-5--database--state-management)
- [Phase 6 — Monitoring & Recovery](#phase-6--monitoring--recovery)
- [Phase 7 — AI Agent (Horizon Level)](#phase-7--ai-agent-horizon-level)
- [Database Schema (Full)](#database-schema-full)
- [API Endpoints (Full)](#api-endpoints-full)
- [Tech Stack Summary](#tech-stack-summary)
- [Developer vs Agent Responsibilities](#developer-vs-agent-responsibilities)
- [Implementation Timeline](#implementation-timeline)

---

## Vision

GenCraft Pro is a **complete app building platform** where:

- **Developer** focuses ONLY on code + UI/UX inside a web editor
- **AI Agent** handles everything else — build, test, deploy, infra, scaling, assets, sandboxes, rollbacks, monitoring
- **Zero DevOps** — no servers, no YAML, no SSH, no config files
- **`git push → automatically live`**

---

## Core Principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Editor-First** | Everything happens inside the browser editor |
| 2 | **Agent-Managed** | AI agent is the DevOps engineer, not the developer |
| 3 | **Zero Config** | No webpack, no docker, no CI files to write |
| 4 | **Instant Preview** | Every change = instant live preview |
| 5 | **One-Click Deploy** | Code → Production in one click |
| 6 | **Sandboxed** | Every project/branch gets isolated environment |
| 7 | **Auto Recovery** | Crashes auto-detected, auto-rolled-back |

---

## Current State (What Exists)

### ✅ Built & Live

| Component | Status | Location |
|-----------|--------|----------|
| Web Editor (Monaco-based) | ✅ Live | `canvas-app/` |
| Code Generation (AI) | ✅ Live | `/api/canvas/generate` |
| Chat Assistant (Master Coder) | ✅ Live | `/api/canvas/chat` |
| Live Preview (Sandpack) | ✅ Live | `components/SandpackPreview.tsx` |
| Code View + Split View | ✅ Live | `components/CodeEditor.tsx` |
| File Tree (Multi-file) | ✅ Live | `components/FileTree.tsx` |
| Templates Library | ✅ Live | `components/TemplatesPanel.tsx` |
| Voice Input | ✅ Live | `components/VoiceInput.tsx` |
| Image → Code | ✅ Live | `components/ImageToCode.tsx` |
| Deploy Panel (S3/Vercel/Netlify) | ✅ Live | `components/DeployPanel.tsx` |
| Auth Gate (Login/Signup) | ✅ Live | `App.tsx` |
| Stripe Billing (3 plans) | ✅ Live | `components/PricingPaywall.tsx` |
| App History (DB + localStorage) | ✅ Live | `services/canvasAppsService.ts` |
| S3 Deploy (maula.ai subdomains) | ✅ Live | Backend `s3-deploy-service.js` |

### 🔧 Needs Building

| Component | Priority | Phase |
|-----------|----------|-------|
| Sandbox Environments | 🔴 High | Phase 2 |
| CI/CD Pipeline Automation | 🔴 High | Phase 3 |
| Asset Pipeline (images/video) | 🟡 Medium | Phase 4 |
| Managed Database per Project | 🟡 Medium | Phase 5 |
| Monitoring & Auto-Recovery | 🟡 Medium | Phase 6 |
| Full AI Agent Orchestrator | 🔵 Future | Phase 7 |

---

## Complete File Tree

### Current Structure (What Exists Today)

```
canvas-app/                              # GenCraft Pro — Standalone Vite+React App
├── index.html                           # Entry HTML — "GenCraft Pro - AI App Builder"
├── index.tsx                            # React mount point
├── App.tsx                              # Main app (1079 lines) — editor, sidebar, auth gate
├── types.ts                             # TypeScript types — GeneratedApp, ViewMode, ChatMessage, etc.
├── styles.css                           # Tailwind + custom styles
├── package.json                         # Dependencies — React, Sandpack, Lucide, Tailwind
├── tsconfig.json                        # TypeScript config
├── vite.config.ts                       # Vite build config (base: /canvas-studio/)
├── tailwind.config.js                   # Tailwind config
├── postcss.config.js                    # PostCSS config
├── metadata.json                        # App metadata
├── README.md                            # Basic readme
├── ROADMAP.md                           # ⭐ THIS FILE — Full platform roadmap
│
├── components/                          # UI Components
│   ├── ChatBox.tsx                      # Chat panel — send messages to Master Coder
│   ├── CodeEditor.tsx                   # Monaco-based code editor with syntax highlighting
│   ├── CodeView.tsx                     # Read-only code view with copy button
│   ├── DeployPanel.tsx                  # Deploy to S3/Vercel/Netlify/Railway/Cloudflare
│   ├── FileTree.tsx                     # Multi-file project tree with add/rename/delete
│   ├── ImageToCode.tsx                  # Upload image → AI generates matching code
│   ├── PlanStatusBar.tsx                # Shows active plan + expiry
│   ├── PricingPaywall.tsx               # Stripe pricing — $7/week, $19/month, $120/year
│   ├── Preview.tsx                      # Basic HTML iframe preview
│   ├── SandpackPreview.tsx              # Sandpack-powered live preview with console
│   ├── TemplatesPanel.tsx               # Template library — HTML, React, Vue, etc.
│   └── VoiceInput.tsx                   # Voice-to-text input for prompts
│
├── services/                            # Business Logic Services
│   ├── agentProcessor.ts                # Agent context builder + response processor
│   ├── anthropicService.ts              # Direct Anthropic SDK calls (client-side fallback)
│   ├── canvasAppsService.ts             # CRUD apps — /api/canvas/apps + localStorage fallback
│   ├── canvasS3FilesService.ts          # S3 file management for multi-file projects
│   ├── deploymentService.ts             # Deploy orchestrator — S3, Vercel, Netlify, etc.
│   ├── editorBridge.ts                  # Bridge between editor state + Sandpack
│   ├── projectBundler.ts                # Bundle multi-file projects for deployment
│   └── speechService.ts                 # TTS/STT integration
│
├── public/                              # Static assets
│   └── favicon.svg                      # App favicon
│
└── dist/                                # Built output (copied to frontend/public/canvas-studio/)
    ├── index.html
    └── assets/
        ├── index-*.js
        └── index-*.css
```

### Backend API Routes (Next.js — frontend/app/api/canvas/)

```
frontend/app/api/canvas/                 # Next.js API Routes
├── generate/
│   └── route.ts                         # POST — AI code generation (auth + plan check)
│                                        #   Providers: Anthropic, OpenAI, Groq, Mistral, xAI, Gemini
│                                        #   Auth: verifyRequestAsync() → 401
│                                        #   Plan: agentSubscription check → 403
│
├── chat/
│   └── route.ts                         # POST — Chat with Master Coder (auth + plan check)
│                                        #   Supports: build, deploy, fix, multi-page
│                                        #   Returns JSON: { type, message, code, pages }
│
├── apps/
│   ├── route.ts                         # GET/POST — List & create canvas apps (auth required)
│   └── [appId]/
│       └── route.ts                     # GET/PUT/DELETE — Single app CRUD (auth required)
│
├── stream/
│   └── route.ts                         # POST — Streaming AI generation (SSE)
│
├── deploy-external/
│   └── route.ts                         # POST — Deploy to Vercel/Netlify/Railway
│
├── studio-checkout/
│   └── route.ts                         # POST — Create Stripe checkout session
│                                        #   Plans: weekly ($7), monthly ($19), yearly ($120)
│
├── studio-plan/
│   └── route.ts                         # GET — Check user's plan status
│
└── studio-verify/
    └── route.ts                         # POST — Verify Stripe purchase after redirect
```

### Backend Express Routes (backend/routes/)

```
backend/routes/
├── canvas-routes.js                     # Canvas generation (Express — smart fallback)
├── canvas-files-routes.js               # S3 file operations (upload/download/list)
└── canvas-project-routes.js             # Canvas project CRUD

backend/services/canvas/
├── canvas-s3-file-service.js            # S3 file manager — upload, list, delete
├── canvas-file-manager.js               # Local file operations + bundling
└── s3-deploy-service.js                 # Deploy to S3 → {slug}.maula.ai
```

### Database Models (Prisma Schema)

```
prisma/schema.prisma
├── User                                 # User account
├── Agent                                # AI agent definitions
├── AgentSubscription                    # Plan subscriptions (canvas-studio plans)
├── CanvasApp                            # Generated apps (code, prompt, history)
├── ChatCanvasFile                       # Multi-file project files
├── ChatCanvasHistory                    # Edit history per session
├── ChatCanvasProject                    # Project metadata
├── Transaction                          # Stripe transactions
└── Session                              # Auth sessions
```

---

### 🆕 Full Target Structure (What We're Building)

```
canvas-app/
├── index.html
├── index.tsx
├── App.tsx                              # Main shell — routes to editor/dashboard
├── types.ts
├── styles.css
├── ROADMAP.md
│
├── components/
│   ├── editor/                          # ── EDITOR EXPERIENCE ──
│   │   ├── MonacoEditor.tsx             # 🆕 Full Monaco editor (multi-tab, multi-file)
│   │   ├── EditorTabs.tsx               # 🆕 Tab bar for open files
│   │   ├── EditorStatusBar.tsx          # 🆕 Bottom bar — language, line:col, git branch
│   │   ├── EditorSettings.tsx           # 🆕 Theme, font size, keybindings
│   │   ├── Terminal.tsx                 # 🆕 Embedded terminal (xterm.js)
│   │   ├── TerminalManager.tsx          # 🆕 Multi-terminal management
│   │   ├── ProblemPanel.tsx             # 🆕 Errors & warnings panel
│   │   └── SearchReplace.tsx            # 🆕 Find/replace across files
│   │
│   ├── preview/                         # ── LIVE PREVIEW ──
│   │   ├── SandpackPreview.tsx          # ✅ Exists — Sandpack live preview
│   │   ├── DeviceFrames.tsx             # 🆕 Desktop/tablet/mobile device frames
│   │   ├── PreviewToolbar.tsx           # 🆕 URL bar, refresh, responsive toggle
│   │   ├── ConsolePanel.tsx             # 🆕 Browser console output
│   │   └── NetworkPanel.tsx             # 🆕 Network requests inspector
│   │
│   ├── sidebar/                         # ── LEFT SIDEBAR ──
│   │   ├── ChatBox.tsx                  # ✅ Exists — AI chat
│   │   ├── FileTree.tsx                 # ✅ Exists — File explorer
│   │   ├── TemplatesPanel.tsx           # ✅ Exists — Templates
│   │   ├── GitPanel.tsx                 # 🆕 Git status, commit, push, branches
│   │   ├── EnvironmentVars.tsx          # 🆕 Manage env vars per project
│   │   ├── DependenciesPanel.tsx        # 🆕 npm packages manager
│   │   └── HistoryPanel.tsx             # 🆕 Project version history
│   │
│   ├── deploy/                          # ── DEPLOY & HOSTING ──
│   │   ├── DeployPanel.tsx              # ✅ Exists — Deploy orchestrator
│   │   ├── DeployStatus.tsx             # 🆕 Deploy progress + logs
│   │   ├── DomainManager.tsx            # 🆕 Custom domains + SSL
│   │   ├── HostingDashboard.tsx         # 🆕 All deployed apps + analytics
│   │   └── RollbackPanel.tsx            # 🆕 One-click rollback to previous deploy
│   │
│   ├── ai/                              # ── AI FEATURES ──
│   │   ├── VoiceInput.tsx               # ✅ Exists — Voice to text
│   │   ├── ImageToCode.tsx              # ✅ Exists — Screenshot to code
│   │   ├── AIAutofix.tsx                # 🆕 Auto-detect + fix errors
│   │   ├── AIRefactor.tsx               # 🆕 Suggest refactors
│   │   ├── AIExplain.tsx                # 🆕 Explain selected code
│   │   └── AITestWriter.tsx             # 🆕 Generate tests for code
│   │
│   ├── billing/                         # ── BILLING ──
│   │   ├── PricingPaywall.tsx           # ✅ Exists — Stripe plans
│   │   ├── PlanStatusBar.tsx            # ✅ Exists — Current plan info
│   │   ├── UsageDashboard.tsx           # 🆕 API calls, storage, bandwidth
│   │   └── InvoiceHistory.tsx           # 🆕 Past invoices
│   │
│   └── shared/                          # ── SHARED UI ──
│       ├── Toast.tsx                    # 🆕 Toast notification system
│       ├── Modal.tsx                    # 🆕 Reusable modal
│       ├── Dropdown.tsx                 # 🆕 Dropdown menus
│       ├── Tooltip.tsx                  # 🆕 Tooltips
│       └── LoadingSpinner.tsx           # 🆕 Loading states
│
├── services/
│   ├── agentProcessor.ts                # ✅ Exists — Agent context builder
│   ├── canvasAppsService.ts             # ✅ Exists — App CRUD
│   ├── deploymentService.ts             # ✅ Exists — Deploy orchestrator
│   ├── editorBridge.ts                  # ✅ Exists — Editor state bridge
│   ├── projectBundler.ts                # ✅ Exists — Bundle for deploy
│   │
│   ├── sandboxService.ts               # 🆕 Sandbox lifecycle management
│   │                                    #    - createSandbox(projectId)
│   │                                    #    - destroySandbox(sandboxId)
│   │                                    #    - getSandboxStatus(sandboxId)
│   │                                    #    - execInSandbox(sandboxId, command)
│   │
│   ├── buildService.ts                  # 🆕 Build pipeline orchestrator
│   │                                    #    - triggerBuild(projectId)
│   │                                    #    - getBuildLogs(buildId)
│   │                                    #    - cancelBuild(buildId)
│   │
│   ├── gitService.ts                    # 🆕 Git operations
│   │                                    #    - init, commit, push, pull
│   │                                    #    - createBranch, mergeBranch
│   │                                    #    - getDiff, getLog
│   │
│   ├── terminalService.ts              # 🆕 Terminal WebSocket connection
│   │                                    #    - connect(sandboxId)
│   │                                    #    - exec(command)
│   │                                    #    - resize(cols, rows)
│   │
│   ├── assetService.ts                  # 🆕 Asset pipeline client
│   │                                    #    - uploadImage(file) → optimized URL
│   │                                    #    - uploadVideo(file) → transcoded URL
│   │                                    #    - getAssets(projectId)
│   │
│   ├── databaseService.ts              # 🆕 Project database management
│   │                                    #    - createDB(projectId)
│   │                                    #    - runMigration(projectId, sql)
│   │                                    #    - getDBStatus(projectId)
│   │
│   └── monitoringService.ts            # 🆕 Monitoring client
│                                        #    - getLogs(deploymentId)
│                                        #    - getMetrics(deploymentId)
│                                        #    - getErrors(deploymentId)
│
├── hooks/                               # 🆕 Custom React Hooks
│   ├── useProject.ts                    # Project state management
│   ├── useSandbox.ts                    # Sandbox lifecycle hook
│   ├── useBuild.ts                      # Build status hook
│   ├── useTerminal.ts                   # Terminal connection hook
│   ├── useEditor.ts                     # Editor state hook
│   └── useAuth.ts                       # Auth + plan hook
│
└── stores/                              # 🆕 State Management (Zustand)
    ├── projectStore.ts                  # Current project state
    ├── editorStore.ts                   # Editor state (tabs, cursors)
    ├── terminalStore.ts                 # Terminal sessions
    ├── buildStore.ts                    # Build queue & status
    └── deployStore.ts                   # Deploy state & history
```

### 🆕 Backend — New API Endpoints Needed

```
frontend/app/api/                        # Next.js API Routes

├── canvas/                              # ── EXISTING ──
│   ├── generate/route.ts                # ✅ AI code generation
│   ├── chat/route.ts                    # ✅ Chat with Master Coder
│   ├── apps/route.ts                    # ✅ App CRUD
│   ├── studio-checkout/route.ts         # ✅ Stripe checkout
│   ├── studio-plan/route.ts             # ✅ Plan check
│   └── studio-verify/route.ts           # ✅ Purchase verify
│
├── sandbox/                             # 🆕 ── SANDBOX MANAGEMENT ──
│   ├── route.ts                         # POST — Create sandbox for project
│   │                                    # GET  — List user's active sandboxes
│   ├── [sandboxId]/
│   │   ├── route.ts                     # GET — Sandbox status
│   │   │                                # DELETE — Destroy sandbox
│   │   ├── exec/route.ts               # POST — Execute command in sandbox
│   │   ├── terminal/route.ts           # WebSocket — Terminal session
│   │   └── logs/route.ts               # GET — Sandbox logs (SSE stream)
│   └── templates/
│       └── route.ts                     # GET — Available sandbox templates
│
├── build/                               # 🆕 ── BUILD PIPELINE ──
│   ├── route.ts                         # POST — Trigger build
│   │                                    # GET  — List builds for project
│   ├── [buildId]/
│   │   ├── route.ts                     # GET — Build status & details
│   │   │                                # DELETE — Cancel build
│   │   └── logs/route.ts               # GET — Build logs (SSE stream)
│   └── config/
│       └── route.ts                     # GET/PUT — Build configuration
│
├── deploy/                              # 🆕 ── DEPLOY MANAGEMENT ──
│   ├── route.ts                         # POST — Deploy project
│   │                                    # GET  — List deployments
│   ├── [deployId]/
│   │   ├── route.ts                     # GET — Deploy status
│   │   │                                # DELETE — Remove deployment
│   │   └── rollback/route.ts           # POST — Rollback to this version
│   └── domains/
│       ├── route.ts                     # GET/POST — List/add custom domains
│       └── [domainId]/
│           └── route.ts                 # PUT/DELETE — Update/remove domain
│
├── project/                             # 🆕 ── PROJECT MANAGEMENT ──
│   ├── route.ts                         # POST — Create project
│   │                                    # GET  — List user's projects
│   ├── [projectId]/
│   │   ├── route.ts                     # GET/PUT/DELETE — Project CRUD
│   │   ├── files/route.ts              # GET/POST — Project files
│   │   ├── env/route.ts                # GET/PUT — Environment variables
│   │   ├── git/
│   │   │   ├── route.ts                # GET — Git status
│   │   │   ├── commit/route.ts         # POST — Commit changes
│   │   │   ├── branches/route.ts       # GET/POST — List/create branches
│   │   │   └── push/route.ts           # POST — Push to remote
│   │   └── db/
│   │       ├── route.ts                # GET — Database status
│   │       ├── migrate/route.ts        # POST — Run migration
│   │       └── backup/route.ts         # POST — Create backup
│   └── templates/
│       └── route.ts                     # GET — Project templates
│
├── assets/                              # 🆕 ── ASSET PIPELINE ──
│   ├── upload/route.ts                  # POST — Upload image/video
│   ├── [assetId]/route.ts              # GET/DELETE — Asset management
│   └── optimize/route.ts               # POST — Optimize existing asset
│
└── monitoring/                          # 🆕 ── MONITORING ──
    ├── route.ts                         # GET — Dashboard metrics
    ├── logs/route.ts                    # GET — Application logs (SSE)
    ├── errors/route.ts                  # GET — Error tracking
    └── alerts/
        ├── route.ts                     # GET/POST — Alert rules
        └── [alertId]/route.ts          # PUT/DELETE — Manage alert
```

### 🆕 Backend Services (New)

```
backend/services/

├── canvas/                              # ── EXISTING ──
│   ├── s3-deploy-service.js             # ✅ S3 deploy
│   ├── canvas-s3-file-service.js        # ✅ S3 file ops
│   └── canvas-file-manager.js           # ✅ File management
│
├── sandbox/                             # 🆕 ── SANDBOX ──
│   ├── sandbox-manager.js              # Orchestrate sandbox lifecycle
│   │                                    #   - Docker container creation
│   │                                    #   - Resource limits (CPU/RAM/disk)
│   │                                    #   - Auto-destroy on timeout
│   ├── sandbox-templates.js            # Pre-built sandbox images
│   │                                    #   - node-18, node-20, python-3.11
│   │                                    #   - next-app, express-app, vite-app
│   ├── sandbox-network.js              # Network isolation & port mapping
│   └── sandbox-storage.js              # Persistent volumes for sandboxes
│
├── build/                               # 🆕 ── BUILD PIPELINE ──
│   ├── build-orchestrator.js           # Build queue & execution
│   │                                    #   1. Detect framework (Next.js/Vite/Express)
│   │                                    #   2. Install deps
│   │                                    #   3. Run build
│   │                                    #   4. Run tests
│   │                                    #   5. Security scan
│   │                                    #   6. Package artifacts
│   ├── build-detector.js               # Auto-detect project type
│   ├── build-cache.js                  # Cache node_modules & build artifacts
│   └── build-logger.js                 # Stream build logs to frontend
│
├── deploy/                              # 🆕 ── DEPLOY ──
│   ├── deploy-orchestrator.js          # Deploy pipeline
│   │                                    #   - Zero-downtime deploy
│   │                                    #   - Health check after deploy
│   │                                    #   - Auto-rollback on failure
│   ├── deploy-s3-static.js             # Deploy static sites to S3 + CloudFront
│   ├── deploy-container.js             # Deploy backend apps to containers
│   ├── deploy-domain.js                # Custom domain + SSL cert management
│   └── deploy-rollback.js              # Rollback to previous version
│
├── git/                                 # 🆕 ── GIT ──
│   ├── git-service.js                  # Git operations (isomorphic-git)
│   └── git-webhook.js                  # Handle GitHub/GitLab webhooks
│
├── assets/                              # 🆕 ── ASSET PIPELINE ──
│   ├── image-processor.js              # Sharp — resize, compress, WebP/AVIF
│   ├── video-processor.js              # FFmpeg — transcode, thumbnail
│   ├── asset-cdn.js                    # Upload to S3 + CloudFront invalidation
│   └── asset-optimizer.js              # Auto-optimize on upload
│
├── database/                            # 🆕 ── PROJECT DATABASES ──
│   ├── db-provisioner.js               # Create/destroy project databases
│   ├── db-migrator.js                  # Run Prisma/Drizzle migrations
│   ├── db-backup.js                    # Automated backups to S3
│   └── db-scaler.js                    # Connection pooling & scaling
│
└── monitoring/                          # 🆕 ── MONITORING ──
    ├── log-aggregator.js               # Collect logs from all services
    ├── metrics-collector.js            # CPU, memory, request count, latency
    ├── error-tracker.js                # Error grouping & alerting
    ├── health-checker.js               # Periodic health checks
    └── auto-recovery.js                # Detect crash → auto-rollback
```

---

## Phase 1 — Editor & UI (DONE ✅)

> **Status: Complete & Live at maula.ai/canvas-studio**

### What's Built

| Feature | File | Status |
|---------|------|--------|
| GenCraft Pro branding | `index.html`, `App.tsx` | ✅ |
| Auth gate (sign-in / sign-up) | `App.tsx` lines 766-800 | ✅ |
| Stripe billing (3 plans) | `PricingPaywall.tsx` | ✅ |
| Plan status bar | `PlanStatusBar.tsx` | ✅ |
| Thank-you toast after checkout | `App.tsx` (showThankYou) | ✅ |
| Left sidebar (340px) with tabs | `App.tsx` sidebar JSX | ✅ |
| Chat tab (Master Coder) | `ChatBox.tsx` | ✅ |
| Files tab (file tree) | `FileTree.tsx` | ✅ |
| Templates tab | `TemplatesPanel.tsx` | ✅ |
| History tab | `App.tsx` history section | ✅ |
| Header bar with PREVIEW/CODE/SPLIT | `App.tsx` header JSX | ✅ |
| Device frames (desktop/tablet/mobile) | `App.tsx` header icons | ✅ |
| AI code generation (6 providers) | `/api/canvas/generate` | ✅ |
| Auth + plan check on API | `generate/route.ts`, `chat/route.ts` | ✅ |
| Voice input | `VoiceInput.tsx` | ✅ |
| Image-to-code | `ImageToCode.tsx` | ✅ |
| S3 deploy (slug.maula.ai) | `DeployPanel.tsx` + backend | ✅ |
| App persistence (DB + localStorage) | `canvasAppsService.ts` | ✅ |

### Auth & Billing Flow

```
User visits /canvas-studio
        │
        ▼
   ┌─────────────┐
   │ Auth Check   │ POST /api/auth/verify
   └──────┬──────┘
          │
     ┌────┴────┐
     │         │
  Not logged   Logged in
  in           │
     │         ▼
     │    ┌─────────────┐
     │    │ Plan Check   │ GET /api/canvas/studio-plan
     │    └──────┬──────┘
     │           │
     │      ┌────┴────┐
     │      │         │
     │   No plan   Has plan
     │      │         │
     ▼      ▼         ▼
  ┌──────┐ ┌──────┐ ┌──────┐
  │Login │ │Price │ │ App  │
  │Gate  │ │Wall  │ │Editor│
  └──┬───┘ └──┬───┘ └──────┘
     │        │
     │        ▼
     │   ┌──────────┐
     │   │  Stripe  │ → /api/canvas/studio-checkout
     │   │ Checkout │
     │   └────┬─────┘
     │        │
     │        ▼
     │   /canvas-studio?purchase=success&session_id=xxx
     │        │
     │        ▼
     │   ┌──────────┐
     │   │ Verify   │ → /api/canvas/studio-verify
     │   │ Purchase │
     │   └────┬─────┘
     │        │
     │        ▼
     │   🎉 Thank You Toast (6s auto-dismiss)
     │        │
     └────────┴──────▶ Full Access
```

---

## Phase 2 — Sandbox & Build Pipeline

> **Status: 🔧 Planning**
> **Priority: 🔴 HIGH**
> **Goal: Every project runs in an isolated container**

### 2.1 Sandbox Architecture

```
┌──────────────────────────────────────────────┐
│                  USER BROWSER                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Editor   │  │ Preview  │  │ Terminal  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │          │
└───────┼──────────────┼──────────────┼──────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────────────────────────────────────┐
│              API GATEWAY (Next.js)            │
│  /api/sandbox/*    /api/build/*               │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│          SANDBOX ORCHESTRATOR (Node.js)        │
│                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Docker   │  │ Build   │  │ Health  │       │
│  │ Manager  │  │ Queue   │  │ Checker │       │
│  └────┬────┘  └────┬────┘  └────┬────┘       │
└───────┼─────────────┼───────────┼─────────────┘
        │             │           │
        ▼             ▼           ▼
┌──────────────────────────────────────────────┐
│              DOCKER HOST (EC2)                │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │Sandbox-A │  │Sandbox-B │  │Sandbox-C │    │
│  │(Next.js) │  │(Express) │  │(Vite)    │    │
│  │Port:4001 │  │Port:4002 │  │Port:4003 │    │
│  │256MB RAM │  │256MB RAM │  │128MB RAM │    │
│  │Temp DB   │  │Temp DB   │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
│  Auto-destroy after 30 min idle                │
└──────────────────────────────────────────────┘
```

### 2.2 Sandbox Lifecycle

| Action | Endpoint | Description |
|--------|----------|-------------|
| Create | `POST /api/sandbox` | Spin up Docker container with project template |
| Status | `GET /api/sandbox/:id` | Container health, ports, resource usage |
| Execute | `POST /api/sandbox/:id/exec` | Run command (npm install, npm run build) |
| Terminal | `WS /api/sandbox/:id/terminal` | WebSocket terminal (xterm.js) |
| Logs | `GET /api/sandbox/:id/logs` | Stream container logs (SSE) |
| Destroy | `DELETE /api/sandbox/:id` | Kill container, cleanup volumes |

### 2.3 Resource Limits per Plan

| Plan | Sandboxes | RAM | CPU | Storage | Timeout |
|------|-----------|-----|-----|---------|---------|
| Weekly ($7) | 2 concurrent | 256MB | 0.5 CPU | 1GB | 30 min idle |
| Monthly ($19) | 5 concurrent | 512MB | 1 CPU | 5GB | 60 min idle |
| Yearly ($120) | 10 concurrent | 1GB | 2 CPU | 20GB | 120 min idle |

### 2.4 Implementation Tasks

- [ ] Install Docker on EC2 instance
- [ ] Create base Docker images (node-18, node-20)
- [ ] Build `sandbox-manager.js` — container CRUD
- [ ] Build `sandbox-network.js` — port allocation & isolation
- [ ] Build `sandbox-storage.js` — temp volumes
- [ ] Create `/api/sandbox/*` API routes
- [ ] Build `sandboxService.ts` frontend client
- [ ] Build `Terminal.tsx` component (xterm.js + WebSocket)
- [ ] Add sandbox UI to editor sidebar
- [ ] Auto-destroy idle sandboxes (cron job)

---

## Phase 3 — CI/CD Automation

> **Status: 📋 Planned**
> **Priority: 🔴 HIGH**
> **Goal: `git push → automatically live`**

### 3.1 Pipeline Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Code    │    │  Build   │    │  Test    │    │ Security │
│  Change  │───▶│  Stage   │───▶│  Stage   │───▶│  Scan    │
│  Detect  │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
                                                      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Live!   │    │  Health  │    │  Deploy  │    │ Preview  │
│  ✅      │◀───│  Check   │◀───│  Prod    │◀───│  Deploy  │
│          │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │
                     ▼ (if unhealthy)
               ┌──────────┐
               │ Auto     │
               │ Rollback │
               └──────────┘
```

### 3.2 Build Stages

| # | Stage | What Happens | Time |
|---|-------|-------------|------|
| 1 | **Detect** | File change detected (save/push) | Instant |
| 2 | **Install** | `npm install` (cached node_modules) | 5-15s |
| 3 | **Lint** | ESLint + TypeScript check | 3-5s |
| 4 | **Test** | Run test suite (if exists) | 5-30s |
| 5 | **Build** | `npm run build` (frontend + backend) | 10-30s |
| 6 | **Security** | Dependency audit + code scan | 3-5s |
| 7 | **Preview** | Deploy to preview URL | 5-10s |
| 8 | **Promote** | One-click → production | 3s |

### 3.3 Implementation Tasks

- [ ] Build `build-orchestrator.js` — queue + execution engine
- [ ] Build `build-detector.js` — auto-detect framework (Next.js/Vite/Express)
- [ ] Build `build-cache.js` — cache node_modules per project hash
- [ ] Build `build-logger.js` — stream logs via SSE
- [ ] Create `/api/build/*` API routes
- [ ] Build `buildService.ts` frontend client
- [ ] Add build status UI to editor header
- [ ] Add build log panel to editor
- [ ] Implement preview deploys (branch-based URLs)
- [ ] Implement one-click promote to production

---

## Phase 4 — Asset Pipeline

> **Status: 📋 Planned**
> **Priority: 🟡 MEDIUM**
> **Goal: Upload image/video → auto-optimized → CDN URL**

### 4.1 Image Pipeline

```
Upload (JPG/PNG/SVG)
        │
        ▼
┌──────────────────┐
│  Sharp Processor  │
│  - Resize         │
│  - Compress        │
│  - WebP/AVIF      │
│  - Thumbnail       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  S3 Upload        │
│  /assets/{id}/    │
│    original.jpg   │
│    thumb.webp     │
│    medium.webp    │
│    large.webp     │
└────────┬─────────┘
         │
         ▼
   CDN URL returned
   https://cdn.maula.ai/assets/{id}/medium.webp
```

### 4.2 Video Pipeline

```
Upload (MP4/MOV/WebM)
        │
        ▼
┌──────────────────┐
│  FFmpeg Processor │
│  - Transcode HLS  │
│  - Generate thumb  │
│  - Multiple bitrates│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  S3 Upload        │
│  /videos/{id}/    │
│    master.m3u8    │
│    720p.m3u8      │
│    1080p.m3u8     │
│    thumb.jpg      │
└────────┬─────────┘
         │
         ▼
   CDN Streaming URL
```

### 4.3 Implementation Tasks

- [ ] Build `image-processor.js` — Sharp integration
- [ ] Build `video-processor.js` — FFmpeg integration
- [ ] Build `asset-cdn.js` — S3 + CloudFront upload
- [ ] Create `/api/assets/*` API routes
- [ ] Build `assetService.ts` frontend client
- [ ] Add drag-and-drop upload to editor
- [ ] Add asset browser panel to sidebar
- [ ] Auto-replace image paths in code with CDN URLs

---

## Phase 5 — Database & State Management

> **Status: 📋 Planned**
> **Priority: 🟡 MEDIUM**
> **Goal: Every project gets its own managed database**

### 5.1 Architecture

```
┌──────────────────────────────────────────────┐
│              PLATFORM DATABASE                │
│         (PostgreSQL on RDS — shared)          │
│                                                │
│  Users, Subscriptions, CanvasApps,            │
│  Transactions, Sessions, Analytics            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│           PROJECT DATABASES                   │
│         (PostgreSQL — per project)             │
│                                                │
│  Project A DB ──┐                             │
│  Project B DB ──┤  Managed by db-provisioner  │
│  Project C DB ──┘                             │
│                                                │
│  + Redis (shared cache layer)                 │
└──────────────────────────────────────────────┘
```

### 5.2 Agent-Managed DB Operations

| Operation | Trigger | Agent Action |
|-----------|---------|-------------|
| Create DB | New project | `CREATE DATABASE project_{id}` |
| Migrate | Schema change detected | Run Prisma/Drizzle migrate |
| Backup | Daily + before deploy | `pg_dump` → S3 |
| Rollback | Deploy fails | Restore from latest backup |
| Scale | High traffic detected | Increase connections/replicas |
| Destroy | Project deleted | `DROP DATABASE` + cleanup backups |

### 5.3 Implementation Tasks

- [ ] Build `db-provisioner.js` — create/destroy project databases
- [ ] Build `db-migrator.js` — auto-detect & run migrations
- [ ] Build `db-backup.js` — scheduled backups to S3
- [ ] Create `/api/project/:id/db/*` API routes
- [ ] Build `databaseService.ts` frontend client
- [ ] Add database panel to editor sidebar
- [ ] Visual schema editor (stretch goal)

---

## Phase 6 — Monitoring & Recovery

> **Status: 📋 Planned**
> **Priority: 🟡 MEDIUM**
> **Goal: Auto-detect problems, auto-fix them**

### 6.1 Monitoring Stack

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ App Logs │────▶│   Log    │────▶│ Dashboard│
│ (stdout) │     │Aggregator│     │  (UI)    │
└──────────┘     └──────────┘     └──────────┘

┌──────────┐     ┌──────────┐     ┌──────────┐
│  Metrics │────▶│ Metrics  │────▶│  Alerts  │
│ (CPU/RAM)│     │Collector │     │  Engine  │
└──────────┘     └──────────┘     └──────────┘

┌──────────┐     ┌──────────┐     ┌──────────┐
│  Errors  │────▶│  Error   │────▶│  Auto    │
│ (crashes)│     │ Tracker  │     │ Rollback │
└──────────┘     └──────────┘     └──────────┘
```

### 6.2 Auto-Recovery Rules

| Condition | Detection | Action |
|-----------|-----------|--------|
| App crash | Health check fails 3x | Auto-restart container |
| High error rate | >5% error rate for 5 min | Alert developer + auto-rollback |
| OOM | Container killed | Increase memory limit + restart |
| Disk full | >90% disk usage | Cleanup logs + alert |
| SSL expiry | <7 days to expiry | Auto-renew cert |
| Unresponsive | No response for 30s | Kill + restart |

### 6.3 Implementation Tasks

- [ ] Build `log-aggregator.js` — collect & store logs
- [ ] Build `metrics-collector.js` — CPU/RAM/request metrics
- [ ] Build `error-tracker.js` — error grouping & counting
- [ ] Build `health-checker.js` — periodic health probes
- [ ] Build `auto-recovery.js` — crash detection + rollback
- [ ] Create `/api/monitoring/*` API routes
- [ ] Build monitoring dashboard UI
- [ ] Build alert notification system (email/webhook)

---

## Phase 7 — AI Agent (Horizon Level)

> **Status: 🔵 Future**
> **Priority: 🔵 LOW (after Phase 2-6)**
> **Goal: The agent runs the company**

### 7.1 Agent Capabilities

```
┌──────────────────────────────────────────────┐
│              AI AGENT ORCHESTRATOR             │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ DevOps   │  │  Debug   │  │  Config  │    │
│  │ Engineer │  │ Assistant│  │Generator │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Infra   │  │  Cost    │  │  Scale   │    │
│  │ Manager  │  │Optimizer │  │  Agent   │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
│  Input: Natural language or code changes       │
│  Output: Automated infrastructure actions      │
└──────────────────────────────────────────────┘
```

### 7.2 Agent Scenarios

| Scenario | Developer Says | Agent Does |
|----------|---------------|-----------|
| Deploy | "make it live" | Build → test → deploy → health check |
| Fix error | "it's broken" | Read logs → identify error → fix code → redeploy |
| Scale | "it's slow" | Analyze metrics → add instances → optimize queries |
| Migrate | "update database" | Generate migration → backup → run → verify |
| Rollback | "go back" | Find last working version → rollback → verify |
| Setup | "new project" | Scaffold → configure → sandbox → preview URL |
| Optimize | "make it faster" | Analyze bundle → code split → cache → CDN |
| Secure | "security check" | Audit deps → scan code → fix vulns → report |

### 7.3 Implementation Tasks

- [ ] Build agent orchestrator — command parser + action executor
- [ ] Integrate with all Phase 2-6 services
- [ ] Natural language → infrastructure action mapping
- [ ] Build context-aware decision engine
- [ ] Train on common DevOps patterns
- [ ] Build cost optimization analyzer
- [ ] Build scaling decision engine
- [ ] Full test suite for agent actions

---

## Database Schema (Full)

### Existing Models

```sql
-- User account
User {
  id, email, password, name, avatar, role, plan,
  stripeCustomerId, createdAt, updatedAt
}

-- AI agent definitions
Agent {
  id, name, description, systemPrompt, model,
  category, pricing, createdBy, isPublic
}

-- Plan subscriptions (canvas-studio, etc.)
AgentSubscription {
  id, userId, agentId, plan, status,
  stripeSessionId, expiryDate, amount, currency,
  createdAt, cancelledAt
}

-- Generated apps
CanvasApp {
  id, userId, name, prompt, code, language,
  provider, modelId, thumbnail, history, metadata,
  isPublic, isFavorite, viewCount, createdAt, updatedAt
}

-- Auth sessions
Session {
  id, sessionId, userId, ipAddress, userAgent,
  expiresAt, isActive, createdAt
}

-- Stripe transactions
Transaction {
  id, transactionId, userId, stripePaymentIntentId,
  type, item, amount, currency, status, createdAt
}
```

### New Models Needed

```sql
-- 🆕 Project (container for multi-file apps)
Project {
  id, userId, name, description, framework,
  gitRepo, defaultBranch, envVars (encrypted),
  sandboxId, lastDeployId, status,
  createdAt, updatedAt
}

-- 🆕 Project File
ProjectFile {
  id, projectId, path, content, language,
  size, hash, createdAt, updatedAt
}

-- 🆕 Sandbox (isolated container)
Sandbox {
  id, projectId, userId, containerId,
  status (creating/running/stopped/destroyed),
  port, memory, cpu, storageUsed,
  lastActivity, expiresAt, createdAt
}

-- 🆕 Build (CI/CD build record)
Build {
  id, projectId, userId, branch, commitHash,
  status (queued/building/testing/deploying/success/failed),
  stages (JSON), logs (Text), duration,
  artifactUrl, triggeredBy, createdAt
}

-- 🆕 Deployment
Deployment {
  id, projectId, userId, buildId,
  environment (preview/staging/production),
  url, domain, status (deploying/live/rolled-back/failed),
  version, previousDeployId,
  healthStatus, createdAt, destroyedAt
}

-- 🆕 Custom Domain
Domain {
  id, deploymentId, userId, domain,
  sslStatus (pending/active/expired),
  sslExpiresAt, dnsVerified, createdAt
}

-- 🆕 Asset
Asset {
  id, projectId, userId, type (image/video/font/file),
  originalName, originalSize, optimizedSize,
  s3Key, cdnUrl, thumbnailUrl, metadata (JSON),
  createdAt
}

-- 🆕 Project Database
ProjectDatabase {
  id, projectId, engine (postgres/mysql/sqlite),
  host, port, name, status (creating/active/suspended),
  sizeBytes, backupSchedule, lastBackup,
  createdAt, destroyedAt
}

-- 🆕 Monitoring Alert
Alert {
  id, projectId, userId, type (error/performance/security),
  condition, threshold, channel (email/webhook/slack),
  isActive, lastTriggered, createdAt
}

-- 🆕 Monitoring Event
MonitoringEvent {
  id, projectId, deploymentId, type, severity,
  message, metadata (JSON), resolved, createdAt
}
```

---

## API Endpoints (Full)

### ✅ Existing (Live)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/verify` | Cookie | Verify session |
| POST | `/api/canvas/generate` | ✅ + Plan | AI code generation |
| POST | `/api/canvas/chat` | ✅ + Plan | Chat with Master Coder |
| GET | `/api/canvas/apps` | ✅ | List user's apps |
| POST | `/api/canvas/apps` | ✅ | Save new app |
| GET | `/api/canvas/apps/:id` | ✅ | Get single app |
| PUT | `/api/canvas/apps/:id` | ✅ | Update app |
| DELETE | `/api/canvas/apps/:id` | ✅ | Delete app |
| POST | `/api/canvas/studio-checkout` | ✅ | Create Stripe checkout |
| GET | `/api/canvas/studio-plan` | ✅ | Check plan status |
| POST | `/api/canvas/studio-verify` | ✅ | Verify purchase |
| POST | `/api/canvas/deploy-external` | ✅ | Deploy to Vercel/Netlify |

### 🆕 Planned

| Method | Endpoint | Phase | Description |
|--------|----------|-------|-------------|
| POST | `/api/sandbox` | 2 | Create sandbox |
| GET | `/api/sandbox/:id` | 2 | Sandbox status |
| DELETE | `/api/sandbox/:id` | 2 | Destroy sandbox |
| POST | `/api/sandbox/:id/exec` | 2 | Execute command |
| WS | `/api/sandbox/:id/terminal` | 2 | Terminal session |
| POST | `/api/build` | 3 | Trigger build |
| GET | `/api/build/:id` | 3 | Build status |
| GET | `/api/build/:id/logs` | 3 | Build logs (SSE) |
| POST | `/api/deploy` | 3 | Deploy project |
| GET | `/api/deploy/:id` | 3 | Deploy status |
| POST | `/api/deploy/:id/rollback` | 3 | Rollback |
| POST | `/api/assets/upload` | 4 | Upload asset |
| GET | `/api/project/:id/db` | 5 | Database status |
| POST | `/api/project/:id/db/migrate` | 5 | Run migration |
| GET | `/api/monitoring/logs` | 6 | App logs (SSE) |
| GET | `/api/monitoring/metrics` | 6 | Metrics dashboard |

---

## Tech Stack Summary

### Current (Phase 1)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | Editor UI |
| **Bundler** | Vite 6 | Build canvas-app |
| **Styling** | Tailwind CSS 3 | UI styling |
| **Preview** | Sandpack (CodeSandbox) | Live code preview |
| **Editor** | CodeMirror (via Sandpack) | Code editing |
| **Icons** | Lucide React | UI icons |
| **API** | Next.js 14 API Routes | Backend endpoints |
| **Backend** | Express.js | Canvas generation API |
| **Database** | PostgreSQL (RDS) | Data persistence |
| **ORM** | Prisma | Database queries |
| **Cache** | Redis | Session cache |
| **Storage** | AWS S3 | File storage + deploy |
| **CDN** | Cloudflare | SSL + caching |
| **Auth** | HttpOnly session cookies | Authentication |
| **Billing** | Stripe | Subscriptions |
| **AI** | Anthropic, OpenAI, Groq, Mistral, xAI, Gemini | Code generation |
| **Hosting** | EC2 (Ubuntu) + PM2 | Server |
| **Proxy** | Nginx | Reverse proxy + SSL |

### Planned (Phase 2+)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Editor** | Monaco Editor | Full VS Code experience |
| **Terminal** | xterm.js + WebSocket | Embedded terminal |
| **Containers** | Docker | Sandbox environments |
| **Orchestration** | Docker Compose / K8s | Container management |
| **Images** | Sharp | Image optimization |
| **Video** | FFmpeg | Video transcoding |
| **Git** | isomorphic-git | In-browser git |
| **Monitoring** | Custom + Sentry | Error tracking |
| **State** | Zustand | Frontend state management |
| **CDN** | CloudFront | Asset delivery |

---

## Developer vs Agent Responsibilities

```
┌──────────────────────────────┬──────────────────────────────┐
│      DEVELOPER DOES          │       AGENT DOES             │
├──────────────────────────────┼──────────────────────────────┤
│ ✏️  Write code                │ 📦 Install dependencies      │
│ 🎨 Design UI/UX             │ 🔨 Build project             │
│ 💬 Describe features         │ 🧪 Run tests                 │
│ 👀 Review preview            │ 🔒 Security scanning         │
│ ✅ Approve deploy            │ 🚀 Deploy to production      │
│                              │ 🌐 Configure DNS/SSL         │
│                              │ 📊 Monitor performance       │
│                              │ 🔄 Auto-rollback on crash    │
│                              │ 💾 Database backups           │
│                              │ 📈 Scale infrastructure      │
│                              │ 🖼️  Optimize assets          │
│                              │ 🏗️  Manage containers        │
│                              │ 🔧 Fix config/infra issues   │
│                              │ 💰 Optimize cloud costs      │
└──────────────────────────────┴──────────────────────────────┘
```

---

## Implementation Timeline

```
Phase 1 ████████████████████ DONE ✅ (Editor + UI + Auth + Billing)
         Jan 2026 ─────────── Feb 2026

Phase 2 ░░░░░░░░░░░░░░░░░░░░ NEXT 🔧 (Sandbox + Build)
         Feb 2026 ─────────── Apr 2026
         • Docker sandboxes
         • xterm.js terminal
         • Build pipeline
         • Preview URLs

Phase 3 ░░░░░░░░░░░░░░░░░░░░ PLANNED (CI/CD)
         Apr 2026 ─────────── Jun 2026
         • Auto build on save
         • Test runner
         • Preview deploys
         • One-click promote

Phase 4 ░░░░░░░░░░░░░░░░░░░░ PLANNED (Assets)
         Jun 2026 ─────────── Jul 2026
         • Image optimization
         • Video transcoding
         • CDN delivery
         • Asset browser

Phase 5 ░░░░░░░░░░░░░░░░░░░░ PLANNED (Database)
         Jul 2026 ─────────── Sep 2026
         • Per-project databases
         • Auto migrations
         • Backups
         • Visual schema editor

Phase 6 ░░░░░░░░░░░░░░░░░░░░ PLANNED (Monitoring)
         Sep 2026 ─────────── Oct 2026
         • Log aggregation
         • Error tracking
         • Auto-recovery
         • Alert system

Phase 7 ░░░░░░░░░░░░░░░░░░░░ FUTURE (AI Agent)
         Oct 2026 ─────────── Dec 2026
         • Full orchestrator
         • Natural language ops
         • Cost optimization
         • Self-healing infra
```

---

## Quick Start (For Developers)

```bash
# Clone & install
git clone https://github.com/aidigitalfriend/maulaai.git
cd canvas-app
npm install

# Development
npm run dev          # Start Vite dev server at localhost:5173

# Build & Deploy
npm run build        # Build to dist/
cp -r dist/* ../frontend/public/canvas-studio/
cd ../frontend && npx next build
# Deploy to EC2: git push → ssh → git pull → pm2 restart

# Live URL
https://maula.ai/canvas-studio
```

---

## Contributing

1. **Frontend changes** → Edit files in `canvas-app/`
2. **API changes** → Edit files in `frontend/app/api/canvas/`
3. **Backend services** → Edit files in `backend/services/canvas/`
4. **Database changes** → Edit `prisma/schema.prisma` → `npx prisma migrate dev`

---

> **GenCraft Pro — You code. The agent runs everything else.** 🚀
