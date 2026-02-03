
import { GoogleGenAI } from "@google/genai";

// Language-specific system instructions
const SYSTEM_INSTRUCTIONS: Record<string, string> = {
  html: `You are a world-class senior frontend engineer and UI/UX designer. 
Your task is to generate or modify a complete, high-quality, single-file HTML application.

Rules for generated code:
1. Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>).
2. Use Lucide icons via CDN (<script src="https://unpkg.com/lucide@latest"></script>).
3. Ensure the design is modern, professional, and mobile-responsive.
4. Include all necessary JavaScript inline.
5. The output MUST be a single, valid HTML file containing <html>, <head>, and <body> tags.
6. Return ONLY the code. No explanations, no markdown blocks.
7. Always return the FULL updated file.`,

  react: `You are a world-class senior React/TypeScript engineer and UI/UX designer.
Your task is to generate or modify a complete, high-quality React component.

Rules for generated code:
1. Use TypeScript with proper types.
2. Use Tailwind CSS classes for styling (it's pre-configured).
3. Use React hooks (useState, useEffect, useMemo, useCallback) appropriately.
4. Export the component as default: export default function ComponentName() { ... }
5. Import React at the top: import React, { useState, useEffect } from 'react';
6. Ensure the design is modern, professional, and mobile-responsive.
7. Return ONLY the code. No explanations, no markdown code blocks.
8. Always return the FULL updated file.
9. For icons, use lucide-react: import { IconName } from 'lucide-react';
10. The component should be self-contained in a single file.`,

  typescript: `You are a world-class senior TypeScript engineer.
Your task is to generate or modify high-quality TypeScript code.

Rules for generated code:
1. Use proper TypeScript types and interfaces.
2. Follow best practices for TypeScript development.
3. Include proper error handling.
4. Add JSDoc comments for public APIs.
5. Return ONLY the code. No explanations, no markdown code blocks.
6. Always return the FULL updated file.`,

  javascript: `You are a world-class senior JavaScript engineer.
Your task is to generate or modify high-quality JavaScript code.

Rules for generated code:
1. Use modern ES6+ syntax.
2. Follow best practices for JavaScript development.
3. Include proper error handling.
4. Add comments for complex logic.
5. Return ONLY the code. No explanations, no markdown code blocks.
6. Always return the FULL updated file.`,

  python: `You are a world-class senior Python engineer.
Your task is to generate or modify high-quality Python code.

Rules for generated code:
1. Use Python 3.10+ syntax and features.
2. Follow PEP 8 style guidelines.
3. Include type hints for function parameters and returns.
4. Add docstrings for classes and functions.
5. Include proper error handling with try/except.
6. Return ONLY the code. No explanations, no markdown code blocks.
7. Always return the FULL updated file.`,

  default: `You are a world-class senior software engineer.
Your task is to generate or modify high-quality code.

Rules:
1. Follow best practices for the language.
2. Include proper error handling.
3. Add comments for complex logic.
4. Return ONLY the code. No explanations, no markdown code blocks.
5. Always return the FULL updated file.`
};

// Detect language from code content
function detectLanguage(code: string): string {
  if (!code) return 'html';
  
  const lowerCode = code.toLowerCase();
  
  // React/JSX detection
  if (code.includes('import React') || 
      code.includes('from "react"') || 
      code.includes("from 'react'") ||
      code.includes('useState') ||
      code.includes('useEffect') ||
      code.includes('export default function')) {
    return 'react';
  }
  
  // HTML detection
  if (lowerCode.includes('<!doctype html') || 
      lowerCode.includes('<html') ||
      (lowerCode.includes('<head') && lowerCode.includes('<body'))) {
    return 'html';
  }
  
  // Python detection
  if (code.includes('def ') || 
      code.includes('import ') && code.includes(':') ||
      code.includes('class ') && code.includes(':') ||
      code.includes('print(')) {
    return 'python';
  }
  
  // TypeScript detection
  if (code.includes(': string') || 
      code.includes(': number') ||
      code.includes('interface ') ||
      code.includes(': boolean')) {
    return 'typescript';
  }
  
  return 'javascript';
}

export async function generateAppCode(
  prompt: string, 
  modelId: string, 
  isThinking: boolean, 
  currentCode?: string, 
  history: any[] = [],
  targetLanguage?: string
): Promise<{ code: string; language: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  // Determine language from current code or prompt
  let language = targetLanguage || 'html';
  if (currentCode) {
    language = detectLanguage(currentCode);
  } else {
    // Check prompt for language hints
    const promptLower = prompt.toLowerCase();
    if (promptLower.includes('react') || promptLower.includes('component')) {
      language = 'react';
    } else if (promptLower.includes('python') || promptLower.includes('.py')) {
      language = 'python';
    } else if (promptLower.includes('typescript') || promptLower.includes('.ts')) {
      language = 'typescript';
    } else if (promptLower.includes('javascript') || promptLower.includes('.js')) {
      language = 'javascript';
    }
  }
  
  const systemInstruction = SYSTEM_INSTRUCTIONS[language] || SYSTEM_INSTRUCTIONS.default;
  
  const contents: any[] = [];
  
  if (currentCode) {
    contents.push({ role: 'user', parts: [{ text: `Current ${language} code:\n\`\`\`\n${currentCode}\n\`\`\`` }] });
  }

  history.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });

  // Add language context to prompt
  const enhancedPrompt = currentCode 
    ? prompt 
    : `Create a ${language === 'react' ? 'React TypeScript component' : language === 'html' ? 'single-file HTML application' : `${language} code`} for: ${prompt}`;
  
  contents.push({ role: 'user', parts: [{ text: enhancedPrompt }] });

  const config: any = {
    systemInstruction,
    temperature: isThinking ? 1 : 0.7,
  };

  if (isThinking) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config,
    });
    const cleanedCode = cleanCode(response.text || "", language);
    return { code: cleanedCode, language };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to process request. Check if the selected model is available.");
  }
}

function cleanCode(text: string, language: string): string {
  // Remove markdown code blocks
  let cleaned = text
    .replace(/```(?:html|tsx?|jsx?|python|py|javascript|typescript|react)?\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  
  return cleaned;
}

// Export for backward compatibility
export async function generateCode(
  prompt: string, 
  modelId: string, 
  isThinking: boolean, 
  currentCode?: string, 
  history: any[] = []
): Promise<string> {
  const result = await generateAppCode(prompt, modelId, isThinking, currentCode, history);
  return result.code;
}

