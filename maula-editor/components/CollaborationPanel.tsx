import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collaborationService,
  CollaborationSession,
  CollaboratorUser,
  ChatMessage,
  UserRole,
  SessionSettings,
} from '../services/collaboration';

type CollabTab = 'session' | 'participants' | 'chat' | 'voice' | 'settings';

export const CollaborationPanel: React.FC = () => {
  const { theme } = useStore();
  
  // State
  const [activeTab, setActiveTab] = useState<CollabTab>('session');
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [currentUser, setCurrentUser] = useState<CollaboratorUser | null>(null);
  const [participants, setParticipants] = useState<CollaboratorUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // Form state
  const [sessionName, setSessionName] = useState('My Collaboration Session');
  const [userName, setUserName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<SessionSettings>({
    allowAnonymous: false,
    requireApproval: false,
    allowVoice: true,
    allowVideo: true,
    allowChat: true,
    allowTerminalSharing: true,
    allowDebugSharing: true,
    defaultRole: 'editor',
    maxParticipants: 10,
    autoRecord: false,
  });
  
  const chatRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fix: Check for all dark themes including charcoal-aurora and steel
  const isDark = theme !== 'light' && theme !== 'high-contrast-light';

  // Initialize collaboration service
  useEffect(() => {
    const init = async () => {
      try {
        await collaborationService.initialize();
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to initialize collaboration:', error);
      }
    };
    init();

    // Setup event listeners
    const unsubs = [
      collaborationService.on('connected', () => setIsConnected(true)),
      collaborationService.on('disconnected', () => setIsConnected(false)),
      collaborationService.on('session:created', ({ data }) => {
        setSession(data.session);
        setCurrentUser(data.user);
      }),
      collaborationService.on('session:joined', ({ data }) => {
        setSession(data.session);
        setCurrentUser(data.user);
        setParticipants(data.session.participants);
      }),
      collaborationService.on('session:ended', () => {
        setSession(null);
        setParticipants([]);
        setMessages([]);
      }),
      collaborationService.on('user:joined', ({ data }) => {
        setParticipants(prev => [...prev.filter(p => p.id !== data.user.id), data.user]);
      }),
      collaborationService.on('user:left', ({ data }) => {
        setParticipants(prev => prev.filter(p => p.id !== data.userId));
      }),
      collaborationService.on('user:updated', ({ data }) => {
        setParticipants(prev => prev.map(p => p.id === data.user.id ? { ...p, ...data.user } : p));
      }),
      collaborationService.on('chat:message', ({ data }) => {
        setMessages(prev => [...prev, data.message]);
      }),
      collaborationService.on('chat:typing', ({ data }) => {
        if (data.isTyping) {
          setTypingUsers(prev => [...new Set([...prev, data.userId])]);
        } else {
          setTypingUsers(prev => prev.filter(id => id !== data.userId));
        }
      }),
      collaborationService.on('cursor:moved', ({ data }) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.userId ? { ...p, cursor: data.cursor } : p
        ));
      }),
      collaborationService.on('recording:started', () => setIsRecording(true)),
      collaborationService.on('recording:stopped', () => setIsRecording(false)),
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
      collaborationService.disconnect();
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Handlers
  const handleCreateSession = async () => {
    if (!userName.trim()) return;
    
    try {
      const newSession = await collaborationService.createSession({
        name: sessionName,
        projectId: 'current-project',
        settings,
      });
      await collaborationService.joinSession(newSession.id, { name: userName });
      setShowCreateModal(false);
      setActiveTab('participants');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleJoinSession = async () => {
    if (!userName.trim() || !inviteCode.trim()) return;
    
    try {
      await collaborationService.joinByInviteCode(inviteCode, { name: userName });
      setShowJoinModal(false);
      setActiveTab('participants');
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const handleLeaveSession = async () => {
    await collaborationService.leaveSession();
    setSession(null);
    setParticipants([]);
    setMessages([]);
  };

  const handleEndSession = async () => {
    await collaborationService.endSession();
    setSession(null);
    setParticipants([]);
    setMessages([]);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    collaborationService.sendChatMessage(chatInput);
    setChatInput('');
    collaborationService.sendTypingIndicator(false);
  };

  const handleChatInputChange = (value: string) => {
    setChatInput(value);
    
    if (value) {
      collaborationService.sendTypingIndicator(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        collaborationService.sendTypingIndicator(false);
      }, 2000);
    } else {
      collaborationService.sendTypingIndicator(false);
    }
  };

  const handleToggleVoice = async () => {
    try {
      if (voiceEnabled) {
        await collaborationService.stopVoice();
        setVoiceEnabled(false);
      } else {
        await collaborationService.startVoice();
        setVoiceEnabled(true);
      }
    } catch (error) {
      console.error('Failed to toggle voice:', error);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      const recording = collaborationService.stopRecording();
      console.log('Recording saved:', recording);
    } else {
      collaborationService.startRecording();
    }
    setIsRecording(!isRecording);
  };

  const handleCopyInvite = () => {
    const link = collaborationService.generateInviteLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const handleUpdateRole = (userId: string, role: UserRole) => {
    collaborationService.updateUserRole(userId, role);
  };

  const handleKickUser = (userId: string) => {
    collaborationService.kickUser(userId);
  };

  // Role badge component
  const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const colors = {
      owner: 'bg-yellow-500 text-black',
      editor: 'bg-blue-500 text-white',
      viewer: 'bg-gray-500 text-white',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[role]}`}>
        {role.toUpperCase()}
      </span>
    );
  };

  // Cursor indicator component
  const CursorIndicator: React.FC<{ user: CollaboratorUser }> = ({ user }) => (
    <div className="flex items-center gap-1.5">
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: user.color }}
      />
      {user.cursor && (
        <span className={`text-[10px] font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {user.cursor.filePath.split('/').pop()}:{user.cursor.line}
        </span>
      )}
    </div>
  );

  // No session view
  if (!session) {
    return (
      <div className={`h-full flex flex-col ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b ${isDark ? 'border-[#1c1c1c] bg-[#0d0d0d]' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🧑‍🤝‍🧑</span>
            <div>
              <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Real-Time Collaboration
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {isConnected ? '● Connected' : '○ Disconnected'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="text-center mb-4">
            <span className="text-5xl">👥</span>
            <h3 className={`text-lg font-semibold mt-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Start Collaborating
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Code together in real-time with your team
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full max-w-xs py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25"
          >
            🚀 Start New Session
          </button>

          <button
            onClick={() => setShowJoinModal(true)}
            className={`w-full max-w-xs py-3 rounded-lg font-medium transition-all border ${
              isDark
                ? 'bg-[#0d0d0d] border-[#1c1c1c] text-white hover:border-blue-500'
                : 'bg-white border-gray-200 text-gray-900 hover:border-blue-400'
            }`}
          >
            🔗 Join with Code
          </button>

          {/* Features */}
          <div className={`mt-6 grid grid-cols-2 gap-3 w-full max-w-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {[
              { icon: '✏️', label: 'Co-edit files' },
              { icon: '💬', label: 'Chat & Voice' },
              { icon: '👆', label: 'Cursor sharing' },
              { icon: '🎬', label: 'Session recording' },
              { icon: '💻', label: 'Share terminal' },
              { icon: '🔒', label: 'Role permissions' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2 text-xs">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Create Session Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-md mx-4 p-6 rounded-xl ${isDark ? 'bg-[#0d0d0d]' : 'bg-white'}`}
                onClick={e => e.stopPropagation()}
              >
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  🚀 Start New Session
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Session Name
                    </label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="My Collaboration Session"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>

                  <div className={`p-3 rounded-lg ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Session Settings
                    </p>
                    <div className="space-y-2">
                      {[
                        { key: 'allowVoice', label: 'Allow voice chat', icon: '🎤' },
                        { key: 'allowChat', label: 'Allow text chat', icon: '💬' },
                        { key: 'allowTerminalSharing', label: 'Allow terminal sharing', icon: '💻' },
                        { key: 'autoRecord', label: 'Auto-record session', icon: '🎬' },
                      ].map(setting => (
                        <label key={setting.key} className="flex items-center justify-between cursor-pointer">
                          <span className={`text-xs flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {setting.icon} {setting.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={settings[setting.key as keyof SessionSettings] as boolean}
                            onChange={(e) => setSettings(prev => ({ ...prev, [setting.key]: e.target.checked }))}
                            className="w-4 h-4 accent-blue-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      isDark ? 'bg-[#1a1a1a] text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSession}
                    disabled={!userName.trim()}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      userName.trim()
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Start Session
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Join Session Modal */}
        <AnimatePresence>
          {showJoinModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              onClick={() => setShowJoinModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-md mx-4 p-6 rounded-xl ${isDark ? 'bg-[#0d0d0d]' : 'bg-white'}`}
                onClick={e => e.stopPropagation()}
              >
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  🔗 Join Session
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Invite Code or Link
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Paste invite code or link"
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        isDark
                          ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      isDark ? 'bg-[#1a1a1a] text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinSession}
                    disabled={!userName.trim() || !inviteCode.trim()}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      userName.trim() && inviteCode.trim()
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Join Session
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Active session view
  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDark ? 'border-[#1c1c1c] bg-[#0d0d0d]' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="text-xl">🧑‍🤝‍🧑</span>
              {isRecording && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {session.name}
              </h2>
              <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {participants.filter(p => p.isOnline).length} online • {participants.length} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-1.5 rounded hover:bg-blue-500/20 text-blue-400"
              title="Invite"
            >
              🔗
            </button>
            {currentUser?.role === 'owner' && (
              <button
                onClick={handleToggleRecording}
                className={`p-1.5 rounded ${isRecording ? 'bg-red-500/20 text-red-400' : 'hover:bg-gray-500/20 text-gray-400'}`}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                {isRecording ? '⏹️' : '🎬'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-[#1c1c1c]' : 'border-gray-200'}`}>
        {[
          { id: 'participants', label: 'Team', icon: '👥' },
          { id: 'chat', label: 'Chat', icon: '💬' },
          { id: 'voice', label: 'Voice', icon: '🎤' },
          { id: 'settings', label: 'Settings', icon: '⚙️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CollabTab)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? isDark
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-blue-600 border-b-2 border-blue-500'
                : isDark
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <div className="h-full overflow-auto p-4 space-y-3">
            {/* Participant Avatars Row */}
            <div className="flex flex-wrap gap-2 pb-3 border-b border-dashed border-gray-600">
              {participants.map(user => (
                <div
                  key={user.id}
                  className="relative group"
                  title={user.name}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      user.isOnline ? '' : 'opacity-50'
                    }`}
                    style={{ backgroundColor: user.color }}
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1e1e1e]" />
                  )}
                  {user.isSpeaking && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[8px]">
                      🎤
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Participant List */}
            {participants.map(user => (
              <div
                key={user.id}
                className={`p-3 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {user.name}
                        </span>
                        <RoleBadge role={user.role} />
                        {user.id === currentUser?.id && (
                          <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(you)</span>
                        )}
                      </div>
                      <CursorIndicator user={user} />
                    </div>
                  </div>

                  {/* Actions */}
                  {currentUser?.role === 'owner' && user.id !== currentUser.id && (
                    <div className="flex gap-1">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                        className={`text-[10px] px-1 py-0.5 rounded ${
                          isDark ? 'bg-[#1a1a1a] text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => handleKickUser(user.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remove from session"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div
              ref={chatRef}
              className="flex-1 overflow-auto p-4 space-y-3"
            >
              {messages.length === 0 ? (
                <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <span className="text-3xl">💬</span>
                  <p className="text-sm mt-2">No messages yet</p>
                  <p className="text-xs">Start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="flex gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: msg.userColor }}
                    >
                      {msg.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {msg.userName}
                        </span>
                        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {msg.type === 'code' ? (
                        <pre className={`mt-1 p-2 rounded text-xs font-mono overflow-x-auto ${
                          isDark ? 'bg-[#0a0a0a]' : 'bg-gray-100'
                        }`}>
                          {msg.content}
                        </pre>
                      ) : (
                        <p className={`text-sm break-words ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {typingUsers.map(id => participants.find(p => p.id === id)?.name).filter(Boolean).join(', ')} typing...
                </div>
              )}
            </div>

            {/* Input */}
            <div className={`p-3 border-t ${isDark ? 'border-[#1c1c1c]' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => handleChatInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                    isDark
                      ? 'bg-[#0a0a0a] border-[#1c1c1c] text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    chatInput.trim()
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <div className="h-full p-4 space-y-4">
            <div className={`p-4 rounded-lg border text-center ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}>
              <div className="text-4xl mb-3">
                {voiceEnabled ? '🎙️' : '🔇'}
              </div>
              <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {voiceEnabled ? 'Voice Active' : 'Voice Inactive'}
              </h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {voiceEnabled 
                  ? 'Your microphone is on. Others can hear you.'
                  : 'Click below to join voice chat'}
              </p>
              <button
                onClick={handleToggleVoice}
                className={`mt-4 px-6 py-2 rounded-lg font-medium ${
                  voiceEnabled
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {voiceEnabled ? '🔇 Leave Voice' : '🎤 Join Voice'}
              </button>
            </div>

            {/* Voice participants */}
            <div>
              <h4 className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                In Voice ({participants.filter(p => p.audioEnabled).length})
              </h4>
              <div className="space-y-2">
                {participants.filter(p => p.audioEnabled).map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-[#0d0d0d]' : 'bg-white'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                        user.isSpeaking ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-[#1e1e1e]' : ''
                      }`}
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {user.name}
                    </span>
                    {user.isSpeaking && (
                      <span className="text-green-500 text-xs">Speaking</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="h-full overflow-auto p-4 space-y-4">
            {/* Session Info */}
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}>
              <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Session Info
              </h4>
              <div className={`space-y-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>ID: <span className="font-mono">{session.id}</span></p>
                <p>Created: {new Date(session.createdAt).toLocaleString()}</p>
                <p>Host: {participants.find(p => p.id === session.hostId)?.name || 'Unknown'}</p>
              </div>
            </div>

            {/* Your Role */}
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-[#0d0d0d] border-[#1c1c1c]' : 'bg-white border-gray-200'}`}>
              <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Your Role
              </h4>
              <div className="flex items-center gap-2">
                <RoleBadge role={currentUser?.role || 'viewer'} />
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {currentUser?.role === 'owner' && 'You have full control of this session'}
                  {currentUser?.role === 'editor' && 'You can edit files and participate'}
                  {currentUser?.role === 'viewer' && 'You can view but not edit'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleLeaveSession}
                className={`w-full py-2 rounded-lg text-sm font-medium ${
                  isDark
                    ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#4c4c4c]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Leave Session
              </button>
              {currentUser?.role === 'owner' && (
                <button
                  onClick={handleEndSession}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  End Session for Everyone
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md mx-4 p-6 rounded-xl ${isDark ? 'bg-[#0d0d0d]' : 'bg-white'}`}
              onClick={e => e.stopPropagation()}
            >
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                🔗 Invite Collaborators
              </h3>

              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Share this link:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={collaborationService.generateInviteLink() || ''}
                    className={`flex-1 px-3 py-2 rounded border text-xs font-mono ${
                      isDark
                        ? 'bg-[#0d0d0d] border-[#1c1c1c] text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                  <button
                    onClick={handleCopyInvite}
                    className={`px-3 py-2 rounded text-sm font-medium ${
                      copiedInvite
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {copiedInvite ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowInviteModal(false)}
                className={`w-full mt-4 py-2 rounded-lg text-sm font-medium ${
                  isDark ? 'bg-[#1a1a1a] text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollaborationPanel;
