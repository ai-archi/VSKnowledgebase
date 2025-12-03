import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { AICommandApplicationService } from './AICommandApplicationService';
import { AICommand, CommandTargetType } from '../domain/entity/AICommand';
import { Result, ArtifactError, ArtifactErrorCode } from '../domain/errors';
import { AICommandRepository } from '../infrastructure/AICommandRepository';
import { VaultApplicationService } from './VaultApplicationService';
import { CommandExecutionContext } from '../domain/value_object/CommandExecutionContext';
import { CommandTemplateDomainService } from '../domain/services/CommandTemplateDomainService';
import { Logger } from '../../../core/logger/Logger';
import * as path from 'path';

/**
 * AI指令应用服务实现
 */
@injectable()
export class AICommandApplicationServiceImpl implements AICommandApplicationService {
  private readonly COMMANDS_DIR = 'ai-enhancements/commands';

  constructor(
    @inject(TYPES.AICommandRepository) private commandRepository: AICommandRepository,
    @inject(TYPES.VaultApplicationService) private vaultService: VaultApplicationService,
    @inject(TYPES.CommandTemplateDomainService) private templateService: CommandTemplateDomainService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async getCommands(vaultId?: string, targetType?: CommandTargetType): Promise<Result<AICommand[], ArtifactError>> {
    try {
      return await this.commandRepository.findAll(vaultId, targetType);
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get commands: ${error.message}`,
          { vaultId, targetType },
          error
        ),
      };
    }
  }

  async getCommand(vaultId: string, commandId: string): Promise<Result<AICommand, ArtifactError>> {
    try {
      const result = await this.commandRepository.findById(vaultId, commandId);
      if (!result.success) {
        return result;
      }

      if (!result.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Command not found: ${commandId}`,
            { vaultId, commandId }
          ),
        };
      }

      return { success: true, value: result.value };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get command: ${error.message}`,
          { vaultId, commandId },
          error
        ),
      };
    }
  }

  async createCommand(
    vaultId: string,
    command: Omit<AICommand, 'id' | 'vaultId' | 'vaultName' | 'filePath' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<AICommand, ArtifactError>> {
    try {
      // 获取Vault信息
      const vaultResult = await this.vaultService.getVault(vaultId);
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

      const vault = vaultResult.value;

      // 生成指令ID（基于名称，转换为kebab-case）
      const commandId = this.generateCommandId(command.name);

      // 确定文件路径（根据targetType确定子目录）
      const subDir = this.getTargetTypeSubDirectory(command.targetTypes[0] || 'all');
      const fileName = `${commandId}.md`;
      const filePath = `${this.COMMANDS_DIR}/${subDir}/${fileName}`;

      // 创建完整的指令对象
      const now = new Date().toISOString();
      const fullCommand: AICommand = {
        ...command,
        id: commandId,
        vaultId: vault.id,
        vaultName: vault.name,
        filePath,
        createdAt: now,
        updatedAt: now,
      };

      // 保存指令
      const saveResult = await this.commandRepository.save(fullCommand);
      if (!saveResult.success) {
        return saveResult;
      }

      return { success: true, value: fullCommand };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to create command: ${error.message}`,
          { vaultId, command },
          error
        ),
      };
    }
  }

  async updateCommand(
    vaultId: string,
    commandId: string,
    updates: Partial<AICommand>
  ): Promise<Result<AICommand, ArtifactError>> {
    try {
      // 获取现有指令
      const getResult = await this.getCommand(vaultId, commandId);
      if (!getResult.success) {
        return getResult;
      }

      const existingCommand = getResult.value;

      // 合并更新
      const updatedCommand: AICommand = {
        ...existingCommand,
        ...updates,
        id: existingCommand.id, // 不允许修改ID
        vaultId: existingCommand.vaultId, // 不允许修改vaultId
        vaultName: existingCommand.vaultName, // 不允许修改vaultName
        filePath: existingCommand.filePath, // 不允许修改filePath
        updatedAt: new Date().toISOString(),
      };

      // 保存更新
      const saveResult = await this.commandRepository.save(updatedCommand);
      if (!saveResult.success) {
        return saveResult;
      }

      return { success: true, value: updatedCommand };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to update command: ${error.message}`,
          { vaultId, commandId, updates },
          error
        ),
      };
    }
  }

  async deleteCommand(vaultId: string, commandId: string): Promise<Result<void, ArtifactError>> {
    try {
      return await this.commandRepository.delete(vaultId, commandId);
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

  async executeCommand(
    commandId: string,
    vaultId: string,
    context: CommandExecutionContext
  ): Promise<Result<string, ArtifactError>> {
    try {
      // 在所有 vault 中查找命令（不限制 vaultId）
      const allCommandsResult = await this.commandRepository.findAll(undefined);
      if (!allCommandsResult.success) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Failed to find commands: ${allCommandsResult.error.message}`,
            { commandId },
            allCommandsResult.error
          ),
        };
      }

      const command = allCommandsResult.value.find(c => c.id === commandId);
      if (!command) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Command not found: ${commandId}`,
            { commandId }
          ),
        };
      }

      // 验证变量
      const missingVars = this.templateService.validateVariables(command, context);
      if (missingVars.length > 0) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Missing required variables: ${missingVars.join(', ')}`,
            { commandId, missingVars }
          ),
        };
      }

      // 渲染模板
      const rendered = this.templateService.renderTemplate(command, context);

      return { success: true, value: rendered };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to execute command: ${error.message}`,
          { commandId, vaultId },
          error
        ),
      };
    }
  }

  /**
   * 生成指令ID（kebab-case）
   */
  private generateCommandId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/-+/g, '-') // 多个连字符合并为一个
      .trim();
  }

  /**
   * 根据targetType获取子目录
   */
  private getTargetTypeSubDirectory(targetType: CommandTargetType): string {
    switch (targetType) {
      case 'file':
        return 'file-commands';
      case 'folder':
        return 'folder-commands';
      case 'design':
        return 'design-commands';
      default:
        return 'file-commands'; // 默认
    }
  }
}

