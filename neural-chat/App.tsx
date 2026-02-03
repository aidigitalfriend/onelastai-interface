
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import ChatBox from './components/ChatBox';
import NavigationDrawer from './components/NavigationDrawer';
import CanvasAppDrawer from './components/CanvasAppDrawer';
import Overlay from './components/Overlay';
import Footer from './components/Footer';
// Fix: Import WorkspaceMode which was missing and causing a reference error on line 312
import { ChatSession, Message, SettingsState, NavItem, CanvasState, WorkspaceMode, FileAttachment } from './types';
import { DEFAULT_SETTINGS, NEURAL_PRESETS } from './constants';
import { callBackendAPI, streamChat, extractFileText } from './services/apiService';

const App: React.FC = () => {
  // UI State
  const [isOverlayActive, setIsOverlayActive] = useState(true);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isCanvasDrawerOpen, setIsCanvasDrawerOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecordingSTT, setIsRecordingSTT] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [sttTranscript, setSttTranscript] = useState('');
  
  // Streaming state
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Image attachment state
  const [pendingImage, setPendingImage] = useState<{ data: string; name: string; mimeType: string } | null>(null);
  
  // File attachment state
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);

  // Gemini Live & STT Refs
  const recognitionRef = useRef<any>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // App Data State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('neural_sessions');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        name: "Welcome Chat",
        active: true,
        messages: [
          { 
            id: 'init-1', 
            sender: 'AGENT', 
            text: 'Hi there! 👋 Welcome to One LastAI Chat. I\'m your AI assistant and I\'m here to help you with anything you need. Feel free to ask questions, upload images, or just chat!', 
            timestamp: new Date().toLocaleTimeString() 
          }
        ],
        settings: { ...DEFAULT_SETTINGS }
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('neural_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find(s => s.active) || sessions[0];

  // Stop generation handler
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
    setStreamingMessageId(null);
  }, []);

  const handleSend = async (text: string) => {
    if (isThinking) return;

    const timestamp = new Date().toLocaleTimeString();
    const hasImage = !!pendingImage;
    const hasFiles = pendingFiles.length > 0;
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      sender: 'YOU', 
      text, 
      timestamp,
      isImage: hasImage,
      imageData: pendingImage?.data,
      files: hasFiles ? [...pendingFiles] : undefined
    };

    setSessions(prev => prev.map(s => 
      s.active ? { ...s, messages: [...s.messages, userMsg] } : s
    ));

    // Switch to CHAT view when sending a message (especially with image)
    if (activeSession.settings.workspaceMode !== 'CHAT') {
      updateActiveSettings({ ...activeSession.settings, workspaceMode: 'CHAT' });
    }

    setIsThinking(true);
    
    // Include image in API call if present
    // Also include file content for code/text files
    const fileContext = pendingFiles
      .filter(f => f.content)
      .map(f => `File: ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');
    
    const fullPrompt = fileContext ? `${text}\n\n${fileContext}` : text;
    
    // Clear pending image and files after sending
    setPendingImage(null);
    setPendingFiles([]);

    // Create placeholder message for streaming
    const agentMsgId = (Date.now() + 1).toString();
    const agentMsg: Message = { 
      id: agentMsgId, 
      sender: 'AGENT', 
      text: '', 
      timestamp: new Date().toLocaleTimeString(),
    };

    setSessions(prev => prev.map(s => 
      s.active ? { ...s, messages: [...s.messages, agentMsg] } : s
    ));

    setStreamingMessageId(agentMsgId);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Use streaming API
    await streamChat(
      fullPrompt,
      activeSession.settings,
      {
        onText: (content) => {
          // Append streamed text to the agent message
          setSessions(prev => prev.map(s => {
            if (!s.active) return s;
            return {
              ...s,
              messages: s.messages.map(m => 
                m.id === agentMsgId 
                  ? { ...m, text: m.text + content }
                  : m
              )
            };
          }));
        },
        onDone: (data) => {
          setIsThinking(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;
          
          // Check for canvas updates in the final message
          setSessions(prev => {
            const session = prev.find(s => s.active);
            if (!session) return prev;
            
            const finalMessage = session.messages.find(m => m.id === agentMsgId);
            if (finalMessage && !hasImage) {
              // Check for code blocks to update canvas
              const codeBlockMatch = finalMessage.text.match(/```(\w+)?\n([\s\S]*?)```/);
              if (codeBlockMatch) {
                const language = codeBlockMatch[1] || 'text';
                const code = codeBlockMatch[2];
                
                if (['javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'rust', 'go'].includes(language)) {
                  const settingsUpdate: Partial<SettingsState> = {
                    canvas: {
                      ...session.settings.canvas,
                      content: code,
                      type: 'code',
                      language: language,
                      title: `CODE_${language.toUpperCase()}`
                    },
                    workspaceMode: 'CANVAS'
                  };
                  updateActiveSettings({ ...session.settings, ...settingsUpdate } as SettingsState);
                }
              }
            }
            
            return prev;
          });
        },
        onError: (error) => {
          setIsThinking(false);
          setStreamingMessageId(null);
          abortControllerRef.current = null;
          
          // Update the message with error
          let errorText = '⚠️ An error occurred. Please try again.';
          if (error === 'auth') {
            errorText = '⚠️ Please sign in to use the AI chat.';
          } else if (error === 'credits') {
            errorText = '⚠️ Insufficient credits. Please purchase more credits.';
          }
          
          setSessions(prev => prev.map(s => {
            if (!s.active) return s;
            return {
              ...s,
              messages: s.messages.map(m => 
                m.id === agentMsgId 
                  ? { ...m, text: errorText }
                  : m
              )
            };
          }));
        }
      },
      pendingImage || undefined,
      abortControllerRef.current.signal
    );
  };

  const handleFileUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isTextFile = file.type.startsWith('text/') || 
      /\.(txt|md|json|xml|csv|log|ini|yaml|yml|toml)$/i.test(file.name);
    const isCodeFile = /\.(js|jsx|ts|tsx|py|html|css|scss|java|cpp|c|h|hpp|rs|go|rb|php|swift|kt|scala|sql|sh|bash|zsh|ps1)$/i.test(file.name);
    const isDocument = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.name);
    
    // Create file attachment object
    const fileAttachment: FileAttachment = {
      id: Date.now().toString(),
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
    };
    
    // For images, read as data URL and set as pending attachment
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPendingImage({
          data: dataUrl,
          name: file.name,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
      return;
    }
    
    // For videos, read as data URL
    if (isVideo) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        fileAttachment.dataUrl = dataUrl;
        setPendingFiles(prev => [...prev, fileAttachment]);
        
        // Also update canvas for preview
        updateActiveSettings({
          ...activeSession.settings,
          workspaceMode: 'CANVAS',
          canvas: {
            ...activeSession.settings.canvas,
            content: dataUrl,
            type: 'video',
            title: `VIDEO_${file.name.toUpperCase()}`
          }
        });
      };
      reader.readAsDataURL(file);
      return;
    }
    
    // For text and code files, read as text
    if (isTextFile || isCodeFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        fileAttachment.content = content;
        setPendingFiles(prev => [...prev, fileAttachment]);
        
        // Determine canvas type
        const canvasType = isCodeFile ? 'code' : 'text';
        const language = isCodeFile ? file.name.split('.').pop() || 'text' : undefined;
        
        // Update canvas to show the file content
        updateActiveSettings({
          ...activeSession.settings,
          workspaceMode: 'CANVAS',
          canvas: {
            content: content,
            type: canvasType,
            language: language,
            title: `FILE_${file.name.toUpperCase()}`
          }
        });
      };
      reader.readAsText(file);
      return;
    }
    
    // For PDF and DOCX files, extract text via backend
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    const isDocx = /\.docx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
    
    if (isPdf || isDocx || isCsv) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        // Show loading state
        const loadingAttachment = { ...fileAttachment, content: '⏳ Extracting text...' };
        setPendingFiles(prev => [...prev, loadingAttachment]);
        
        // Extract text from the file via backend
        const result = await extractFileText(dataUrl, file.name, file.type);
        
        if (result.success && result.text) {
          // Update the file attachment with extracted content
          setPendingFiles(prev => prev.map(f => 
            f.id === fileAttachment.id 
              ? { ...f, content: result.text }
              : f
          ));
          
          // Update canvas to show the extracted text
          const canvasTitle = isPdf 
            ? `PDF_${file.name.toUpperCase()}${result.metadata?.pages ? ` (${result.metadata.pages} pages)` : ''}`
            : isDocx 
              ? `DOCX_${file.name.toUpperCase()}`
              : `CSV_${file.name.toUpperCase()}`;
          
          updateActiveSettings({
            ...activeSession.settings,
            workspaceMode: 'CANVAS',
            canvas: {
              content: result.text,
              type: 'text',
              title: canvasTitle
            }
          });
        } else {
          // Update with error message
          setPendingFiles(prev => prev.map(f => 
            f.id === fileAttachment.id 
              ? { ...f, content: `❌ ${result.error || 'Failed to extract text'}` }
              : f
          ));
        }
      };
      reader.readAsDataURL(file);
      return;
    }
    
    // For other documents (.doc, etc.) and binary files, just store metadata
    // Don't try to read content (would show garbled text)
    fileAttachment.dataUrl = undefined;
    fileAttachment.content = undefined;
    setPendingFiles(prev => [...prev, fileAttachment]);
    
    // Show a message about the file
    const sizeStr = file.size < 1024 ? `${file.size} bytes` : 
                    file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` :
                    `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    
    // Auto-send a message about the file attachment
    handleSend(`I've attached a file: **${file.name}** (${sizeStr}, ${file.type || 'unknown type'}). Please help me with this file.`);
  };
  
  // Clear pending files
  const clearPendingFiles = () => {
    setPendingFiles([]);
  };

  const toggleSTT = () => {
    if (isRecordingSTT) {
      recognitionRef.current?.stop();
      setIsRecordingSTT(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition not supported in this browser environment.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setSttTranscript(transcript);
      };

      recognition.onend = () => setIsRecordingSTT(false);
      recognition.start();
      setIsRecordingSTT(true);
      recognitionRef.current = recognition;
    }
  };

  const toggleLive = async () => {
    // Voice chat feature coming soon - requires backend integration
    alert('🎙️ Voice chat feature coming soon! For now, please use text input.');
    return;
    
    /* Disabled: Direct Gemini API calls - needs backend integration
    if (isLiveActive) {
      liveSessionRef.current?.close();
      setIsLiveActive(false);
    } else {
      // ... voice code ...
    }
    */
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) return [
        { id: Date.now().toString(), name: "New Chat", active: true, messages: [], settings: { ...DEFAULT_SETTINGS } }
      ];
      if (prev.find(s => s.id === id)?.active) filtered[0].active = true;
      return filtered;
    });
  };

  const handleApplyPreset = (type: string) => {
    const preset = NEURAL_PRESETS[type];
    if (!preset) return;
    updateActiveSettings({ ...activeSession.settings, customPrompt: preset.prompt, temperature: preset.temp });
  };

  const createNewSession = () => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id, name: `Chat ${id.slice(-4)}`, active: true, 
      messages: [{ id: `init-${id}`, sender: 'AGENT', text: 'Hi! How can I help you today?', timestamp: new Date().toLocaleTimeString() }],
      settings: { ...DEFAULT_SETTINGS }
    };
    setSessions(prev => prev.map(s => ({ ...s, active: false })).concat(newSession));
  };

  const selectSession = (id: string) => {
    setSessions(prev => prev.map(s => ({ ...s, active: s.id === id })));
  };

  const updateActiveSettings = (settings: SettingsState) => {
    setSessions(prev => prev.map(s => s.active ? { ...s, settings } : s));
  };

  return (
    <div className="matrix-bg text-gray-300 h-screen flex flex-col overflow-hidden relative selection:bg-green-500/30 selection:text-white font-mono">
      <Overlay active={isOverlayActive} onActivate={() => setIsOverlayActive(false)} />
      <div className={`flex flex-col h-full transition-opacity duration-300 ${(isNavDrawerOpen || isCanvasDrawerOpen) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Header 
          onToggleLeft={() => setIsLeftPanelOpen(!isLeftPanelOpen)} 
          onToggleRight={() => setIsRightPanelOpen(!isRightPanelOpen)}
          onToggleNav={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
          onToggleCanvas={() => setIsCanvasDrawerOpen(true)}
          onClear={() => setSessions(prev => prev.map(s => s.active ? { ...s, messages: [] } : s))}
          onLock={() => setIsOverlayActive(true)}
          leftOpen={isLeftPanelOpen} rightOpen={isRightPanelOpen}
        />
        <div className="flex-grow flex relative overflow-hidden z-10">
          {(isLeftPanelOpen || isRightPanelOpen) && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[50] transition-opacity animate-in fade-in duration-300" onClick={() => { setIsLeftPanelOpen(false); setIsRightPanelOpen(false); }}></div>
          )}
          <Sidebar sessions={sessions} onSelect={selectSession} onCreate={createNewSession} onDelete={deleteSession} isOpen={isLeftPanelOpen} />
          <ChatBox 
            messages={activeSession.messages} isThinking={isThinking}
            isRecordingSTT={isRecordingSTT} isLiveActive={isLiveActive}
            onSend={handleSend} onFileUpload={handleFileUpload}
            onToggleSTT={toggleSTT} onToggleLive={toggleLive}
            onStopGeneration={handleStopGeneration}
            agentSettings={activeSession.settings} onUpdateSettings={updateActiveSettings}
            pendingImage={pendingImage} onClearPendingImage={() => setPendingImage(null)}
            pendingFiles={pendingFiles} onClearPendingFiles={() => setPendingFiles([])}
            sttTranscript={sttTranscript} onClearSttTranscript={() => setSttTranscript('')}
          />
          <SettingsPanel settings={activeSession.settings} onChange={updateActiveSettings} onApplyPreset={handleApplyPreset} onReset={() => updateActiveSettings({ ...activeSession.settings, ...DEFAULT_SETTINGS })} isOpen={isRightPanelOpen} />
        </div>
        <Footer />
      </div>
      <NavigationDrawer 
        isOpen={isNavDrawerOpen} 
        onClose={() => setIsNavDrawerOpen(false)} 
        currentSettings={activeSession.settings}
        onSettingsChange={updateActiveSettings}
        onModuleSelect={(item: NavItem) => {
          // Handle Canvas App - open the canvas drawer
          if (item.tool === 'canvas_app') {
            setIsNavDrawerOpen(false);
            setTimeout(() => setIsCanvasDrawerOpen(true), 300);
            return;
          }
          
          let mode: WorkspaceMode = 'CHAT';
          if (item.tool === 'browser') mode = 'PORTAL';
          else if (item.tool === 'canvas') mode = 'CANVAS';
          updateActiveSettings({ ...activeSession.settings, activeTool: item.tool, workspaceMode: mode });
          setIsNavDrawerOpen(false);
      }} />
      <CanvasAppDrawer isOpen={isCanvasDrawerOpen} onClose={() => setIsCanvasDrawerOpen(false)} />
    </div>
  );
};

export default App;
