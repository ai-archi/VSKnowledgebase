import { AICommand, AICommandContext } from '../domain/entity/AICommand';
import { Result, ArtifactError } from '../domain/errors';

/**
 * AI指令仓库接口
 */
export interface AICommandRepository {
  /**
   * 根据ID查找指令
   */
  findById(vaultId: string, commandId: string): Promise<Result<AICommand | null, ArtifactError>>;

  /**
   * 根据路径查找指令
   */
  findByPath(vaultId: string, commandPath: string): Promise<Result<AICommand | null, ArtifactError>>;

  /**
   * 查找所有指令
   * @param vaultId Vault ID，如果提供则只查找该Vault的指令
   * @param context 过滤上下文，如果提供则只返回适用于该上下文的指令
   */
  findAll(vaultId?: string, context?: AICommandContext): Promise<Result<AICommand[], ArtifactError>>;

  /**
   * 保存指令
   */
  save(command: AICommand): Promise<Result<void, ArtifactError>>;

  /**
   * 删除指令
   */
  delete(vaultId: string, commandId: string): Promise<Result<void, ArtifactError>>;
}

