import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger/Logger';

export class ConfigManager {
  public readonly architoolRoot: string;
  private logger?: Logger;

  constructor(architoolRoot: string, logger?: Logger) {
    this.architoolRoot = architoolRoot;
    this.logger = logger;
  }

  getArchitoolRoot(): string {
    return this.architoolRoot;
  }
}


