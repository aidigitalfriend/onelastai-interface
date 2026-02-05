/**
 * NEURAL CHAT - SPEECH SERVICE
 * Text-to-Speech using Web Speech API (browser native)
 * Speech-to-Text using Web Speech Recognition API
 */

// ============================================================================
// TEXT-TO-SPEECH (TTS)
// ============================================================================

let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

/**
 * Speak text using browser's native TTS
 */
export async function speak(text: string, options?: {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    // Cancel any ongoing speech
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply options
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    // Select voice if specified
    if (options?.voice) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => 
        v.name.toLowerCase().includes(options.voice!.toLowerCase())
      );
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      isSpeaking = true;
      options?.onStart?.();
    };

    utterance.onend = () => {
      isSpeaking = false;
      currentUtterance = null;
      options?.onEnd?.();
      resolve();
    };

    utterance.onerror = (event) => {
      isSpeaking = false;
      currentUtterance = null;
      options?.onError?.(event);
      reject(event);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
  isSpeaking = false;
  currentUtterance = null;
}

/**
 * Check if currently speaking
 */
export function getIsSpeaking(): boolean {
  return isSpeaking;
}

/**
 * Get available voices
 */
export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices();
}

// ============================================================================
// SPEECH-TO-TEXT (STT)
// ============================================================================

type SpeechRecognitionType = typeof window.SpeechRecognition | typeof window.webkitSpeechRecognition;

let recognition: SpeechRecognition | null = null;
let isListening = false;

interface STTOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

/**
 * Start speech recognition
 */
export function startListening(options?: STTOptions): boolean {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('Speech Recognition not supported');
    options?.onError?.({ message: 'Speech Recognition not supported in this browser' });
    return false;
  }

  // Stop existing recognition
  if (recognition && isListening) {
    recognition.stop();
  }

  recognition = new SpeechRecognition();
  recognition.continuous = options?.continuous ?? false;
  recognition.interimResults = options?.interimResults ?? true;
  recognition.lang = options?.language ?? 'en-US';

  recognition.onstart = () => {
    isListening = true;
    options?.onStart?.();
  };

  recognition.onresult = (event: any) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      options?.onResult?.(finalTranscript, true);
    } else if (interimTranscript) {
      options?.onResult?.(interimTranscript, false);
    }
  };

  recognition.onend = () => {
    isListening = false;
    options?.onEnd?.();
  };

  recognition.onerror = (event: any) => {
    isListening = false;
    options?.onError?.(event);
  };

  recognition.start();
  return true;
}

/**
 * Stop speech recognition
 */
export function stopListening(): void {
  if (recognition) {
    recognition.stop();
    isListening = false;
  }
}

/**
 * Check if currently listening
 */
export function getIsListening(): boolean {
  return isListening;
}

// ============================================================================
// SPEECH-TO-SPEECH (STS) - Voice Chat Mode
// ============================================================================

interface STSOptions {
  language?: string;
  autoSpeak?: boolean;
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onListenStart?: () => void;
  onListenEnd?: () => void;
  onError?: (error: any) => void;
  processResponse: (transcript: string) => Promise<string>;
}

let stsActive = false;
let stsOptions: STSOptions | null = null;

/**
 * Start Speech-to-Speech mode
 * Listens → Gets AI response → Speaks response → Repeats
 */
export function startSTS(options: STSOptions): boolean {
  if (stsActive) {
    console.warn('STS already active');
    return false;
  }

  stsOptions = options;
  stsActive = true;

  const listen = () => {
    if (!stsActive) return;

    startListening({
      language: options.language,
      continuous: false,
      interimResults: false,
      onStart: () => {
        options.onListenStart?.();
      },
      onResult: async (transcript, isFinal) => {
        if (!isFinal || !stsActive) return;
        
        options.onTranscript?.(transcript);
        options.onListenEnd?.();

        try {
          // Get AI response
          const response = await options.processResponse(transcript);
          options.onResponse?.(response);

          // Speak the response if autoSpeak is enabled
          if (options.autoSpeak !== false && stsActive) {
            options.onSpeakStart?.();
            await speak(response, {
              onEnd: () => {
                options.onSpeakEnd?.();
                // Continue listening after speaking
                if (stsActive) {
                  setTimeout(listen, 500);
                }
              },
              onError: (error) => {
                options.onSpeakEnd?.();
                options.onError?.(error);
                if (stsActive) {
                  setTimeout(listen, 500);
                }
              }
            });
          } else if (stsActive) {
            // Continue listening without speaking
            setTimeout(listen, 500);
          }
        } catch (error) {
          options.onError?.(error);
          if (stsActive) {
            setTimeout(listen, 1000);
          }
        }
      },
      onEnd: () => {
        // Speech recognition ended - this can happen on timeout or when user stops talking
        // Continue listening loop if STS is still active and no result was received
        if (stsActive) {
          // Restart listening after a short delay
          setTimeout(listen, 300);
        } else {
          options.onListenEnd?.();
        }
      },
      onError: (error) => {
        options.onError?.(error);
        options.onListenEnd?.();
        // Retry on error
        if (stsActive) {
          setTimeout(listen, 1000);
        }
      }
    });
  };

  listen();
  return true;
}

/**
 * Stop Speech-to-Speech mode
 */
export function stopSTS(): void {
  stsActive = false;
  stsOptions = null;
  stopListening();
  stopSpeaking();
}

/**
 * Check if STS is active
 */
export function getIsSTSActive(): boolean {
  return stsActive;
}

// ============================================================================
// VOICE COMMANDS
// ============================================================================

const VOICE_COMMANDS: Record<string, string[]> = {
  'stop': ['stop', 'stop listening', 'cancel', 'nevermind'],
  'clear': ['clear', 'clear chat', 'new chat', 'start over'],
  'repeat': ['repeat', 'say again', 'what did you say'],
  'slower': ['slower', 'speak slower', 'slow down'],
  'faster': ['faster', 'speak faster', 'speed up'],
};

/**
 * Check if text matches a voice command
 */
export function matchVoiceCommand(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  for (const [command, phrases] of Object.entries(VOICE_COMMANDS)) {
    if (phrases.some(phrase => lowerText.includes(phrase))) {
      return command;
    }
  }
  
  return null;
}

// Export types
export type { STTOptions, STSOptions };
