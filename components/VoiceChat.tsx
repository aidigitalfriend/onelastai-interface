import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Settings, X } from 'lucide-react';

interface VoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
  onCreditsUpdate?: (credits: number) => void;
  systemPrompt?: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const VOICES = {
  'nova': { name: 'Nova', description: 'Warm & conversational', icon: '👩' },
  'alloy': { name: 'Alloy', description: 'Balanced & versatile', icon: '🤖' },
  'echo': { name: 'Echo', description: 'Smooth & clear', icon: '👨' },
  'fable': { name: 'Fable', description: 'Expressive & dramatic', icon: '🎭' },
  'onyx': { name: 'Onyx', description: 'Deep & authoritative', icon: '🎩' },
  'shimmer': { name: 'Shimmer', description: 'Bright & energetic', icon: '✨' },
};

const VoiceChat: React.FC<VoiceChatProps> = ({ isOpen, onClose, onCreditsUpdate, systemPrompt }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [showSettings, setShowSettings] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(32).fill(0));
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      stopRecording();
    };
  }, []);

  // Audio visualizer
  const updateVisualizer = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Sample 32 values for visualization
    const samples = [];
    const step = Math.floor(dataArray.length / 32);
    for (let i = 0; i < 32; i++) {
      samples.push(dataArray[i * step] / 255);
    }
    setVisualizerData(samples);
    
    animationRef.current = requestAnimationFrame(updateVisualizer);
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Start visualizer
      updateVisualizer();
      
      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Stop visualizer
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        setVisualizerData(new Array(32).fill(0));
        
        // Process recorded audio
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceConversation(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('[VoiceChat] Microphone error:', err);
      setError('Microphone access denied. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceConversation = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });

      // Call STS API
      const response = await fetch('/api/speech/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          audio: base64Audio,
          voice: selectedVoice,
          systemPrompt: systemPrompt || "You are a helpful AI assistant having a voice conversation. Keep responses concise and conversational.",
          conversationHistory: conversationHistory.map(m => ({
            role: m.role,
            content: m.text
          })),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Voice conversation failed');
      }

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: data.userText, timestamp: Date.now() },
        { role: 'assistant', text: data.aiText, timestamp: Date.now() },
      ]);

      // Update credits if callback provided
      if (onCreditsUpdate && data.creditsUsed) {
        onCreditsUpdate(data.creditsUsed);
      }

      // Play response audio
      playAudio(data.audio);

    } catch (err: any) {
      console.error('[VoiceChat] Error:', err);
      setError(err.message || 'Voice conversation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (audioData: string) => {
    setIsPlaying(true);
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(audioData);
    audioRef.current = audio;
    
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      setError('Failed to play audio response');
    };
    
    audio.play();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center">
      <div className="w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
              <Volume2 className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Voice Chat</h2>
              <p className="text-gray-500 text-xs">Speech-to-Speech AI Conversation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
            <h3 className="text-white font-semibold text-sm mb-3">Voice Selection</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(VOICES).map(([id, voice]) => (
                <button
                  key={id}
                  onClick={() => setSelectedVoice(id)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    selectedVoice === id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{voice.icon}</span>
                  <div className="text-white text-sm font-medium">{voice.name}</div>
                  <div className="text-gray-500 text-[10px]">{voice.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Visualizer */}
        <div className="flex items-center justify-center gap-1 h-24 mb-6">
          {visualizerData.map((value, i) => (
            <div
              key={i}
              className={`w-2 rounded-full transition-all duration-75 ${
                isRecording ? 'bg-cyan-500' : isPlaying ? 'bg-purple-500' : 'bg-gray-700'
              }`}
              style={{ 
                height: `${Math.max(8, value * 80)}px`,
                opacity: isRecording || isPlaying ? 0.5 + value * 0.5 : 0.3
              }}
            />
          ))}
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          {isRecording && (
            <div className="text-cyan-400 font-medium animate-pulse">
              🎤 Listening...
            </div>
          )}
          {isProcessing && (
            <div className="text-yellow-400 font-medium flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={18} />
              Processing voice...
            </div>
          )}
          {isPlaying && (
            <div className="text-purple-400 font-medium">
              🔊 Speaking...
            </div>
          )}
          {!isRecording && !isProcessing && !isPlaying && (
            <div className="text-gray-500">
              Tap the microphone to start talking
            </div>
          )}
          {error && (
            <div className="text-red-400 text-sm mt-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Main Button */}
        <div className="flex justify-center mb-8">
          {isPlaying ? (
            <button
              onClick={stopAudio}
              className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 transition-all"
            >
              <VolumeX size={32} />
            </button>
          ) : isProcessing ? (
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
              <Loader2 className="animate-spin text-cyan-400" size={32} />
            </div>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isRecording
                  ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-cyan-500/30'
              }`}
            >
              {isRecording ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
            </button>
          )}
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Conversation</h3>
              <button
                onClick={clearConversation}
                className="text-gray-600 hover:text-gray-400 text-xs"
              >
                Clear
              </button>
            </div>
            <div className="space-y-3">
              {conversationHistory.slice(-6).map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm ${msg.role === 'user' ? 'text-cyan-400' : 'text-gray-300'}`}
                >
                  <span className="font-medium">{msg.role === 'user' ? 'You: ' : 'AI: '}</span>
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credits Info */}
        <div className="mt-4 text-center text-gray-600 text-xs">
          ~1 credit per voice exchange • Voice: {VOICES[selectedVoice as keyof typeof VOICES]?.name}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
