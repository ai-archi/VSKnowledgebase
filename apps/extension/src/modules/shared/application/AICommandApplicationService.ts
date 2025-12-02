import { Result } from '../../../core/types/Result';
import { AICommand, AICommandContext } from '../domain/entity/AICommand';
import { ArtifactError } from '../domain/errors';
import { CommandExecutionContext } from '../domain/value_object/CommandExecutionContext';

/**
 * AI指令应用服务接口
 */
export interface AICommandApplicationService {
  /**
   * 获取所有指令
   * @param vaultId Vault ID，如果提供则只查找该Vault的指令
   * @param context 过滤上下文，如果提供则只返回适用于该上下文的指令
   */
  getCommands(vaultId?: string, context?: AICommandContext): Promise<Result<AICommand[], ArtifactError>>;

  /**
   * 获取指令
   */
  getCommand(vaultId: string, commandId: string): Promise<Result<AICommand, ArtifactError>>;

  /**
   * 创建指令
   */
  createCommand(
    vaultId: string,
    command: Omit<AICommand, 'id' | 'vaultId' | 'vaultName' | 'filePath' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<AICommand, ArtifactError>>;

  /**
   * 更新指令
   */
  updateCommand(
    vaultId: string,
    commandId: string,
    updates: Partial<AICommand>
  ): Promise<Result<AICommand, ArtifactError>>;

  /**
   * 删除指令
   */
  deleteCommand(vaultId: string, commandId: string): Promise<Result<void, ArtifactError>>;

  /**
   * 执行指令（渲染模板）
   * @param commandId 指令ID
   * @param vaultId Vault ID
   * @param context 执行上下文
   * @returns 渲染后的提示词
   */
  executeCommand(
    commandId: string,
    vaultId: string,
    context: CommandExecutionContext
  ): Promise<Result<string, ArtifactError>>;
}

