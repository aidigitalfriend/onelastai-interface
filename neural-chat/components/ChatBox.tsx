
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Upload, 
  Mic, 
  Check, 
  ExternalLink, 
  Globe, 
  MessageSquare, 
  Edit3, 
  Monitor, 
  FileCode, 
  FileText, 
  Layout, 
  Image as ImageIcon, 
  Video,
  Radio,
  MicOff,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  Share2,
  Volume2,
  Pencil
} from 'lucide-react';
import { Message, SettingsState, WorkspaceMode } from '../types';

interface ChatBoxProps {
  messages: Message[];
  isThinking: boolean;
  isRecordingSTT: boolean;
  isLiveActive: boolean;
  onSend: (text: string) => void;
  onFileUpload: (file: File) => void;
  onToggleSTT: () => void;
  onToggleLive: () => void;
  onRegenerateResponse?: () => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  agentSettings: SettingsState;
  onUpdateSettings: (settings: SettingsState) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ 
  messages, 
  isThinking, 
  isRecordingSTT,
  isLiveActive,
  onSend, 
  onFileUpload,
  onToggleSTT,
  onToggleLive,
  onRegenerateResponse,
  onEditMessage,
  agentSettings, 
  onUpdateSettings 
}) => {
  const [inputText, setInputText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current && agentSettings.workspaceMode === 'CHAT') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, agentSettings.workspaceMode]);

  const handleSend = () => {
    if (!inputText.trim() || isThinking) return;
    onSend(inputText.trim());
    setInputText("");
  };

  // Copy message to clipboard
  const handleCopy = async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Like/Unlike message
  const handleLike = (messageId: string) => {
    const newLiked = new Set(likedMessages);
    const newDisliked = new Set(dislikedMessages);
    if (newLiked.has(messageId)) {
      newLiked.delete(messageId);
    } else {
      newLiked.add(messageId);
      newDisliked.delete(messageId);
    }
    setLikedMessages(newLiked);
    setDislikedMessages(newDisliked);
  };

  // Dislike message
  const handleDislike = (messageId: string) => {
    const newLiked = new Set(likedMessages);
    const newDisliked = new Set(dislikedMessages);
    if (newDisliked.has(messageId)) {
      newDisliked.delete(messageId);
    } else {
      newDisliked.add(messageId);
      newLiked.delete(messageId);
    }
    setLikedMessages(newLiked);
    setDislikedMessages(newDisliked);
  };

  // Share message
  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
    }
  };

  // Text-to-speech for agent messages
  const handleSpeak = (messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Start editing a user message
  const startEditing = (messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditingText(text);
  };

  // Submit edited message
  const submitEdit = () => {
    if (editingMessageId && editingText.trim()) {
      if (onEditMessage) {
        onEditMessage(editingMessageId, editingText.trim());
      } else {
        // Fallback: just resend as new message
        onSend(editingText.trim());
      }
      setEditingMessageId(null);
      setEditingText("");
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const setWorkspace = (mode: WorkspaceMode) => {
    onUpdateSettings({ ...agentSettings, workspaceMode: mode });
  };

  const mountPortal = (url: string) => {
    onUpdateSettings({ ...agentSettings, portalUrl: url, workspaceMode: 'PORTAL' });
  };

  const handleCanvasEdit = (content: string) => {
    onUpdateSettings({
      ...agentSettings,
      canvas: { ...agentSettings.canvas, content }
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const renderCanvasContent = () => {
    const { type, content } = agentSettings.canvas;

    switch (type) {
      case 'html':
        return (
          <div className="w-full h-full bg-white rounded shadow-2xl overflow-hidden border border-gray-300 ring-4 ring-black">
            <iframe srcDoc={content} className="w-full h-full border-none" title="Canvas Preview" />
          </div>
        );
      case 'video':
        return (
          <div className="w-full h-full bg-black rounded flex items-center justify-center overflow-hidden">
             {content.includes('youtube.com') || content.includes('vimeo.com') ? (
                <iframe src={content} className="w-full h-full aspect-video" allowFullScreen title="Neural Video Sync" />
             ) : (
                <video src={content} controls className="max-w-full max-h-full" />
             )}
          </div>
        );
      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center bg-[#050505] p-4">
            <img src={content} alt="Sync Asset" className="max-w-full max-h-full object-contain rounded shadow-[0_0_50px_rgba(34,211,238,0.2)]" />
          </div>
        );
      case 'code':
      case 'text':
      default:
        return (
          <textarea 
            value={content}
            onChange={(e) => handleCanvasEdit(e.target.value)}
            spellCheck="false"
            className={`w-full h-full bg-transparent outline-none resize-none leading-relaxed custom-scrollbar ${type === 'code' ? 'font-mono text-cyan-300/80 text-sm' : 'font-serif text-gray-400 text-lg'}`}
            placeholder="Start typing or let the agent synthesize content here..."
          />
        );
    }
  };

  return (
    <main className="relative flex-grow bg-black/20 flex flex-col overflow-hidden z-10 m-2 sm:m-4 rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-gray-800/40 backdrop-blur-md">

      
      <div className="flex-grow flex flex-col relative overflow-hidden bg-black/10">
        {/* CHAT VIEW */}
        <div className={`absolute inset-0 flex flex-col p-4 sm:p-6 overflow-y-auto custom-scrollbar transition-opacity duration-300 ${agentSettings.workspaceMode === 'CHAT' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`} ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`group mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col ${msg.sender === 'YOU' ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-baseline gap-3 mb-1 ${msg.sender === 'YOU' ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className={`font-bold text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm ${msg.sender === 'YOU' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                  {msg.sender === 'AGENT' ? agentSettings.agentName : msg.sender}:
                </span>
                <span className="text-[9px] text-gray-700 select-none tabular-nums">[{msg.timestamp}]</span>
              </div>
              
              <div className={`max-w-[85%] sm:max-w-[75%] px-4 border-l ${msg.sender === 'YOU' ? 'border-l-0 border-r text-right border-emerald-500/20' : 'border-l border-cyan-500/20'} mb-2`}>
                {/* Editing mode for user messages */}
                {editingMessageId === msg.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
                      className="w-full bg-black/40 border border-emerald-500/50 rounded px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={cancelEdit} className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1">
                        Cancel
                      </button>
                      <button onClick={submitEdit} className="text-[10px] text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                        Send
                      </button>
                    </div>
                  </div>
                ) : msg.isImage ? (
                  <div className="relative group/img overflow-hidden rounded-lg border border-cyan-500/30 shadow-2xl cursor-pointer" onClick={() => onUpdateSettings({ ...agentSettings, canvas: { content: msg.text, type: 'image', title: 'Asset View' }, workspaceMode: 'CANVAS'})}>
                    <img src={msg.text} alt="Synth" className="max-w-full transition-transform duration-500 group-hover/img:scale-105" />
                  </div>
                ) : (
                  <div className="text-gray-300 whitespace-pre-wrap break-words text-xs sm:text-sm leading-relaxed">{msg.text}</div>
                )}
                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {msg.groundingUrls.map((url, i) => (
                      <button key={i} onClick={() => mountPortal(url)} className="flex items-center gap-1.5 text-[9px] text-cyan-400 hover:text-white transition-all bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 hover:border-cyan-400 shadow-sm">
                        <Globe size={10} /> OPEN_PORTAL_{i+1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Action Buttons */}
              {editingMessageId !== msg.id && (
                <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${msg.sender === 'YOU' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.sender === 'AGENT' ? (
                    <>
                      {/* Agent Message Actions: Thumbs Up, Thumbs Down, Copy, Refresh, Share, Speaker */}
                      <button
                        onClick={() => handleLike(msg.id)}
                        className={`p-1.5 rounded transition-all ${likedMessages.has(msg.id) ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                        title="Positive Feedback"
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <button
                        onClick={() => handleDislike(msg.id)}
                        className={`p-1.5 rounded transition-all ${dislikedMessages.has(msg.id) ? 'text-red-400 bg-red-500/10' : 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'}`}
                        title="Negative Feedback"
                      >
                        <ThumbsDown size={14} />
                      </button>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className={`p-1.5 rounded transition-all ${copiedId === msg.id ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
                        title={copiedId === msg.id ? "Copied!" : "Copy Response"}
                      >
                        {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => onRegenerateResponse?.()}
                        className="p-1.5 text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-all"
                        title="Regenerate Response"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => handleShare(msg.text)}
                        className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                        title="Share Response"
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        onClick={() => handleSpeak(msg.id, msg.text)}
                        className={`p-1.5 rounded transition-all ${speakingMessageId === msg.id ? 'text-cyan-400 bg-cyan-500/10 animate-pulse' : 'text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
                        title={speakingMessageId === msg.id ? "Stop Speaking" : "Listen to Response"}
                      >
                        <Volume2 size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* User Message Actions: Copy, Edit */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className={`p-1.5 rounded transition-all ${copiedId === msg.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                        title={copiedId === msg.id ? "Copied!" : "Copy Message"}
                      >
                        {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => startEditing(msg.id, msg.text)}
                        className="p-1.5 text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                        title="Edit & Resend"
                      >
                        <Pencil size={14} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {isThinking && <div className="animate-pulse text-cyan-500/60 text-[10px] font-mono tracking-widest uppercase">Processing Neural Data...</div>}
        </div>

        {/* PORTAL VIEW */}
        <div className={`absolute inset-0 bg-[#050505] transition-opacity duration-300 ${agentSettings.workspaceMode === 'PORTAL' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}>
          <div className="h-full flex flex-col">
            <div className="bg-[#111] p-2 flex items-center gap-3 border-b border-gray-800">
              <div className="flex-grow bg-black/50 border border-gray-800 rounded px-3 py-1.5 flex items-center gap-3 overflow-hidden">
                <Globe size={12} className="text-cyan-600 flex-shrink-0" />
                <span className="text-[10px] text-gray-400 truncate font-mono uppercase tracking-widest">{agentSettings.portalUrl}</span>
              </div>
              <button onClick={() => window.open(agentSettings.portalUrl, '_blank')} className="text-gray-500 hover:text-cyan-400 p-1.5 transition-colors">
                <ExternalLink size={16} />
              </button>
            </div>
            <div className="flex-grow relative bg-[#0a0a0a]">
              <iframe src={agentSettings.portalUrl} className="w-full h-full border-none opacity-90 hover:opacity-100 transition-opacity" title="Neural Portal" />
            </div>
          </div>
        </div>

        {/* CANVAS VIEW */}
        <div className={`absolute inset-0 bg-[#080808] transition-opacity duration-300 ${agentSettings.workspaceMode === 'CANVAS' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}>
          <div className="h-full flex flex-col overflow-hidden">
            <div className="p-4 bg-[#111] border-b border-gray-800 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                {agentSettings.canvas.type === 'code' ? <FileCode size={18} className="text-purple-400" /> : 
                 agentSettings.canvas.type === 'video' ? <Video size={18} className="text-red-400" /> :
                 agentSettings.canvas.type === 'image' ? <ImageIcon size={18} className="text-cyan-400" /> :
                 agentSettings.canvas.type === 'html' ? <Layout size={18} className="text-orange-400" /> : 
                 <FileText size={18} className="text-emerald-400" />}
                <span className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold">{agentSettings.canvas.title}</span>
              </div>
            </div>
            <div className="flex-grow relative p-6 sm:p-12 overflow-y-auto custom-scrollbar">
              <div className="max-w-5xl mx-auto w-full h-full">
                {renderCanvasContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Universal Input Bar - Redesigned with Send icon inside the typer */}
      <div className="relative z-40 p-4 border-t border-gray-800/50 bg-[#0a0a0a]/90 backdrop-blur-xl flex items-center gap-3">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileChange} 
          className="hidden" 
        />
        
        {/* typer / input field container */}
        <div className="flex-grow relative group">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className={`w-full bg-black/40 border border-gray-800 rounded px-4 py-3 pr-12 text-gray-200 placeholder:text-gray-700 font-mono text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 transition-all shadow-inner ${isRecordingSTT ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : ''}`} 
            placeholder={
              isRecordingSTT ? "Listening for neural broadcast..." :
              agentSettings.workspaceMode === 'PORTAL' ? "Send command to portal agent..." :
              agentSettings.workspaceMode === 'CANVAS' ? "Instruct workspace sync..." :
              "Enter neural directive..."
            } 
          />
          
          {/* Send Icon Inside Input */}
          <button 
            onClick={handleSend}
            disabled={isThinking || !inputText.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400 disabled:text-gray-800 transition-colors p-1"
            title="Transmit Protocol"
          >
            <Send size={18} className={!inputText.trim() ? "" : "glow-green"} />
          </button>

          {isRecordingSTT && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            </div>
          )}
        </div>

        {/* Feature Icons Section */}
        <div className="flex items-center gap-1">
          {/* File Upload Icon */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all border border-transparent hover:border-emerald-500/20"
            title="Upload Protocol Asset"
          >
            <Paperclip size={20} />
          </button>

          {/* STS (Speech-to-Text) Mic Icon */}
          <button 
            onClick={onToggleSTT}
            className={`p-2.5 rounded transition-all border ${isRecordingSTT ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'}`}
            title="Neural Audio Transcribe"
          >
            {isRecordingSTT ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Voice to Voice Conversation Icon */}
          <button 
            onClick={onToggleLive}
            className={`p-2.5 rounded transition-all border ${isLiveActive ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 border-transparent hover:border-purple-500/20'}`}
            title="Live Neural Uplink"
          >
            <Radio size={20} className={isLiveActive ? 'animate-pulse' : ''} />
          </button>
        </div>
      </div>
    </main>
  );
};

export default ChatBox;
