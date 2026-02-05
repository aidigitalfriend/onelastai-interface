# 🏗️ Canvas Studio - Full-Stack Multi-Page Deploy Architecture

> **Version:** 2.0 | **Status:** Planning → Implementation  
> **Goal:** AI Agent builds complete full-stack apps with multi-page support, deploys to subdomain hosting

---

## 🎯 Vision

Users describe what they want → Agent builds a **complete, deployable full-stack application** with:
- ✅ Multiple pages with working routing
- ✅ Multiple files (frontend + backend)
- ✅ Database integration
- ✅ API endpoints
- ✅ One-click deploy to `appname.canvas.onelast.ai`
- ✅ Custom domain support
- ✅ SSL certificates

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CANVAS STUDIO FRONTEND                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Chat/Agent │  │ File Explorer│  │ Code Editor │  │ Live Preview│        │
│  │   Panel     │  │ (Multi-file) │  │ (Monaco)    │  │ (Sandpack)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │               │
│         └────────────────┴────────────────┴────────────────┘               │
│                                   │                                         │
│                          ┌────────┴────────┐                               │
│                          │  Editor Bridge  │                               │
│                          │  (Tool Registry)│                               │
│                          └────────┬────────┘                               │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API SERVER                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ /api/canvas/    │  │ /api/hosting/   │  │ /api/billing/   │             │
│  │   - /generate   │  │   - /deploy     │  │   - /credits    │             │
│  │   - /agent      │  │   - /app/:slug  │  │   - /usage      │             │
│  │   - /project    │  │   - /build      │  │   - /checkout   │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┴────────────────────┘                       │
│                                │                                            │
│                    ┌───────────┴───────────┐                               │
│                    │   AI Service Layer    │                               │
│                    │ (Multi-Provider LLM)  │                               │
│                    └───────────┬───────────┘                               │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HOSTING INFRASTRUCTURE                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         NGINX REVERSE PROXY                          │   │
│  │   *.canvas.onelast.ai → Route by subdomain                          │   │
│  │   custom-domain.com → Route by Host header                          │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│         ┌───────────────────────┼───────────────────────┐                  │
│         ▼                       ▼                       ▼                  │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐            │
│  │   Static    │        │   Dynamic   │        │   Database  │            │
│  │   Hosting   │        │   Backends  │        │   Per App   │            │
│  │  (HTML/JS)  │        │  (Docker)   │        │  (SQLite)   │            │
│  └─────────────┘        └─────────────┘        └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure (What Agent Generates)

### Static Website (HTML/CSS/JS)
```
my-portfolio/
├── index.html          # Home page
├── about.html          # About page
├── projects.html       # Projects page
├── contact.html        # Contact page
├── css/
│   └── styles.css      # Global styles
├── js/
│   ├── main.js         # Core functionality
│   └── router.js       # Client-side routing
└── assets/
    └── images/
```

### React/Next.js App
```
my-dashboard/
├── package.json
├── src/
│   ├── App.tsx
│   ├── index.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Settings.tsx
│   │   └── Profile.tsx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── styles/
│       └── globals.css
└── public/
```

### Full-Stack App (React + Express/Flask)
```
my-fullstack-app/
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   │       └── api.ts      # API client
│   └── public/
├── backend/
│   ├── package.json        # or requirements.txt
│   ├── server.js           # or app.py
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── api.js
│   ├── models/
│   │   └── User.js
│   └── database/
│       └── schema.sql
├── docker-compose.yml
└── README.md
```

---

## 🤖 Agent Capabilities (Enhanced)

### Current Actions
```typescript
type AgentAction = 
  | 'chat'           // Respond conversationally
  | 'build'          // Generate single-file app
  | 'edit'           // Modify existing code
  | 'preview'        // Show preview
  | 'deploy'         // Deploy to hosting
```

### New Actions (To Implement)
```typescript
type AgentAction = 
  // ... existing
  | 'build_project'      // Multi-file project generation
  | 'create_page'        // Add new page to project
  | 'create_component'   // Add reusable component
  | 'create_api'         // Generate API endpoint
  | 'create_model'       // Generate database model
  | 'create_route'       // Add backend route
  | 'setup_auth'         // Add authentication
  | 'setup_database'     // Configure database
  | 'build_fullstack'    // Generate complete full-stack app
  | 'deploy_preview'     // Deploy to preview URL
  | 'deploy_production'  // Deploy to production URL
  | 'add_domain'         // Configure custom domain
```

---

## 🚀 Deploy System Architecture

### Deployment Flow
```
User clicks "Deploy"
        │
        ▼
┌───────────────────┐
│  Validate Project │  Check all files present, no errors
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   Bundle/Build    │  npm build / webpack / esbuild
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Generate Slug/URL │  "my-app-a1b2c3" → my-app-a1b2c3.canvas.onelast.ai
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Upload to S3/R2  │  Static files to CDN
└─────────┬─────────┘
          │
          ▼ (If has backend)
┌───────────────────┐
│ Create Container  │  Docker container for backend
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Configure Nginx  │  Add routing rules
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Setup SSL Cert   │  Let's Encrypt auto-cert
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   Return URL      │  https://my-app-a1b2c3.canvas.onelast.ai
└───────────────────┘
```

### Subdomain Hosting Types

| Type | URL Pattern | Technology |
|------|-------------|------------|
| Static | `app.canvas.onelast.ai` | Nginx static serve |
| SPA | `app.canvas.onelast.ai` | Nginx + index.html fallback |
| Full-Stack | `app.canvas.onelast.ai` | Docker + Nginx proxy |
| Custom | `yoursite.com` | CNAME + SSL |

---

## 💾 Database Schema (Additions)

```prisma
// Enhanced HostedApp model
model HostedApp {
  id              String    @id @default(cuid())
  userId          String?   @map("user_id")
  
  // App identity
  slug            String    @unique
  name            String
  description     String?
  
  // Project structure (NEW)
  projectType     ProjectType @default(STATIC) @map("project_type")
  files           Json        // File tree structure
  mainFile        String?     @map("main_file")
  
  // Code storage
  code            String      @db.Text  // For single-file apps
  
  // Build configuration (NEW)
  buildCommand    String?     @map("build_command")
  startCommand    String?     @map("start_command")
  envVars         Json?       @map("env_vars")
  
  // Backend config (NEW)
  hasBackend      Boolean     @default(false) @map("has_backend")
  backendType     String?     @map("backend_type") // express, flask, fastapi
  backendPort     Int?        @map("backend_port")
  containerId     String?     @map("container_id") // Docker container ID
  
  // Database config (NEW)
  hasDatabase     Boolean     @default(false) @map("has_database")
  databaseType    String?     @map("database_type") // sqlite, postgres
  databaseUrl     String?     @map("database_url")
  
  // Hosting details
  language        String      @default("html")
  framework       String?
  
  // URLs
  customDomain    String?     @unique @map("custom_domain")
  previewUrl      String?     @map("preview_url")
  productionUrl   String?     @map("production_url")
  
  // SSL
  sslEnabled      Boolean     @default(false) @map("ssl_enabled")
  sslExpiry       DateTime?   @map("ssl_expiry")
  
  // Status & Analytics
  status          HostedAppStatus @default(ACTIVE)
  viewCount       Int         @default(0) @map("view_count")
  lastViewedAt    DateTime?   @map("last_viewed_at")
  lastDeployedAt  DateTime?   @map("last_deployed_at")
  
  // Storage
  storageUsed     Int         @default(0) @map("storage_used") // bytes
  bandwidthUsed   Int         @default(0) @map("bandwidth_used") // bytes this month
  
  // AI context
  originalPrompt  String?     @map("original_prompt") @db.Text
  aiModel         String?     @map("ai_model")
  aiProvider      String?     @map("ai_provider")
  
  // Timestamps
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")
  publishedAt     DateTime?   @map("published_at")
  
  // Relations
  user            User?       @relation(fields: [userId], references: [id])
  versions        HostedAppVersion[]
  deployments     Deployment[]
  
  @@map("hosted_apps")
}

enum ProjectType {
  STATIC        // HTML/CSS/JS
  SPA           // React/Vue SPA
  SSR           // Next.js/Nuxt SSR
  FULLSTACK     // Frontend + Backend
  API_ONLY      // Backend API only
}

model Deployment {
  id            String    @id @default(cuid())
  appId         String    @map("app_id")
  
  // Deploy info
  version       Int
  environment   String    @default("production") // preview, production
  status        DeployStatus @default(PENDING)
  
  // Build
  buildLogs     String?   @db.Text @map("build_logs")
  buildDuration Int?      @map("build_duration") // seconds
  
  // URLs
  url           String?
  
  // Timestamps
  startedAt     DateTime  @default(now()) @map("started_at")
  completedAt   DateTime? @map("completed_at")
  
  // Relations
  app           HostedApp @relation(fields: [appId], references: [id], onDelete: Cascade)
  
  @@map("deployments")
}

enum DeployStatus {
  PENDING
  BUILDING
  DEPLOYING
  LIVE
  FAILED
  ROLLED_BACK
}
```

---

## 🔌 API Endpoints (New)

### Project Management
```
POST   /api/canvas/project/create      # Create multi-file project
GET    /api/canvas/project/:id         # Get project details
PUT    /api/canvas/project/:id         # Update project
DELETE /api/canvas/project/:id         # Delete project
POST   /api/canvas/project/:id/file    # Add file to project
PUT    /api/canvas/project/:id/file    # Update file in project
DELETE /api/canvas/project/:id/file    # Delete file from project
```

### Build & Deploy
```
POST   /api/hosting/build              # Build project (returns artifacts)
POST   /api/hosting/deploy             # Deploy to hosting
GET    /api/hosting/deploy/:id/status  # Check deployment status
GET    /api/hosting/deploy/:id/logs    # Get build/deploy logs
POST   /api/hosting/deploy/:id/rollback # Rollback to previous version
```

### Domain Management
```
POST   /api/hosting/app/:id/domain     # Add custom domain
DELETE /api/hosting/app/:id/domain     # Remove custom domain
POST   /api/hosting/app/:id/ssl        # Generate SSL certificate
GET    /api/hosting/app/:id/dns        # Get DNS configuration
```

---

## 🎨 Frontend Components (New)

### 1. Project Explorer (Enhanced File Tree)
```typescript
interface ProjectExplorerProps {
  files: ProjectFile[];
  activeFile: string;
  onFileSelect: (path: string) => void;
  onFileCreate: (path: string, type: 'file' | 'folder') => void;
  onFileDelete: (path: string) => void;
  onFileRename: (oldPath: string, newPath: string) => void;
}
```

### 2. Deploy Panel
```typescript
interface DeployPanelProps {
  project: Project;
  onDeploy: (env: 'preview' | 'production') => void;
  onAddDomain: (domain: string) => void;
  deployHistory: Deployment[];
}
```

### 3. Multi-File Preview
```typescript
interface MultiFilePreviewProps {
  files: Map<string, string>;
  entryFile: string;
  framework: 'html' | 'react' | 'vue';
}
```

---

## 🔧 Implementation Phases

### Phase 1: Multi-File Foundation (Week 1)
- [ ] Enhanced EditorBridge for multi-file
- [ ] Project Explorer component
- [ ] Multi-file Sandpack preview
- [ ] Agent `build_project` action

### Phase 2: Full-Stack Generation (Week 2)
- [ ] Backend code templates (Express, Flask)
- [ ] Database schema generation
- [ ] API endpoint generation
- [ ] Agent `build_fullstack` action

### Phase 3: Deploy Infrastructure (Week 3)
- [ ] Build pipeline (esbuild/webpack)
- [ ] Static file hosting (S3/R2)
- [ ] Nginx wildcard subdomain config
- [ ] SSL automation (Let's Encrypt)

### Phase 4: Dynamic Hosting (Week 4)
- [ ] Docker container management
- [ ] Backend process orchestration
- [ ] Database provisioning
- [ ] Container health monitoring

### Phase 5: Domain & Polish (Week 5)
- [ ] Custom domain configuration
- [ ] Deploy UI/UX polish
- [ ] Analytics dashboard
- [ ] Documentation

---

## 🛡️ Security Considerations

1. **Code Sandboxing**
   - All generated code runs in isolated containers
   - No access to host filesystem
   - Network isolation between apps

2. **Resource Limits**
   - CPU/Memory limits per container
   - Storage quotas per user
   - Bandwidth throttling

3. **Input Validation**
   - Sanitize all user inputs
   - Validate file paths (no traversal)
   - Scan for malicious code patterns

4. **SSL/TLS**
   - Auto-generate certs for all subdomains
   - Force HTTPS
   - HSTS headers

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Deploy time (static) | < 30 seconds |
| Deploy time (full-stack) | < 2 minutes |
| Preview load time | < 3 seconds |
| Uptime | 99.9% |
| SSL coverage | 100% |

---

## 🚦 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Single-file generation | ✅ Complete | Works well |
| Multi-file EditorBridge | 🟡 Partial | Needs enhancement |
| Project templates | ✅ Complete | 5 templates |
| Hosting backend routes | ✅ Complete | `/api/hosting/*` |
| Deploy UI | ❌ Missing | Need to build |
| Nginx config | ❌ Missing | Need to configure |
| Docker orchestration | ❌ Missing | Need to implement |
| SSL automation | ❌ Missing | Need Let's Encrypt |
| Full-stack generation | ❌ Missing | Agent needs training |

---

## 📝 Next Steps

1. **Create Deploy Panel UI** - Frontend component for deploy workflow
2. **Enhance Agent** - Add `build_project` and `build_fullstack` actions
3. **Setup Nginx** - Wildcard subdomain configuration
4. **Implement Build Pipeline** - Bundle and deploy static files
5. **Add Docker Support** - Container management for backends

---

*Document created: February 5, 2026*  
*Last updated: February 5, 2026*
