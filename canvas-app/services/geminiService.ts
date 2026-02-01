
import { GoogleGenAI } from "@google/genai";

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

// Map model IDs to actual Gemini model names
function getGeminiModelName(modelId: string): string {
  const modelMap: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-2.0-flash': 'gemini-2.0-flash-exp',
    'gemini-1.0-pro': 'gemini-1.0-pro',
  };
  return modelMap[modelId] || 'gemini-1.5-flash';
}

export async function generateAppCode(
  prompt: string, 
  modelId: string, 
  isThinking: boolean, 
  currentCode?: string, 
  history: any[] = []
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  // Get the proper Gemini model name
  const geminiModel = getGeminiModelName(modelId);
  
  const contents: any[] = [];
  
  if (currentCode) {
    contents.push({ role: 'user', parts: [{ text: `Current code:\n${currentCode}` }] });
  }

  history.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });

  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: isThinking ? 1 : 0.7,
  };

  if (isThinking) {
    config.thinkingConfig = { thinkingBudget: 32768 };
    // No maxOutputTokens allowed when thinkingBudget is set per instructions
  }

  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents,
      config,
    });
    return cleanCode(response.text || "");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to process request. Check if the selected model is available.");
  }
}

function cleanCode(text: string): string {
  return text.replace(/```html/g, "").replace(/```/g, "").trim();
}
