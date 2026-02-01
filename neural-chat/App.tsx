
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
import { ChatSession, Message, SettingsState, NavItem, CanvasState, WorkspaceMode } from './types';
import { DEFAULT_SETTINGS, NEURAL_PRESETS } from './constants';
import { callBackendAPI } from './services/apiService';

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
        name: "PROTOCOL_INITIAL_CONTACT",
        active: true,
        messages: [
          { 
            id: 'init-1', 
            sender: 'AGENT', 
            text: 'Uplink established. Secure line verified. Neural link at 100% capacity. Workspace synchronized.', 
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

  const handleSend = async (text: string) => {
    if (isThinking) return;

    const timestamp = new Date().toLocaleTimeString();
    const userMsg: Message = { id: Date.now().toString(), sender: 'YOU', text, timestamp };

    setSessions(prev => prev.map(s => 
      s.active ? { ...s, messages: [...s.messages, userMsg] } : s
    ));

    setIsThinking(true);
    const result = await callBackendAPI(text, activeSession.settings);
    setIsThinking(false);

    const settingsUpdate: Partial<SettingsState> = {};
    if (result.navigationUrl) {
      settingsUpdate.portalUrl = result.navigationUrl;
      settingsUpdate.workspaceMode = 'PORTAL';
    }
    if (result.canvasUpdate) {
      settingsUpdate.canvas = { ...activeSession.settings.canvas, ...result.canvasUpdate };
      settingsUpdate.workspaceMode = 'CANVAS';
    }
    if (Object.keys(settingsUpdate).length > 0) {
      updateActiveSettings({ ...activeSession.settings, ...settingsUpdate } as SettingsState);
    }

    const agentMsg: Message = { 
      id: (Date.now() + 1).toString(), 
      sender: 'AGENT', 
      text: result.text, 
      timestamp: new Date().toLocaleTimeString(),
      isImage: result.isImage,
      groundingUrls: result.urls
    };

    setSessions(prev => prev.map(s => 
      s.active ? { ...s, messages: [...s.messages, agentMsg] } : s
    ));
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isCode = file.name.endsWith('.js') || file.name.endsWith('.py') || file.name.endsWith('.html') || file.name.endsWith('.css');
      
      let type: CanvasState['type'] = 'text';
      if (isImage) type = 'image';
      else if (isVideo) type = 'video';
      else if (isCode) type = 'code';

      updateActiveSettings({
        ...activeSession.settings,
        workspaceMode: 'CANVAS',
        canvas: {
          ...activeSession.settings.canvas,
          content: content,
          type: type,
          title: `UPLOAD_${file.name.toUpperCase()}`
        }
      });

      handleSend(`I have uploaded a file: ${file.name}. Please analyze it in the workspace.`);
    };

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
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
        { id: Date.now().toString(), name: "NEW_PROTOCOL", active: true, messages: [], settings: { ...DEFAULT_SETTINGS } }
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
      id, name: `PROTOCOL_LOG_${id.slice(-4)}`, active: true, 
      messages: [{ id: `init-${id}`, sender: 'AGENT', text: 'New neural channel opened. Workspace ready.', timestamp: new Date().toLocaleTimeString() }],
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
            agentSettings={activeSession.settings} onUpdateSettings={updateActiveSettings}
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
