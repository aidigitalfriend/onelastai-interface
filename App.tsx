import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import ChatBox from './components/ChatBox';
import NavigationDrawer from './components/NavigationDrawer';
import CanvasAppDrawer from './components/CanvasAppDrawer';
import VoiceChat from './components/VoiceChat';
import Overlay from './components/Overlay';
import Footer from './components/Footer';
import { ChatSession, Message, SettingsState, NavItem, CanvasState, WorkspaceMode } from './types';
import { DEFAULT_SETTINGS, NEURAL_PRESETS } from './constants';
import { 
  sendMessage, 
  streamMessage, 
  getProviders, 
  getCurrentUser,
  Providers 
} from './services/apiService';

const App: React.FC = () => {
  // UI State
  const [isOverlayActive, setIsOverlayActive] = useState(true);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isCanvasDrawerOpen, setIsCanvasDrawerOpen] = useState(false);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecordingSTT, setIsRecordingSTT] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);

  // User and Credits State
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(0);
  const [providers, setProviders] = useState<Providers>({});

  // STT Ref
  const recognitionRef = useRef<any>(null);

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

  // SSO State
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Initialize user and providers on mount
  useEffect(() => {
    const init = async () => {
      // Check if returning from SSO with token (legacy flow - keep for compatibility)
      const urlParams = new URLSearchParams(window.location.search);
      const ssoToken = urlParams.get('sso_token');
      
      if (ssoToken) {
        // Exchange SSO token for session
        try {
          const response = await fetch('/api/auth/verify-handoff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token: ssoToken }),
          });
          
          if (response.ok) {
            // Clear URL params and reload
            window.history.replaceState({}, '', '/');
          }
        } catch (error) {
          console.error('[Neural Link] SSO token verification failed:', error);
        }
      }
      
      // Try to get current user - backend checks shared cookie from main site
      const [userInfo, providersInfo] = await Promise.all([
        getCurrentUser(),
        getProviders()
      ]);
      
      setIsAuthenticating(false);
      
      if (userInfo) {
        setUser(userInfo.user);
        setCredits(userInfo.credits);
        console.log('[Neural Link] User authenticated via shared session');
      } else {
        // Not authenticated - that's OK, user can still browse
        // They'll need to login to use AI features (handled in handleSend)
        console.log('[Neural Link] No session - user can browse but needs login to chat');
      }
      
      setProviders(providersInfo);
      console.log('[Neural Link] Available providers:', Object.keys(providersInfo));
    };
    
    init();
  }, []);

  useEffect(() => {
    localStorage.setItem('neural_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find(s => s.active) || sessions[0];

  const handleSend = async (text: string) => {
    if (isThinking) return;

    // Check if user is logged in
    if (!user) {
      const loginPrompt: Message = {
        id: Date.now().toString(),
        sender: 'AGENT',
        text: '🔐 Please log in to use Maula AI. Click on the Login button at the top to sign in or create an account.',
        timestamp: new Date().toLocaleTimeString()
      };
      setSessions(prev => prev.map(s =>
        s.active ? { ...s, messages: [...s.messages, loginPrompt] } : s
      ));
      return;
    }

    // Check credits
    if (credits <= 0) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        sender: 'AGENT',
        text: '⚠️ INSUFFICIENT CREDITS. Please purchase credits to continue using Neural Link. Open Settings panel to buy credit packages.',
        timestamp: new Date().toLocaleTimeString()
      };
      setSessions(prev => prev.map(s =>
        s.active ? { ...s, messages: [...s.messages, errorMsg] } : s
      ));
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const userMsg: Message = { id: Date.now().toString(), sender: 'YOU', text, timestamp };

    setSessions(prev => prev.map(s =>
      s.active ? { ...s, messages: [...s.messages, userMsg] } : s
    ));

    setIsThinking(true);

    // Get provider and model from current session settings
    const provider = activeSession.settings.provider || 'anthropic';
    const model = activeSession.settings.model || 'claude-3-5-sonnet-20241022';
    const customPrompt = activeSession.settings.customPrompt;
    
    // Use streaming for better UX
    let responseText = '';
    const responseId = (Date.now() + 1).toString();

    // Add placeholder message
    const placeholderMsg: Message = {
      id: responseId,
      sender: 'AGENT',
      text: '▌',
      timestamp: new Date().toLocaleTimeString()
    };
    setSessions(prev => prev.map(s =>
      s.active ? { ...s, messages: [...s.messages, placeholderMsg] } : s
    ));

    try {
      await streamMessage(
        text,
        provider,
        model,
        activeSession.id,
        customPrompt,
        // onChunk
        (chunk: string) => {
          responseText += chunk;
          setSessions(prev => prev.map(s =>
            s.active ? { 
              ...s, 
              messages: s.messages.map(m => 
                m.id === responseId 
                  ? { ...m, text: responseText + '▌' }
                  : m
              )
            } : s
          ));
        },
        // onDone
        (response) => {
          setSessions(prev => prev.map(s =>
            s.active ? { 
              ...s, 
              messages: s.messages.map(m => 
                m.id === responseId 
                  ? { ...m, text: responseText || 'Response received.' }
                  : m
              )
            } : s
          ));
          setCredits(response.balance);
          setIsThinking(false);
        },
        // onError
        (error: string) => {
          console.error('[Neural Link] Stream error:', error);
          handleNonStreamingFallback(text, provider, model, customPrompt, responseId);
        }
      );
    } catch (error) {
      console.error('[Neural Link] Chat error:', error);
      handleNonStreamingFallback(text, provider, model, customPrompt, responseId);
    }
  };

  const handleNonStreamingFallback = async (
    text: string, 
    provider: string, 
    model: string, 
    systemPrompt: string | undefined,
    responseId: string
  ) => {
    const result = await sendMessage(text, provider, model, activeSession.id, systemPrompt);
    
    if (result.success && result.response) {
      setSessions(prev => prev.map(s =>
        s.active ? { 
          ...s, 
          messages: s.messages.map(m => 
            m.id === responseId 
              ? { ...m, text: result.response!.content }
              : m
          )
        } : s
      ));
      if (result.credits !== undefined) {
        setCredits(result.credits);
      }
    } else {
      setSessions(prev => prev.map(s =>
        s.active ? { 
          ...s, 
          messages: s.messages.map(m => 
            m.id === responseId 
              ? { ...m, text: '⚠️ Error: ' + (result.error || 'Unknown error') }
              : m
          )
        } : s
      ));
    }
    
    setIsThinking(false);
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
          title: 'UPLOAD_' + file.name.toUpperCase()
        }
      });

      handleSend('I have uploaded a file: ' + file.name + '. Please analyze it in the workspace.');
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
        alert("Speech Recognition not supported in this browser.");
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
        // Could update an input field here
      };

      recognition.onend = () => setIsRecordingSTT(false);
      recognition.start();
      setIsRecordingSTT(true);
      recognitionRef.current = recognition;
    }
  };

  const toggleLive = async () => {
    // Open Voice Chat modal for Speech-to-Speech
    setIsVoiceChatOpen(true);
    setIsLiveActive(true);
  };

  const handleVoiceChatClose = () => {
    setIsVoiceChatOpen(false);
    setIsLiveActive(false);
  };

  const handleCreditsUpdate = (creditsUsed: number) => {
    setCredits(prev => Math.max(0, prev - creditsUsed));
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
      id, 
      name: 'PROTOCOL_LOG_' + id.slice(-4), 
      active: true,
      messages: [{ id: 'init-' + id, sender: 'AGENT', text: 'New neural channel opened. Workspace ready.', timestamp: new Date().toLocaleTimeString() }],
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

  const leftPanelOrRightOpen = isLeftPanelOpen || isRightPanelOpen;
  const navOrCanvasOpen = isNavDrawerOpen || isCanvasDrawerOpen;

  return (
    <div className="matrix-bg text-gray-300 h-screen flex flex-col overflow-hidden relative selection:bg-green-500/30 selection:text-white font-mono">
      <Overlay active={isOverlayActive} onActivate={() => setIsOverlayActive(false)} />
      <div className={`flex flex-col h-full transition-opacity duration-300 ${navOrCanvasOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Header 
          onToggleLeft={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          onToggleRight={() => setIsRightPanelOpen(!isRightPanelOpen)}
          onToggleNav={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
          onToggleCanvas={() => setIsCanvasDrawerOpen(true)}
          onClear={() => setSessions(prev => prev.map(s => s.active ? { ...s, messages: [] } : s))}
          onLock={() => setIsOverlayActive(true)}
          leftOpen={isLeftPanelOpen} 
          rightOpen={isRightPanelOpen}
          credits={credits}
          user={user}
        />
        <div className="flex-grow flex relative overflow-hidden z-10">
          {leftPanelOrRightOpen && (
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[50] transition-opacity animate-in fade-in duration-300" 
              onClick={() => { setIsLeftPanelOpen(false); setIsRightPanelOpen(false); }}
            />
          )}
          <Sidebar 
            sessions={sessions} 
            onSelect={selectSession} 
            onCreate={createNewSession} 
            onDelete={deleteSession} 
            isOpen={isLeftPanelOpen} 
          />
          <ChatBox 
            messages={activeSession.messages} 
            isThinking={isThinking}
            isRecordingSTT={isRecordingSTT} 
            isLiveActive={isLiveActive}
            onSend={handleSend} 
            onFileUpload={handleFileUpload}
            onToggleSTT={toggleSTT} 
            onToggleLive={toggleLive}
            agentSettings={activeSession.settings} 
            onUpdateSettings={updateActiveSettings}
          />
          <SettingsPanel 
            settings={activeSession.settings} 
            onChange={updateActiveSettings} 
            onApplyPreset={handleApplyPreset} 
            onReset={() => updateActiveSettings({ ...activeSession.settings, ...DEFAULT_SETTINGS })} 
            isOpen={isRightPanelOpen}
            providers={providers}
            credits={credits}
            onCreditsChange={setCredits}
          />
        </div>
        <Footer />
      </div>
      <NavigationDrawer 
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        currentSettings={activeSession.settings}
        onSettingsChange={updateActiveSettings}
        onModuleSelect={(item: NavItem) => {
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
        }} 
      />
      <CanvasAppDrawer isOpen={isCanvasDrawerOpen} onClose={() => setIsCanvasDrawerOpen(false)} />
      <VoiceChat 
        isOpen={isVoiceChatOpen} 
        onClose={handleVoiceChatClose}
        onCreditsUpdate={handleCreditsUpdate}
        systemPrompt={activeSession.settings.customPrompt}
      />
    </div>
  );
};

export default App;
