import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Check, 
  ExternalLink, 
  Globe, 
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
  Pencil,
  X,
  Download,
  Maximize2,
  Minimize2,
  Search,
  ArrowDown,
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Pin,
  Clock,
  Zap,
  Sparkles,
  StopCircle,
  Hash,
  Smile,
  Link,
  Code,
  Bold,
  Italic,
  List,
  Quote,
  CornerDownLeft,
  Command,
  Keyboard,
  Type,
  Eye,
  MessageCircle,
  Info,
  Braces,
  FileJson,
  Database
} from 'lucide-react';
import { Message, SettingsState, WorkspaceMode, FileAttachment } from '../types';

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
  onDeleteMessage?: (messageId: string) => void;
  onStopGeneration?: () => void;
  agentSettings: SettingsState;
  onUpdateSettings: (settings: SettingsState) => void;
  pendingImage?: { data: string; name: string; mimeType: string } | null;
  onClearPendingImage?: () => void;
  pendingFiles?: FileAttachment[];
  onClearPendingFiles?: () => void;
  sttTranscript?: string;
  onClearSttTranscript?: () => void;
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
  onStopGeneration,
  agentSettings, 
  onUpdateSettings,
  pendingImage,
  onClearPendingImage,
  pendingFiles = [],
  onClearPendingFiles,
  sttTranscript,
  onClearSttTranscript
}) => {
  // Core states
  const [inputText, setInputText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(new Set());
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  
  // Professional features states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [spellSuggestions, setSpellSuggestions] = useState<{word: string, suggestions: string[], position: number}[]>([]);
  const [showSpellSuggestions, setShowSpellSuggestions] = useState(false);
  const [activeSpellIndex, setActiveSpellIndex] = useState(0);
  
  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Slash commands
  const slashCommands = [
    { command: '/clear', description: 'Clear conversation', icon: <Trash2 size={14} /> },
    { command: '/export', description: 'Export chat history', icon: <Download size={14} /> },
    { command: '/code', description: 'Insert code block', icon: <Code size={14} /> },
    { command: '/image', description: 'Generate an image', icon: <ImageIcon size={14} /> },
    { command: '/search', description: 'Search the web', icon: <Search size={14} /> },
    { command: '/help', description: 'Show available commands', icon: <Info size={14} /> },
    { command: '/focus', description: 'Toggle focus mode', icon: <Eye size={14} /> },
    { command: '/compact', description: 'Toggle compact view', icon: <Minimize2 size={14} /> },
  ];

  // Common emojis
  const quickEmojis = ['👍', '👎', '❤️', '🎉', '🤔', '😊', '🚀', '✨', '💡', '🔥', '👀', '💪'];

  // Smart sentence suggestions based on context
  const smartSuggestions: Record<string, string[]> = {
    'how': ['How do I', 'How can I', 'How does', 'How to', 'How would you'],
    'what': ['What is', 'What are', 'What does', "What's the difference between", 'What would happen if'],
    'can': ['Can you help me', 'Can you explain', 'Can you show me', 'Can you write', 'Can you create'],
    'help': ['Help me understand', 'Help me write', 'Help me debug', 'Help me create', 'Help me with'],
    'explain': ['Explain how', 'Explain why', 'Explain the difference between', 'Explain in simple terms'],
    'write': ['Write a function that', 'Write a script to', 'Write code for', 'Write an example of'],
    'create': ['Create a', 'Create an example of', 'Create a function that', 'Create a component for'],
    'show': ['Show me how to', 'Show me an example of', 'Show me the code for'],
    'why': ['Why does', 'Why is', "Why isn't", 'Why would'],
    'could': ['Could you help me', 'Could you explain', 'Could you show me', 'Could you write'],
    'please': ['Please help me', 'Please explain', 'Please show me', 'Please write'],
    'i': ["I want to", "I need help with", "I'm trying to", "I don't understand"],
    'debug': ['Debug this code', 'Debug the error in', 'Debug why'],
    'fix': ['Fix this error', 'Fix the bug in', 'Fix my code'],
    'convert': ['Convert this to', 'Convert from', 'Convert the following'],
    'generate': ['Generate a', 'Generate code for', 'Generate an example of'],
    'analyze': ['Analyze this code', 'Analyze the data', 'Analyze the error'],
    'compare': ['Compare the difference between', 'Compare these two', 'Compare and contrast'],
    'summarize': ['Summarize this', 'Summarize the main points of', 'Summarize in bullet points'],
    'translate': ['Translate this to', 'Translate from', 'Translate the following'],
    'optimize': ['Optimize this code', 'Optimize for performance', 'Optimize the function'],
    'refactor': ['Refactor this code', 'Refactor to use', 'Refactor for better readability'],
    'test': ['Test this function', 'Test the code', 'Write tests for'],
    'implement': ['Implement a', 'Implement the following', 'Implement using'],
  };

  // Common misspellings dictionary
  const spellCheckDict: Record<string, string[]> = {
    'teh': ['the'],
    'thier': ['their', 'there'],
    'recieve': ['receive'],
    'seperate': ['separate'],
    'occured': ['occurred'],
    'untill': ['until'],
    'wierd': ['weird'],
    'definately': ['definitely'],
    'accomodate': ['accommodate'],
    'occurence': ['occurrence'],
    'neccessary': ['necessary'],
    'succesful': ['successful'],
    'tommorrow': ['tomorrow'],
    'goverment': ['government'],
    'enviroment': ['environment'],
    'beggining': ['beginning'],
    'beleive': ['believe'],
    'calender': ['calendar'],
    'collegue': ['colleague'],
    'commited': ['committed'],
    'concious': ['conscious'],
    'diference': ['difference'],
    'disapoint': ['disappoint'],
    'embarass': ['embarrass'],
    'existance': ['existence'],
    'foriegn': ['foreign'],
    'freind': ['friend'],
    'garantee': ['guarantee'],
    'happend': ['happened'],
    'immediatly': ['immediately'],
    'independant': ['independent'],
    'knowlege': ['knowledge'],
    'libary': ['library'],
    'maintainance': ['maintenance'],
    'mispell': ['misspell'],
    'noticable': ['noticeable'],
    'ocasion': ['occasion'],
    'posession': ['possession'],
    'prefered': ['preferred'],
    'privelege': ['privilege'],
    'profesional': ['professional'],
    'publically': ['publicly'],
    'recomend': ['recommend'],
    'refered': ['referred'],
    'relevent': ['relevant'],
    'remeber': ['remember'],
    'repitition': ['repetition'],
    'resistence': ['resistance'],
    'responsable': ['responsible'],
    'rythm': ['rhythm'],
    'similiar': ['similar'],
    'sincerely': ['sincerely'],
    'speach': ['speech'],
    'strenght': ['strength'],
    'suprise': ['surprise'],
    'truely': ['truly'],
    'vaccum': ['vacuum'],
    'wether': ['whether', 'weather'],
    'writting': ['writing'],
    'funtion': ['function'],
    'javscript': ['javascript'],
    'typscript': ['typescript'],
    'pyhton': ['python'],
    'reutrn': ['return'],
    'cosnt': ['const'],
    'improt': ['import'],
    'exprot': ['export'],
    'fucntion': ['function'],
    'arry': ['array'],
    'objcet': ['object'],
    'stirng': ['string'],
    'nubmer': ['number'],
    'boolen': ['boolean'],
    'varaible': ['variable'],
    'paramter': ['parameter'],
    'arguemnt': ['argument'],
    'elemnt': ['element'],
    'compnent': ['component'],
    'modle': ['model', 'module'],
    'sevrer': ['server'],
    'clinet': ['client'],
    'databse': ['database'],
    'qurey': ['query'],
    'resposne': ['response'],
    'reqeust': ['request'],
    'heigth': ['height'],
    'widht': ['width'],
    'lenght': ['length'],
    'calss': ['class'],
    'metohd': ['method'],
    'proprty': ['property'],
  };

  // Keyboard shortcuts
  const keyboardShortcuts = [
    { keys: ['⌘', 'Enter'], action: 'Send message' },
    { keys: ['⌘', 'K'], action: 'Search in chat' },
    { keys: ['⌘', 'B'], action: 'Bold text' },
    { keys: ['⌘', 'I'], action: 'Italic text' },
    { keys: ['⌘', 'E'], action: 'Insert code' },
    { keys: ['⌘', '/'], action: 'Show commands' },
    { keys: ['Esc'], action: 'Cancel/Close' },
    { keys: ['↑'], action: 'Edit last message' },
  ];

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to get file icon based on type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={16} className="text-purple-400" />;
    if (mimeType.startsWith('video/')) return <Video size={16} className="text-pink-400" />;
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) return <FileCode size={16} className="text-yellow-400" />;
    if (mimeType.includes('json')) return <FileJson size={16} className="text-orange-400" />;
    if (mimeType.includes('html') || mimeType.includes('xml')) return <Code size={16} className="text-red-400" />;
    if (mimeType.includes('css')) return <Braces size={16} className="text-blue-400" />;
    if (mimeType.includes('sql') || mimeType.includes('database')) return <Database size={16} className="text-green-400" />;
    return <FileText size={16} className="text-emerald-400" />;
  };

  // Estimate tokens (rough approximation: ~4 chars per token)
  const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
  };

  // Generate smart suggestions based on input
  const generateSuggestions = (text: string): string[] => {
    if (!text || text.length < 2) return [];
    
    const words = text.toLowerCase().split(' ');
    const lastWord = words[words.length - 1];
    const textLower = text.toLowerCase().trim();
    
    // Check if typing a slash command
    if (text.startsWith('/')) return [];
    
    // Find matching suggestions
    const matches: string[] = [];
    
    // Check for keyword-based suggestions
    for (const [keyword, suggestions] of Object.entries(smartSuggestions)) {
      if (lastWord.startsWith(keyword.substring(0, Math.min(lastWord.length, keyword.length))) && lastWord.length >= 2) {
        suggestions.forEach(s => {
          if (!matches.includes(s)) {
            // Replace last word with suggestion
            const prefix = words.slice(0, -1).join(' ');
            const fullSuggestion = prefix ? `${prefix} ${s}` : s;
            if (fullSuggestion.toLowerCase().startsWith(textLower) || s.toLowerCase().startsWith(lastWord)) {
              matches.push(fullSuggestion);
            }
          }
        });
      }
    }
    
    // Also suggest completions that start with the current text
    for (const [keyword, suggestions] of Object.entries(smartSuggestions)) {
      if (textLower.startsWith(keyword)) {
        suggestions.forEach(s => {
          if (!matches.includes(s) && s.toLowerCase().startsWith(textLower)) {
            matches.push(s);
          }
        });
      }
    }
    
    return matches.slice(0, 5); // Return top 5 suggestions
  };

  // Check spelling and return suggestions
  const checkSpelling = (text: string): {word: string, suggestions: string[], position: number}[] => {
    if (!text) return [];
    
    const words = text.split(/\s+/);
    const results: {word: string, suggestions: string[], position: number}[] = [];
    let position = 0;
    
    words.forEach((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
      if (cleanWord && spellCheckDict[cleanWord]) {
        results.push({
          word: word,
          suggestions: spellCheckDict[cleanWord],
          position: position
        });
      }
      position += word.length + 1; // +1 for space
    });
    
    return results;
  };

  // Apply spell correction
  const applySpellCorrection = (correction: string, originalWord: string, position: number) => {
    const before = inputText.substring(0, position);
    const after = inputText.substring(position + originalWord.length);
    setInputText(before + correction + after);
    setShowSpellSuggestions(false);
    setSpellSuggestions([]);
    textareaRef.current?.focus();
  };

  // Apply suggestion
  const applySuggestion = (suggestion: string) => {
    setInputText(suggestion + ' ');
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedSuggestionIndex(0);
    textareaRef.current?.focus();
  };

  // Update character count and token estimate
  useEffect(() => {
    setCharCount(inputText.length);
    setTokenEstimate(estimateTokens(inputText));
  }, [inputText]);

  // Handle STT transcript - insert into input field
  useEffect(() => {
    if (sttTranscript && sttTranscript.trim()) {
      setInputText(prev => {
        const separator = prev.trim() ? ' ' : '';
        return prev + separator + sttTranscript;
      });
      onClearSttTranscript?.();
    }
  }, [sttTranscript, onClearSttTranscript]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current && agentSettings.workspaceMode === 'CHAT') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, agentSettings.workspaceMode]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = messages
        .filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(m => m.id);
      setSearchResults(results);
      setCurrentSearchIndex(0);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, messages]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Cmd/Ctrl + Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setShowFormatting(false);
        setShowEmojiPicker(false);
        setShowSlashCommands(false);
        setShowKeyboardShortcuts(false);
        setShowSuggestions(false);
        setShowSpellSuggestions(false);
        setEditingMessageId(null);
      }
      // Arrow up to edit last message (only when no suggestions)
      if (e.key === 'ArrowUp' && !inputText && !showSuggestions && document.activeElement === textareaRef.current) {
        const lastUserMessage = [...messages].reverse().find(m => m.sender === 'YOU');
        if (lastUserMessage) {
          startEditing(lastUserMessage.id, lastUserMessage.text);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputText, messages, showSuggestions]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const value = textarea.value;
    setInputText(value);
    
    // Check for slash commands
    if (value.startsWith('/')) {
      setShowSlashCommands(true);
      setShowSuggestions(false);
      setShowSpellSuggestions(false);
    } else {
      setShowSlashCommands(false);
      
      // Generate smart suggestions
      const newSuggestions = generateSuggestions(value);
      if (newSuggestions.length > 0 && value.length >= 2) {
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
        setSelectedSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
        setSuggestions([]);
      }
      
      // Check spelling
      const spellErrors = checkSpelling(value);
      if (spellErrors.length > 0) {
        setSpellSuggestions(spellErrors);
        setShowSpellSuggestions(true);
      } else {
        setSpellSuggestions([]);
        setShowSpellSuggestions(false);
      }
    }
    
    // Auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  // Handle send
  const handleSend = () => {
    if (!inputText.trim() || isThinking) return;
    
    // Handle slash commands
    if (inputText.startsWith('/')) {
      handleSlashCommand(inputText);
      return;
    }
    
    onSend(inputText.trim());
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle slash commands
  const handleSlashCommand = (command: string) => {
    const cmd = command.toLowerCase().trim();
    
    if (cmd === '/clear') {
      setInputText("");
    } else if (cmd === '/export') {
      exportChat();
    } else if (cmd === '/code') {
      setInputText("```\n\n```");
    } else if (cmd === '/focus') {
      setFocusMode(!focusMode);
      setInputText("");
    } else if (cmd === '/compact') {
      setCompactMode(!compactMode);
      setInputText("");
    } else if (cmd === '/help') {
      setInputText("");
      setShowSlashCommands(true);
    } else {
      onSend(inputText.trim());
      setInputText("");
    }
    setShowSlashCommands(false);
  };

  // Export chat as markdown
  const exportChat = () => {
    const markdown = messages.map(m => {
      const sender = m.sender === 'YOU' ? 'User' : agentSettings.agentName;
      return `## ${sender} (${m.timestamp})\n\n${m.text}\n`;
    }).join('\n---\n\n');
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Bookmark message
  const handleBookmark = (messageId: string) => {
    const newBookmarked = new Set(bookmarkedMessages);
    if (newBookmarked.has(messageId)) {
      newBookmarked.delete(messageId);
    } else {
      newBookmarked.add(messageId);
    }
    setBookmarkedMessages(newBookmarked);
  };

  // Pin message
  const handlePin = (messageId: string) => {
    const newPinned = new Set(pinnedMessages);
    if (newPinned.has(messageId)) {
      newPinned.delete(messageId);
    } else {
      newPinned.add(messageId);
    }
    setPinnedMessages(newPinned);
  };

  // Share message
  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  // Text-to-speech using OpenAI TTS API
  const [ttsAudio, setTtsAudio] = useState<HTMLAudioElement | null>(null);
  
  const handleSpeak = async (messageId: string, text: string) => {
    // Stop if already playing this message
    if (speakingMessageId === messageId) {
      if (ttsAudio) {
        ttsAudio.pause();
        ttsAudio.currentTime = 0;
        setTtsAudio(null);
      }
      window.speechSynthesis.cancel(); // Also stop browser TTS if any
      setSpeakingMessageId(null);
      return;
    }
    
    // Stop any ongoing audio
    if (ttsAudio) {
      ttsAudio.pause();
      setTtsAudio(null);
    }
    window.speechSynthesis.cancel();
    setSpeakingMessageId(messageId);
    
    try {
      // Use OpenAI TTS API
      const API_URL = import.meta.env.VITE_API_URL || 'https://maula.onelastai.co';
      const response = await fetch(`${API_URL}/api/speech/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text, voice: 'nova', speed: 1.0 })
      });
      
      if (!response.ok) {
        const err = await response.json();
        // Fallback to browser TTS if API fails
        console.warn('[TTS] API failed, using browser fallback:', err.error);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => setSpeakingMessageId(null);
        window.speechSynthesis.speak(utterance);
        return;
      }
      
      const data = await response.json();
      const audio = new Audio(data.audio);
      setTtsAudio(audio);
      
      audio.onended = () => {
        setSpeakingMessageId(null);
        setTtsAudio(null);
      };
      audio.onerror = () => {
        setSpeakingMessageId(null);
        setTtsAudio(null);
      };
      
      audio.play();
    } catch (error) {
      console.error('[TTS] Error:', error);
      setSpeakingMessageId(null);
      // Fallback to browser TTS
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeakingMessageId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start editing
  const startEditing = (messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditingText(text);
  };

  // Submit edit
  const submitEdit = () => {
    if (editingMessageId && editingText.trim()) {
      if (onEditMessage) {
        onEditMessage(editingMessageId, editingText.trim());
      } else {
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

  // Navigate search results
  const navigateSearch = (direction: 'prev' | 'next') => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    setCurrentSearchIndex(newIndex);
    
    const messageEl = document.getElementById(`message-${searchResults[newIndex]}`);
    messageEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Insert formatting
  const insertFormatting = (format: 'bold' | 'italic' | 'code' | 'link' | 'list' | 'quote') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = inputText.substring(start, end);
    
    let prefix = '';
    let suffix = '';
    let placeholder = '';
    
    switch (format) {
      case 'bold':
        prefix = '**';
        suffix = '**';
        placeholder = 'bold text';
        break;
      case 'italic':
        prefix = '*';
        suffix = '*';
        placeholder = 'italic text';
        break;
      case 'code':
        if (selectedText.includes('\n')) {
          prefix = '```\n';
          suffix = '\n```';
          placeholder = 'code';
        } else {
          prefix = '`';
          suffix = '`';
          placeholder = 'code';
        }
        break;
      case 'link':
        prefix = '[';
        suffix = '](url)';
        placeholder = 'link text';
        break;
      case 'list':
        prefix = '- ';
        suffix = '';
        placeholder = 'item';
        break;
      case 'quote':
        prefix = '> ';
        suffix = '';
        placeholder = 'quote';
        break;
    }
    
    const textToInsert = selectedText || placeholder;
    const formattedText = prefix + textToInsert + suffix;
    const newText = inputText.substring(0, start) + formattedText + inputText.substring(end);
    setInputText(newText);
    
    // Focus back and select the text for easy replacement
    setTimeout(() => {
      textarea.focus();
      if (!selectedText) {
        // Select the placeholder text so user can type over it
        const newStart = start + prefix.length;
        const newEnd = newStart + placeholder.length;
        textarea.setSelectionRange(newStart, newEnd);
      } else {
        // Place cursor after the formatted text
        const newPos = start + formattedText.length;
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
    
    setShowFormatting(false);
  };
  
  // Check if text contains markdown formatting
  const hasMarkdownFormatting = (text: string): boolean => {
    return /\*\*.*\*\*|\*[^*]+\*|`[^`]+`|\[.*\]\(.*\)|^>|^-\s/m.test(text);
  };

  // Insert emoji
  const insertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => onFileUpload(file));
  };

  // Handle paste (for images)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          onFileUpload(file);
        }
      }
    }
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
      e.target.value = '';
    }
  };

  // Render inline markdown (bold, italic, links, strikethrough)
  const renderInlineMarkdown = (text: string, keyPrefix: string = ''): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let partIndex = 0;

    while (remaining.length > 0) {
      // Bold **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
      if (boldMatch) {
        elements.push(<strong key={`${keyPrefix}-bold-${partIndex}`} className="font-semibold text-white">{boldMatch[2]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        partIndex++;
        continue;
      }

      // Italic *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
      if (italicMatch) {
        elements.push(<em key={`${keyPrefix}-italic-${partIndex}`} className="italic text-gray-200">{italicMatch[2]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        partIndex++;
        continue;
      }

      // Strikethrough ~~text~~
      const strikeMatch = remaining.match(/^~~(.+?)~~/);
      if (strikeMatch) {
        elements.push(<del key={`${keyPrefix}-strike-${partIndex}`} className="line-through text-gray-500">{strikeMatch[1]}</del>);
        remaining = remaining.slice(strikeMatch[0].length);
        partIndex++;
        continue;
      }

      // Links [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a 
            key={`${keyPrefix}-link-${partIndex}`} 
            href={linkMatch[2]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        partIndex++;
        continue;
      }

      // No match, take one character
      elements.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    // Combine adjacent strings
    const combined: React.ReactNode[] = [];
    let currentString = '';
    for (const el of elements) {
      if (typeof el === 'string') {
        currentString += el;
      } else {
        if (currentString) {
          combined.push(currentString);
          currentString = '';
        }
        combined.push(el);
      }
    }
    if (currentString) {
      combined.push(currentString);
    }

    return combined;
  };

  // Syntax highlighting for code blocks
  const highlightCode = (code: string, language: string): React.ReactNode => {
    const keywords: Record<string, string[]> = {
      javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'default', 'switch', 'case', 'break', 'continue'],
      typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'interface', 'type', 'enum', 'implements', 'extends', 'public', 'private', 'protected', 'readonly', 'as', 'default', 'switch', 'case', 'break', 'continue'],
      python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'self', 'async', 'await'],
      java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'int', 'String', 'boolean', 'return', 'if', 'else', 'for', 'while', 'new', 'this', 'super', 'try', 'catch', 'throw', 'throws', 'import', 'package', 'null', 'true', 'false'],
      rust: ['fn', 'let', 'mut', 'const', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'if', 'else', 'match', 'loop', 'while', 'for', 'return', 'self', 'Self', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'async', 'await', 'move', 'ref', 'where'],
      go: ['func', 'var', 'const', 'type', 'struct', 'interface', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'go', 'chan', 'select', 'defer', 'package', 'import', 'nil', 'true', 'false', 'map', 'make', 'new'],
      sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'],
      css: ['color', 'background', 'margin', 'padding', 'border', 'display', 'flex', 'grid', 'position', 'width', 'height', 'font', 'text', 'align', 'justify', 'content', 'items', 'important', 'none', 'block', 'inline', 'absolute', 'relative', 'fixed'],
      html: ['div', 'span', 'p', 'a', 'img', 'button', 'input', 'form', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'nav', 'section', 'article', 'aside', 'main', 'class', 'id', 'href', 'src', 'alt', 'style', 'type', 'name', 'value'],
      bash: ['echo', 'cd', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'sed', 'awk', 'find', 'chmod', 'chown', 'sudo', 'apt', 'yum', 'npm', 'pip', 'git', 'curl', 'wget', 'if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'export', 'source'],
      shell: ['echo', 'cd', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'sed', 'awk', 'find', 'chmod', 'chown', 'sudo', 'apt', 'yum', 'npm', 'pip', 'git', 'curl', 'wget', 'if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'export', 'source'],
    };

    const langKeywords = keywords[language.toLowerCase()] || keywords['javascript'] || [];
    const lines = code.split('\n');

    return lines.map((line, lineIndex) => {
      const tokens: React.ReactNode[] = [];
      let remaining = line;
      let tokenIndex = 0;

      while (remaining.length > 0) {
        // Comments (// or #)
        const commentMatch = remaining.match(/^(\/\/.*|#.*)$/);
        if (commentMatch) {
          tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-gray-500 italic">{commentMatch[0]}</span>);
          remaining = '';
          tokenIndex++;
          continue;
        }

        // Strings (single or double quotes)
        const stringMatch = remaining.match(/^(["'`])(?:\\.|(?!\1)[^\\])*\1/);
        if (stringMatch) {
          tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-green-400">{stringMatch[0]}</span>);
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

        // Keywords
        const wordMatch = remaining.match(/^\b\w+\b/);
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
        tokens.push(<span key={`${lineIndex}-${tokenIndex}`} className="text-gray-400">{remaining[0]}</span>);
        remaining = remaining.slice(1);
        tokenIndex++;
      }

      return (
        <div key={lineIndex} className="leading-relaxed">
          {tokens.length > 0 ? tokens : ' '}
        </div>
      );
    });
  };

  // Render code blocks with syntax highlighting
  const renderMessageText = (text: string) => {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let index = 0;

    while (remaining.length > 0) {
      // Multi-line code block ```language\ncode```
      const codeBlockMatch = remaining.match(/^```(\w*)\n?([\s\S]*?)```/);
      if (codeBlockMatch) {
        const language = codeBlockMatch[1] || 'code';
        const code = codeBlockMatch[2];
        
        elements.push(
          <div key={`code-${index}`} className="my-3 rounded-lg overflow-hidden border border-gray-800 bg-[#0d0d0d]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900/50 border-b border-gray-800">
              <span className="text-[10px] text-gray-500 font-mono uppercase">{language}</span>
              <button 
                onClick={() => handleCopy(`code-${index}`, code)}
                className="text-gray-500 hover:text-cyan-400 transition-colors"
                title="Copy code"
              >
                {copiedId === `code-${index}` ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed">
              <code>{highlightCode(code, language)}</code>
            </pre>
          </div>
        );
        remaining = remaining.slice(codeBlockMatch[0].length);
        index++;
        continue;
      }

      // Inline code `code`
      const inlineCodeMatch = remaining.match(/^`([^`]+)`/);
      if (inlineCodeMatch) {
        elements.push(
          <code key={`inline-${index}`} className="px-1.5 py-0.5 bg-gray-800 rounded text-cyan-400 text-xs font-mono">
            {inlineCodeMatch[1]}
          </code>
        );
        remaining = remaining.slice(inlineCodeMatch[0].length);
        index++;
        continue;
      }

      // Headers # ## ### etc
      const headerMatch = remaining.match(/^(#{1,6})\s+(.+?)(?:\n|$)/);
      if (headerMatch && (index === 0 || elements.length === 0 || remaining.startsWith('\n'))) {
        const level = headerMatch[1].length;
        const headerText = headerMatch[2];
        const sizes = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold', 'text-sm font-medium', 'text-xs font-medium'];
        elements.push(
          <div key={`header-${index}`} className={`${sizes[level - 1]} text-white mt-3 mb-2`}>
            {renderInlineMarkdown(headerText, `h-${index}`)}
          </div>
        );
        remaining = remaining.slice(headerMatch[0].length);
        index++;
        continue;
      }

      // Blockquote > text
      const quoteMatch = remaining.match(/^>\s*(.+?)(?:\n|$)/);
      if (quoteMatch) {
        elements.push(
          <blockquote key={`quote-${index}`} className="border-l-2 border-cyan-500 pl-3 my-2 text-gray-400 italic">
            {renderInlineMarkdown(quoteMatch[1], `q-${index}`)}
          </blockquote>
        );
        remaining = remaining.slice(quoteMatch[0].length);
        index++;
        continue;
      }

      // Unordered list item - text or * text
      const ulMatch = remaining.match(/^[-*]\s+(.+?)(?:\n|$)/);
      if (ulMatch) {
        elements.push(
          <div key={`ul-${index}`} className="flex items-start gap-2 my-1">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span>{renderInlineMarkdown(ulMatch[1], `ul-${index}`)}</span>
          </div>
        );
        remaining = remaining.slice(ulMatch[0].length);
        index++;
        continue;
      }

      // Ordered list item 1. text
      const olMatch = remaining.match(/^(\d+)\.\s+(.+?)(?:\n|$)/);
      if (olMatch) {
        elements.push(
          <div key={`ol-${index}`} className="flex items-start gap-2 my-1">
            <span className="text-cyan-400 font-medium min-w-[1.5rem]">{olMatch[1]}.</span>
            <span>{renderInlineMarkdown(olMatch[2], `ol-${index}`)}</span>
          </div>
        );
        remaining = remaining.slice(olMatch[0].length);
        index++;
        continue;
      }

      // Horizontal rule --- or ***
      const hrMatch = remaining.match(/^(?:---|\*\*\*|___)(?:\n|$)/);
      if (hrMatch) {
        elements.push(<hr key={`hr-${index}`} className="border-gray-700 my-4" />);
        remaining = remaining.slice(hrMatch[0].length);
        index++;
        continue;
      }

      // Regular text until next special element or newline
      const textMatch = remaining.match(/^([^`#>\-*\d\n]+|\n)/);
      if (textMatch) {
        if (textMatch[0] === '\n') {
          elements.push(<br key={`br-${index}`} />);
        } else {
          elements.push(<span key={`text-${index}`}>{renderInlineMarkdown(textMatch[0], `t-${index}`)}</span>);
        }
        remaining = remaining.slice(textMatch[0].length);
        index++;
        continue;
      }

      // Fallback: take one character
      elements.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return <>{elements}</>;
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
                <iframe src={content} className="w-full h-full aspect-video" allowFullScreen title="Video" />
             ) : (
                <video src={content} controls className="max-w-full max-h-full" />
             )}
          </div>
        );
      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center bg-[#050505] p-4">
            <img src={content} alt="Asset" className="max-w-full max-h-full object-contain rounded shadow-[0_0_50px_rgba(34,211,238,0.2)]" />
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

  // Get pinned messages to display at top
  const pinnedMessagesList = messages.filter(m => pinnedMessages.has(m.id));

  return (
    <main 
      className={`relative flex-grow bg-black/20 flex flex-col overflow-hidden z-10 m-2 sm:m-3 rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-gray-800/40 backdrop-blur-md transition-all duration-300 ${isFullscreen ? 'fixed inset-0 m-0 rounded-none z-50' : ''} ${focusMode ? 'max-w-3xl mx-auto' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Paperclip size={48} className="mx-auto text-emerald-400 mb-3" />
            <p className="text-emerald-400 font-medium">Drop files here</p>
            <p className="text-xs text-gray-500 mt-1">Images, code, documents supported</p>
          </div>
        </div>
      )}

      {/* Compact top bar - just message count and essential actions */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800/30 bg-black/30">
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <MessageCircle size={12} className="text-cyan-500/70" />
          <span>{messages.length} messages</span>
          {bookmarkedMessages.size > 0 && (
            <span className="text-yellow-500/70 flex items-center gap-0.5">
              <Bookmark size={10} /> {bookmarkedMessages.size}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-0.5">
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-1 rounded transition-all ${isSearchOpen ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-500 hover:text-gray-300'}`} title="Search ⌘K">
            <Search size={14} />
          </button>
          <button onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)} className="p-1 text-gray-500 hover:text-gray-300 rounded transition-all" title="Shortcuts">
            <Keyboard size={14} />
          </button>
          <button onClick={() => setShowTimestamps(!showTimestamps)} className={`p-1 rounded transition-all ${showTimestamps ? 'text-gray-400' : 'text-gray-600'} hover:text-gray-300`} title="Timestamps">
            <Clock size={14} />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 text-gray-500 hover:text-gray-300 rounded transition-all" title="Fullscreen">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={exportChat} className="p-1 text-gray-500 hover:text-emerald-400 rounded transition-all" title="Export">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {isSearchOpen && (
        <div className="px-4 py-2 border-b border-gray-800/50 bg-black/60 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <Search size={14} className="text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-grow bg-transparent border-none outline-none text-sm text-gray-300 placeholder:text-gray-600"
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {currentSearchIndex + 1} / {searchResults.length}
              </span>
              <button onClick={() => navigateSearch('prev')} className="p-1 text-gray-500 hover:text-gray-300" title="Previous">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => navigateSearch('next')} className="p-1 text-gray-500 hover:text-gray-300" title="Next">
                <ArrowDown size={14} />
              </button>
            </div>
          )}
          <button onClick={() => setIsSearchOpen(false)} className="p-1 text-gray-500 hover:text-gray-300" title="Close">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Keyboard shortcuts modal */}
      {showKeyboardShortcuts && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="bg-[#111] border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Keyboard Shortcuts</h3>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="text-gray-500 hover:text-gray-300" title="Close">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {keyboardShortcuts.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{shortcut.action}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd key={j} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 font-mono">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pinned messages */}
      {pinnedMessagesList.length > 0 && (
        <div className="px-4 py-2 border-b border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Pin size={12} className="text-yellow-500" />
            <span className="text-[10px] text-yellow-500 uppercase tracking-wider">Pinned</span>
          </div>
          {pinnedMessagesList.map(msg => (
            <div key={msg.id} className="text-xs text-gray-400 truncate hover:text-gray-200 cursor-pointer" onClick={() => {
              document.getElementById(`message-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}>
              <span className="text-yellow-500/50">{msg.sender}: </span>{msg.text.substring(0, 80)}...
            </div>
          ))}
        </div>
      )}
      
      <div className="flex-grow flex flex-col relative overflow-hidden bg-black/10">
        {/* CHAT VIEW */}
        <div className={`absolute inset-0 flex flex-col p-4 sm:p-6 overflow-y-auto custom-scrollbar transition-opacity duration-300 ${agentSettings.workspaceMode === 'CHAT' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`} ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Start a conversation</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Ask me anything, upload files, or use commands like <code className="px-1.5 py-0.5 bg-gray-800 rounded text-cyan-400 text-xs">/help</code> to see what I can do.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {['Explain quantum computing', 'Write a Python script', 'Analyze this image', 'Help me debug'].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => setInputText(suggestion)}
                    className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-full text-xs text-gray-400 hover:text-gray-200 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              id={`message-${msg.id}`}
              className={`group ${compactMode ? 'mb-4' : 'mb-8'} animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col ${msg.sender === 'YOU' ? 'items-end' : 'items-start'} ${searchResults.includes(msg.id) && searchResults[currentSearchIndex] === msg.id ? 'ring-2 ring-cyan-500/50 rounded-lg p-2 -m-2' : ''}`}
            >
              <div className={`flex items-baseline gap-3 mb-1 ${msg.sender === 'YOU' ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className={`font-bold text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm ${msg.sender === 'YOU' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                  {msg.sender === 'AGENT' ? agentSettings.agentName : msg.sender}
                </span>
                {showTimestamps && (
                  <span className="text-[9px] text-gray-700 select-none tabular-nums">[{msg.timestamp}]</span>
                )}
                {bookmarkedMessages.has(msg.id) && <Bookmark size={10} className="text-yellow-500" />}
                {pinnedMessages.has(msg.id) && <Pin size={10} className="text-yellow-500" />}
              </div>
              
              <div className={`max-w-[85%] sm:max-w-[75%] px-4 border-l ${msg.sender === 'YOU' ? 'border-l-0 border-r text-right border-emerald-500/20' : 'border-l border-cyan-500/20'} mb-2`}>
                {/* Editing mode */}
                {editingMessageId === msg.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="w-full bg-black/40 border border-emerald-500/50 rounded px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={cancelEdit} className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1">
                        Cancel (Esc)
                      </button>
                      <button onClick={submitEdit} className="text-[10px] text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                        Save (⌘↵)
                      </button>
                    </div>
                  </div>
                ) : msg.isImage ? (
                  <div className="flex flex-col gap-2">
                    <div className="relative group/img overflow-hidden rounded-lg border border-cyan-500/30 shadow-2xl cursor-pointer" onClick={() => onUpdateSettings({ ...agentSettings, canvas: { content: msg.imageData || msg.text, type: 'image', title: 'Asset View' }, workspaceMode: 'CANVAS'})}>
                      <img src={msg.imageData || msg.text} alt="Uploaded" className="max-w-[200px] max-h-[200px] object-cover transition-transform duration-500 group-hover/img:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 size={20} className="text-white" />
                      </div>
                    </div>
                    {msg.text && !msg.text.startsWith('data:') && (
                      <div className="text-gray-300 whitespace-pre-wrap break-words text-xs sm:text-sm leading-relaxed">{renderMessageText(msg.text)}</div>
                    )}
                  </div>
                ) : msg.files && msg.files.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {msg.files.map((file) => (
                        <div 
                          key={file.id} 
                          className="flex items-center gap-2 bg-black/40 border border-gray-700 rounded-lg px-3 py-2 hover:border-cyan-500/50 transition-colors cursor-pointer group/file"
                          onClick={() => {
                            if (file.dataUrl && file.type.startsWith('image/')) {
                              onUpdateSettings({ ...agentSettings, canvas: { content: file.dataUrl, type: 'image', title: file.name }, workspaceMode: 'CANVAS'});
                            } else if (file.content) {
                              const isCode = file.type.includes('javascript') || file.type.includes('typescript') || file.type.includes('json') || file.name.match(/\.(js|ts|jsx|tsx|json|py|java|cpp|c|go|rs|rb|php)$/);
                              onUpdateSettings({ ...agentSettings, canvas: { content: file.content, type: isCode ? 'code' : 'text', title: file.name }, workspaceMode: 'CANVAS'});
                            }
                          }}
                        >
                          {getFileIcon(file.type)}
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-300 truncate max-w-[150px] group-hover/file:text-cyan-400 transition-colors">{file.name}</span>
                            <span className="text-[10px] text-gray-500">{formatFileSize(file.size)}</span>
                          </div>
                          <Eye size={12} className="text-gray-600 group-hover/file:text-cyan-400 transition-colors ml-1" />
                        </div>
                      ))}
                    </div>
                    {msg.text && (
                      <div className="text-gray-300 whitespace-pre-wrap break-words text-xs sm:text-sm leading-relaxed">{renderMessageText(msg.text)}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-300 whitespace-pre-wrap break-words text-xs sm:text-sm leading-relaxed">{renderMessageText(msg.text)}</div>
                )}
                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {msg.groundingUrls.map((url, i) => (
                      <button key={i} onClick={() => mountPortal(url)} className="flex items-center gap-1.5 text-[9px] text-cyan-400 hover:text-white transition-all bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 hover:border-cyan-400 shadow-sm">
                        <Globe size={10} /> Source {i+1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Actions */}
              {editingMessageId !== msg.id && (
                <div className={`flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${msg.sender === 'YOU' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.sender === 'AGENT' ? (
                    <>
                      <button onClick={() => handleLike(msg.id)} className={`p-1.5 rounded transition-all ${likedMessages.has(msg.id) ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`} title="Good response">
                        <ThumbsUp size={13} />
                      </button>
                      <button onClick={() => handleDislike(msg.id)} className={`p-1.5 rounded transition-all ${dislikedMessages.has(msg.id) ? 'text-red-400 bg-red-500/10' : 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'}`} title="Bad response">
                        <ThumbsDown size={13} />
                      </button>
                      <div className="w-px h-4 bg-gray-800 mx-1" />
                      <button onClick={() => handleCopy(msg.id, msg.text)} className={`p-1.5 rounded transition-all ${copiedId === msg.id ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10'}`} title={copiedId === msg.id ? "Copied!" : "Copy"}>
                        {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      <button onClick={() => onRegenerateResponse?.()} className="p-1.5 text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-all" title="Regenerate">
                        <RefreshCw size={13} />
                      </button>
                      <button onClick={() => handleSpeak(msg.id, msg.text)} className={`p-1.5 rounded transition-all ${speakingMessageId === msg.id ? 'text-cyan-400 bg-cyan-500/10 animate-pulse' : 'text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10'}`} title={speakingMessageId === msg.id ? "Stop" : "Read aloud"}>
                        <Volume2 size={13} />
                      </button>
                      <div className="w-px h-4 bg-gray-800 mx-1" />
                      <button onClick={() => handleBookmark(msg.id)} className={`p-1.5 rounded transition-all ${bookmarkedMessages.has(msg.id) ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-500/10'}`} title={bookmarkedMessages.has(msg.id) ? "Remove bookmark" : "Bookmark"}>
                        {bookmarkedMessages.has(msg.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                      </button>
                      <button onClick={() => handlePin(msg.id)} className={`p-1.5 rounded transition-all ${pinnedMessages.has(msg.id) ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-500/10'}`} title={pinnedMessages.has(msg.id) ? "Unpin" : "Pin"}>
                        <Pin size={13} />
                      </button>
                      <button onClick={() => handleShare(msg.text)} className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all" title="Share">
                        <Share2 size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleCopy(msg.id, msg.text)} className={`p-1.5 rounded transition-all ${copiedId === msg.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`} title={copiedId === msg.id ? "Copied!" : "Copy"}>
                        {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      <button onClick={() => startEditing(msg.id, msg.text)} className="p-1.5 text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleBookmark(msg.id)} className={`p-1.5 rounded transition-all ${bookmarkedMessages.has(msg.id) ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-500/10'}`} title={bookmarkedMessages.has(msg.id) ? "Remove bookmark" : "Bookmark"}>
                        {bookmarkedMessages.has(msg.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex items-start gap-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-baseline gap-3">
                <span className="font-bold text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {agentSettings.agentName}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-cyan-500/5 border border-cyan-500/10 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs text-cyan-500/70 ml-2">Thinking...</span>
                {onStopGeneration && (
                  <button onClick={onStopGeneration} className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all" title="Stop">
                    <StopCircle size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PORTAL VIEW */}
        <div className={`absolute inset-0 bg-[#050505] transition-opacity duration-300 ${agentSettings.workspaceMode === 'PORTAL' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}>
          <div className="h-full flex flex-col">
            <div className="bg-[#111] p-2 flex items-center gap-3 border-b border-gray-800">
              <div className="flex-grow bg-black/50 border border-gray-800 rounded px-3 py-1.5 flex items-center gap-3 overflow-hidden">
                <Globe size={12} className="text-cyan-600 flex-shrink-0" />
                <span className="text-[10px] text-gray-400 truncate font-mono uppercase tracking-widest">{agentSettings.portalUrl}</span>
              </div>
              <button onClick={() => window.open(agentSettings.portalUrl, '_blank')} className="text-gray-500 hover:text-cyan-400 p-1.5 transition-colors" title="Open in new tab">
                <ExternalLink size={16} />
              </button>
            </div>
            <div className="flex-grow relative bg-[#0a0a0a]">
              <iframe src={agentSettings.portalUrl} className="w-full h-full border-none opacity-90 hover:opacity-100 transition-opacity" title="Portal" />
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const blob = new Blob([agentSettings.canvas.content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = agentSettings.canvas.title || 'download.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all border border-transparent hover:border-emerald-500/30"
                  title="Download"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={() => setWorkspace('CHAT')}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/30"
                  title="Close"
                >
                  <X size={18} />
                </button>
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
      
      {/* Input Bar */}
      <div className="relative z-40 px-3 py-2 border-t border-gray-800/50 bg-[#0a0a0a]/90 backdrop-blur-xl flex flex-col gap-1.5">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileChange} 
          className="hidden"
          accept="image/*,video/*,.js,.ts,.tsx,.jsx,.py,.html,.css,.json,.txt,.md,.csv,.pdf,.doc,.docx,.java,.cpp,.c,.h,.hpp,.go,.rs,.rb,.php,.swift,.kt,.scala,.sql,.xml,.yaml,.yml,.sh,.bash,.toml,.ini,.log"
          multiple
          title="Upload files"
        />
        
        {/* Pending Image Preview */}
        {pendingImage && (
          <div className="flex items-center gap-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg animate-in slide-in-from-bottom-2 duration-200">
            <img src={pendingImage.data} alt={pendingImage.name} className="w-16 h-16 object-cover rounded border border-cyan-500/50" />
            <div className="flex-grow">
              <p className="text-xs text-cyan-400 font-mono truncate">{pendingImage.name}</p>
              <p className="text-[10px] text-gray-500">Image ready to send</p>
            </div>
            <button onClick={onClearPendingImage} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Remove">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Pending Files Preview */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg animate-in slide-in-from-bottom-2 duration-200">
            {pendingFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-2 bg-black/40 border border-gray-700 rounded px-2 py-1.5 group">
                {getFileIcon(file.type)}
                <div className="flex flex-col">
                  <span className="text-xs text-gray-300 truncate max-w-[120px]">{file.name}</span>
                  <span className="text-[10px] text-gray-500">{formatFileSize(file.size)}</span>
                </div>
              </div>
            ))}
            <button onClick={onClearPendingFiles} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all self-center" title="Clear all">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Slash commands dropdown */}
        {showSlashCommands && inputText.startsWith('/') && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#111] border border-gray-800 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 max-h-64 overflow-y-auto">
            {slashCommands
              .filter(cmd => cmd.command.includes(inputText.toLowerCase()))
              .map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputText(cmd.command);
                    handleSlashCommand(cmd.command);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-gray-500">{cmd.icon}</span>
                  <div className="flex-grow">
                    <span className="text-sm text-gray-300 font-mono">{cmd.command}</span>
                    <p className="text-xs text-gray-500">{cmd.description}</p>
                  </div>
                </button>
              ))}
          </div>
        )}

        {/* Smart suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && !showSlashCommands && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#111] border border-cyan-500/30 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            <div className="px-3 py-1.5 border-b border-gray-800 flex items-center justify-between">
              <span className="text-[10px] text-cyan-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={10} /> Suggestions
              </span>
              <span className="text-[9px] text-gray-600">Tab to accept · ↑↓ to navigate</span>
            </div>
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => applySuggestion(suggestion)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedSuggestionIndex 
                    ? 'bg-cyan-500/10 border-l-2 border-cyan-500' 
                    : 'hover:bg-gray-800/50 border-l-2 border-transparent'
                }`}
              >
                <Zap size={14} className={i === selectedSuggestionIndex ? 'text-cyan-400' : 'text-gray-600'} />
                <span className={`text-sm ${i === selectedSuggestionIndex ? 'text-cyan-300' : 'text-gray-400'}`}>
                  {suggestion}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Spell check suggestions */}
        {showSpellSuggestions && spellSuggestions.length > 0 && !showSuggestions && !showSlashCommands && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#111] border border-yellow-500/30 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            <div className="px-3 py-1.5 border-b border-gray-800 flex items-center justify-between">
              <span className="text-[10px] text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
                <Type size={10} /> Spell Check
              </span>
              <button 
                onClick={() => setShowSpellSuggestions(false)} 
                className="text-gray-600 hover:text-gray-400"
              >
                <X size={12} />
              </button>
            </div>
            {spellSuggestions.map((spell, i) => (
              <div key={i} className="px-4 py-2 border-b border-gray-800/50 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-red-400 line-through">{spell.word}</span>
                  <span className="text-[10px] text-gray-600">→</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {spell.suggestions.map((correction, j) => (
                    <button
                      key={j}
                      onClick={() => applySpellCorrection(correction, spell.word, spell.position)}
                      className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      {correction}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formatting toolbar */}
        {showFormatting && (
          <div className="flex items-center gap-1 p-2 bg-[#111] border border-gray-800 rounded-lg animate-in slide-in-from-bottom-2 duration-200">
            <button onClick={() => insertFormatting('bold')} className="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded" title="Bold (⌘B)">
              <Bold size={16} />
            </button>
            <button onClick={() => insertFormatting('italic')} className="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded" title="Italic (⌘I)">
              <Italic size={16} />
            </button>
            <button onClick={() => insertFormatting('code')} className="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded" title="Code (⌘E)">
              <Code size={16} />
            </button>
            <button onClick={() => insertFormatting('link')} className="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded" title="Link">
              <Link size={16} />
            </button>
            <button onClick={() => insertFormatting('list')} className="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded" title="List">
              <List size={16} />
            </button>
            <button onClick={() => insertFormatting('quote')} className="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded" title="Quote">
              <Quote size={16} />
            </button>
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="flex items-center gap-1 p-2 bg-[#111] border border-gray-800 rounded-lg animate-in slide-in-from-bottom-2 duration-200">
            {quickEmojis.map((emoji, i) => (
              <button key={i} onClick={() => insertEmoji(emoji)} className="p-2 hover:bg-gray-800 rounded text-lg transition-transform hover:scale-125">
                {emoji}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex items-end gap-3">
          {/* Feature Icons - Left side */}
          <div className="flex items-center gap-0.5 pb-1.5">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all" title="Attach file">
              <Paperclip size={18} />
            </button>
            <button onClick={() => setShowFormatting(!showFormatting)} className={`p-2 rounded transition-all ${showFormatting ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10'}`} title="Formatting">
              <Type size={18} />
            </button>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 rounded transition-all ${showEmojiPicker ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10'}`} title="Emoji">
              <Smile size={18} />
            </button>
          </div>

          {/* Textarea container */}
          <div className="flex-grow relative group">
            {/* Live Preview - Shows formatted text when markdown is detected */}
            {inputText && hasMarkdownFormatting(inputText) && (
              <div className="mb-2 p-3 bg-gray-900/50 border border-gray-800 rounded-lg text-sm">
                <div className="text-[10px] text-cyan-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>📝</span> Preview
                </div>
                <div className="text-gray-300">
                  {renderInlineMarkdown(inputText, 'preview')}
                </div>
              </div>
            )}
            <textarea 
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                // Handle suggestions navigation
                if (showSuggestions && suggestions.length > 0) {
                  if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                    e.preventDefault();
                    applySuggestion(suggestions[selectedSuggestionIndex]);
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSuggestionIndex(prev => (prev + 1) % suggestions.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                    return;
                  }
                }
                
                // Normal enter to send
                if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !showSuggestions) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onPaste={handlePaste}
              rows={1}
              className={`w-full bg-black/40 border border-gray-800 rounded-lg px-4 py-3 pr-24 text-gray-200 placeholder:text-gray-600 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 transition-all shadow-inner resize-none custom-scrollbar ${isRecordingSTT ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : ''} ${pendingImage || pendingFiles.length ? 'border-cyan-500/30' : ''}`} 
              placeholder={
                pendingImage ? "Describe what you want to know about this image..." :
                pendingFiles.length ? "Ask about the attached files..." :
                isRecordingSTT ? "Listening..." :
                agentSettings.workspaceMode === 'PORTAL' ? "Ask about this page..." :
                agentSettings.workspaceMode === 'CANVAS' ? "Ask about the workspace..." :
                "Message OneLast AI... (/ for commands)"
              } 
            />
            
            {/* Character count */}
            {inputText.length > 0 && (
              <div className="absolute bottom-1 left-3 text-[9px] text-gray-600 select-none">
                {charCount} chars · ~{tokenEstimate} tokens
              </div>
            )}
            
            {/* Send button */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {isRecordingSTT && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></span>
              )}
              <button 
                onClick={handleSend}
                disabled={isThinking || (!inputText.trim() && !pendingImage && !pendingFiles.length)}
                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:bg-transparent text-emerald-500 hover:text-emerald-400 disabled:text-gray-700 rounded-lg transition-all disabled:cursor-not-allowed"
                title="Send (Enter)"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* Voice controls - Right side */}
          <div className="flex items-center gap-0.5">
            <button onClick={onToggleSTT} className={`p-2 rounded transition-all ${isRecordingSTT ? 'bg-red-500/20 text-red-500' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10'}`} title="Voice input (Mic)">
              {isRecordingSTT ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button onClick={onToggleLive} className={`p-2 rounded transition-all ${isLiveActive ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-purple-400 hover:bg-purple-500/10'}`} title="Voice chat">
              <Radio size={18} className={isLiveActive ? 'animate-pulse' : ''} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatBox;
