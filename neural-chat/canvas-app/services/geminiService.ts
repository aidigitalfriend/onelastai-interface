/**
 * Canvas App AI Service
 * Routes all AI calls through the backend API (no direct SDK calls)
 * Supports: Anthropic (primary), Mistral (primary), xAI (fallback)
 */

const SYSTEM_INSTRUCTION = `You are a world-class senior frontend engineer and UI/UX designer. 
Your task is to generate or modify a complete, high-quality, single-file HTML application.

Rules for generated code:
1. Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>).
2. Use Lucide icons via CDN (<script src="https://unpkg.com/lucide@latest"></script>).
3. Ensure the design is modern, professional, and mobile-responsive.
4. Include all necessary JavaScript.
5. The output MUST be a single, valid HTML file containing <html>, <head>, and <body> tags.
6. Return ONLY the code. No explanations, no markdown blocks.
7. Always return the FULL updated file.`;

export async function generateAppCode(
  prompt: string, 
  modelId: string, 
  isThinking: boolean, 
  currentCode?: string, 
  history: any[] = []
): Promise<string> {
  try {
    // Route through backend canvas API instead of direct SDK calls
    const response = await fetch('/api/canvas/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        prompt,
        provider: detectProvider(modelId),
        modelId,
        isThinking,
        currentCode,
        history,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate application');
    }

    return cleanCode(data.code || data.response || '');
  } catch (error) {
    console.error("AI API Error:", error);
    throw new Error("Failed to process request. Please try again.");
  }
}

// Map model ID to provider name for the backend
function detectProvider(modelId: string): string {
  if (modelId.startsWith('claude')) return 'Anthropic';
  if (modelId.startsWith('mistral') || modelId.startsWith('codestral')) return 'Mistral';
  if (modelId.startsWith('grok')) return 'xAI';
  if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'OpenAI';
  if (modelId.startsWith('gemini')) return 'Designer';
  if (modelId.startsWith('llama')) return 'Groq';
  return 'Anthropic'; // default fallback
}

function cleanCode(text: string): string {
  return text.replace(/```html/g, "").replace(/```/g, "").trim();
}
