<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🎨 Neural Canvas App

### AI-Powered Code Generator with Live Preview

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 🌟 Overview

Neural Canvas App is an AI-powered code generation platform that lets you describe what you want to build and instantly see it come to life. Generate full HTML/CSS/JS applications, edit them iteratively, and preview in real-time.

### 🎯 Key Features

- **🚀 AI Code Generation** - Describe your app, get working code
- **👁️ Live Preview** - See your app render in real-time
- **💻 Code View** - Inspect and copy generated code
- **📱 Device Modes** - Preview on Desktop, Tablet, Mobile
- **🔄 Iterative Editing** - Refine with follow-up prompts
- **📊 Dashboard** - Track credits, usage, and billing
- **🎨 Starter Templates** - Quick-start with pre-built examples

---

## 🏗️ Architecture

Canvas App is part of the **Neural Link Interface** ecosystem:

```
neural-link-interface/
├── /                    # 🗣️ Main Chat App
├── canvas-app/          # 🎨 Canvas App (YOU ARE HERE)
│   ├── components/
│   │   ├── ChatBox.tsx      # AI assistant panel
│   │   ├── Dashboard.tsx    # Analytics & billing
│   │   ├── Preview.tsx      # Live code preview
│   │   ├── CodeView.tsx     # Syntax highlighted code
│   │   └── CanvasNavDrawer.tsx
│   └── services/
│       └── geminiService.ts # AI integration
└── (coming soon)        # ✏️ Editor App
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Gemini API Key** (or other provider keys)

### Installation

```bash
# Navigate to canvas-app directory
cd canvas-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### Environment Setup

Create a `.env.local` file:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# Optional - Additional providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
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

The app will be available at `http://localhost:3001` (or next available port)

---

## 📖 How It Works

### 1. Create Your First App

**Option A: Use a Template**
- Open the **Workspace** panel (first icon in sidebar)
- Click on a starter template like "SaaS Landing Page"
- The prompt will be auto-filled

**Option B: Write Your Own Prompt**
- Type a description in the chat input
- Example: *"Create a dark-themed dashboard with 3 stat cards and a chart"*

### 2. Generate Code
- Click the **Send** button or press Enter
- Watch the AI generate your app in real-time
- The preview updates live as code is generated

### 3. View Modes

| Mode | Description |
|------|-------------|
| **Preview** | See your app rendered in an iframe |
| **Code** | View the generated HTML/CSS/JS code |
| **Split** | Side-by-side preview and code |

### 4. Device Preview

Switch between device sizes using the top toolbar:
- 🖥️ **Desktop** - Full width
- 📱 **Tablet** - 768px width
- 📱 **Mobile** - 375px width

### 5. Iterate & Refine

Continue the conversation to modify your app:
- *"Add a dark mode toggle"*
- *"Make the cards horizontally scrollable"*
- *"Add hover animations to the buttons"*

---

## 📊 Dashboard

Click the **Dashboard** icon (📊) in the sidebar to access:

### Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **Overview** | Credit balance, today's usage, quick stats |
| **Requests** | Full request history with details (model, tokens, time) |
| **Usage** | Breakdown by provider, model, and type |
| **Billing** | Transaction history and payment methods |
| **Credits** | Purchase more credits with package options |

### Credit Costs

| Action | Credits |
|--------|---------|
| Code Generation | 8-12 credits |
| Code Edit | 4-6 credits |
| Chat Message | 2-3 credits |

---

## 🎮 Sidebar Icons

| Icon | Panel | Description |
|------|-------|-------------|
| 🏠 | Workspace | Templates and quick actions |
| 💬 | Assistant | Chat with AI for help |
| 📊 | Dashboard | Usage, billing, credits |
| 📁 | Files | Generated app files |
| 🕐 | History | Previous sessions |
| ⚙️ | Settings | App preferences |

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript
- **Build Tool:** Vite 6
- **Styling:** TailwindCSS 3
- **AI Integration:** Google Gemini API
- **Code Preview:** Sandboxed iframe

---

## 📁 Project Structure

```
canvas-app/
├── components/
│   ├── ChatBox.tsx          # AI assistant with history
│   ├── Dashboard.tsx        # 5-tab analytics panel
│   ├── Preview.tsx          # Live iframe preview
│   ├── CodeView.tsx         # Syntax highlighted code
│   └── CanvasNavDrawer.tsx  # Navigation drawer
├── services/
│   └── geminiService.ts     # Gemini AI integration
├── public/                  # Static assets
├── App.tsx                  # Main app component
├── index.tsx                # Entry point
├── types.ts                 # TypeScript types
└── vite.config.ts           # Vite configuration
```

---

## ⚡ Quick Actions

Available in the Workspace panel:

| Action | Description |
|--------|-------------|
| ✨ Improve | Enhance code quality and performance |
| 🎨 Restyle | Apply new visual design |
| 📱 Responsive | Make layout mobile-friendly |
| ⚡ Optimize | Improve performance |
| 🔧 Fix | Debug and fix issues |
| 🌊 Animate | Add smooth animations |
| ⏳ Loading | Add loading states |
| ✅ Validate | Add form validation |

---

## 🎨 Starter Templates

Pre-built templates to get started quickly:

- 📄 **SaaS Landing Page** - Modern hero + features
- 🛒 **E-commerce Product Page** - Product cards + cart
- 📊 **Analytics Dashboard** - Charts + data cards
- 📝 **Blog Layout** - Article list + reading view
- ⚙️ **Admin Panel** - User management + settings
- 💰 **Pricing Table** - Plan comparison cards
- 📧 **Newsletter Signup** - Email capture form
- 🖼️ **Image Gallery** - Lightbox + grid layout

---

## 🔧 Configuration

### API Integration

The app uses `geminiService.ts` for AI calls. To add more providers:

```typescript
// services/geminiService.ts
export const generateCode = async (prompt: string, model: string) => {
  // Switch based on selected provider
  switch (model) {
    case 'gemini':
      return await callGemini(prompt);
    case 'openai':
      return await callOpenAI(prompt);
    // Add more providers...
  }
};
```

### Preview Sandbox

Code runs in a sandboxed iframe for security. The preview component:
- Injects generated HTML/CSS/JS
- Supports external CDN imports
- Handles responsive sizing

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
