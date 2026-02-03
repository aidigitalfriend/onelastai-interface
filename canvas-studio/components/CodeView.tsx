
import React, { useState, useMemo } from 'react';

interface CodeViewProps {
  code: string;
  language?: string;
}

const CodeView: React.FC<CodeViewProps> = ({ code, language = 'javascript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlighting function
  const highlightCode = useMemo(() => {
    if (!code) return [];
    
    const keywords: Record<string, string[]> = {
      javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'default', 'switch', 'case', 'break', 'continue', 'extends', 'super', 'static', 'get', 'set', 'yield', 'delete', 'in', 'of', 'void', 'with', 'debugger', 'finally', 'do'],
      typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'interface', 'type', 'enum', 'implements', 'extends', 'public', 'private', 'protected', 'readonly', 'as', 'default', 'switch', 'case', 'break', 'continue', 'abstract', 'namespace', 'module', 'declare', 'keyof', 'infer', 'never', 'unknown', 'any'],
      python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'self', 'async', 'await', 'global', 'nonlocal', 'assert', 'del', 'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'open', 'super'],
      html: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'button', 'input', 'form', 'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav', 'section', 'article', 'aside', 'main', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'class', 'id', 'href', 'src', 'alt', 'canvas', 'video', 'audio', 'iframe', 'textarea', 'select', 'option', 'label'],
      css: ['color', 'background', 'margin', 'padding', 'border', 'display', 'flex', 'grid', 'position', 'width', 'height', 'font', 'text', 'align', 'justify', 'content', 'items', 'important', 'none', 'block', 'inline', 'absolute', 'relative', 'fixed', 'top', 'left', 'right', 'bottom', 'z-index', 'opacity', 'transition', 'transform', 'animation', 'overflow', 'visibility', 'cursor', 'box-shadow', 'filter', 'backdrop', 'gap', 'auto', 'inherit', 'initial'],
      java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'default', 'new', 'this', 'super', 'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package', 'null', 'true', 'false', 'instanceof', 'abstract', 'synchronized', 'volatile', 'transient', 'native', 'enum', 'assert'],
      rust: ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'impl', 'trait', 'pub', 'mod', 'use', 'crate', 'self', 'super', 'return', 'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue', 'move', 'ref', 'as', 'where', 'async', 'await', 'dyn', 'unsafe', 'extern', 'type', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'Self', 'Box', 'Vec', 'String', 'Option', 'Result'],
      go: ['func', 'package', 'import', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan', 'go', 'select', 'case', 'default', 'if', 'else', 'for', 'range', 'switch', 'break', 'continue', 'return', 'defer', 'panic', 'recover', 'make', 'new', 'append', 'len', 'cap', 'nil', 'true', 'false', 'iota', 'fallthrough'],
      cpp: ['auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'delete', 'do', 'double', 'else', 'enum', 'explicit', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'nullptr', 'operator', 'private', 'protected', 'public', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'while', 'include', 'define', 'ifdef', 'ifndef', 'endif'],
      c: ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'include', 'define', 'ifdef', 'ifndef', 'endif', 'NULL', 'true', 'false'],
      ruby: ['def', 'class', 'module', 'end', 'if', 'elsif', 'else', 'unless', 'case', 'when', 'while', 'until', 'for', 'do', 'begin', 'rescue', 'ensure', 'raise', 'return', 'yield', 'break', 'next', 'redo', 'retry', 'self', 'super', 'nil', 'true', 'false', 'and', 'or', 'not', 'in', 'then', 'attr_accessor', 'attr_reader', 'attr_writer', 'require', 'require_relative', 'include', 'extend', 'private', 'protected', 'public', 'alias', 'lambda', 'proc'],
      php: ['php', 'echo', 'print', 'function', 'class', 'public', 'private', 'protected', 'static', 'const', 'var', 'return', 'if', 'else', 'elseif', 'endif', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'extends', 'implements', 'interface', 'trait', 'namespace', 'use', 'require', 'include', 'null', 'true', 'false', 'array', 'global', 'as', 'abstract', 'final'],
      swift: ['func', 'var', 'let', 'class', 'struct', 'enum', 'protocol', 'extension', 'import', 'return', 'if', 'else', 'guard', 'switch', 'case', 'default', 'for', 'while', 'repeat', 'break', 'continue', 'in', 'where', 'try', 'catch', 'throw', 'throws', 'rethrows', 'defer', 'do', 'as', 'is', 'nil', 'true', 'false', 'self', 'Self', 'super', 'init', 'deinit', 'subscript', 'typealias', 'associatedtype', 'public', 'private', 'internal', 'fileprivate', 'open', 'static', 'final', 'override', 'mutating', 'lazy', 'weak', 'unowned', 'inout', 'some', 'any', 'async', 'await', 'actor'],
      kotlin: ['fun', 'val', 'var', 'class', 'object', 'interface', 'enum', 'sealed', 'data', 'companion', 'return', 'if', 'else', 'when', 'for', 'while', 'do', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'import', 'package', 'as', 'is', 'in', 'out', 'this', 'super', 'null', 'true', 'false', 'private', 'protected', 'public', 'internal', 'open', 'final', 'abstract', 'override', 'lateinit', 'lazy', 'by', 'constructor', 'init', 'suspend', 'inline', 'crossinline', 'noinline', 'reified', 'typealias', 'where'],
      sql: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'GROUP', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'UNIQUE', 'DEFAULT', 'CHECK', 'VIEW', 'UNION', 'ALL', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'TRUE', 'FALSE'],
      json: [],
      yaml: ['true', 'false', 'null', 'yes', 'no', 'on', 'off'],
      markdown: [],
      bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'read', 'export', 'source', 'local', 'declare', 'readonly', 'unset', 'shift', 'test', 'true', 'false', 'cd', 'pwd', 'ls', 'cat', 'grep', 'sed', 'awk', 'find', 'xargs', 'chmod', 'chown', 'mkdir', 'rm', 'cp', 'mv', 'touch', 'curl', 'wget'],
      shell: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'read', 'export', 'source', 'local', 'declare', 'readonly', 'unset', 'shift', 'test', 'true', 'false'],
    };

    const langKeywords = keywords[language.toLowerCase()] || keywords['javascript'];
    const lines = code.split('\n');

    return lines.map((line, lineIndex) => {
      const tokens: React.ReactNode[] = [];
      let remaining = line;
      let tokenIndex = 0;

      while (remaining.length > 0) {
        // HTML/JSX tags
        const tagMatch = remaining.match(/^(<\/?[a-zA-Z][a-zA-Z0-9]*)/);
        if (tagMatch) {
          tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-pink-400">{tagMatch[0]}</span>);
          remaining = remaining.slice(tagMatch[0].length);
          tokenIndex++;
          continue;
        }

        // HTML closing >
        const closeTagMatch = remaining.match(/^(\/?>)/);
        if (closeTagMatch) {
          tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-pink-400">{closeTagMatch[0]}</span>);
          remaining = remaining.slice(closeTagMatch[0].length);
          tokenIndex++;
          continue;
        }

        // Comments (// or # or <!-- -->)
        const commentMatch = remaining.match(/^(\/\/.*|#.*|<!--[\s\S]*?-->)$/);
        if (commentMatch) {
          tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-gray-500 italic">{commentMatch[0]}</span>);
          remaining = '';
          tokenIndex++;
          continue;
        }

        // Strings (single, double, template)
        const stringMatch = remaining.match(/^(["'`])(?:\\.|(?!\1)[^\\])*\1/);
        if (stringMatch) {
          tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-emerald-400">{stringMatch[0]}</span>);
          remaining = remaining.slice(stringMatch[0].length);
          tokenIndex++;
          continue;
        }

        // Numbers
        const numberMatch = remaining.match(/^\b\d+\.?\d*\b/);
        if (numberMatch) {
          tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-orange-400">{numberMatch[0]}</span>);
          remaining = remaining.slice(numberMatch[0].length);
          tokenIndex++;
          continue;
        }

        // Keywords and identifiers
        const wordMatch = remaining.match(/^\b[a-zA-Z_][a-zA-Z0-9_]*\b/);
        if (wordMatch) {
          const word = wordMatch[0];
          if (langKeywords.includes(word)) {
            tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-purple-400 font-medium">{word}</span>);
          } else if (word.match(/^[A-Z][a-zA-Z]*$/)) {
            // Class/Type names (PascalCase)
            tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-yellow-300">{word}</span>);
          } else if (remaining.slice(word.length).match(/^\s*\(/)) {
            // Function calls
            tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-blue-400">{word}</span>);
          } else {
            tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-cyan-300">{word}</span>);
          }
          remaining = remaining.slice(word.length);
          tokenIndex++;
          continue;
        }

        // Operators and punctuation
        const opMatch = remaining.match(/^[=+\-*/<>!&|^~%?:;,.(){}[\]@#$]+/);
        if (opMatch) {
          tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-gray-400">{opMatch[0]}</span>);
          remaining = remaining.slice(opMatch[0].length);
          tokenIndex++;
          continue;
        }

        // Whitespace and other
        tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-gray-400">{remaining[0]}</span>);
        remaining = remaining.slice(1);
        tokenIndex++;
      }

      return (
        <div key={lineIndex} className="table-row hover:bg-white/5">
          <span className="table-cell pr-4 text-right text-gray-600 select-none w-12 text-xs">{lineIndex + 1}</span>
          <span className="table-cell">{tokens.length > 0 ? tokens : ' '}</span>
        </div>
      );
    });
  }, [code, language]);

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-black/40 border-2 border-dashed border-gray-800 rounded-lg m-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <p className="text-sm font-bold text-cyan-500/80 uppercase tracking-widest">Code_Output_Pending</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#0d0d0d] group flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono ml-2">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`px-3 py-1 ${copied ? 'bg-emerald-600 text-white' : 'bg-gray-800 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400'} text-xs rounded flex items-center gap-1.5 transition-all uppercase tracking-wider font-medium`}
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      
      {/* Code content */}
      <pre className="flex-1 p-4 overflow-auto font-mono text-sm custom-scrollbar">
        <code className="table w-full">
          {highlightCode}
        </code>
      </pre>
    </div>
  );
};

export default CodeView;
