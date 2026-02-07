/**
 * NEURAL CHAT - OPENAI REALTIME API SERVICE
 * Real-time voice conversations using WebSocket
 * wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
 *
 * Key design: Gapless audio playback using a single persistent AudioContext
 * with scheduled buffer sources for smooth, natural-sounding AI speech.
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
  inputAudioContext: AudioContext | null;
  mediaStream: MediaStream | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  processorNode: ScriptProcessorNode | null;
  isConnected: boolean;
  isRecording: boolean;
  config: RealtimeConfig;
}

// Session state
let session: RealtimeSession | null = null;

// ============================================================================
// AUDIO PLAYBACK ENGINE - Gapless streaming via scheduled buffers
// ============================================================================

// Persistent playback context (reused across the entire call)
let playbackCtx: AudioContext | null = null;
// The time at which the next chunk should start playing
let nextPlayTime = 0;
// Gain node for smooth volume control and interruption
let gainNode: GainNode | null = null;
// Track if AI is currently speaking (for interruption)
let isSpeaking = false;

function ensurePlaybackContext(): AudioContext {
  if (!playbackCtx || playbackCtx.state === 'closed') {
    playbackCtx = new AudioContext({ sampleRate: 24000 });
    gainNode = playbackCtx.createGain();
    gainNode.connect(playbackCtx.destination);
    nextPlayTime = 0;
  }
  if (playbackCtx.state === 'suspended') {
    playbackCtx.resume();
  }
  return playbackCtx;
}

/**
 * Schedule a PCM16 audio chunk for gapless playback.
 * Instead of await-ing each chunk, we schedule them at precise
 * times so they play back-to-back with zero gaps.
 */
function scheduleAudioChunk(pcmData: ArrayBuffer): void {
  const ctx = ensurePlaybackContext();
  if (!gainNode) return;

  const int16 = new Int16Array(pcmData);
  if (int16.length === 0) return;

  // Convert Int16 -> Float32
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }

  // Create buffer
  const buffer = ctx.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);

  // Create source
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode);

  // Schedule: if nextPlayTime is in the past, start now
  const now = ctx.currentTime;
  if (nextPlayTime < now) {
    nextPlayTime = now;
  }

  source.start(nextPlayTime);
  isSpeaking = true;

  // Advance the schedule by this chunk's duration
  nextPlayTime += buffer.duration;

  // When this chunk finishes, check if AI has stopped speaking
  source.onended = () => {
    if (ctx.currentTime >= nextPlayTime - 0.01) {
      isSpeaking = false;
    }
  };
}

/**
 * Interrupt AI speech immediately (e.g., when user starts talking)
 */
function interruptPlayback(): void {
  if (gainNode && playbackCtx) {
    // Quick fade out to avoid pop
    gainNode.gain.setValueAtTime(gainNode.gain.value, playbackCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, playbackCtx.currentTime + 0.05);

    // After fade, reset
    setTimeout(() => {
      if (gainNode && playbackCtx) {
        // Disconnect and recreate gain to cancel all scheduled sources
        gainNode.disconnect();
        gainNode = playbackCtx.createGain();
        gainNode.connect(playbackCtx.destination);
        nextPlayTime = 0;
        isSpeaking = false;
      }
    }, 60);
  }
}

/**
 * Close the playback context entirely
 */
function closePlayback(): void {
  if (playbackCtx && playbackCtx.state !== 'closed') {
    playbackCtx.close().catch(() => {});
  }
  playbackCtx = null;
  gainNode = null;
  nextPlayTime = 0;
  isSpeaking = false;
}

// ============================================================================
// SESSION TOKEN
// ============================================================================

async function getSessionToken(
  voice: string,
  instructions: string
): Promise<{ client_secret: string; expires_at: number } | null> {
  try {
    const response = await fetch('/api/realtime/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ voice, instructions }),
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

// ============================================================================
// CONNECT
// ============================================================================

export async function connectRealtime(config: RealtimeConfig): Promise<boolean> {
  try {
    // Close existing session
    if (session?.ws) {
      session.ws.close();
    }
    closePlayback();

    config.onStatusChange?.('Getting session token...');

    const sessionToken = await getSessionToken(
      config.voice || 'alloy',
      config.instructions || 'You are a helpful AI assistant.'
    );

    if (!sessionToken) {
      config.onError?.(
        'Failed to get session token. Please sign in and ensure you have credits.'
      );
      return false;
    }

    config.onStatusChange?.('Connecting...');

    const model = 'gpt-4o-realtime-preview-2024-12-17';
    const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

    const ws = new WebSocket(wsUrl, [
      'realtime',
      `openai-insecure-api-key.${sessionToken.client_secret}`,
      'openai-beta.realtime-v1',
    ]);

    session = {
      ws,
      inputAudioContext: null,
      mediaStream: null,
      sourceNode: null,
      processorNode: null,
      isConnected: false,
      isRecording: false,
      config,
    };

    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        console.log('[OpenAI Realtime] Connected');
        session!.isConnected = true;
        config.onConnected?.();
        config.onStatusChange?.('Connected');

        // Configure the session for natural conversation
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions:
              config.instructions ||
              'You are a helpful AI assistant. Be conversational and friendly.',
            voice: config.voice || 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.4,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
            },
            temperature: config.temperature || 0.8,
          },
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
        if (session) session.isConnected = false;
        config.onDisconnected?.();
        config.onStatusChange?.('Disconnected');
        stopRecording();
      };

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

// ============================================================================
// WEBSOCKET MESSAGE HANDLER
// ============================================================================

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
        // User started talking - interrupt AI if it is speaking
        interruptPlayback();
        session?.config.onStatusChange?.('Listening...');
        break;

      case 'input_audio_buffer.speech_stopped':
        session?.config.onStatusChange?.('Processing...');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (message.transcript) {
          session?.config.onTranscript?.(message.transcript, true);
        }
        break;

      case 'response.audio_transcript.delta':
        if (message.delta) {
          session?.config.onTranscript?.(message.delta, false);
        }
        break;

      case 'response.audio_transcript.done':
        break;

      case 'response.audio.delta':
        // AI audio chunk - schedule for gapless playback
        if (message.delta) {
          const audioData = base64ToArrayBuffer(message.delta);
          scheduleAudioChunk(audioData);
          session?.config.onStatusChange?.('Speaking...');
        }
        break;

      case 'response.audio.done':
        console.log('[OpenAI Realtime] Audio response complete');
        break;

      case 'response.done': {
        // AI finished its full response - wait for playback to end
        const checkDone = () => {
          if (!isSpeaking) {
            session?.config.onStatusChange?.('Listening...');
          } else {
            setTimeout(checkDone, 100);
          }
        };
        setTimeout(checkDone, 100);
        break;
      }

      case 'error':
        console.error('[OpenAI Realtime] Error:', message.error);
        session?.config.onError?.(message.error?.message || 'Unknown error');
        break;

      default:
        break;
    }
  } catch (error) {
    console.error('[OpenAI Realtime] Parse error:', error);
  }
}

// ============================================================================
// MICROPHONE RECORDING
// ============================================================================

export async function startRecording(): Promise<boolean> {
  if (!session?.isConnected || !session.ws) {
    console.error('[OpenAI Realtime] Not connected');
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 24000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    session.mediaStream = stream;
    session.inputAudioContext = new AudioContext({ sampleRate: 24000 });

    const source = session.inputAudioContext.createMediaStreamSource(stream);
    const processor = session.inputAudioContext.createScriptProcessor(4096, 1, 1);

    session.sourceNode = source;
    session.processorNode = processor;

    processor.onaudioprocess = (e) => {
      if (!session?.isConnected || !session.ws || session.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(inputData);
      const base64 = arrayBufferToBase64(pcm16.buffer);

      session.ws.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64,
        })
      );
    };

    source.connect(processor);
    processor.connect(session.inputAudioContext.destination);

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

export function stopRecording(): void {
  if (session?.processorNode) {
    session.processorNode.disconnect();
    session.processorNode = null;
  }
  if (session?.sourceNode) {
    session.sourceNode.disconnect();
    session.sourceNode = null;
  }
  if (session?.mediaStream) {
    session.mediaStream.getTracks().forEach((track) => track.stop());
    session.mediaStream = null;
  }
  if (session?.inputAudioContext) {
    session.inputAudioContext.close().catch(() => {});
    session.inputAudioContext = null;
  }
  if (session) {
    session.isRecording = false;
  }
}

// ============================================================================
// DISCONNECT
// ============================================================================

export function disconnectRealtime(): void {
  stopRecording();
  closePlayback();
  if (session?.ws) {
    session.ws.close();
    session.ws = null;
  }
  session = null;
}

// ============================================================================
// TEXT MESSAGE (hybrid mode)
// ============================================================================

export function sendTextMessage(text: string): void {
  if (!session?.isConnected || !session.ws) {
    console.error('[OpenAI Realtime] Not connected');
    return;
  }

  session.ws.send(
    JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    })
  );

  session.ws.send(JSON.stringify({ type: 'response.create' }));
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

export function isConnected(): boolean {
  return session?.isConnected || false;
}

export function isRecordingActive(): boolean {
  return session?.isRecording || false;
}

// ============================================================================
// AUDIO CONVERSION UTILITIES
// ============================================================================

function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Export types
export type { RealtimeConfig };
