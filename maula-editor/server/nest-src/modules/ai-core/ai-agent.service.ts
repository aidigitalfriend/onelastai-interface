import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/services/logger.service';

export interface AgentAction {
  type: string;
  payload: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  message: string;
  actions: AgentAction[];
}

/**
 * Stub AIAgentService - placeholder for agent functionality
 */
@Injectable()
export class AIAgentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AIAgentService');
    this.logger.warn('AIAgentService: Using stub implementation');
  }

  async executeTask(task: string, context?: Record<string, any>): Promise<AgentResult> {
    return {
      success: false,
      message: 'AI Agent service is not available (stub implementation)',
      actions: [],
    };
  }

  async processMessage(message: string, conversationId?: string): Promise<string> {
    return 'AI Agent service is not available';
  }

  async getAvailableTools(): Promise<string[]> {
    return [];
  }
}
