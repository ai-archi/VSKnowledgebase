import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { AICommandRepository } from './AICommandRepository';
import { AICommand, CommandTargetType } from '../domain/entity/AICommand';
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

  async findAll(vaultId?: string, targetType?: CommandTargetType): Promise<Result<AICommand[], ArtifactError>> {
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

      // 根据targetType过滤
      let filteredCommands = commands;
      if (targetType && targetType !== 'all') {
        this.logger.info(`[AICommandRepository] Filtering commands by targetType: ${targetType}, total commands: ${commands.length}`);
        filteredCommands = commands.filter(cmd => {
          const matches = cmd.enabled && (cmd.targetTypes.includes(targetType) || cmd.targetTypes.includes('all'));
          if (!matches) {
            this.logger.debug(`[AICommandRepository] Command ${cmd.id} filtered out: enabled=${cmd.enabled}, targetTypes=${cmd.targetTypes.join(',')}`);
          }
          return matches;
        });
        this.logger.info(`[AICommandRepository] Filtered commands count: ${filteredCommands.length}`);
      } else {
        filteredCommands = commands.filter(cmd => cmd.enabled);
      }

      // 按order排序
      filteredCommands.sort((a, b) => a.order - b.order);

      this.logger.info(`[AICommandRepository] Returning ${filteredCommands.length} commands for targetType: ${targetType || 'all'}`);
      return { success: true, value: filteredCommands };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find all commands: ${error.message}`,
          { vaultId, targetType },
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
        targetTypes: command.targetTypes,
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
      this.logger.info(`[AICommandRepository] Loading commands from vault: ${vaultName}, directory: ${this.COMMANDS_DIR}`);
      const listResult = await this.artifactService.listDirectory(vaultRef, this.COMMANDS_DIR, { recursive: true });
      
      if (!listResult.success) {
        this.logger.warn(`[AICommandRepository] Failed to list directory for commands: ${listResult.error.message}`);
        return commands;
      }

      this.logger.info(`[AICommandRepository] Found ${listResult.value.length} items in commands directory`);

      // 扫描所有.yml和.md文件（兼容旧格式）
      for (const node of listResult.value) {
        if (node.isFile && (node.name.endsWith('.yml') || node.name.endsWith('.yaml') || node.name.endsWith('.md'))) {
          // 解析命令文件
          // node.path 是相对于 dirPath (COMMANDS_DIR) 的路径
          // 例如：如果 COMMANDS_DIR 是 'ai-enhancements/commands'，node.path 可能是 'file-commands/summarize.yml'
          // 所以 commandPath 应该是 'ai-enhancements/commands/file-commands/summarize.yml'
          let commandPath: string;
          if (node.path) {
            // node.path 已经是相对于 COMMANDS_DIR 的路径，直接拼接
            commandPath = node.path.startsWith(this.COMMANDS_DIR) 
              ? node.path 
              : `${this.COMMANDS_DIR}/${node.path}`;
          } else {
            // 如果 node.path 为空，说明文件直接在 COMMANDS_DIR 下
            commandPath = `${this.COMMANDS_DIR}/${node.name}`;
          }
          
          // 使用 node.fullPath 如果存在，否则拼接
          const fullPath = node.fullPath || path.join(
            this.fileAdapter.getVaultPath(vaultName),
            commandPath
          );

          this.logger.info(`[AICommandRepository] Processing command file: name=${node.name}, path=${node.path}, commandPath=${commandPath}, fullPath=${fullPath}, exists=${fs.existsSync(fullPath)}`);

          if (fs.existsSync(fullPath)) {
            try {
              const command = this.parseCommandFileSync(vaultId, vaultName, commandPath, fullPath);
              if (command) {
                this.logger.info(`[AICommandRepository] Successfully loaded command: ${command.id} (${command.name}), targetTypes: ${command.targetTypes.join(',')}`);
                commands.push(command);
              } else {
                this.logger.warn(`[AICommandRepository] Failed to parse command file: ${commandPath} (returned null)`);
              }
            } catch (error: any) {
              this.logger.warn(`[AICommandRepository] Failed to parse command file: ${commandPath}`, { error: error.message, stack: error.stack });
            }
          } else {
            this.logger.warn(`[AICommandRepository] Command file not found: ${fullPath}`);
          }
        }
      }

      this.logger.info(`[AICommandRepository] Loaded ${commands.length} commands from vault: ${vaultName}`);
    } catch (error: any) {
      this.logger.error(`[AICommandRepository] Failed to load commands from vault: ${vaultName}`, { error: error.message, stack: error.stack });
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
      const isYamlFile = commandPath.endsWith('.yml') || commandPath.endsWith('.yaml');
      
      if (isYamlFile) {
        // 纯 YAML 格式：直接解析整个文件
        const commandData = yaml.load(content) as any;
        if (!commandData || !commandData.name) {
          this.logger.warn(`Command file missing required fields: ${commandPath}`);
          return null;
        }

        // ID使用从vault根目录开始的相对路径（包含扩展名）
        const commandId = commandPath;

        const command: AICommand = {
          id: commandId,
          vaultId,
          vaultName,
          name: commandData.name,
          description: commandData.description,
          icon: commandData.icon,
          targetTypes: commandData.targetTypes || ['all'],
          enabled: commandData.enabled !== false, // 默认启用
          order: commandData.order || 0,
          template: commandData.commandContent || commandData.template || '', // 支持新字段commandContent和旧字段template
          variables: commandData.variables || [],
          filePath: commandPath,
          createdAt: commandData.createdAt,
          updatedAt: commandData.updatedAt,
        };

        return command;
      } else {
        // Markdown + Front Matter 格式（兼容旧格式）
      const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontMatterRegex);

      if (!match) {
        this.logger.warn(`Command file missing front matter: ${commandPath}`);
        return null;
      }

      const frontMatterText = match[1];
      const templateContent = match[2].trim();

      const frontMatter = yaml.load(frontMatterText) as any;
        if (!frontMatter || !frontMatter.name) {
        this.logger.warn(`Command file missing required fields: ${commandPath}`);
        return null;
      }

        // ID使用从vault根目录开始的相对路径（包含扩展名）
        const commandId = commandPath;

      const command: AICommand = {
        id: commandId,
        vaultId,
        vaultName,
        name: frontMatter.name,
        description: frontMatter.description,
        icon: frontMatter.icon,
          targetTypes: frontMatter.targetTypes || frontMatter.contexts || ['all'], // 兼容旧格式
        enabled: frontMatter.enabled !== false, // 默认启用
        order: frontMatter.order || 0,
        template: templateContent,
        variables: frontMatter.variables || [],
        filePath: commandPath,
        createdAt: frontMatter.createdAt,
        updatedAt: frontMatter.updatedAt,
      };

      return command;
      }
    } catch (error: any) {
      this.logger.error(`Failed to parse command content: ${commandPath}`, { error: error.message });
      return null;
    }
  }
}

