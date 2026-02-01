
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useStore } from './store/useStore';

// Apply theme immediately on load to prevent flash
const applyInitialTheme = () => {
  const root = document.documentElement;
  
  // Try to get persisted theme from localStorage
  let theme = 'charcoal-aurora';
  try {
    const stored = localStorage.getItem('code-editor-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      theme = parsed?.state?.theme || 'charcoal-aurora';
    }
  } catch (e) {
    // Use default theme
  }
  
  // Apply charcoal-aurora hardstyle theme classes immediately
  root.classList.add('dark', 'theme-charcoal-aurora');
  
  // Set CSS variables for charcoal-aurora - Dark Industrial Gaming Theme
  root.style.setProperty('--vscode-bg', '#0d0d0d');
  root.style.setProperty('--vscode-sidebar', '#0a0a0a');
  root.style.setProperty('--vscode-panel', '#0a0a0a');
  root.style.setProperty('--vscode-border', '#1c1c1c');
  root.style.setProperty('--vscode-accent', '#00c8e0');
  root.style.setProperty('--vscode-accent-hover', '#00d4ff');
  root.style.setProperty('--vscode-text', '#a0a0a0');
  root.style.setProperty('--vscode-text-muted', '#505050');
  root.style.setProperty('--vscode-selection', '#1a3040');
  root.style.setProperty('--vscode-hover', '#161616');
  root.style.setProperty('--vscode-active', '#1c1c1c');
};

// Apply theme before React renders
applyInitialTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
