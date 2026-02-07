import { ModelOption } from './types';

// AI Models - Anthropic (primary) + Mistral (primary) + xAI (fallback)
// OpenAI and Gemini removed from Canvas Studio
export const MODELS: ModelOption[] = [
  // Anthropic (Primary)
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    description: 'Best for coding - highly recommended.',
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'Anthropic',
    description: 'Most powerful reasoning model.',
    isThinking: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude Haiku',
    provider: 'Anthropic',
    description: 'Fast and affordable.',
  },
  // Mistral (Primary)
  {
    id: 'mistral-large-2501',
    name: 'Mistral Large',
    provider: 'Mistral',
    description: 'Powerful multilingual reasoning.',
  },
  {
    id: 'codestral-latest',
    name: 'Codestral',
    provider: 'Mistral',
    description: 'Specialized for code generation.',
  },
  // xAI (Fallback)
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xAI',
    description: 'Strong reasoning and coding.',
  },
  {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'xAI',
    description: 'Fast fallback model.',
  },
];

// 8 Preset Templates
export const PRESET_TEMPLATES = [
  { name: 'SaaS Landing Page', icon: '🚀', prompt: 'Build a modern SaaS landing page for a CRM tool with features, pricing, and hero.' },
  { name: 'Analytics Dashboard', icon: '📊', prompt: 'Create a dark-themed analytics dashboard with 3 chart placeholders and a sidebar.' },
  { name: 'E-commerce Store', icon: '🛒', prompt: 'Generate an elegant minimal furniture store with a grid of items and cart icon.' },
  { name: 'Portfolio Website', icon: '🎨', prompt: 'Create a minimal portfolio website for a designer with project gallery and contact form.' },
  { name: 'Blog Platform', icon: '📝', prompt: 'Build a clean blog platform with article cards, categories, and reading time.' },
  { name: 'Mobile App UI', icon: '📱', prompt: 'Design a mobile app UI for a fitness tracker with stats, progress, and workout plans.' },
  { name: 'Admin Panel', icon: '⚙️', prompt: 'Create an admin dashboard with user management, analytics, and settings panels.' },
  { name: 'Restaurant Menu', icon: '🍽️', prompt: 'Build a beautiful restaurant menu with categories, items, prices, and order button.' },
];

// 6 Quick Actions
export const QUICK_ACTIONS = [
  { id: 'dark-mode', label: 'Dark Mode', icon: '🌙', description: 'Add dark mode toggle to the app' },
  { id: 'responsive', label: 'Responsive', icon: '📱', description: 'Make the layout responsive' },
  { id: 'animations', label: 'Animations', icon: '✨', description: 'Add smooth animations' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿', description: 'Improve accessibility' },
  { id: 'loading', label: 'Loading', icon: '⏳', description: 'Add loading states' },
  { id: 'validation', label: 'Validation', icon: '✅', description: 'Add form validation' },
];

// 🎭 Fun Commentary Messages - Rotate during generation for entertainment!
export const GENERATION_COMMENTARY = [
  { text: "🧠 AI neurons are firing up...", emoji: "🧠" },
  { text: "⚡ Charging the creativity capacitors...", emoji: "⚡" },
  { text: "🎨 Mixing the perfect color palette...", emoji: "🎨" },
  { text: "🔮 Consulting the coding crystal ball...", emoji: "🔮" },
  { text: "🚀 Launching code rockets into orbit...", emoji: "🚀" },
  { text: "🎯 Targeting pixel-perfect precision...", emoji: "🎯" },
  { text: "🌟 Sprinkling some UI magic dust...", emoji: "🌟" },
  { text: "🔧 Tightening the digital bolts...", emoji: "🔧" },
  { text: "☕ AI is caffeinating for peak performance...", emoji: "☕" },
  { text: "🎪 The code circus is in town!", emoji: "🎪" },
  { text: "🏗️ Building your dream, brick by brick...", emoji: "🏗️" },
  { text: "🎸 Rocking some sick code riffs...", emoji: "🎸" },
  { text: "🧪 Mixing the secret sauce...", emoji: "🧪" },
  { text: "🦾 Flexing those AI muscles...", emoji: "🦾" },
  { text: "🎲 Rolling for critical success...", emoji: "🎲" },
  { text: "🌈 Weaving rainbows into your UI...", emoji: "🌈" },
  { text: "🔥 Code is heating up nicely...", emoji: "🔥" },
  { text: "🎵 Composing a symphony of components...", emoji: "🎵" },
  { text: "🧩 Solving the puzzle pieces...", emoji: "🧩" },
  { text: "⏳ Good things come to those who wait...", emoji: "⏳" },
  { text: "🎁 Wrapping up something special...", emoji: "🎁" },
  { text: "🏆 Crafting award-winning code...", emoji: "🏆" },
  { text: "🎬 Directing your digital masterpiece...", emoji: "🎬" },
  { text: "🌙 Channeling late-night dev energy...", emoji: "🌙" },
  { text: "💎 Polishing every pixel to perfection...", emoji: "💎" },
  { text: "🤖 Beep boop... processing awesomeness...", emoji: "🤖" },
  { text: "🎢 Riding the code roller coaster!", emoji: "🎢" },
  { text: "🍕 Almost done... just ordering pizza...", emoji: "🍕" },
  { text: "🦄 Summoning unicorn-level quality...", emoji: "🦄" },
  { text: "🎯 Locking onto target... almost there!", emoji: "🎯" },
];

// Project file structure type
export interface ProjectFile {
  name: string;
  type: 'file' | 'folder';
  language?: string;
  content?: string;
  children?: ProjectFile[];
}

// Complete Project Templates with multiple files
export const PROJECT_TEMPLATES = [
  {
    id: 'python-flask-project',
    name: 'Python Flask API',
    icon: '🐍',
    language: 'Python',
    description: 'Complete Flask REST API with database',
    mainFile: 'app.py',
    files: [
      { name: 'app.py', type: 'file' as const, language: 'python', content: `from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db, User, Item

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
CORS(app)
db.init_app(app)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'API is running'})

@app.route('/api/items', methods=['GET'])
def get_items():
    items = Item.query.all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/items', methods=['POST'])
def create_item():
    data = request.json
    item = Item(name=data['name'], price=data['price'])
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)` },
      { name: 'models.py', type: 'file' as const, language: 'python', content: `from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(80), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {'id': self.id, 'email': self.email, 'name': self.name}

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'price': self.price}` },
      { name: 'requirements.txt', type: 'file' as const, language: 'text', content: `flask==2.3.0
flask-cors==4.0.0
flask-sqlalchemy==3.1.0
python-dotenv==1.0.0` },
      { name: 'templates', type: 'folder' as const, children: [
        { name: 'index.html', type: 'file' as const, language: 'html', content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Flask API</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white p-8">
    <h1 class="text-3xl font-bold text-cyan-400">Flask API Dashboard</h1>
    <div id="items" class="mt-8 grid grid-cols-3 gap-4"></div>
    <script>
        fetch('/api/items')
            .then(r => r.json())
            .then(items => {
                document.getElementById('items').innerHTML = items.map(i => 
                    \`<div class="bg-gray-800 p-4 rounded">\${i.name} - $\${i.price}</div>\`
                ).join('');
            });
    </script>
</body>
</html>` }
      ]},
      { name: 'static', type: 'folder' as const, children: [
        { name: 'styles.css', type: 'file' as const, language: 'css', content: `body { font-family: system-ui, sans-serif; }
.container { max-width: 1200px; margin: 0 auto; }` }
      ]}
    ]
  },
  {
    id: 'react-typescript-project',
    name: 'React TypeScript App',
    icon: '⚛️',
    language: 'TypeScript',
    description: 'Full React app with components',
    mainFile: 'src/App.tsx',
    files: [
      { name: 'package.json', type: 'file' as const, language: 'json', content: `{
  "name": "react-typescript-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}` },
      { name: 'index.html', type: 'file' as const, language: 'html', content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>` },
      { name: 'src', type: 'folder' as const, children: [
        { name: 'main.tsx', type: 'file' as const, language: 'typescript', content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);` },
        { name: 'App.tsx', type: 'file' as const, language: 'typescript', content: `import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ItemList from './components/ItemList';
import { Item } from './types';

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setItems([
        { id: 1, name: 'Product 1', price: 29.99, description: 'Amazing product' },
        { id: 2, name: 'Product 2', price: 49.99, description: 'Great value' },
        { id: 3, name: 'Product 3', price: 19.99, description: 'Best seller' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header title="My React App" />
      <main className="container mx-auto p-8">
        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : (
          <ItemList items={items} />
        )}
      </main>
    </div>
  );
}

export default App;` },
        { name: 'index.css', type: 'file' as const, language: 'css', content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, sans-serif;
}` },
        { name: 'types.ts', type: 'file' as const, language: 'typescript', content: `export interface Item {
  id: number;
  name: string;
  price: number;
  description: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
}` }
      ]},
      { name: 'src/components', type: 'folder' as const, children: [
        { name: 'Header.tsx', type: 'file' as const, language: 'typescript', content: `import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cyan-400">{title}</h1>
        <nav className="space-x-4">
          <a href="#" className="hover:text-cyan-400 transition">Home</a>
          <a href="#" className="hover:text-cyan-400 transition">About</a>
          <a href="#" className="hover:text-cyan-400 transition">Contact</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;` },
        { name: 'ItemList.tsx', type: 'file' as const, language: 'typescript', content: `import React from 'react';
import { Item } from '../types';

interface ItemListProps {
  items: Item[];
}

const ItemList: React.FC<ItemListProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map(item => (
        <div key={item.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition">
          <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
          <p className="text-gray-400 mb-4">{item.description}</p>
          <p className="text-2xl font-bold text-cyan-400">\${item.price}</p>
          <button className="mt-4 w-full bg-cyan-600 hover:bg-cyan-500 py-2 rounded font-bold transition">
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
};

export default ItemList;` }
      ]}
    ]
  },
  {
    id: 'nodejs-express-project',
    name: 'Node.js Express API',
    icon: '🟢',
    language: 'JavaScript',
    description: 'Express server with routes & middleware',
    mainFile: 'server.js',
    files: [
      { name: 'server.js', type: 'file' as const, language: 'javascript', content: `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import itemRoutes from './routes/items.js';
import userRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});` },
      { name: 'package.json', type: 'file' as const, language: 'json', content: `{
  "name": "nodejs-express-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}` },
      { name: '.env', type: 'file' as const, language: 'text', content: `PORT=3000
NODE_ENV=development` },
      { name: 'routes', type: 'folder' as const, children: [
        { name: 'items.js', type: 'file' as const, language: 'javascript', content: `import express from 'express';
const router = express.Router();

let items = [
  { id: 1, name: 'Item 1', price: 29.99 },
  { id: 2, name: 'Item 2', price: 49.99 },
];

router.get('/', (req, res) => {
  res.json(items);
});

router.get('/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', (req, res) => {
  const item = { id: Date.now(), ...req.body };
  items.push(item);
  res.status(201).json(item);
});

export default router;` },
        { name: 'users.js', type: 'file' as const, language: 'javascript', content: `import express from 'express';
const router = express.Router();

let users = [
  { id: 1, name: 'John', email: 'john@example.com' },
];

router.get('/', (req, res) => res.json(users));

router.post('/', (req, res) => {
  const user = { id: Date.now(), ...req.body };
  users.push(user);
  res.status(201).json(user);
});

export default router;` }
      ]},
      { name: 'middleware', type: 'folder' as const, children: [
        { name: 'auth.js', type: 'file' as const, language: 'javascript', content: `export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  // Verify token here
  next();
};` }
      ]}
    ]
  },
  {
    id: 'html-landing-page',
    name: 'HTML Landing Page',
    icon: '🌐',
    language: 'HTML',
    description: 'Complete landing page with CSS & JS',
    mainFile: 'index.html',
    files: [
      { name: 'index.html', type: 'file' as const, language: 'html', content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Landing Page</title>
    <link rel="stylesheet" href="css/styles.css">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white">
    <nav class="fixed w-full bg-gray-900/90 backdrop-blur border-b border-gray-800 z-50">
        <div class="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-cyan-400">Brand</h1>
            <div class="space-x-6">
                <a href="#features" class="hover:text-cyan-400">Features</a>
                <a href="#pricing" class="hover:text-cyan-400">Pricing</a>
                <a href="#contact" class="hover:text-cyan-400">Contact</a>
                <button class="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg">Get Started</button>
            </div>
        </div>
    </nav>
    
    <section class="min-h-screen flex items-center justify-center pt-20">
        <div class="text-center max-w-4xl px-4">
            <h2 class="text-6xl font-bold mb-6">Build Something <span class="text-cyan-400">Amazing</span></h2>
            <p class="text-xl text-gray-400 mb-8">Create beautiful, responsive websites with ease using our powerful platform.</p>
            <button class="bg-cyan-500 hover:bg-cyan-600 px-8 py-4 rounded-lg text-lg font-bold">Start Free Trial</button>
        </div>
    </section>
    
    <script src="js/main.js"></script>
</body>
</html>` },
      { name: 'css', type: 'folder' as const, children: [
        { name: 'styles.css', type: 'file' as const, language: 'css', content: `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
}

.container { max-width: 1200px; margin: 0 auto; }

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in { animation: fadeIn 0.6s ease-out forwards; }

/* Custom scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #1f2937; }
::-webkit-scrollbar-thumb { background: #22d3ee; border-radius: 4px; }` }
      ]},
      { name: 'js', type: 'folder' as const, children: [
        { name: 'main.js', type: 'file' as const, language: 'javascript', content: `// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Intersection Observer for animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('section').forEach(el => observer.observe(el));

console.log('Landing page loaded!');` }
      ]},
      { name: 'images', type: 'folder' as const, children: [] }
    ]
  },
  {
    id: 'nextjs-project',
    name: 'Next.js Full Stack',
    icon: '▲',
    language: 'TypeScript',
    description: 'Next.js app with API routes',
    mainFile: 'app/page.tsx',
    files: [
      { name: 'package.json', type: 'file' as const, language: 'json', content: `{
  "name": "nextjs-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0"
  }
}` },
      { name: 'app', type: 'folder' as const, children: [
        { name: 'layout.tsx', type: 'file' as const, language: 'typescript', content: `import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">{children}</body>
    </html>
  );
}` },
        { name: 'page.tsx', type: 'file' as const, language: 'typescript', content: `export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold text-cyan-400 mb-8">Next.js App</h1>
      <p className="text-gray-400">Welcome to your Next.js application!</p>
    </main>
  );
}` },
        { name: 'globals.css', type: 'file' as const, language: 'css', content: `@tailwind base;
@tailwind components;
@tailwind utilities;` }
      ]},
      { name: 'app/api', type: 'folder' as const, children: [
        { name: 'items/route.ts', type: 'file' as const, language: 'typescript', content: `import { NextResponse } from 'next/server';

const items = [
  { id: 1, name: 'Item 1', price: 29.99 },
  { id: 2, name: 'Item 2', price: 49.99 },
];

export async function GET() {
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const data = await request.json();
  const item = { id: Date.now(), ...data };
  items.push(item);
  return NextResponse.json(item, { status: 201 });
}` }
      ]},
      { name: 'components', type: 'folder' as const, children: [
        { name: 'Button.tsx', type: 'file' as const, language: 'typescript', content: `interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export default function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  const base = 'px-4 py-2 rounded-lg font-bold transition';
  const variants = {
    primary: 'bg-cyan-500 hover:bg-cyan-600 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200'
  };
  
  return (
    <button onClick={onClick} className={\`\${base} \${variants[variant]}\`}>
      {children}
    </button>
  );
}` }
      ]}
    ]
  },
  {
    id: 'mern-fullstack-project',
    name: 'MERN Full Stack',
    icon: '🚀',
    language: 'TypeScript',
    description: 'MongoDB + Express + React + Node.js full-stack application',
    mainFile: 'client/src/App.tsx',
    files: [
      { name: 'package.json', type: 'file' as const, language: 'json', content: `{
  "name": "mern-fullstack",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \\"npm run server\\" \\"npm run client\\"",
    "server": "cd server && npm run dev",
    "client": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "install-all": "npm install && cd server && npm install && cd ../client && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}` },
      { name: 'server', type: 'folder' as const, children: [
        { name: 'package.json', type: 'file' as const, language: 'json', content: `{
  "name": "mern-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "mongoose": "^8.0.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}` },
        { name: 'index.js', type: 'file' as const, language: 'javascript', content: `import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import itemRoutes from './routes/items.js';
import userRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mernapp';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => console.log(\`🚀 Server running on port \${PORT}\`));
  })
  .catch(err => console.error('MongoDB connection error:', err));` },
        { name: '.env', type: 'file' as const, language: 'text', content: `PORT=5000
MONGODB_URI=mongodb://localhost:27017/mernapp
NODE_ENV=development` },
        { name: 'models', type: 'folder' as const, children: [
          { name: 'Item.js', type: 'file' as const, language: 'javascript', content: `import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: String,
  inStock: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Item', itemSchema);` },
          { name: 'User.js', type: 'file' as const, language: 'javascript', content: `import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);` }
        ]},
        { name: 'routes', type: 'folder' as const, children: [
          { name: 'items.js', type: 'file' as const, language: 'javascript', content: `import express from 'express';
import Item from '../models/Item.js';

const router = express.Router();

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create item
router.post('/', async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update item
router.put('/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;` },
          { name: 'users.js', type: 'file' as const, language: 'javascript', content: `import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;` }
        ]}
      ]},
      { name: 'client', type: 'folder' as const, children: [
        { name: 'package.json', type: 'file' as const, language: 'json', content: `{
  "name": "mern-client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}` },
        { name: 'vite.config.ts', type: 'file' as const, language: 'typescript', content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});` },
        { name: 'index.html', type: 'file' as const, language: 'html', content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MERN App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>` }
      ]},
      { name: 'client/src', type: 'folder' as const, children: [
        { name: 'main.tsx', type: 'file' as const, language: 'typescript', content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);` },
        { name: 'App.tsx', type: 'file' as const, language: 'typescript', content: `import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Item {
  _id: string;
  name: string;
  description?: string;
  price: number;
  inStock: boolean;
}

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ name: '', price: 0 });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data } = await axios.get('/api/items');
      setItems(data);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/api/items', newItem);
      setItems([data, ...items]);
      setNewItem({ name: '', price: 0 });
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await axios.delete(\`/api/items/\${id}\`);
      setItems(items.filter(item => item._id !== id));
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-cyan-400 mb-8">🚀 MERN Full Stack</h1>
        
        {/* Add Item Form */}
        <form onSubmit={addItem} className="mb-8 p-6 bg-gray-800 rounded-xl">
          <h2 className="text-xl font-bold mb-4">Add New Item</h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Item name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="flex-1 px-4 py-2 bg-gray-700 rounded-lg"
              required
            />
            <input
              type="number"
              placeholder="Price"
              value={newItem.price || ''}
              onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
              className="w-32 px-4 py-2 bg-gray-700 rounded-lg"
              required
            />
            <button type="submit" className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-bold">
              Add
            </button>
          </div>
        </form>

        {/* Items List */}
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-gray-400">No items yet. Add one above!</p>
        ) : (
          <div className="grid gap-4">
            {items.map(item => (
              <div key={item._id} className="p-4 bg-gray-800 rounded-xl flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{item.name}</h3>
                  <p className="text-cyan-400 font-bold">\${item.price.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => deleteItem(item._id)}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;` },
        { name: 'index.css', type: 'file' as const, language: 'css', content: `@tailwind base;
@tailwind components;
@tailwind utilities;` }
      ]}
    ]
  },
  {
    id: 'flask-react-fullstack',
    name: 'Flask + React Full Stack',
    icon: '🐍⚛️',
    language: 'Python + TypeScript',
    description: 'Python Flask backend with React frontend',
    mainFile: 'backend/app.py',
    files: [
      { name: 'README.md', type: 'file' as const, language: 'markdown', content: `# Flask + React Full Stack Application

## Project Structure
\`\`\`
├── backend/          # Flask API server
│   ├── app.py        # Main Flask app
│   ├── models.py     # SQLAlchemy models
│   └── routes/       # API routes
├── frontend/         # React TypeScript app
│   ├── src/          # React source
│   └── package.json
\`\`\`

## Getting Started

### Backend
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\\Scripts\\activate on Windows
pip install -r requirements.txt
python app.py
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

API runs on http://localhost:5000
Frontend runs on http://localhost:3000
` },
      { name: 'backend', type: 'folder' as const, children: [
        { name: 'app.py', type: 'file' as const, language: 'python', content: `from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)

db = SQLAlchemy(app)

# Models
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100))
    in_stock = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'category': self.category,
            'inStock': self.in_stock,
            'createdAt': self.created_at.isoformat()
        }

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(80), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'createdAt': self.created_at.isoformat()
        }

# Routes
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/items', methods=['GET'])
def get_items():
    items = Item.query.order_by(Item.created_at.desc()).all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/items/<int:id>', methods=['GET'])
def get_item(id):
    item = Item.query.get_or_404(id)
    return jsonify(item.to_dict())

@app.route('/api/items', methods=['POST'])
def create_item():
    data = request.json
    item = Item(
        name=data['name'],
        description=data.get('description'),
        price=data['price'],
        category=data.get('category')
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/items/<int:id>', methods=['PUT'])
def update_item(id):
    item = Item.query.get_or_404(id)
    data = request.json
    item.name = data.get('name', item.name)
    item.description = data.get('description', item.description)
    item.price = data.get('price', item.price)
    item.category = data.get('category', item.category)
    item.in_stock = data.get('inStock', item.in_stock)
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/items/<int:id>', methods=['DELETE'])
def delete_item(id):
    item = Item.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted successfully'})

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    user = User(email=data['email'], name=data['name'])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)` },
        { name: 'requirements.txt', type: 'file' as const, language: 'text', content: `flask==2.3.3
flask-cors==4.0.0
flask-sqlalchemy==3.1.1
python-dotenv==1.0.0
gunicorn==21.2.0` },
        { name: '.env', type: 'file' as const, language: 'text', content: `FLASK_ENV=development
DATABASE_URL=sqlite:///app.db
SECRET_KEY=your-secret-key-here` }
      ]},
      { name: 'frontend', type: 'folder' as const, children: [
        { name: 'package.json', type: 'file' as const, language: 'json', content: `{
  "name": "flask-react-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}` },
        { name: 'vite.config.ts', type: 'file' as const, language: 'typescript', content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});` },
        { name: 'index.html', type: 'file' as const, language: 'html', content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flask + React App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>` }
      ]},
      { name: 'frontend/src', type: 'folder' as const, children: [
        { name: 'main.tsx', type: 'file' as const, language: 'typescript', content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);` },
        { name: 'App.tsx', type: 'file' as const, language: 'typescript', content: `import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Item {
  id: number;
  name: string;
  description?: string;
  price: number;
  category?: string;
  inStock: boolean;
  createdAt: string;
}

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', price: 0, description: '', category: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data } = await axios.get('/api/items');
      setItems(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { data } = await axios.put(\`/api/items/\${editingId}\`, formData);
        setItems(items.map(item => item.id === editingId ? data : item));
        setEditingId(null);
      } else {
        const { data } = await axios.post('/api/items', formData);
        setItems([data, ...items]);
      }
      setFormData({ name: '', price: 0, description: '', category: '' });
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      await axios.delete(\`/api/items/\${id}\`);
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      price: item.price,
      description: item.description || '',
      category: item.category || ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-8">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-4">
            🐍⚛️ Flask + React
          </h1>
          <p className="text-gray-400">Full Stack Application with Python Backend</p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mb-12 p-8 bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700">
          <h2 className="text-2xl font-bold mb-6">{editingId ? '✏️ Edit Item' : '➕ Add New Item'}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="px-4 py-3 bg-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
              required
            />
            <input
              type="number"
              placeholder="Price"
              value={formData.price || ''}
              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="px-4 py-3 bg-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
              required
            />
            <input
              type="text"
              placeholder="Category (optional)"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="px-4 py-3 bg-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="px-4 py-3 bg-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
          <div className="flex gap-4">
            <button type="submit" className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-xl font-bold hover:opacity-90 transition">
              {editingId ? 'Update' : 'Add Item'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', price: 0, description: '', category: '' }); }} className="px-8 py-3 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 transition">
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl">No items yet. Add your first item above!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.id} className="p-6 bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-700 hover:border-cyan-500/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{item.name}</h3>
                  <span className="text-2xl font-bold text-cyan-400">\${item.price.toFixed(2)}</span>
                </div>
                {item.description && <p className="text-gray-400 mb-3">{item.description}</p>}
                {item.category && <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm mb-4">{item.category}</span>}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                  <button onClick={() => handleEdit(item)} className="flex-1 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;` }
      ]}
    ]
  }
];

// Device preview sizes
export const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '812px', label: 'Mobile' },
};
