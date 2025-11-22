import { inject, injectable } from 'inversify';
import { TYPES } from '../../infrastructure/di/types';
import { Logger } from '../../core/logger/Logger';

@injectable()
export class MCPServerStarter {
  constructor(
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async start(): Promise<void> {
    // MCP Server implementation will be added later
    this.logger.info('MCP Server starter initialized (not yet implemented)');
  }

  async stop(): Promise<void> {
    // Cleanup if needed
  }
}

