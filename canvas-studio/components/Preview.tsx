import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
} from '@codesandbox/sandpack-react';
import LZString from 'lz-string';

interface ProjectFile {
  name: string;
  type: 'file' | 'folder';
  language?: string;
  content?: string;
  children?: ProjectFile[];
}

interface PreviewProps {
  code: string;
  language?: string;
  onCodeChange?: (newCode: string) => void;
  projectFiles?: ProjectFile[]; // Multi-file project support
  onFilesGenerated?: (files: Record<string, string>) => void; // Sync generated files back to parent
}

// Detect what type of project this is based on code content
const detectProjectType = (code: string, language: string): 'html' | 'react' | 'vanilla-js' | 'static' => {
  const lowerLang = language.toLowerCase();
  const lowerCode = code.toLowerCase();
  
  // Check for React patterns
  if (code.includes('import React') || 
      code.includes('from "react"') || 
      code.includes("from 'react'") ||
      code.includes('useState') ||
      code.includes('useEffect') ||
      code.includes('export default function') ||
      code.includes('export default class') ||
      (code.includes('<') && code.includes('/>') && (lowerLang === 'tsx' || lowerLang === 'jsx' || lowerLang === 'typescript' || lowerLang === 'javascript'))) {
    return 'react';
  }
  
  // Check for HTML
  if (lowerLang === 'html' || lowerLang === 'htm' ||
      lowerCode.trim().startsWith('<!doctype html') || 
      lowerCode.trim().startsWith('<html')) {
    return 'html';
  }
  
  // Vanilla JS
  if (lowerLang === 'javascript' || lowerLang === 'js') {
    return 'vanilla-js';
  }
  
  return 'static';
};

// Parse React code to extract component and dependencies
const parseReactCode = (code: string): { files: Record<string, string>, dependencies: Record<string, string> } => {
  const dependencies: Record<string, string> = {
    'react': '^18.2.0',
    'react-dom': '^18.2.0',
  };
  
  // Detect common dependencies from imports
  const importMatches = code.matchAll(/import\s+.*\s+from\s+['"]([^'"./][^'"]*)['"]/g);
  for (const match of importMatches) {
    const pkg = match[1].split('/')[0];
    if (pkg && pkg !== 'react' && pkg !== 'react-dom') {
      // Add common versions
      const commonVersions: Record<string, string> = {
        'framer-motion': '^10.16.0',
        'lucide-react': '^0.294.0',
        '@heroicons/react': '^2.0.18',
        'axios': '^1.6.0',
        'zustand': '^4.4.0',
        '@tanstack/react-query': '^5.0.0',
        'react-router-dom': '^6.20.0',
        'clsx': '^2.0.0',
        'tailwind-merge': '^2.0.0',
        'date-fns': '^2.30.0',
        'recharts': '^2.10.0',
        '@radix-ui/react-dialog': '^1.0.5',
        '@radix-ui/react-dropdown-menu': '^2.0.6',
        '@radix-ui/react-slot': '^1.0.2',
      };
      dependencies[pkg] = commonVersions[pkg] || 'latest';
    }
  }
  
  // Check if code has a default export, if not wrap it
  let mainCode = code;
  if (!code.includes('export default')) {
    // Try to find the main component name
    const componentMatch = code.match(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)/);
    if (componentMatch) {
      mainCode = code + `\n\nexport default ${componentMatch[1]};`;
    }
  }
  
  const files: Record<string, string> = {
    '/App.tsx': mainCode,
    '/index.tsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    '/styles.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0a0a;
  color: #ffffff;
  min-height: 100vh;
}`,
    '/public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
  };
  
  return { files, dependencies };
};

// Sandpack editor component for code changes
const SandpackEditor: React.FC<{ onCodeChange?: (code: string) => void }> = ({ onCodeChange }) => {
  const { sandpack } = useSandpack();
  
  useEffect(() => {
    if (onCodeChange && sandpack.files['/App.tsx']) {
      onCodeChange(sandpack.files['/App.tsx'].code);
    }
  }, [sandpack.files, onCodeChange]);
  
  return null;
};

// Helper to flatten project files into Sandpack file format
const buildSandpackFiles = (projectFiles: ProjectFile[], basePath: string = ''): Record<string, string> => {
  const files: Record<string, string> = {};
  
  const processFiles = (items: ProjectFile[], currentPath: string) => {
    for (const item of items) {
      if (item.type === 'folder' && item.children) {
        processFiles(item.children, `${currentPath}/${item.name}`);
      } else if (item.type === 'file' && item.content) {
        // Convert path to Sandpack format (add leading slash, use src/ for components)
        let filePath = `${currentPath}/${item.name}`;
        if (!filePath.startsWith('/')) filePath = '/' + filePath;
        // For React files in components/ folder, put them in /src/components/
        if (filePath.includes('/components/')) {
          filePath = filePath.replace('/components/', '/components/');
        }
        files[filePath] = item.content;
      }
    }
  };
  
  processFiles(projectFiles, basePath);
  return files;
};

const Preview: React.FC<PreviewProps> = ({ code, language = 'html', onCodeChange, projectFiles, onFilesGenerated }) => {
  const [showEditor, setShowEditor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const lastFilesRef = useRef<string>(''); // Track last files to prevent infinite loop
  
  const projectType = useMemo(() => detectProjectType(code, language), [code, language]);
  
  // Debounce code changes to prevent excessive re-renders
  useEffect(() => {
    // Only debounce if code actually changed
    if (code === debouncedCode) return;
    
    setIsLoading(true);
    const timer = setTimeout(() => {
      setDebouncedCode(code);
      setIsLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [code, debouncedCode]);

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-black/40 border-2 border-dashed border-gray-800 rounded-lg m-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mb-4 opacity-20 text-cyan-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9.75 17L9 21h6l-.75-4M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm font-bold text-cyan-500/80 uppercase tracking-widest">Preview_Awaiting_Input</p>
        <p className="text-xs text-gray-600 mt-2">Describe your application and initiate generation</p>
      </div>
    );
  }

  // React/TSX/JSX - Use Sandpack
  if (projectType === 'react') {
    // Show loading state while debouncing
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-black/60">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent mb-4"></div>
          <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Preparing React Preview...</p>
          <p className="text-[10px] text-gray-600 mt-2">Bundling dependencies</p>
        </div>
      );
    }
    
    // Check if we have multi-file project
    let files: Record<string, string>;
    let dependencies: Record<string, string>;
    
    if (projectFiles && projectFiles.length > 0) {
      // Multi-file project: build files from projectFiles
      const builtFiles = buildSandpackFiles(projectFiles);
      dependencies = {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
      };
      
      // Detect dependencies from all files
      Object.values(builtFiles).forEach(fileContent => {
        const importMatches = fileContent.matchAll(/import\s+.*\s+from\s+['"]([^'"./][^'"]*)['"]/g);
        for (const match of importMatches) {
          const pkg = match[1].split('/')[0];
          if (pkg && pkg !== 'react' && pkg !== 'react-dom') {
            const commonVersions: Record<string, string> = {
              'framer-motion': '^10.16.0',
              'lucide-react': '^0.294.0',
              '@heroicons/react': '^2.0.18',
              'axios': '^1.6.0',
              'zustand': '^4.4.0',
              '@tanstack/react-query': '^5.0.0',
              'react-router-dom': '^6.20.0',
              'clsx': '^2.0.0',
              'tailwind-merge': '^2.0.0',
            };
            dependencies[pkg] = commonVersions[pkg] || 'latest';
          }
        }
      });
      
      // Build final files with proper structure
      files = {
        ...builtFiles,
        '/index.tsx': builtFiles['/index.tsx'] || builtFiles['/main.tsx'] || `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        '/public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
      };
      
      // If no index.css exists, add default styles
      if (!files['/index.css'] && !files['/styles.css']) {
        files['/index.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0a0a;
  color: #ffffff;
  min-height: 100vh;
}`;
      }
    } else {
      // Single file project: use existing parseReactCode
      const parsed = parseReactCode(debouncedCode);
      files = parsed.files;
      dependencies = parsed.dependencies;
    }
    
    // Notify parent of generated files (only if changed to prevent infinite loop)
    const filesKey = JSON.stringify(Object.keys(files).sort());
    if (onFilesGenerated && filesKey !== lastFilesRef.current) {
      lastFilesRef.current = filesKey;
      // Use setTimeout to avoid calling during render
      setTimeout(() => onFilesGenerated(files), 0);
    }
    
    // Open in CodeSandbox using POST request
    const openInCodeSandbox = () => {
      const sandboxFiles: Record<string, { content: string }> = {};
      Object.entries(files).forEach(([path, content]) => {
        sandboxFiles[path.replace(/^\//, '')] = { content };
      });
      
      // Add package.json if not present
      if (!sandboxFiles['package.json']) {
        sandboxFiles['package.json'] = {
          content: JSON.stringify({
            name: 'canvas-studio-export',
            version: '1.0.0',
            main: 'index.tsx',
            dependencies: dependencies,
          }, null, 2)
        };
      }
      
      const parameters = LZString.compressToBase64(JSON.stringify({ files: sandboxFiles }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Use POST request via form to avoid URL length limits
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://codesandbox.io/api/v1/sandboxes/define';
      form.target = '_blank';
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'parameters';
      input.value = parameters;
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    };
    
    return (
      <div className="w-full bg-[#0a0a0a] flex flex-col" style={{ height: '100%', minHeight: 0, maxHeight: '100%' }}>
        {/* Sandpack CSS Override */}
        <style>{`
          .sp-wrapper { height: 100% !important; }
          .sp-layout { height: 100% !important; }
          .sp-stack { height: 100% !important; }
          .sp-preview { height: 100% !important; }
          .sp-preview-container { height: 100% !important; }
          .sp-preview-iframe { height: 100% !important; }
          .sp-code-editor { height: 100% !important; }
        `}</style>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
            </div>
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-mono ml-2">
              ⚛️ React Live Preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`px-3 py-1 text-[10px] rounded transition-all uppercase tracking-wider font-medium ${
                showEditor 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-gray-800 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400'
              }`}
            >
              {showEditor ? '✓ Editor' : '⌨ Editor'}
            </button>
            <button
              onClick={openInCodeSandbox}
              className="px-3 py-1 text-[10px] rounded bg-gray-800 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 transition-all uppercase tracking-wider font-medium"
              title="Open in CodeSandbox"
            >
              📦 Sandbox
            </button>
          </div>
        </div>
        
        {/* Sandpack */}
        <div className="flex-1" style={{ minHeight: 0, height: 'calc(100% - 44px)' }}>
          <SandpackProvider
            template="react-ts"
            files={files}
            customSetup={{
              dependencies,
            }}
            theme="dark"
            options={{
              externalResources: ['https://cdn.tailwindcss.com'],
              recompileMode: 'delayed', // Prevent rapid recompilation
              recompileDelay: 500, // 500ms delay before recompiling
              autorun: true,
              autoReload: false, // Don't auto-reload on every change
            }}
          >
            <div style={{ height: '100%', display: 'flex', flexDirection: showEditor ? 'row' : 'column' }}>
              {showEditor && (
                <div style={{ width: '50%', height: '100%', borderRight: '1px solid #333' }}>
                  <SandpackCodeEditor 
                    showTabs 
                    showLineNumbers 
                    showInlineErrors
                    style={{ height: '100%' }}
                  />
                </div>
              )}
              <div style={{ width: showEditor ? '50%' : '100%', height: '100%' }}>
                <SandpackPreview 
                  showNavigator={false}
                  showRefreshButton
                  showOpenInCodeSandbox
                  style={{ height: '100%' }}
                />
              </div>
            </div>
            {onCodeChange && <SandpackEditor onCodeChange={onCodeChange} />}
          </SandpackProvider>
        </div>
      </div>
    );
  }

  // Vanilla JS - Use Sandpack with vanilla template
  if (projectType === 'vanilla-js') {
    const files = {
      '/index.js': code,
      '/index.html': `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #0a0a0a; color: white; font-family: system-ui, sans-serif; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="index.js"></script>
</body>
</html>`,
    };
    
    // Open in CodeSandbox using POST request
    const openInCodeSandbox = () => {
      const sandboxFiles = {
        'index.js': { content: code },
        'index.html': { content: files['/index.html'] },
      };
      const parameters = LZString.compressToBase64(JSON.stringify({ files: sandboxFiles }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Use POST request via form to avoid URL length limits
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://codesandbox.io/api/v1/sandboxes/define';
      form.target = '_blank';
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'parameters';
      input.value = parameters;
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    };
    
    return (
      <div className="w-full h-full bg-[#0a0a0a] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
            </div>
            <span className="text-[10px] text-yellow-400 uppercase tracking-wider font-mono ml-2">
              📜 JavaScript Preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`px-3 py-1 text-[10px] rounded transition-all uppercase tracking-wider font-medium ${
                showEditor 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-gray-800 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400'
              }`}
            >
              {showEditor ? '✓ Editor' : '⌨ Editor'}
            </button>
            <button
              onClick={openInCodeSandbox}
              className="px-3 py-1 text-[10px] rounded bg-gray-800 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 transition-all uppercase tracking-wider font-medium"
              title="Open in CodeSandbox"
            >
              📦 Sandbox
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden" style={{ display: 'flex', flexDirection: showEditor ? 'row' : 'column' }}>
          <SandpackProvider
            template="vanilla"
            files={files}
            theme="dark"
            options={{
              recompileMode: 'delayed',
              recompileDelay: 500,
              autorun: true,
              autoReload: false,
            }}
          >
            {showEditor && (
              <div style={{ width: '50%', height: '100%', borderRight: '1px solid #333' }}>
                <SandpackCodeEditor 
                  showTabs 
                  showLineNumbers 
                  style={{ height: '100%' }}
                />
              </div>
            )}
            <div style={{ width: showEditor ? '50%' : '100%', height: '100%' }}>
              <SandpackPreview 
                showNavigator={false}
                showRefreshButton
                style={{ height: '100%' }}
              />
            </div>
          </SandpackProvider>
        </div>
      </div>
    );
  }

  // HTML - Use Sandpack static template for secure sandboxed preview
  if (projectType === 'html') {
    // Show loading state while debouncing
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-black/60">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent mb-4"></div>
          <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Preparing Preview...</p>
        </div>
      );
    }

    const files: Record<string, string> = {
      '/index.html': debouncedCode,
    };

    // Open in CodeSandbox using POST request
    const openInCodeSandbox = () => {
      const sandboxFiles = {
        'index.html': { content: debouncedCode },
      };
      const parameters = LZString.compressToBase64(JSON.stringify({ files: sandboxFiles }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://codesandbox.io/api/v1/sandboxes/define';
      form.target = '_blank';
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'parameters';
      input.value = parameters;
      form.appendChild(input);
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    };
    
    return (
      <div className="w-full bg-[#0a0a0a] flex flex-col" style={{ height: '100%', minHeight: 0, maxHeight: '100%' }}>
        {/* Sandpack CSS Override */}
        <style>{`
          .sp-wrapper { height: 100% !important; }
          .sp-layout { height: 100% !important; }
          .sp-stack { height: 100% !important; }
          .sp-preview { height: 100% !important; }
          .sp-preview-container { height: 100% !important; }
          .sp-preview-iframe { height: 100% !important; }
          .sp-code-editor { height: 100% !important; }
        `}</style>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
            </div>
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-mono ml-2">
              🌐 HTML Live Preview (Sandboxed)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`px-3 py-1 text-[10px] rounded transition-all uppercase tracking-wider font-medium ${
                showEditor 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-gray-800 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400'
              }`}
            >
              {showEditor ? '✓ Editor' : '⌨ Editor'}
            </button>
            <button
              onClick={openInCodeSandbox}
              className="px-3 py-1 text-[10px] rounded bg-gray-800 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-all uppercase tracking-wider font-medium"
              title="Open in CodeSandbox"
            >
              📦 CodeSandbox
            </button>
          </div>
        </div>
        
        {/* Sandpack for HTML */}
        <div className="flex-1" style={{ minHeight: 0, height: 'calc(100% - 44px)' }}>
          <SandpackProvider
            template="static"
            files={files}
            theme="dark"
            options={{
              recompileMode: 'delayed',
              recompileDelay: 500,
              autorun: true,
              autoReload: false,
            }}
          >
            <div style={{ height: '100%', display: 'flex', flexDirection: showEditor ? 'row' : 'column' }}>
              {showEditor && (
                <div style={{ width: '50%', height: '100%', borderRight: '1px solid #333' }}>
                  <SandpackCodeEditor 
                    showTabs 
                    showLineNumbers 
                    showInlineErrors
                    style={{ height: '100%' }}
                  />
                </div>
              )}
              <div style={{ width: showEditor ? '50%' : '100%', height: '100%' }}>
                <SandpackPreview 
                  showNavigator={false}
                  showRefreshButton
                  showOpenInCodeSandbox
                  style={{ height: '100%' }}
                />
              </div>
            </div>
          </SandpackProvider>
        </div>
      </div>
    );
  }

  // Static/other - Show code preview message
  const languageIcons: Record<string, string> = {
    python: '🐍',
    java: '☕',
    rust: '🦀',
    go: '🐹',
    cpp: '⚡',
    c: '🔧',
    ruby: '💎',
    php: '🐘',
    swift: '🍎',
    kotlin: '🎯',
    sql: '🗄️',
    default: '💻'
  };
  
  const langLower = language.toLowerCase();
  const icon = languageIcons[langLower] || languageIcons['default'];
  
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-900 to-black">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-6">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wider">
          {language} Code Generated
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          {langLower === 'python' ? (
            <span className="text-emerald-400">Python code requires a backend server to execute.</span>
          ) : langLower === 'sql' ? (
            <span className="text-blue-400">SQL queries need a database connection to run.</span>
          ) : (
            <span className="text-purple-400">This language requires compilation or a runtime environment.</span>
          )}
        </p>
        
        {/* Show code snippet */}
        <div className="p-4 bg-black/60 rounded-lg border border-gray-800 text-left max-h-60 overflow-auto">
          <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap">
            {code.split('\n').slice(0, 20).join('\n')}
            {code.split('\n').length > 20 && '\n\n... (more code)'}
          </pre>
        </div>
        
        <p className="text-gray-600 text-xs mt-4">
          Switch to <span className="text-cyan-400">Code View</span> for syntax-highlighted editing
        </p>
      </div>
    </div>
  );
};

export default Preview;
