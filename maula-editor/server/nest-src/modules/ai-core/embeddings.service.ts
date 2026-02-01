import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface BatchEmbeddingResult {
  embeddings: EmbeddingResult[];
  model: string;
  dimensions: number;
  totalTokens: number;
}

/**
 * Stub EmbeddingsService - LangChain imports removed for build compatibility
 * Original implementation preserved in embeddings.service.ts.full
 */
@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private embeddingDimensions = 1536;
  private maxBatchSize = 100;
  private maxTokensPerBatch = 8000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('EmbeddingsService');
  }

  async onModuleInit() {
    this.logger.warn('EmbeddingsService: Using stub implementation - LangChain disabled');
  }

  async embedText(text: string, metadata?: Record<string, any>): Promise<EmbeddingResult> {
    // Return empty embedding - stub implementation
    return {
      text,
      embedding: new Array(this.embeddingDimensions).fill(0),
      metadata,
    };
  }

  async embedBatch(texts: string[], metadata?: Record<string, any>[]): Promise<BatchEmbeddingResult> {
    const embeddings = texts.map((text, i) => ({
      text,
      embedding: new Array(this.embeddingDimensions).fill(0),
      metadata: metadata?.[i],
    }));

    return {
      embeddings,
      model: 'stub',
      dimensions: this.embeddingDimensions,
      totalTokens: 0,
    };
  }

  async embedDocuments(documents: Array<{ content: string; metadata?: Record<string, any> }>): Promise<BatchEmbeddingResult> {
    const texts = documents.map(d => d.content);
    const metadata = documents.map(d => d.metadata);
    return this.embedBatch(texts, metadata);
  }

  getDimensions(): number {
    return this.embeddingDimensions;
  }

  getMaxBatchSize(): number {
    return this.maxBatchSize;
  }

  async computeSimilarity(embedding1: number[], embedding2: number[]): Promise<number> {
    // Cosine similarity stub - return 0
    return 0;
  }

  async findMostSimilar(
    queryEmbedding: number[],
    embeddings: EmbeddingResult[],
    topK = 5,
  ): Promise<Array<EmbeddingResult & { similarity: number }>> {
    return embeddings.slice(0, topK).map(e => ({ ...e, similarity: 0 }));
  }

  async embedTexts(texts: string[], metadata?: Record<string, any>[]): Promise<BatchEmbeddingResult> {
    return this.embedBatch(texts, metadata);
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  isInitialized(): boolean {
    return false;
  }
}
