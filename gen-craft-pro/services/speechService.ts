/**
 * Speech Service - Text-to-Speech via Backend API
 * SECURITY: All AI/TTS calls go through backend - no API keys in frontend
 */

const TTS_API_ENDPOINT = '/api/canvas/tts';

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Speak text using browser's built-in speech synthesis (fallback)
 */
function speakWithBrowserTTS(text: string): void {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

/**
 * Play audio from MP3/MPEG base64 data
 */
async function playAudioFromBase64(base64Audio: string): Promise<void> {
  const audioData = decode(base64Audio);
  const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(audioBlob);
  
  const audio = new Audio(audioUrl);
  audio.onended = () => URL.revokeObjectURL(audioUrl);
  await audio.play();
}

/**
 * Play PCM audio data (for Gemini TTS)
 */
async function playPCMAudio(base64Audio: string, sampleRate: number, channels: number): Promise<void> {
  const outputAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate });
  const audioBuffer = await decodeAudioData(
    decode(base64Audio),
    outputAudioContext,
    sampleRate,
    channels,
  );

  const source = outputAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(outputAudioContext.destination);
  source.start();
}

/**
 * Speak text using backend TTS API
 * Falls back to browser TTS if backend unavailable
 */
export async function speak(text: string): Promise<void> {
  try {
    const response = await fetch(TTS_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text, voice: 'Kore' }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.audioData) {
      throw new Error(data.error || 'No audio data in response');
    }

    // Handle different audio formats
    if (data.format === 'mp3' || data.mimeType === 'audio/mpeg') {
      await playAudioFromBase64(data.audioData);
    } else {
      // PCM audio (Gemini TTS)
      await playPCMAudio(data.audioData, data.sampleRate || 24000, data.channels || 1);
    }
  } catch (error) {
    console.warn('[TTS] Backend TTS failed, using browser fallback:', error);
    speakWithBrowserTTS(text);
  }
}

export default { speak };
