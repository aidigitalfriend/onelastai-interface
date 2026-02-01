/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'],
        mono: ['Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      colors: {
        vscode: {
          bg: 'var(--vscode-bg)',
          sidebar: 'var(--vscode-sidebar)',
          panel: 'var(--vscode-panel)',
          border: 'var(--vscode-border)',
          accent: 'var(--vscode-accent)',
          accentHover: 'var(--vscode-accent-hover)',
          text: 'var(--vscode-text)',
          textMuted: 'var(--vscode-text-muted)',
          selection: 'var(--vscode-selection)',
          hover: 'var(--vscode-hover)',
          active: 'var(--vscode-active)',
          input: 'var(--vscode-hover)',
          inputBorder: 'var(--vscode-accent)',
          success: 'var(--vscode-success)',
          warning: 'var(--vscode-warning)',
          error: 'var(--vscode-error)',
          listHover: 'var(--vscode-hover)',
          listActive: 'var(--vscode-selection)',
        },
        slate: {
          850: '#1e293b',
          950: '#0f172a',
        }
      },
      boxShadow: {
        'vscode': '0 0 8px rgba(0, 0, 0, 0.36)',
        'vscode-sm': '0 2px 8px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
