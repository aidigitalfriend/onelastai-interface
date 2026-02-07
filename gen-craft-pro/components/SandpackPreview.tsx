/**
 * SandpackPreview - Live Code Preview with Sandpack
 * Supports multiple view modes: Desktop, Tablet, Mobile, Split
 */

import React, { useState, useCallback } from 'react';
import {
  SandpackProvider,
  SandpackPreview as SandpackPreviewPane,
  SandpackCodeEditor,
  SandpackLayout,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { atomDark } from '@codesandbox/sandpack-themes';
import {
  Monitor,
  Tablet,
  Smartphone,
  Code,
  Columns,
  RefreshCw,
  ExternalLink,
  Download,
  Copy,
  Check,
  Maximize2,
} from 'lucide-react';

export type ViewMode = 'desktop' | 'tablet' | 'mobile' | 'code' | 'split';

interface SandpackPreviewProps {
  code: string;
  language?: 'html' | 'react' | 'nextjs' | 'vanilla';
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onCodeChange?: (code: string) => void;
}

// Device dimensions
const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '812px' },
};

// Refresh button component that uses Sandpack context
const RefreshButton: React.FC = () => {
  const { dispatch } = useSandpack();
  
  return (
    <button
      onClick={() => dispatch({ type: 'refresh' })}
      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
      title="Refresh preview"
    >
      <RefreshCw className="w-4 h-4" />
    </button>
  );
};

// Convert HTML to Sandpack-compatible format
function htmlToSandpackFiles(code: string) {
  // Extract CSS from style tags
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  const styles = styleMatch 
    ? styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n')
    : '';

  // Extract JS from script tags (excluding CDN scripts)
  const scriptMatch = code.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi);
  const scripts = scriptMatch
    ? scriptMatch.map(s => s.replace(/<\/?script[^>]*>/gi, '')).join('\n')
    : '';

  return {
    '/index.html': code,
    '/styles.css': styles || '/* No embedded styles */',
    '/index.js': scripts || '// No embedded scripts',
  };
}

// Convert React code to Sandpack format
function reactToSandpackFiles(code: string) {
  return {
    '/App.tsx': code,
    '/index.tsx': `
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
    `.trim(),
  };
}

const SandpackPreviewComponent: React.FC<SandpackPreviewProps> = ({
  code,
  language = 'html',
  viewMode = 'desktop',
  onViewModeChange,
  onCodeChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine template and files based on language
  const getTemplateConfig = useCallback(() => {
    switch (language) {
      case 'react':
      case 'nextjs':
        return {
          template: 'react-ts' as const,
          files: reactToSandpackFiles(code),
        };
      case 'vanilla':
        return {
          template: 'vanilla' as const,
          files: { '/index.js': code, '/index.html': '<div id="app"></div>' },
        };
      case 'html':
      default:
        return {
          template: 'static' as const,
          files: htmlToSandpackFiles(code),
        };
    }
  }, [code, language]);

  const { template, files } = getTemplateConfig();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    // Export to CodeSandbox
    const parameters = btoa(JSON.stringify({ files }));
    window.open(`https://codesandbox.io/api/v1/sandboxes/define?parameters=${parameters}`, '_blank');
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = language === 'html' ? 'index.html' : 'App.tsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Empty state
  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-canvas-dark text-zinc-400">
        <div className="w-20 h-20 mb-6 rounded-2xl bg-canvas-card flex items-center justify-center">
          <Monitor className="w-10 h-10 opacity-30" />
        </div>
        <p className="text-lg font-medium mb-2">No preview yet</p>
        <p className="text-sm text-zinc-500">Generate some code to see it live here</p>
      </div>
    );
  }

  const deviceStyle = DEVICE_SIZES[viewMode as keyof typeof DEVICE_SIZES] || DEVICE_SIZES.desktop;

  return (
    <div className={`flex flex-col h-full bg-canvas-darker ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-canvas-card border-b border-canvas-border">
        {/* View Mode Buttons */}
        <div className="flex items-center gap-1 p-1 bg-canvas-darker rounded-lg">
          {[
            { mode: 'desktop' as ViewMode, icon: Monitor, label: 'Desktop' },
            { mode: 'tablet' as ViewMode, icon: Tablet, label: 'Tablet' },
            { mode: 'mobile' as ViewMode, icon: Smartphone, label: 'Mobile' },
            { mode: 'code' as ViewMode, icon: Code, label: 'Code' },
            { mode: 'split' as ViewMode, icon: Columns, label: 'Split' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange?.(mode)}
              className={`p-2 rounded-md transition-all ${
                viewMode === mode
                  ? 'bg-canvas-accent text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 text-zinc-400">
          <RefreshButton />
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Open in CodeSandbox"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden">
        <SandpackProvider
          template={template}
          files={files}
          theme={atomDark}
          options={{
            externalResources: [
              'https://cdn.tailwindcss.com',
              'https://unpkg.com/lucide@latest',
            ],
          }}
        >
          {viewMode === 'code' ? (
            <SandpackCodeEditor
              style={{ height: '100%' }}
              showLineNumbers
              showInlineErrors
              wrapContent
            />
          ) : viewMode === 'split' ? (
            <SandpackLayout>
              <SandpackCodeEditor
                style={{ height: '100%', minWidth: '50%' }}
                showLineNumbers
                showInlineErrors
              />
              <SandpackPreviewPane
                style={{ height: '100%' }}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
              />
            </SandpackLayout>
          ) : (
            <div className="h-full flex items-center justify-center p-4 bg-zinc-900">
              <div
                className={`bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${
                  viewMode === 'mobile' ? 'rounded-[2rem] border-8 border-zinc-800' : ''
                } ${viewMode === 'tablet' ? 'rounded-2xl border-4 border-zinc-700' : ''}`}
                style={{
                  width: deviceStyle.width,
                  height: deviceStyle.height,
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              >
                {viewMode === 'mobile' && (
                  <div className="h-6 bg-zinc-800 flex items-center justify-center">
                    <div className="w-20 h-4 bg-black rounded-full" />
                  </div>
                )}
                <SandpackPreviewPane
                  style={{ height: viewMode === 'mobile' ? 'calc(100% - 24px)' : '100%' }}
                  showOpenInCodeSandbox={false}
                  showRefreshButton={false}
                />
              </div>
            </div>
          )}
        </SandpackProvider>
      </div>
    </div>
  );
};

export default SandpackPreviewComponent;
