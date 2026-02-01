import React, { useEffect, useRef } from 'react';

interface PreviewProps {
  code: string;
}

const Preview: React.FC<PreviewProps> = ({ code }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && code) {
      const doc = iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(code);
        doc.close();
      }
    }
  }, [code]);

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

  return (
    <div className="w-full h-full bg-[#0a0a0a] shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 bg-black/60 border-b border-gray-800 text-xs text-gray-500">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
        </div>
        <div className="flex-1 text-center font-mono text-gray-600 opacity-80 truncate uppercase tracking-wider text-[10px]">
          neural://localhost:3000/generated-app
        </div>
      </div>
      <iframe
        ref={iframeRef}
        title="App Preview"
        className="w-full h-full border-none bg-white"
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-same-origin"
      />
    </div>
  );
};

export default Preview;
