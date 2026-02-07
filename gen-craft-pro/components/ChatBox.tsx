
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { speak } from '../services/speechService';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, isGenerating }) => {
  const [input, setInput] = useState('');
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleSpeak = async (text: string, idx: number) => {
    setSpeakingIdx(idx);
    await speak(text);
    setSpeakingIdx(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 w-full overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 bg-violet-500/15 rounded-2xl flex items-center justify-center text-violet-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">How can I help?</p>
            <p className="text-xs text-zinc-500 leading-relaxed">Ask me to add animations, change colors, or add complex functionality to your app.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`group relative max-w-[90%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-tr-none shadow-md shadow-violet-500/15 ring-1 ring-white/10' 
                : 'bg-zinc-900 text-zinc-300 rounded-tl-none border border-zinc-800'
            }`}>
              {msg.text}
              
              {msg.role === 'model' && (
                <button 
                  onClick={() => handleSpeak(msg.text, i)}
                  className={`absolute -right-8 top-1 p-1 text-zinc-500 hover:text-violet-400 transition-opacity ${speakingIdx === i ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              )}
            </div>
            <span className="text-[10px] text-zinc-600 mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        {isGenerating && (
          <div className="flex items-center gap-2 text-violet-400 text-[10px] px-2 font-bold uppercase tracking-widest italic animate-pulse">
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-violet-400 rounded-full"></span>
              <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce delay-150"></span>
            </span>
            Processing...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800/50 bg-zinc-950">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isGenerating}
            placeholder="Describe changes..."
            className="w-full pl-4 pr-12 py-3 text-xs bg-zinc-900/50 border border-zinc-800/60 rounded-2xl focus:ring-2 focus:ring-violet-500/30 outline-none transition-all placeholder:text-zinc-600 text-zinc-300"
          />
          <button type="submit" disabled={!input.trim() || isGenerating} className="absolute right-2 top-2 p-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl disabled:opacity-50 transition-colors shadow-sm active:scale-95 ring-1 ring-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
