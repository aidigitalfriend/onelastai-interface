
import React, { useState, useMemo } from 'react';
import { ProgrammingLanguage } from '../types';

interface CodeViewProps {
  code: string;
  language?: ProgrammingLanguage;
}

// Simple syntax highlighting rules
const syntaxRules: Record<string, { pattern: RegExp; className: string }[]> = {
  html: [
    { pattern: /(&lt;!DOCTYPE[^&]*&gt;)/gi, className: 'text-zinc-500' },
    { pattern: /(&lt;\/?[\w-]+)/g, className: 'text-pink-400' },
    { pattern: /(\s[\w-]+)(?==)/g, className: 'text-yellow-300' },
    { pattern: /(="[^"]*")/g, className: 'text-green-400' },
    { pattern: /(&gt;)/g, className: 'text-pink-400' },
    { pattern: /(&lt;!--[\s\S]*?--&gt;)/g, className: 'text-zinc-500 italic' },
  ],
  javascript: [
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g, className: 'text-purple-400' },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, className: 'text-orange-400' },
    { pattern: /(["'`])((?:[^\\]|\\.)*?)\1/g, className: 'text-green-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-orange-400' },
    { pattern: /(\/\/.*$)/gm, className: 'text-zinc-500 italic' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-zinc-500 italic' },
    { pattern: /(\.\w+)\s*\(/g, className: 'text-yellow-300' },
  ],
  python: [
    { pattern: /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|raise|with|lambda|yield|pass|break|continue|and|or|not|in|is|True|False|None)\b/g, className: 'text-purple-400' },
    { pattern: /(["']{3}[\s\S]*?["']{3})/g, className: 'text-green-400' },
    { pattern: /(["'])((?:[^\\]|\\.)*?)\1/g, className: 'text-green-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-orange-400' },
    { pattern: /(#.*$)/gm, className: 'text-zinc-500 italic' },
    { pattern: /(@\w+)/g, className: 'text-yellow-300' },
    { pattern: /\b(self|cls)\b/g, className: 'text-pink-400' },
  ],
  sql: [
    { pattern: /\b(SELECT|FROM|WHERE|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|PRIMARY KEY|FOREIGN KEY|REFERENCES|NOT NULL|UNIQUE|DEFAULT|AUTO_INCREMENT|CASCADE)\b/gi, className: 'text-purple-400' },
    { pattern: /('(?:[^']|'')*')/g, className: 'text-green-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-orange-400' },
    { pattern: /(--.*$)/gm, className: 'text-zinc-500 italic' },
  ],
  bash: [
    { pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|read|export|source|alias|cd|pwd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|chmod|chown|sudo|apt|yum|npm|pip|git)\b/g, className: 'text-purple-400' },
    { pattern: /(\$[\w{}]+)/g, className: 'text-yellow-300' },
    { pattern: /(["'])((?:[^\\]|\\.)*?)\1/g, className: 'text-green-400' },
    { pattern: /(#.*$)/gm, className: 'text-zinc-500 italic' },
  ],
};

// Get syntax rules for a language
const getSyntaxRules = (lang: ProgrammingLanguage) => {
  if (['html', 'tailwind', 'vue', 'svelte'].includes(lang)) return syntaxRules.html;
  if (['javascript', 'typescript', 'react', 'nextjs', 'nodejs', 'express', 'json'].includes(lang)) return syntaxRules.javascript;
  if (lang === 'python') return syntaxRules.python;
  if (lang === 'sql') return syntaxRules.sql;
  if (lang === 'bash') return syntaxRules.bash;
  return syntaxRules.javascript;
};

const CodeView: React.FC<CodeViewProps> = ({ code, language = 'html' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting
  const highlightedCode = useMemo(() => {
    if (!code) return '';
    
    // Escape HTML first
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Apply syntax highlighting based on language
    const rules = getSyntaxRules(language);
    rules.forEach(({ pattern, className }) => {
      escaped = escaped.replace(pattern, (match) => `<span class="${className}">${match}</span>`);
    });
    
    return escaped;
  }, [code, language]);

  // Get file extension for display
  const getFileExtension = () => {
    const extensions: Record<ProgrammingLanguage, string> = {
      html: 'index.html',
      javascript: 'script.js',
      typescript: 'index.ts',
      python: 'main.py',
      react: 'App.tsx',
      nextjs: 'page.tsx',
      vue: 'App.vue',
      svelte: 'App.svelte',
      css: 'styles.css',
      tailwind: 'index.html',
      nodejs: 'server.js',
      express: 'app.js',
      sql: 'schema.sql',
      bash: 'script.sh',
      json: 'data.json',
      markdown: 'README.md',
    };
    return extensions[language] || 'code.txt';
  };

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-xl m-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <p className="text-lg font-medium">No code generated yet</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-zinc-950 group flex flex-col">
      {/* File tab */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 rounded-t border-t-2 border-t-blue-500">
            <span className="text-xs text-zinc-400">{getFileExtension()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{language}</span>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs rounded-md flex items-center gap-2 transition-all border border-blue-500/30"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Code with line numbers */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="flex min-h-full">
          {/* Line numbers */}
          <div className="sticky left-0 bg-zinc-950 text-zinc-600 text-right pr-4 pl-4 py-4 font-mono text-sm select-none border-r border-zinc-800">
            {code.split('\n').map((_, i) => (
              <div key={i} className="leading-6">{i + 1}</div>
            ))}
          </div>
          {/* Code content */}
          <pre 
            className="flex-1 p-4 font-mono text-sm text-zinc-300 leading-6"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeView;

