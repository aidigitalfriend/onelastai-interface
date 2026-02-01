
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { SettingsState, CanvasState } from "../types";

const navigatePortalTool: FunctionDeclaration = {
  name: 'navigate_portal',
  parameters: {
    type: Type.OBJECT,
    description: 'Opens a specific URL in the user\'s Neural Portal.',
    properties: {
      url: { type: Type.STRING, description: 'The full URL to navigate to.' },
      reason: { type: Type.STRING, description: 'Explanation.' }
    },
    required: ['url'],
  },
};

const updateCanvasTool: FunctionDeclaration = {
  name: 'update_canvas',
  parameters: {
    type: Type.OBJECT,
    description: 'Updates the content of the Neural Canvas workspace. Use this to write documents, code, create mockups, or display media (video/images).',
    properties: {
      content: { type: Type.STRING, description: 'The content or source URL for the canvas.' },
      type: { type: Type.STRING, enum: ['text', 'code', 'html', 'video', 'image'], description: 'The type of content being synchronized.' },
      language: { type: Type.STRING, description: 'If type is code, specify the language (e.g., javascript, python).' },
      title: { type: Type.STRING, description: 'A title for this canvas state.' }
    },
    required: ['content', 'type'],
  },
};

export const callGemini = async (
  prompt: string, 
  settings: SettingsState
): Promise<{ 
  text: string; 
  isImage?: boolean; 
  urls?: string[]; 
  navigationUrl?: string;
  canvasUpdate?: Partial<CanvasState>;
}> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return { text: "ERROR: API_KEY not provisioned." };

  // Fix: Create instance right before use to ensure updated key selection
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    let modelToUse = settings.model;
    const config: any = {
      systemInstruction: settings.customPrompt + `
\n\nWORKAL_CAPABILITIES:
1. NEURAL_PORTAL: Use 'navigate_portal' to open sites/media.
2. CANVAS_SYNC: Use 'update_canvas' to manage the shared workspace. This tab supports:
   - 'text': Collaborative documents.
   - 'code': Programming with syntax support.
   - 'html': Live rendered web layouts.
   - 'video': Embedded video streams (provide URL).
   - 'image': Full-screen visual assets (provide URL/Base64).
If the user mentions a document, file, or media they want to "work on", push it to the Canvas Sync tab immediately.`,
      temperature: settings.temperature,
      maxOutputTokens: settings.maxTokens,
      tools: [{ functionDeclarations: [navigatePortalTool, updateCanvasTool] }]
    };

    // Fix: Adjusted tool configuration logic. googleSearch is mutually exclusive with other tool categories.
    if (settings.activeTool === 'web_search' || settings.activeTool === 'browser' || settings.activeTool === 'deep_research') {
      config.tools = [{ googleSearch: {} }];
      modelToUse = 'gemini-3-pro-preview'; 
    }

    // Fix: When using thinkingConfig, set thinkingBudget
    if (settings.activeTool === 'thinking') {
      config.thinkingConfig = { thinkingBudget: 1024 };
    }

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: config
    });

    // Fix: Extract function calls using the built-in property
    const functionCalls = response.functionCalls;
    let navigationUrl: string | undefined;
    let canvasUpdate: Partial<CanvasState> | undefined;
    
    if (functionCalls) {
      for (const call of functionCalls) {
        if (call.name === 'navigate_portal') {
          navigationUrl = call.args.url as string;
        } else if (call.name === 'update_canvas') {
          canvasUpdate = {
            content: call.args.content as string,
            type: call.args.type as any,
            language: call.args.language as string,
            title: (call.args.title as string) || settings.canvas.title
          };
        }
      }
    }

    // Fix: Extract grounding URLs from groundingMetadata
    const urls = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web?.uri)
      .filter(Boolean);

    let textResponse = response.text || "";
    if (navigationUrl) textResponse += `\n\n[SYSTEM_ACTION]: Portal initialized at ${navigationUrl}`;
    if (canvasUpdate) textResponse += `\n\n[SYSTEM_ACTION]: Workspace synchronized with ${canvasUpdate.title}`;

    return { 
      text: textResponse || "Command processed successfully.", 
      urls: urls,
      navigationUrl,
      canvasUpdate
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { text: `CRITICAL_ERROR: ${error.message || "Uplink failure"}` };
  }
};
