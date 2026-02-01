<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🧠 Neural Link Interface

### Multi-Provider AI Chat Platform with Credits-Based Billing

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 🌟 Overview

Neural Link Interface is a futuristic, cyberpunk-themed AI chat platform that connects you to **7 major AI providers** through a unified, credit-based billing system. Built for developers and power users who want seamless access to multiple AI models.

### 🎯 Key Features

- **🤖 7 AI Providers** - Anthropic, OpenAI, Gemini, Mistral, xAI, Groq, Cerebras
- **💳 Unified Credits System** - One balance for all providers
- **📊 Real-Time Dashboard** - Track usage, billing, and requests
- **🎨 Cyberpunk UI** - Dark theme with neon accents and animations
- **📱 Responsive Design** - Works on desktop, tablet, and mobile
- **⚡ Live Stats** - Token usage, latency, success rates

---

## 🏗️ Architecture

This workspace contains **2 standalone apps** that share the same credit system:

```
neural-link-interface/
├── /                    # 🗣️ Main Chat App (Standalone ChatBox)
├── canvas-app/          # 🎨 Canvas App (AI Code Generator)
└── (coming soon)        # ✏️ Editor App
```

### Products After Login:
1. **Chat Box** - Standalone AI chat interface (this app)
2. **Canvas App** - AI-powered code generation with live preview
3. **Editor** - (Coming soon) AI-assisted code editor
4. **All Connected** - Unified workspace with all features

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- API keys for AI providers (at least one)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/neural-link-interface.git
cd neural-link-interface

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### Environment Setup

Create a `.env.local` file with your API keys:

```env
# Required - At least one provider key
GEMINI_API_KEY=your_gemini_api_key

# Optional - Additional providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
MISTRAL_API_KEY=your_mistral_api_key
XAI_API_KEY=your_xai_api_key
GROQ_API_KEY=your_groq_api_key
CEREBRAS_API_KEY=your_cerebras_api_key
```

### Run the App

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:3000`

---

## 📖 How It Works

### 1. Provider Selection
Open the **AI Dashboard** (click the hamburger menu) to:
- Browse all 7 AI providers with status indicators
- Select your preferred provider (Anthropic, OpenAI, etc.)
- Choose a specific model (Claude 3.5, GPT-4o, etc.)

### 2. Dashboard Tabs
The dashboard has **5 tabs**:

| Tab | Description |
|-----|-------------|
| **Providers** | Select AI provider and model, view live stats gauges |
| **Requests** | See recent request history with details |
| **Usage** | Analytics breakdown by provider and model |
| **Billing** | Transaction history and total spend |
| **Credits** | Current balance and purchase packages |

### 3. Chat Interface
- Type your message in the ChatBox
- Select provider/model from the header dropdowns
- View conversation history in the sidebar
- Start new chats or continue existing ones

### 4. Credit System
- Each request costs credits based on tokens used
- Credits are shared across all providers
- Purchase packages: 50, 100, 350, 600, or 1500 credits
- Track usage in real-time on the dashboard

---

## 🎮 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `App.tsx` | `/App.tsx` | Main app layout and state |
| `ChatBox.tsx` | `/components/` | AI chat interface |
| `NavigationDrawer.tsx` | `/components/` | Full-screen dashboard |
| `Sidebar.tsx` | `/components/` | Left navigation |
| `SettingsPanel.tsx` | `/components/` | App settings |

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript
- **Build Tool:** Vite 6
- **Styling:** TailwindCSS 3
- **Icons:** Lucide React
- **AI Services:** Gemini API (expandable to others)

---

## 📁 Project Structure

```
neural-link-interface/
├── components/
│   ├── ChatBox.tsx          # Main chat interface
│   ├── NavigationDrawer.tsx # Dashboard with 5 tabs
│   ├── Sidebar.tsx          # Left navigation
│   ├── Header.tsx           # Top header
│   ├── Footer.tsx           # Status footer
│   ├── SettingsPanel.tsx    # Settings drawer
│   └── Overlay.tsx          # Modal overlay
├── services/
│   └── geminiService.ts     # AI API integration
├── public/                  # Static assets
├── App.tsx                  # Main app component
├── index.tsx                # Entry point
├── types.ts                 # TypeScript types
├── constants.tsx            # App constants
└── vite.config.ts           # Vite configuration
```

---

## 🔧 Configuration

### Tailwind Config
Custom colors and animations are defined in `tailwind.config.js`

### TypeScript Config
Strict mode enabled in `tsconfig.json`

### Vite Config
Hot reload and build optimization in `vite.config.ts`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ by Neural Link Team**

[Report Bug](https://github.com/your-username/neural-link-interface/issues) · [Request Feature](https://github.com/your-username/neural-link-interface/issues)

</div>
