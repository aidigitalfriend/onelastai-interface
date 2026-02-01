
import React, { useState } from 'react';

interface CodeViewProps {
  code: string;
}

const CodeView: React.FC<CodeViewProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div className="relative h-full w-full bg-[#0a0a0a] group">
      <button
        onClick={handleCopy}
        className={`absolute top-4 right-4 z-10 px-3 py-1.5 ${copied ? 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-black/60 hover:bg-cyan-500/20 border border-gray-800 hover:border-cyan-500/30'} text-white text-xs rounded-lg flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100 uppercase tracking-wider font-bold`}
      >
        {copied ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Copied
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
      <pre className="p-6 overflow-auto h-full font-mono text-sm text-gray-400 custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeView;
