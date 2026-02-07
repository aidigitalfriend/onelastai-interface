/**
 * Anthropic Claude Service - Canvas Code Generation
 * Direct client-side fallback for code generation
 * Primary generation goes through backend API
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistory {
  role: 'user' | 'model';
  text: string;
}

/**
 * Generate app code using Anthropic Claude API
 * Note: This is a client-side fallback - primary generation uses backend API
 */
export async function generateAppCode(
  prompt: string,
  modelId: string = 'claude-3-5-sonnet-20241022',
  currentCode?: string,
  history: ChatHistory[] = []
): Promise<string> {
  // Build messages array
  const messages: Message[] = [];

  // Add current code context if exists
  if (currentCode) {
    messages.push({
      role: 'user',
      content: `Current code:\n${currentCode}`,
    });
    messages.push({
      role: 'assistant',
      content: 'I understand the current code. What changes would you like me to make?',
    });
  }

  // Add conversation history
  history.forEach((msg) => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text,
    });
  });

  // Add the new prompt
  messages.push({
    role: 'user',
    content: prompt,
  });

  try {
    const response = await fetch('/api/canvas/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        provider: 'anthropic',
        modelId,
        currentCode,
        history,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate code');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Generation failed');
    }

    return cleanCode(data.code || '');
  } catch (error) {
    console.error('Anthropic API Error:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to process request. Please try again.'
    );
  }
}

/**
 * Clean generated code - remove markdown fences
 */
function cleanCode(text: string): string {
  return text
    .replace(/```html/gi, '')
    .replace(/```typescript/gi, '')
    .replace(/```javascript/gi, '')
    .replace(/```/g, '')
    .trim();
}

/**
 * Get available Claude models
 */
export function getAvailableModels() {
  return [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Best for coding - highly recommended',
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      description: 'Most capable, best for complex tasks',
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      description: 'Fast and efficient',
    },
  ];
}

export default {
  generateAppCode,
  getAvailableModels,
  SYSTEM_INSTRUCTION,
};
