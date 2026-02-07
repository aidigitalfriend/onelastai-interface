/**
 * NEURAL CHAT - OPENAI REALTIME API SERVICE
 * Real-time voice conversations using WebSocket
 * wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
 */

// Types for OpenAI Realtime API
interface RealtimeConfig {
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  instructions?: string;
  temperature?: number;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onAudioResponse?: (audioData: ArrayBuffer) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
}

interface RealtimeSession {
  ws: WebSocket | null;
  audioContext: AudioContext | null;
  mediaStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  isConnected: boolean;
  isRecording: boolean;
  config: RealtimeConfig;
}

// Session state
let session: RealtimeSession | null = null;

// Audio playback queue
let audioQueue: ArrayBuffer[] = [];
let isPlaying = false;

/**
 * Get ephemeral session token from backend
 */
async function getSessionToken(voice: string, instructions: string): Promise<{ client_secret: string; expires_at: number } | null> {
  try {
    const response = await fetch('/api/realtime/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ voice, instructions })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get session token');
    }

    const data = await response.json();
    return data.session;
  } catch (error) {
    console.error('[OpenAI Realtime] Token error:', error);
    return null;
  }
}

/**
 * Initialize and connect to OpenAI Realtime API
 */
export async function connectRealtime(config: RealtimeConfig): Promise<boolean> {
  try {
    // Close existing session
    if (session?.ws) {
      session.ws.close();
    }

    config.onStatusChange?.('Getting session token...');

    // Get ephemeral token from backend
    const sessionToken = await getSessionToken(
      config.voice || 'alloy',
      config.instructions || 'You are a helpful AI assistant.'
    );

    if (!sessionToken) {
      config.onError?.('Failed to get session token. Please sign in and ensure you have credits.');
      return false;
    }

    config.onStatusChange?.('Connecting...');

    const model = 'gpt-4o-realtime-preview-2024-12-17';
    const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

    const ws = new WebSocket(wsUrl, [
      'realtime',
      `openai-insecure-api-key.${sessionToken.client_secret}`,
      'openai-beta.realtime-v1'
    ]);

    session = {
      ws,
      audioContext: null,
      mediaStream: null,
      mediaRecorder: null,
      audioChunks: [],
      isConnected: false,
      isRecording: false,
      config
    };

    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        console.log('[OpenAI Realtime] Connected');
        session!.isConnected = true;
        config.onConnected?.();
        config.onStatusChange?.('Connected');

        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: config.instructions || 'You are a helpful AI assistant. Be conversational and friendly.',
            voice: config.voice || 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            temperature: config.temperature || 0.8,
          }
        };
        ws.send(JSON.stringify(sessionConfig));
        resolve(true);
      };

      ws.onmessage = (event) => {
        handleRealtimeMessage(event.data);
      };

      ws.onerror = (error) => {
        console.error('[OpenAI Realtime] WebSocket error:', error);
        config.onError?.('Connection error');
        config.onStatusChange?.('Error');
        reject(error);
      };

      ws.onclose = (event) => {
        console.log('[OpenAI Realtime] Disconnected:', event.code, event.reason);
        session!.isConnected = false;
        config.onDisconnected?.();
        config.onStatusChange?.('Disconnected');
        stopRecording();
      };

      // Timeout for connection
      setTimeout(() => {
        if (!session?.isConnected) {
          ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  } catch (error) {
    console.error('[OpenAI Realtime] Connect error:', error);
    config.onError?.(`Failed to connect: ${error}`);
    return false;
  }
}

/**
 * Handle incoming WebSocket messages
 */
function handleRealtimeMessage(data: string) {
  try {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'session.created':
        console.log('[OpenAI Realtime] Session created');
        session?.config.onStatusChange?.('Session ready');
        break;

      case 'session.updated':
        console.log('[OpenAI Realtime] Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        session?.config.onStatusChange?.('Listening...');
        break;

      case 'input_audio_buffer.speech_stopped':
        session?.config.onStatusChange?.('Processing...');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        if (message.transcript) {
          session?.config.onTranscript?.(message.transcript, true);
        }
        break;

      case 'response.audio_transcript.delta':
        // AI response text streaming
        if (message.delta) {
          session?.config.onTranscript?.(message.delta, false);
        }
        break;

      case 'response.audio_transcript.done':
        // AI response text complete
        console.log('[OpenAI Realtime] Audio transcript done');
        break;

      case 'response.audio.delta':
        // AI audio response chunk
        if (message.delta) {
          const audioData = base64ToArrayBuffer(message.delta);
          playAudioChunk(audioData);
          session?.config.onStatusChange?.('Speaking...');
        }
        break;

      case 'response.audio.done':
        console.log('[OpenAI Realtime] Audio response done');
        break;

      case 'response.done':
        session?.config.onStatusChange?.('Listening...');
        break;

      case 'error':
        console.error('[OpenAI Realtime] Error:', message.error);
        session?.config.onError?.(message.error?.message || 'Unknown error');
        break;

      default:
        // console.log('[OpenAI Realtime] Message:', message.type);
        break;
    }
  } catch (error) {
    console.error('[OpenAI Realtime] Parse error:', error);
  }
}

/**
 * Start recording and streaming audio
 */
export async function startRecording(): Promise<boolean> {
  if (!session?.isConnected || !session.ws) {
    console.error('[OpenAI Realtime] Not connected');
    return false;
  }

  try {
    // Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 24000,
        echoCancellation: true,
        noiseSuppression: true
      }
    });

    session.mediaStream = stream;
    session.audioContext = new AudioContext({ sampleRate: 24000 });

    // Create audio worklet for processing
    const source = session.audioContext.createMediaStreamSource(stream);
    const processor = session.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!session?.isConnected || !session.ws) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(inputData);
      const base64 = arrayBufferToBase64(pcm16.buffer);

      // Send audio to OpenAI
      session.ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64
      }));
    };

    source.connect(processor);
    processor.connect(session.audioContext.destination);

    session.isRecording = true;
    session.config.onStatusChange?.('Listening...');
    console.log('[OpenAI Realtime] Recording started');
    return true;
  } catch (error) {
    console.error('[OpenAI Realtime] Recording error:', error);
    session.config.onError?.(`Microphone error: ${error}`);
    return false;
  }
}

/**
 * Stop recording
 */
export function stopRecording(): void {
  if (session?.mediaStream) {
    session.mediaStream.getTracks().forEach(track => track.stop());
    session.mediaStream = null;
  }
  if (session?.audioContext) {
    session.audioContext.close();
    session.audioContext = null;
  }
  if (session) {
    session.isRecording = false;
  }
}

/**
 * Disconnect from realtime API
 */
export function disconnectRealtime(): void {
  stopRecording();
  if (session?.ws) {
    session.ws.close();
    session.ws = null;
  }
  session = null;
  audioQueue = [];
  isPlaying = false;
}

/**
 * Send text message (for testing or hybrid mode)
 */
export function sendTextMessage(text: string): void {
  if (!session?.isConnected || !session.ws) {
    console.error('[OpenAI Realtime] Not connected');
    return;
  }

  // Create conversation item
  session.ws.send(JSON.stringify({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{
        type: 'input_text',
        text: text
      }]
    }
  }));

  // Request response
  session.ws.send(JSON.stringify({
    type: 'response.create'
  }));
}

/**
 * Check connection status
 */
export function isConnected(): boolean {
  return session?.isConnected || false;
}

/**
 * Check recording status
 */
export function isRecordingActive(): boolean {
  return session?.isRecording || false;
}

// ============================================================================
// AUDIO UTILITIES
// ============================================================================

/**
 * Convert Float32Array to 16-bit PCM
 */
function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Play audio chunk (PCM16 at 24kHz)
 */
async function playAudioChunk(pcmData: ArrayBuffer): Promise<void> {
  audioQueue.push(pcmData);
  
  if (!isPlaying) {
    processAudioQueue();
  }
}

/**
 * Process audio queue for smooth playback
 */
async function processAudioQueue(): Promise<void> {
  if (isPlaying || audioQueue.length === 0) return;
  
  isPlaying = true;
  
  try {
    const audioContext = new AudioContext({ sampleRate: 24000 });
    
    while (audioQueue.length > 0) {
      const pcmData = audioQueue.shift()!;
      const int16Array = new Int16Array(pcmData);
      
      // Convert to float32
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);
      
      // Play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      
      // Wait for playback
      await new Promise(resolve => {
        source.onended = resolve;
      });
    }
    
    await audioContext.close();
  } catch (error) {
    console.error('[OpenAI Realtime] Playback error:', error);
  }
  
  isPlaying = false;
}

// Export types
export type { RealtimeConfig };
