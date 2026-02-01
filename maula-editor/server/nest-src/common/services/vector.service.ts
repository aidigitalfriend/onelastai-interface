import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VectorService {
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.slice(0, 8000), // Limit input size
    });

    return response.data[0].embedding;
  }

  /**
   * Update file embedding for semantic search
   */
  async updateFileEmbedding(fileId: string, content: string): Promise<void> {
    if (!content || content.length < 10) return;

    try {
      const embedding = await this.generateEmbedding(content);
      const embeddingStr = `[${embedding.join(',')}]`;

      await this.prisma.$executeRaw`
        UPDATE "File" 
        SET embedding = ${embeddingStr}::vector 
        WHERE id = ${fileId}
      `;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
    }
  }

  /**
   * Search files by semantic similarity
   */
  async searchSimilarFiles(
    projectId: string,
    query: string,
    limit: number = 10,
  ): Promise<{ id: string; path: string; name: string; similarity: number }[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const results = await this.prisma.$queryRaw<
      { id: string; path: string; name: string; similarity: number }[]
    >`
      SELECT 
        id, 
        path, 
        name,
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM "File"
      WHERE "projectId" = ${projectId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;

    return results;
  }

  /**
   * Fuzzy text search using trigrams
   */
  async fuzzySearchFiles(
    projectId: string,
    searchTerm: string,
    limit: number = 20,
  ): Promise<{ id: string; path: string; name: string; similarity: number }[]> {
    const results = await this.prisma.$queryRaw<
      { id: string; path: string; name: string; similarity: number }[]
    >`
      SELECT 
        id,
        path,
        name,
        similarity(name, ${searchTerm}) as similarity
      FROM "File"
      WHERE "projectId" = ${projectId}
        AND (
          name % ${searchTerm}
          OR content ILIKE ${'%' + searchTerm + '%'}
        )
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return results;
  }
}
