<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Digital Friend Zone - Web IDE

A full-stack AI-powered Web IDE that allows users to create, edit, and deploy code projects directly in the browser with deep AI integration.

## ✨ Features

- **Multi-Provider AI Chat** - Supports 9+ LLM providers: Gemini, OpenAI, Anthropic, Mistral, Groq, xAI, Cerebras, Hugging Face, Ollama
- **Agentic AI** - Specialized agents for code generation, refactoring, debugging, testing, and deployment
- **Browser-Based IDE** - Monaco Editor (VS Code's editor), file explorer, integrated terminal
- **Live Preview** - WebContainer-powered in-browser Node.js runtime
- **Real-time Collaboration** - Yjs + CRDTs for conflict-free editing
- **Project Templates** - React, Vue, Next.js, Node.js, Python, HTML/CSS starters
- **Git Integration** - Built-in version control with isomorphic-git
- **Deployment** - Docker containerization and EC2 deployment support

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| State | Zustand (persisted) |
| Editor | Monaco Editor, xterm.js |
| Backend | NestJS, Express, Prisma, PostgreSQL |
| Real-time | Socket.IO, WebSockets, Yjs |
| AI | LangChain, LangGraph, Multi-provider support |
| Runtime | WebContainer API |

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment file and set your API key:
   ```bash
   cp .env.local.example .env.local
   ```
   Then set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## 📦 Backend Server (Optional)

For full functionality including database persistence and collaboration:

```bash
cd server
npm install
npm run db:generate
npm run start:dev
```

## 🐳 Docker Deployment

```bash
docker-compose up -d
```

## 📁 Project Structure

```
├── App.tsx              # Main application
├── components/          # React components
│   ├── AgenticAIChat    # AI chat with agent orchestration
│   ├── CodeEditor       # Monaco-based editor
│   ├── FileExplorer     # Project file tree
│   └── LivePreview      # WebContainer preview
├── services/            # Client-side services
├── server/              # NestJS backend
│   ├── nest-src/        # NestJS modules
│   └── prisma/          # Database schema
└── spaces/              # Collaborative spaces app
```

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key (optional) |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional) |
| `DATABASE_URL` | PostgreSQL connection string (for backend) |

## 📄 License

MIT
