import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { AICommandRepository } from './AICommandRepository';
import { AICommand, AICommandContext } from '../domain/entity/AICommand';
import { Result, ArtifactError, ArtifactErrorCode } from '../domain/errors';
import { ArtifactFileSystemAdapter } from './storage/file/ArtifactFileSystemAdapter';
import { VaultRepository } from './VaultRepository';
import { ArtifactApplicationService, FileTreeNode } from '../application/ArtifactApplicationService';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from '../../../core/logger/Logger';

/**
 * AI指令仓库实现
 * 从文件系统读取Markdown格式的AI指令文件
 */
@injectable()
export class AICommandRepositoryImpl implements AICommandRepository {
  private readonly COMMANDS_DIR = 'ai-enhancements/commands';

  constructor(
    @inject(TYPES.ArtifactFileSystemAdapter) private fileAdapter: ArtifactFileSystemAdapter,
    @inject(TYPES.VaultRepository) private vaultRepository: VaultRepository,
    @inject(TYPES.ArtifactApplicationService) private artifactService: ArtifactApplicationService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async findById(vaultId: string, commandId: string): Promise<Result<AICommand | null, ArtifactError>> {
    try {
      const allCommandsResult = await this.findAll(vaultId);
      if (!allCommandsResult.success) {
        return allCommandsResult;
      }

      const command = allCommandsResult.value.find(c => c.id === commandId);
      return { success: true, value: command || null };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find command by ID: ${error.message}`,
          { vaultId, commandId },
          error
        ),
      };
    }
  }

  async findByPath(vaultId: string, commandPath: string): Promise<Result<AICommand | null, ArtifactError>> {
    try {
      const vaultResult = await this.vaultRepository.findById(vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${vaultId}`,
            { vaultId }
          ),
        };
      }

      const vaultName = vaultResult.value.name;
      const fullPath = path.join(
        this.fileAdapter.getVaultPath(vaultName),
        commandPath
      );

      if (!fs.existsSync(fullPath) || !fullPath.endsWith('.md')) {
        return { success: true, value: null };
      }

      const command = await this.parseCommandFile(vaultId, vaultName, commandPath, fullPath);
      return { success: true, value: command };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find command by path: ${error.message}`,
          { vaultId, commandPath },
          error
        ),
      };
    }
  }

  async findAll(vaultId?: string, context?: AICommandContext): Promise<Result<AICommand[], ArtifactError>> {
    try {
      const commands: AICommand[] = [];

      if (vaultId) {
        // 只查找指定Vault的指令
        const vaultResult = await this.vaultRepository.findById(vaultId);
        if (!vaultResult.success || !vaultResult.value) {
          return {
            success: false,
            error: new ArtifactError(
              ArtifactErrorCode.NOT_FOUND,
              `Vault not found: ${vaultId}`,
              { vaultId }
            ),
          };
        }

        const vaultCommands = await this.loadCommandsFromVault(vaultResult.value.id, vaultResult.value.name);
        commands.push(...vaultCommands);
      } else {
        // 查找所有Vault的指令
        const vaultsResult = await this.vaultRepository.findAll();
        if (!vaultsResult.success) {
          return {
            success: false,
            error: new ArtifactError(
              ArtifactErrorCode.OPERATION_FAILED,
              `Failed to list vaults: ${vaultsResult.error.message}`,
              {}
            ),
          };
        }

        for (const vault of vaultsResult.value) {
          const vaultCommands = await this.loadCommandsFromVault(vault.id, vault.name);
          commands.push(...vaultCommands);
        }
      }

      // 根据context过滤
      let filteredCommands = commands;
      if (context && context !== 'all') {
        filteredCommands = commands.filter(cmd => 
          cmd.enabled && (cmd.contexts.includes(context) || cmd.contexts.includes('all'))
        );
      } else {
        filteredCommands = commands.filter(cmd => cmd.enabled);
      }

      // 按order排序
      filteredCommands.sort((a, b) => a.order - b.order);

      return { success: true, value: filteredCommands };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find all commands: ${error.message}`,
          { vaultId, context },
          error
        ),
      };
    }
  }

  async save(command: AICommand): Promise<Result<void, ArtifactError>> {
    try {
      const vaultResult = await this.vaultRepository.findById(command.vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${command.vaultId}`,
            { vaultId: command.vaultId }
          ),
        };
      }

      const vaultRef = { id: command.vaultId, name: command.vaultName };
      
      // 构建Markdown内容（Front Matter + 模板内容）
      const frontMatter = {
        id: command.id,
        name: command.name,
        description: command.description,
        icon: command.icon,
        contexts: command.contexts,
        enabled: command.enabled,
        order: command.order,
        variables: command.variables,
        createdAt: command.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const markdownContent = `---\n${yaml.dump(frontMatter)}---\n\n${command.template}`;

      // 写入文件
      const writeResult = await this.artifactService.writeFile(vaultRef, command.filePath, markdownContent);
      if (!writeResult.success) {
        return writeResult;
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to save command: ${error.message}`,
          { command },
          error
        ),
      };
    }
  }

  async delete(vaultId: string, commandId: string): Promise<Result<void, ArtifactError>> {
    try {
      const commandResult = await this.findById(vaultId, commandId);
      if (!commandResult.success) {
        return commandResult;
      }

      if (!commandResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Command not found: ${commandId}`,
            { vaultId, commandId }
          ),
        };
      }

      const vaultResult = await this.vaultRepository.findById(vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${vaultId}`,
            { vaultId }
          ),
        };
      }

      const vaultRef = { id: vaultId, name: vaultResult.value.name };
      const deleteResult = await this.artifactService.delete(vaultRef, commandResult.value.filePath);
      if (!deleteResult.success) {
        return deleteResult;
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to delete command: ${error.message}`,
          { vaultId, commandId },
          error
        ),
      };
    }
  }

  /**
   * 从Vault加载所有指令
   */
  private async loadCommandsFromVault(vaultId: string, vaultName: string): Promise<AICommand[]> {
    const commands: AICommand[] = [];

    try {
      // 使用ArtifactService扫描commands目录
      const vaultRef = { id: vaultId, name: vaultName };
      const listResult = await this.artifactService.listDirectory(vaultRef, this.COMMANDS_DIR, { recursive: true });
      
      if (!listResult.success) {
        this.logger.warn(`Failed to list directory for commands: ${listResult.error.message}`);
        return commands;
      }

      // 扫描所有.md文件
      for (const node of listResult.value) {
        if (node.isFile && node.name.endsWith('.md')) {
          // 解析Markdown文件
          // node.path是相对于COMMANDS_DIR的路径，需要拼接完整路径
          const commandPath = `${this.COMMANDS_DIR}/${node.path}`;
          const fullPath = path.join(
            this.fileAdapter.getVaultPath(vaultName),
            commandPath
          );

          if (fs.existsSync(fullPath)) {
            try {
              const command = this.parseCommandFileSync(vaultId, vaultName, commandPath, fullPath);
              if (command) {
                commands.push(command);
              }
            } catch (error: any) {
              this.logger.warn(`Failed to parse command file: ${commandPath}`, { error: error.message });
            }
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to load commands from vault: ${vaultName}`, { error: error.message });
    }

    return commands;
  }

  /**
   * 解析指令文件（异步版本）
   */
  private async parseCommandFile(
    vaultId: string,
    vaultName: string,
    commandPath: string,
    fullPath: string
  ): Promise<AICommand | null> {
    try {
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      return this.parseCommandContent(vaultId, vaultName, commandPath, content);
    } catch (error: any) {
      this.logger.error(`Failed to read command file: ${commandPath}`, { error: error.message });
      return null;
    }
  }

  /**
   * 解析指令文件（同步版本）
   */
  private parseCommandFileSync(
    vaultId: string,
    vaultName: string,
    commandPath: string,
    fullPath: string
  ): AICommand | null {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return this.parseCommandContent(vaultId, vaultName, commandPath, content);
    } catch (error: any) {
      this.logger.error(`Failed to read command file: ${commandPath}`, { error: error.message });
      return null;
    }
  }

  /**
   * 解析指令内容
   */
  private parseCommandContent(
    vaultId: string,
    vaultName: string,
    commandPath: string,
    content: string
  ): AICommand | null {
    try {
      // 解析Front Matter
      const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontMatterRegex);

      if (!match) {
        this.logger.warn(`Command file missing front matter: ${commandPath}`);
        return null;
      }

      const frontMatterText = match[1];
      const templateContent = match[2].trim();

      const frontMatter = yaml.load(frontMatterText) as any;
      if (!frontMatter || !frontMatter.id || !frontMatter.name) {
        this.logger.warn(`Command file missing required fields: ${commandPath}`);
        return null;
      }

      // 提取文件名作为ID（如果front matter中没有id）
      const fileName = path.basename(commandPath, '.md');
      const commandId = frontMatter.id || fileName;

      const command: AICommand = {
        id: commandId,
        vaultId,
        vaultName,
        name: frontMatter.name,
        description: frontMatter.description,
        icon: frontMatter.icon,
        contexts: frontMatter.contexts || ['all'],
        enabled: frontMatter.enabled !== false, // 默认启用
        order: frontMatter.order || 0,
        template: templateContent,
        variables: frontMatter.variables || [],
        filePath: commandPath,
        createdAt: frontMatter.createdAt,
        updatedAt: frontMatter.updatedAt,
      };

      return command;
    } catch (error: any) {
      this.logger.error(`Failed to parse command content: ${commandPath}`, { error: error.message });
      return null;
    }
  }
}

