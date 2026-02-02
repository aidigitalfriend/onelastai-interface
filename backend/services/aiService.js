/**
 * NEURAL LINK AI SERVICE
 * Multi-provider AI chat with credit-based billing
 * 
 * Supported Providers:
 * - Anthropic (Claude)
 * - OpenAI (GPT-4, GPT-4o)
 * - Google (Gemini)
 * - Mistral
 * - xAI (Grok)
 * - Groq
 * - Cerebras
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    models: {
      'claude-sonnet-4-20250514': { inputCost: 0.003, outputCost: 0.015 },
      'claude-opus-4-20250514': { inputCost: 0.015, outputCost: 0.075 },
      'claude-3-5-haiku-20241022': { inputCost: 0.00025, outputCost: 0.00125 },
    },
  },
  openai: {
    name: 'OpenAI',
    models: {
      'gpt-4.1': { inputCost: 0.005, outputCost: 0.015 },
      'gpt-4.1-mini': { inputCost: 0.00015, outputCost: 0.0006 },
      'gpt-4o': { inputCost: 0.005, outputCost: 0.015 },
      'gpt-4o-mini': { inputCost: 0.00015, outputCost: 0.0006 },
      'o3-mini': { inputCost: 0.01, outputCost: 0.03 },
      'o1': { inputCost: 0.03, outputCost: 0.06 },
    },
  },
  gemini: {
    name: 'Google Gemini',
    models: {
      'gemini-2.5-pro-preview-06-05': { inputCost: 0.00125, outputCost: 0.005 },
      'gemini-2.5-flash-preview-05-20': { inputCost: 0.000075, outputCost: 0.0003 },
      'gemini-2.0-flash': { inputCost: 0.00, outputCost: 0.00 }, // Free tier
    },
  },
  mistral: {
    name: 'Mistral',
    models: {
      'mistral-large-2501': { inputCost: 0.002, outputCost: 0.006 },
      'codestral-latest': { inputCost: 0.0027, outputCost: 0.0081 },
      'mistral-small-latest': { inputCost: 0.0002, outputCost: 0.0006 },
    },
  },
  xai: {
    name: 'xAI',
    models: {
      'grok-3': { inputCost: 0.002, outputCost: 0.01 },
      'grok-3-fast': { inputCost: 0.001, outputCost: 0.005 },
      'grok-3-mini': { inputCost: 0.0002, outputCost: 0.001 },
    },
  },
  groq: {
    name: 'Groq',
    models: {
      'llama-3.3-70b-versatile': { inputCost: 0.00059, outputCost: 0.00079 },
      'llama-3.3-70b-specdec': { inputCost: 0.00059, outputCost: 0.00079 },
      'llama-3.1-8b-instant': { inputCost: 0.00005, outputCost: 0.00008 },
    },
  },
  cerebras: {
    name: 'Cerebras',
    models: {
      'llama-3.3-70b': { inputCost: 0.0006, outputCost: 0.0006 },
      'llama3.1-8b': { inputCost: 0.0001, outputCost: 0.0001 },
    },
  },
};

// Credit multiplier (1 credit = $1 worth of tokens)
const CREDIT_MULTIPLIER = 1.0;

// ============================================================================
// PROVIDER CLIENTS
// ============================================================================

let anthropicClient = null;
let openaiClient = null;
let geminiClient = null;
let mistralClient = null;
let xaiClient = null;
let groqClient = null;
let cerebrasClient = null;

function initializeClients() {
  if (process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  
  if (process.env.MISTRAL_API_KEY) {
    mistralClient = new OpenAI({
      apiKey: process.env.MISTRAL_API_KEY,
      baseURL: 'https://api.mistral.ai/v1',
    });
  }
  
  if (process.env.XAI_API_KEY) {
    xaiClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  }
  
  if (process.env.GROQ_API_KEY) {
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  
  if (process.env.CEREBRAS_API_KEY) {
    cerebrasClient = new OpenAI({
      apiKey: process.env.CEREBRAS_API_KEY,
      baseURL: 'https://api.cerebras.ai/v1',
    });
  }
}

initializeClients();

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

export class AIService {
  constructor(user) {
    this.user = user;
  }

  /**
   * Get available providers
   */
  static getAvailableProviders() {
    const available = {};
    
    if (anthropicClient) available.anthropic = PROVIDERS.anthropic;
    if (openaiClient) available.openai = PROVIDERS.openai;
    if (geminiClient) available.gemini = PROVIDERS.gemini;
    if (mistralClient) available.mistral = PROVIDERS.mistral;
    if (xaiClient) available.xai = PROVIDERS.xai;
    if (groqClient) available.groq = PROVIDERS.groq;
    if (cerebrasClient) available.cerebras = PROVIDERS.cerebras;
    
    return available;
  }

  /**
   * Calculate credit cost for a message
   */
  static calculateCost(provider, model, inputTokens, outputTokens) {
    const providerConfig = PROVIDERS[provider];
    if (!providerConfig) return 0;
    
    const modelConfig = providerConfig.models[model];
    if (!modelConfig) return 0;
    
    const inputCost = (inputTokens / 1000) * modelConfig.inputCost;
    const outputCost = (outputTokens / 1000) * modelConfig.outputCost;
    
    return (inputCost + outputCost) * CREDIT_MULTIPLIER;
  }

  /**
   * Check if user has enough credits
   */
  async checkCredits(estimatedCost = 0.01) {
    const credits = this.user.credits?.balance || 0;
    return credits >= estimatedCost;
  }

  /**
   * Deduct credits after usage
   */
  async deductCredits(cost, provider, model, inputTokens, outputTokens, sessionId = null) {
    if (cost <= 0) return;

    await prisma.$transaction(async (tx) => {
      // Update balance
      const updatedCredits = await tx.userCredits.update({
        where: { userId: this.user.id },
        data: {
          balance: { decrement: cost },
          lifetimeSpent: { increment: cost },
        },
      });

      // Record transaction
      await tx.creditTransaction.create({
        data: {
          userCreditsId: updatedCredits.id,
          type: 'USAGE',
          amount: -cost,
          balanceAfter: updatedCredits.balance,
          description: `${provider}/${model} - ${inputTokens + outputTokens} tokens`,
          referenceId: sessionId,
          referenceType: 'chat',
        },
      });

      // Log usage
      await tx.usageLog.create({
        data: {
          userId: this.user.id,
          sessionId,
          provider,
          model,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          creditsCost: cost,
        },
      });
    });

    return cost;
  }

  /**
   * Chat with Anthropic Claude (supports vision)
   */
  async chatAnthropic(messages, model = 'claude-sonnet-4-20250514', options = {}) {
    if (!anthropicClient) throw new Error('Anthropic not configured');

    const startTime = Date.now();
    
    // Format messages, handling image in the last user message if present
    const formattedMessages = messages.map((m, idx) => {
      const isLastMessage = idx === messages.length - 1;
      const hasImage = isLastMessage && options.image;
      
      if (hasImage && m.role === 'user') {
        // Multimodal message with image
        return {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: options.image.mimeType,
                data: options.image.data.replace(/^data:[^;]+;base64,/, ''), // Strip prefix if present
              },
            },
            {
              type: 'text',
              text: m.content,
            },
          ],
        };
      }
      
      return {
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      };
    });

    const response = await anthropicClient.messages.create({
      model,
      max_tokens: options.maxTokens || 4096,
      system: options.systemPrompt || 'You are a helpful AI assistant.',
      messages: formattedMessages,
    });

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = AIService.calculateCost('anthropic', model, inputTokens, outputTokens);
    const latency = Date.now() - startTime;

    await this.deductCredits(cost, 'anthropic', model, inputTokens, outputTokens, options.sessionId);

    return {
      content: response.content[0].text,
      provider: 'anthropic',
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      creditsCost: cost,
      latencyMs: latency,
    };
  }

  /**
   * Chat with OpenAI (supports vision for gpt-4.1 and gpt-4o)
   */
  async chatOpenAI(messages, model = 'gpt-4.1', options = {}) {
    if (!openaiClient) throw new Error('OpenAI not configured');

    const startTime = Date.now();

    // Format messages, handling image in the last user message if present
    const formattedMessages = [
      { role: 'system', content: options.systemPrompt || 'You are a helpful AI assistant.' },
      ...messages.map((m, idx) => {
        const isLastMessage = idx === messages.length - 1;
        const hasImage = isLastMessage && options.image;
        
        if (hasImage && m.role === 'user') {
          // Multimodal message with image
          const imageData = options.image.data.includes('base64,') 
            ? options.image.data 
            : `data:${options.image.mimeType};base64,${options.image.data}`;
          
          return {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageData },
              },
              {
                type: 'text',
                text: m.content,
              },
            ],
          };
        }
        
        return { role: m.role, content: m.content };
      }),
    ];

    const response = await openaiClient.chat.completions.create({
      model,
      max_tokens: options.maxTokens || 4096,
      messages: formattedMessages,
    });

    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const cost = AIService.calculateCost('openai', model, inputTokens, outputTokens);
    const latency = Date.now() - startTime;

    await this.deductCredits(cost, 'openai', model, inputTokens, outputTokens, options.sessionId);

    return {
      content: response.choices[0].message.content,
      provider: 'openai',
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      creditsCost: cost,
      latencyMs: latency,
    };
  }

  /**
   * Chat with Google Gemini (supports vision)
   */
  async chatGemini(messages, model = 'gemini-2.0-flash', options = {}) {
    if (!geminiClient) throw new Error('Gemini not configured');

    const startTime = Date.now();
    
    const genModel = geminiClient.getGenerativeModel({ 
      model,
      systemInstruction: options.systemPrompt || 'You are a helpful AI assistant.',
    });

    // Format messages for Gemini
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = genModel.startChat({ history });
    const lastMessage = messages[messages.length - 1];
    
    // Build parts array for the last message
    const parts = [];
    
    // Add image if present
    if (options.image) {
      const imageData = options.image.data.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: options.image.mimeType,
          data: imageData,
        },
      });
    }
    
    // Add text
    parts.push({ text: lastMessage.content });
    
    const result = await chat.sendMessage(parts);

    const response = await result.response;
    const text = response.text();

    // Estimate tokens for Gemini (they don't always provide exact counts)
    const inputTokens = response.usageMetadata?.promptTokenCount || 
      Math.ceil(messages.reduce((acc, m) => acc + m.content.length / 4, 0));
    const outputTokens = response.usageMetadata?.candidatesTokenCount ||
      Math.ceil(text.length / 4);

    const cost = AIService.calculateCost('gemini', model, inputTokens, outputTokens);
    const latency = Date.now() - startTime;

    await this.deductCredits(cost, 'gemini', model, inputTokens, outputTokens, options.sessionId);

    return {
      content: text,
      provider: 'gemini',
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      creditsCost: cost,
      latencyMs: latency,
    };
  }

  /**
   * Chat with OpenAI-compatible providers (Mistral, xAI, Groq, Cerebras)
   */
  async chatOpenAICompatible(client, providerName, messages, model, options = {}) {
    if (!client) throw new Error(`${providerName} not configured`);

    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model,
      max_tokens: options.maxTokens || 4096,
      messages: [
        { role: 'system', content: options.systemPrompt || 'You are a helpful AI assistant.' },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    });

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = AIService.calculateCost(providerName, model, inputTokens, outputTokens);
    const latency = Date.now() - startTime;

    await this.deductCredits(cost, providerName, model, inputTokens, outputTokens, options.sessionId);

    return {
      content: response.choices[0].message.content,
      provider: providerName,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      creditsCost: cost,
      latencyMs: latency,
    };
  }

  /**
   * Universal chat method - routes to appropriate provider
   */
  async chat(messages, provider, model, options = {}) {
    // Check credits first
    const hasCredits = await this.checkCredits();
    if (!hasCredits) {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    switch (provider) {
      case 'anthropic':
        return this.chatAnthropic(messages, model, options);
      
      case 'openai':
        return this.chatOpenAI(messages, model, options);
      
      case 'gemini':
        return this.chatGemini(messages, model, options);
      
      case 'mistral':
        return this.chatOpenAICompatible(mistralClient, 'mistral', messages, model, options);
      
      case 'xai':
        return this.chatOpenAICompatible(xaiClient, 'xai', messages, model, options);
      
      case 'groq':
        return this.chatOpenAICompatible(groqClient, 'groq', messages, model, options);
      
      case 'cerebras':
        return this.chatOpenAICompatible(cerebrasClient, 'cerebras', messages, model, options);
      
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Stream chat response (for providers that support it)
   */
  async *streamChat(messages, provider, model, options = {}) {
    // Check credits first
    const hasCredits = await this.checkCredits();
    if (!hasCredits) {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    const startTime = Date.now();
    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    switch (provider) {
      case 'anthropic': {
        if (!anthropicClient) throw new Error('Anthropic not configured');
        
        const stream = await anthropicClient.messages.stream({
          model,
          max_tokens: options.maxTokens || 4096,
          system: options.systemPrompt || 'You are a helpful AI assistant.',
          messages: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            fullContent += chunk.delta.text;
            yield { type: 'text', content: chunk.delta.text };
          }
        }

        const finalMessage = await stream.finalMessage();
        inputTokens = finalMessage.usage.input_tokens;
        outputTokens = finalMessage.usage.output_tokens;
        break;
      }

      case 'openai':
      case 'mistral':
      case 'xai':
      case 'groq':
      case 'cerebras': {
        const client = provider === 'openai' ? openaiClient :
                       provider === 'mistral' ? mistralClient :
                       provider === 'xai' ? xaiClient :
                       provider === 'groq' ? groqClient :
                       cerebrasClient;

        if (!client) throw new Error(`${provider} not configured`);

        const stream = await client.chat.completions.create({
          model,
          max_tokens: options.maxTokens || 4096,
          stream: true,
          messages: [
            { role: 'system', content: options.systemPrompt || 'You are a helpful AI assistant.' },
            ...messages.map(m => ({ role: m.role, content: m.content })),
          ],
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullContent += content;
            yield { type: 'text', content };
          }
          // Some providers send usage in final chunk
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens || 0;
            outputTokens = chunk.usage.completion_tokens || 0;
          }
        }

        // Estimate if not provided
        if (!outputTokens) {
          inputTokens = Math.ceil(messages.reduce((acc, m) => acc + m.content.length / 4, 0));
          outputTokens = Math.ceil(fullContent.length / 4);
        }
        break;
      }

      default:
        throw new Error(`Streaming not supported for ${provider}`);
    }

    // Calculate and deduct credits
    const cost = AIService.calculateCost(provider, model, inputTokens, outputTokens);
    const latency = Date.now() - startTime;

    await this.deductCredits(cost, provider, model, inputTokens, outputTokens, options.sessionId);

    yield {
      type: 'done',
      content: fullContent,
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      creditsCost: cost,
      latencyMs: latency,
    };
  }
}

export default AIService;
