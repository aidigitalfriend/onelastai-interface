import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { webContainerService } from '../services/webcontainer';

type DeviceView = 'desktop' | 'tablet' | 'mobile';

export const LivePreview: React.FC = () => {
  const { files, theme } = useStore();
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBuildTime, setLastBuildTime] = useState<number>(0);
  const [webContainerUrl, setWebContainerUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for WebContainer server-ready events
  useEffect(() => {
    if (webContainerService.getInstance()) {
      webContainerService.onServerReady((port, url) => {
        console.log('[Preview] Server ready at:', url);
        setWebContainerUrl(url);
      });
    }
  }, []);

  // Get device dimensions
  const getDeviceStyle = () => {
    switch (deviceView) {
      case 'mobile':
        return { width: '375px', height: '100%' };
      case 'tablet':
        return { width: '768px', height: '100%' };
      default:
        return { width: '100%', height: '100%' };
    }
  };

  // Find all project files recursively
  const getAllFiles = useCallback((nodes: typeof files): { path: string; content: string; type: string }[] => {
    const result: { path: string; content: string; type: string }[] = [];
    
    const traverse = (items: typeof files) => {
      for (const item of items) {
        if (item.type === 'file' && item.content) {
          result.push({
            path: item.path,
            content: item.content,
            type: item.name.split('.').pop() || 'txt',
          });
        }
        if (item.children) {
          traverse(item.children);
        }
      }
    };
    
    traverse(nodes);
    return result;
  }, []);

  // Generate preview HTML from project files
  const generatePreviewHTML = useCallback(() => {
    const projectFiles = getAllFiles(files);
    
    if (projectFiles.length === 0) {
      return getDefaultPreview();
    }

    // Find key files
    const htmlFile = projectFiles.find(f => f.path.endsWith('index.html') || f.path.endsWith('.html'));
    const cssFiles = projectFiles.filter(f => f.type === 'css');
    const jsFiles = projectFiles.filter(f => f.type === 'js');
    const tsxFiles = projectFiles.filter(f => f.type === 'tsx' || f.type === 'jsx');

    // If we have an HTML file, use it as base
    if (htmlFile) {
      let html = htmlFile.content;
      
      // Inject CSS
      const cssContent = cssFiles.map(f => f.content).join('\n');
      if (cssContent) {
        html = html.replace('</head>', `<style>${cssContent}</style></head>`);
      }
      
      // Inject JS
      const jsContent = jsFiles.map(f => f.content).join('\n');
      if (jsContent) {
        html = html.replace('</body>', `<script>${jsContent}</script></body>`);
      }
      
      return html;
    }

    // If we have React/TSX files, build a React preview
    if (tsxFiles.length > 0) {
      return buildReactPreview(projectFiles);
    }

    // If we only have CSS/JS, show a basic preview
    if (cssFiles.length > 0 || jsFiles.length > 0) {
      return buildBasicPreview(cssFiles, jsFiles);
    }

    return getDefaultPreview();
  }, [files, getAllFiles]);

  // Build React preview
  const buildReactPreview = (projectFiles: { path: string; content: string; type: string }[]) => {
    // Find App component
    const appFile = projectFiles.find(f => 
      f.path.includes('App.tsx') || 
      f.path.includes('App.jsx') ||
      f.path.includes('app.tsx')
    );
    
    // Find all component files
    const componentFiles = projectFiles.filter(f => 
      (f.type === 'tsx' || f.type === 'jsx') && 
      !f.path.includes('main.') &&
      !f.path.includes('index.')
    );

    // Find CSS files
    const cssFiles = projectFiles.filter(f => f.type === 'css');
    const cssContent = cssFiles.map(f => f.content).join('\n');

    // Simple React component renderer
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script crossorigin src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    
    // Component definitions
    ${componentFiles.map(f => {
      // Extract component code (remove imports/exports for browser)
      let code = f.content
        .replace(/import\s+.*?from\s+['"][^'"]+['"]\s*;?/g, '')
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+/g, '');
      return `// ${f.path}\n${code}`;
    }).join('\n\n')}
    
    // Main App
    ${appFile ? appFile.content
        .replace(/import\s+.*?from\s+['"][^'"]+['"]\s*;?/g, '')
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+/g, '')
      : `
      function App() {
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center text-white">
            <div className="text-center p-8">
              <h1 className="text-4xl font-bold mb-4">🚀 Your App</h1>
              <p className="text-slate-300">Components are loading...</p>
            </div>
          </div>
        );
      }
    `}
    
    // Render
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;
  };

  // Build basic HTML/CSS/JS preview
  const buildBasicPreview = (
    cssFiles: { path: string; content: string }[],
    jsFiles: { path: string; content: string }[]
  ) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script crossorigin src="https://cdn.tailwindcss.com"></script>
  <style>
    ${cssFiles.map(f => f.content).join('\n')}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    ${jsFiles.map(f => f.content).join('\n')}
  </script>
</body>
</html>`;
  };

  // Default preview when no files
  const getDefaultPreview = () => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script crossorigin src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-slate-900 to-indigo-900 min-h-screen flex items-center justify-center">
  <div class="text-center text-white p-8">
    <div class="text-6xl mb-6">🚀</div>
    <h1 class="text-3xl font-bold mb-4">Live Preview</h1>
    <p class="text-slate-300 mb-6">Your app will appear here when you create files</p>
    <div class="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
      <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
      Ready
    </div>
  </div>
</body>
</html>`;
  };

  // Update preview when files change
  useEffect(() => {
    const updatePreview = () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // If WebContainer has a server running, use that URL
        if (webContainerUrl) {
          if (iframeRef.current) {
            iframeRef.current.src = webContainerUrl;
            setLastBuildTime(Date.now());
          }
        } else {
          // Otherwise generate preview HTML from files
          const html = generatePreviewHTML();
          
          if (iframeRef.current) {
            const iframe = iframeRef.current;
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            
            if (doc) {
              doc.open();
              doc.write(html);
              doc.close();
              setLastBuildTime(Date.now());
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Preview error');
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce updates
    const timeout = setTimeout(updatePreview, 300);
    return () => clearTimeout(timeout);
  }, [files, generatePreviewHTML, webContainerUrl]);

  // Manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    
    // If WebContainer has a server running, use that
    if (webContainerUrl) {
      if (iframeRef.current) {
        iframeRef.current.src = webContainerUrl;
        setLastBuildTime(Date.now());
      }
    } else {
      const html = generatePreviewHTML();
      
      if (iframeRef.current) {
        const iframe = iframeRef.current;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          setLastBuildTime(Date.now());
        }
      }
    }
    
    setTimeout(() => setIsLoading(false), 500);
  };

  // Open in new tab
  const handleOpenNewTab = () => {
    const html = generatePreviewHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const deviceStyle = getDeviceStyle();

  return (
    <div className="h-full flex flex-col bg-vscode-bg font-mono">
      {/* Preview Toolbar */}
      <div className="flex items-center justify-end px-2 py-0.5 bg-vscode-sidebar border-b border-vscode-border">
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-0.5 text-vscode-textMuted hover:text-white hover:bg-white/5 transition rounded disabled:opacity-50"
            title="Refresh Preview"
          >
            <span className={`text-[10px] ${isLoading ? 'animate-spin inline-block' : ''}`}>↻</span>
          </button>
          
          <button
            onClick={handleOpenNewTab}
            className="p-0.5 text-vscode-textMuted hover:text-white hover:bg-white/5 transition rounded"
            title="Open in New Tab"
          >
            <span className="text-[10px]">↗</span>
          </button>
          
          {/* Device toggles */}
          <div className="flex items-center gap-0.5 ml-0.5 border-l border-vscode-border/50 pl-0.5">
            {(['desktop', 'tablet', 'mobile'] as DeviceView[]).map((device) => (
              <button
                key={device}
                onClick={() => setDeviceView(device)}
                className={`px-1 py-0.5 text-[10px] font-medium transition rounded ${
                  deviceView === device
                    ? 'text-vscode-accent bg-vscode-accent/10'
                    : 'text-vscode-textMuted hover:text-white hover:bg-white/5'
                }`}
                title={`${device.charAt(0).toUpperCase() + device.slice(1)} View`}
              >
                {device === 'desktop' && '▣'}
                {device === 'tablet' && '▢'}
                {device === 'mobile' && '▯'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center p-4 bg-vscode-sidebar">
        {error ? (
          <div className="text-red-400 text-center p-4 border border-red-400 rounded">
            <div className="text-4xl mb-2">⚠</div>
            <p className="font-medium text-sm">{error}</p>
          </div>
        ) : (
          <div 
            className={`bg-white overflow-hidden transition-all duration-300 shadow-lg rounded ${
              deviceView !== 'desktop' ? 'border-4 border-vscode-border' : 'border border-vscode-border'
            }`}
            style={deviceStyle}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LivePreview;
