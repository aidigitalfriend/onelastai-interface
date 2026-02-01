// Usage & Credits Service - Tracks AI usage, credits, and billing
import { AIProvider } from '../types';

// Types
export interface CreditBalance {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  lastUpdated: number;
}

export interface UsageRecord {
  id: string;
  timestamp: number;
  provider: AIProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  creditsUsed: number;
  requestType: 'chat' | 'completion' | 'embedding' | 'image';
  success: boolean;
  responseTime: number; // ms
}

export interface DailyUsage {
  date: string;
  totalTokens: number;
  totalCredits: number;
  requestCount: number;
  byProvider: Record<string, { tokens: number; credits: number; requests: number }>;
  byModel: Record<string, { tokens: number; credits: number; requests: number }>;
}

export interface UsageStats {
  today: DailyUsage;
  thisWeek: DailyUsage[];
  thisMonth: DailyUsage[];
  allTime: {
    totalTokens: number;
    totalCredits: number;
    totalRequests: number;
    averageResponseTime: number;
    successRate: number;
  };
}

export interface ModelPricing {
  provider: AIProvider;
  model: string;
  inputCostPer1K: number;  // Credits per 1K input tokens
  outputCostPer1K: number; // Credits per 1K output tokens
  displayName: string;
  description: string;
  maxTokens: number;
  capabilities: string[];
  tier: 'free' | 'standard' | 'premium' | 'enterprise';
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  bonus: number;
  popular?: boolean;
}

// Model pricing configuration (credits per 1K tokens)
export const MODEL_PRICING: ModelPricing[] = [
  // Gemini Models
  {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    inputCostPer1K: 0.5,
    outputCostPer1K: 1.5,
    displayName: 'Gemini 2.0 Flash',
    description: 'Fast and efficient for most tasks',
    maxTokens: 8192,
    capabilities: ['chat', 'code', 'analysis'],
    tier: 'standard',
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    inputCostPer1K: 2.0,
    outputCostPer1K: 6.0,
    displayName: 'Gemini 1.5 Pro',
    description: 'Advanced reasoning and long context',
    maxTokens: 32768,
    capabilities: ['chat', 'code', 'analysis', 'vision'],
    tier: 'premium',
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    inputCostPer1K: 0.3,
    outputCostPer1K: 1.0,
    displayName: 'Gemini 1.5 Flash',
    description: 'Quick responses for simple tasks',
    maxTokens: 8192,
    capabilities: ['chat', 'code'],
    tier: 'free',
  },
  // OpenAI Models
  {
    provider: 'openai',
    model: 'gpt-4o',
    inputCostPer1K: 3.0,
    outputCostPer1K: 9.0,
    displayName: 'GPT-4o',
    description: 'Most capable OpenAI model',
    maxTokens: 128000,
    capabilities: ['chat', 'code', 'analysis', 'vision'],
    tier: 'premium',
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputCostPer1K: 0.8,
    outputCostPer1K: 2.4,
    displayName: 'GPT-4o Mini',
    description: 'Fast and cost-effective',
    maxTokens: 128000,
    capabilities: ['chat', 'code', 'analysis'],
    tier: 'standard',
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    inputCostPer1K: 0.3,
    outputCostPer1K: 0.6,
    displayName: 'GPT-3.5 Turbo',
    description: 'Good for simple tasks',
    maxTokens: 16384,
    capabilities: ['chat', 'code'],
    tier: 'free',
  },
  // Anthropic Models
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    inputCostPer1K: 2.5,
    outputCostPer1K: 7.5,
    displayName: 'Claude 3.5 Sonnet',
    description: 'Best for coding and analysis',
    maxTokens: 200000,
    capabilities: ['chat', 'code', 'analysis', 'vision'],
    tier: 'premium',
  },
  {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    inputCostPer1K: 0.4,
    outputCostPer1K: 1.2,
    displayName: 'Claude 3 Haiku',
    description: 'Fast and lightweight',
    maxTokens: 200000,
    capabilities: ['chat', 'code'],
    tier: 'standard',
  },
  // Mistral Models
  {
    provider: 'mistral',
    model: 'mistral-large-latest',
    inputCostPer1K: 2.0,
    outputCostPer1K: 6.0,
    displayName: 'Mistral Large',
    description: 'Most powerful Mistral model',
    maxTokens: 32768,
    capabilities: ['chat', 'code', 'analysis'],
    tier: 'premium',
  },
  {
    provider: 'mistral',
    model: 'mistral-small-latest',
    inputCostPer1K: 0.5,
    outputCostPer1K: 1.5,
    displayName: 'Mistral Small',
    description: 'Balanced performance',
    maxTokens: 32768,
    capabilities: ['chat', 'code'],
    tier: 'standard',
  },
  // Groq Models (Fast inference)
  {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    inputCostPer1K: 0.6,
    outputCostPer1K: 1.8,
    displayName: 'Llama 3.3 70B',
    description: 'Fast inference, great for code',
    maxTokens: 32768,
    capabilities: ['chat', 'code', 'analysis'],
    tier: 'standard',
  },
  {
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    inputCostPer1K: 0.3,
    outputCostPer1K: 0.9,
    displayName: 'Mixtral 8x7B',
    description: 'Efficient mixture of experts',
    maxTokens: 32768,
    capabilities: ['chat', 'code'],
    tier: 'free',
  },
  // xAI Models
  {
    provider: 'xai',
    model: 'grok-2',
    inputCostPer1K: 3.0,
    outputCostPer1K: 9.0,
    displayName: 'Grok 2',
    description: 'Latest Grok model',
    maxTokens: 131072,
    capabilities: ['chat', 'code', 'analysis'],
    tier: 'premium',
  },
  // Cerebras Models
  {
    provider: 'cerebras',
    model: 'llama3.1-70b',
    inputCostPer1K: 0.5,
    outputCostPer1K: 1.5,
    displayName: 'Llama 3.1 70B (Cerebras)',
    description: 'Ultra-fast inference',
    maxTokens: 8192,
    capabilities: ['chat', 'code'],
    tier: 'standard',
  },
];

// Credit packages
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 1000, price: 5, currency: 'USD', bonus: 0 },
  { id: 'basic', name: 'Basic', credits: 5000, price: 20, currency: 'USD', bonus: 500, popular: true },
  { id: 'pro', name: 'Pro', credits: 15000, price: 50, currency: 'USD', bonus: 2500 },
  { id: 'business', name: 'Business', credits: 50000, price: 150, currency: 'USD', bonus: 10000 },
  { id: 'enterprise', name: 'Enterprise', credits: 200000, price: 500, currency: 'USD', bonus: 50000 },
];

// Storage keys
const STORAGE_KEYS = {
  CREDITS: 'ai_credits_balance',
  USAGE_RECORDS: 'ai_usage_records',
  DAILY_USAGE: 'ai_daily_usage',
};

class UsageCreditsService {
  private credits: CreditBalance;
  private usageRecords: UsageRecord[];
  private dailyUsage: Map<string, DailyUsage>;
  private listeners: Set<(event: string, data: any) => void>;

  constructor() {
    this.credits = this.loadCredits();
    this.usageRecords = this.loadUsageRecords();
    this.dailyUsage = this.loadDailyUsage();
    this.listeners = new Set();
  }

  // Load/Save methods
  private loadCredits(): CreditBalance {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CREDITS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load credits:', e);
    }
    // Default: Start with 500 free credits
    return {
      totalCredits: 500,
      usedCredits: 0,
      remainingCredits: 500,
      lastUpdated: Date.now(),
    };
  }

  private saveCredits(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CREDITS, JSON.stringify(this.credits));
    } catch (e) {
      console.error('Failed to save credits:', e);
    }
  }

  private loadUsageRecords(): UsageRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USAGE_RECORDS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load usage records:', e);
    }
    return [];
  }

  private saveUsageRecords(): void {
    try {
      // Keep only last 1000 records
      const toSave = this.usageRecords.slice(-1000);
      localStorage.setItem(STORAGE_KEYS.USAGE_RECORDS, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save usage records:', e);
    }
  }

  private loadDailyUsage(): Map<string, DailyUsage> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DAILY_USAGE);
      if (stored) {
        const data = JSON.parse(stored);
        return new Map(Object.entries(data));
      }
    } catch (e) {
      console.error('Failed to load daily usage:', e);
    }
    return new Map();
  }

  private saveDailyUsage(): void {
    try {
      const obj: Record<string, DailyUsage> = {};
      this.dailyUsage.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(STORAGE_KEYS.DAILY_USAGE, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save daily usage:', e);
    }
  }

  // Event system
  subscribe(callback: (event: string, data: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.forEach(cb => cb(event, data));
  }

  // Credit operations
  getCredits(): CreditBalance {
    return { ...this.credits };
  }

  addCredits(amount: number, source: string = 'purchase'): void {
    this.credits.totalCredits += amount;
    this.credits.remainingCredits += amount;
    this.credits.lastUpdated = Date.now();
    this.saveCredits();
    this.emit('creditsUpdated', { balance: this.credits, added: amount, source });
  }

  useCredits(amount: number): boolean {
    if (this.credits.remainingCredits < amount) {
      this.emit('insufficientCredits', { required: amount, available: this.credits.remainingCredits });
      return false;
    }
    this.credits.usedCredits += amount;
    this.credits.remainingCredits -= amount;
    this.credits.lastUpdated = Date.now();
    this.saveCredits();
    this.emit('creditsUsed', { amount, balance: this.credits });
    return true;
  }

  hasEnoughCredits(amount: number): boolean {
    return this.credits.remainingCredits >= amount;
  }

  // Calculate cost for a request
  calculateCost(provider: AIProvider, model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING.find(p => p.provider === provider && p.model === model);
    if (!pricing) {
      // Default pricing if model not found
      return (promptTokens / 1000) * 1 + (completionTokens / 1000) * 3;
    }
    const inputCost = (promptTokens / 1000) * pricing.inputCostPer1K;
    const outputCost = (completionTokens / 1000) * pricing.outputCostPer1K;
    return Math.ceil(inputCost + outputCost);
  }

  // Record usage
  recordUsage(
    provider: AIProvider,
    model: string,
    promptTokens: number,
    completionTokens: number,
    success: boolean,
    responseTime: number,
    requestType: UsageRecord['requestType'] = 'chat'
  ): UsageRecord {
    const creditsUsed = this.calculateCost(provider, model, promptTokens, completionTokens);
    
    const record: UsageRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      creditsUsed,
      requestType,
      success,
      responseTime,
    };

    this.usageRecords.push(record);
    this.saveUsageRecords();

    // Update daily usage
    this.updateDailyUsage(record);

    // Deduct credits
    if (success) {
      this.useCredits(creditsUsed);
    }

    this.emit('usageRecorded', record);
    return record;
  }

  private updateDailyUsage(record: UsageRecord): void {
    const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
    
    let daily = this.dailyUsage.get(dateKey);
    if (!daily) {
      daily = {
        date: dateKey,
        totalTokens: 0,
        totalCredits: 0,
        requestCount: 0,
        byProvider: {},
        byModel: {},
      };
    }

    daily.totalTokens += record.totalTokens;
    daily.totalCredits += record.creditsUsed;
    daily.requestCount += 1;

    // By provider
    if (!daily.byProvider[record.provider]) {
      daily.byProvider[record.provider] = { tokens: 0, credits: 0, requests: 0 };
    }
    daily.byProvider[record.provider].tokens += record.totalTokens;
    daily.byProvider[record.provider].credits += record.creditsUsed;
    daily.byProvider[record.provider].requests += 1;

    // By model
    if (!daily.byModel[record.model]) {
      daily.byModel[record.model] = { tokens: 0, credits: 0, requests: 0 };
    }
    daily.byModel[record.model].tokens += record.totalTokens;
    daily.byModel[record.model].credits += record.creditsUsed;
    daily.byModel[record.model].requests += 1;

    this.dailyUsage.set(dateKey, daily);
    this.saveDailyUsage();
  }

  // Get usage statistics
  getUsageStats(): UsageStats {
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    
    // Today
    const today = this.dailyUsage.get(todayKey) || {
      date: todayKey,
      totalTokens: 0,
      totalCredits: 0,
      requestCount: 0,
      byProvider: {},
      byModel: {},
    };

    // This week (last 7 days)
    const thisWeek: DailyUsage[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      thisWeek.push(this.dailyUsage.get(key) || {
        date: key,
        totalTokens: 0,
        totalCredits: 0,
        requestCount: 0,
        byProvider: {},
        byModel: {},
      });
    }

    // This month (last 30 days)
    const thisMonth: DailyUsage[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      thisMonth.push(this.dailyUsage.get(key) || {
        date: key,
        totalTokens: 0,
        totalCredits: 0,
        requestCount: 0,
        byProvider: {},
        byModel: {},
      });
    }

    // All time
    const allTimeTokens = this.usageRecords.reduce((sum, r) => sum + r.totalTokens, 0);
    const allTimeCredits = this.usageRecords.reduce((sum, r) => sum + r.creditsUsed, 0);
    const allTimeRequests = this.usageRecords.length;
    const avgResponseTime = allTimeRequests > 0 
      ? this.usageRecords.reduce((sum, r) => sum + r.responseTime, 0) / allTimeRequests 
      : 0;
    const successCount = this.usageRecords.filter(r => r.success).length;
    const successRate = allTimeRequests > 0 ? (successCount / allTimeRequests) * 100 : 100;

    return {
      today,
      thisWeek,
      thisMonth,
      allTime: {
        totalTokens: allTimeTokens,
        totalCredits: allTimeCredits,
        totalRequests: allTimeRequests,
        averageResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate * 10) / 10,
      },
    };
  }

  // Get recent usage records
  getRecentUsage(limit: number = 50): UsageRecord[] {
    return this.usageRecords.slice(-limit).reverse();
  }

  // Get usage by provider
  getUsageByProvider(): Record<string, { tokens: number; credits: number; requests: number }> {
    const result: Record<string, { tokens: number; credits: number; requests: number }> = {};
    
    this.usageRecords.forEach(record => {
      if (!result[record.provider]) {
        result[record.provider] = { tokens: 0, credits: 0, requests: 0 };
      }
      result[record.provider].tokens += record.totalTokens;
      result[record.provider].credits += record.creditsUsed;
      result[record.provider].requests += 1;
    });

    return result;
  }

  // Get usage by model
  getUsageByModel(): Record<string, { tokens: number; credits: number; requests: number; provider: string }> {
    const result: Record<string, { tokens: number; credits: number; requests: number; provider: string }> = {};
    
    this.usageRecords.forEach(record => {
      if (!result[record.model]) {
        result[record.model] = { tokens: 0, credits: 0, requests: 0, provider: record.provider };
      }
      result[record.model].tokens += record.totalTokens;
      result[record.model].credits += record.creditsUsed;
      result[record.model].requests += 1;
    });

    return result;
  }

  // Get model info
  getModelInfo(provider: AIProvider, model: string): ModelPricing | undefined {
    return MODEL_PRICING.find(p => p.provider === provider && p.model === model);
  }

  // Get all available models
  getAvailableModels(): ModelPricing[] {
    return [...MODEL_PRICING];
  }

  // Get models by tier
  getModelsByTier(tier: ModelPricing['tier']): ModelPricing[] {
    return MODEL_PRICING.filter(m => m.tier === tier);
  }

  // Get credit packages
  getCreditPackages(): CreditPackage[] {
    return [...CREDIT_PACKAGES];
  }

  // Simulate adding demo data
  addDemoData(): void {
    const providers: AIProvider[] = ['gemini', 'openai', 'anthropic', 'groq'];
    const models = ['gemini-2.0-flash', 'gpt-4o-mini', 'claude-3-haiku-20240307', 'mixtral-8x7b-32768'];
    
    // Add some demo usage records for the past week
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Random number of requests per day (3-10)
      const numRequests = Math.floor(Math.random() * 8) + 3;
      
      for (let j = 0; j < numRequests; j++) {
        const providerIdx = Math.floor(Math.random() * providers.length);
        const provider = providers[providerIdx];
        const model = models[providerIdx];
        
        const promptTokens = Math.floor(Math.random() * 500) + 100;
        const completionTokens = Math.floor(Math.random() * 1000) + 200;
        const responseTime = Math.floor(Math.random() * 2000) + 500;
        
        const record: UsageRecord = {
          id: crypto.randomUUID(),
          timestamp: date.getTime() + j * 3600000,
          provider,
          model,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          creditsUsed: this.calculateCost(provider, model, promptTokens, completionTokens),
          requestType: 'chat',
          success: Math.random() > 0.05,
          responseTime,
        };
        
        this.usageRecords.push(record);
        this.updateDailyUsage(record);
      }
    }
    
    this.saveUsageRecords();
    this.emit('demoDataAdded', {});
  }

  // Reset all data (for testing)
  reset(): void {
    this.credits = {
      totalCredits: 500,
      usedCredits: 0,
      remainingCredits: 500,
      lastUpdated: Date.now(),
    };
    this.usageRecords = [];
    this.dailyUsage = new Map();
    this.saveCredits();
    this.saveUsageRecords();
    this.saveDailyUsage();
    this.emit('reset', {});
  }
}

// Singleton instance
export const usageCreditsService = new UsageCreditsService();
export default usageCreditsService;
