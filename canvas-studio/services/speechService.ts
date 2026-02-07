/**
 * Canvas Studio Speech Service
 * Routes TTS through the backend API instead of direct Gemini SDK calls
 */

export async function speak(text: string): Promise<void> {
  try {
    // Use backend speech synthesis endpoint
    const response = await fetch('/api/speech/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        text,
        voice: 'nova', // OpenAI TTS voice
      }),
    });

    if (!response.ok) {
      // Fallback to browser's built-in speech synthesis
      fallbackSpeak(text);
      return;
    }

    const data = await response.json();
    
    if (data.audio) {
      // Play base64 audio from backend
      const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
    } else {
      fallbackSpeak(text);
    }
  } catch (error) {
    console.error("TTS Error:", error);
    // Fallback to browser TTS
    fallbackSpeak(text);
  }
}

function fallbackSpeak(text: string): void {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}
