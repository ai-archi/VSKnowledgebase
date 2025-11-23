/**
 * 错误代码枚举
 */
export enum ArtifactErrorCode {
  NOT_FOUND = 'ARTIFACT_NOT_FOUND',
  ALREADY_EXISTS = 'ARTIFACT_ALREADY_EXISTS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  VAULT_READ_ONLY = 'VAULT_READ_ONLY',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_PATH = 'INVALID_PATH',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  OPERATION_FAILED = 'OPERATION_FAILED',
}

export enum VaultErrorCode {
  NOT_FOUND = 'VAULT_NOT_FOUND',
  ALREADY_EXISTS = 'VAULT_ALREADY_EXISTS',
  GIT_CLONE_FAILED = 'GIT_CLONE_FAILED',
  GIT_SYNC_FAILED = 'GIT_SYNC_FAILED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  OPERATION_FAILED = 'OPERATION_FAILED',
}

export enum SystemErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 基础错误类
 */
export class ArchiToolError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, any>,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ArchiToolError';
  }
}

/**
 * Artifact 错误
 */
export class ArtifactError extends ArchiToolError {
  constructor(
    code: ArtifactErrorCode,
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause);
    this.name = 'ArtifactError';
  }
}

/**
 * Vault 错误
 */
export class VaultError extends ArchiToolError {
  constructor(
    code: VaultErrorCode,
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause);
    this.name = 'VaultError';
  }
}

/**
 * 系统错误
 */
export class SystemError extends ArchiToolError {
  constructor(
    code: SystemErrorCode,
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(code, message, context, cause);
    this.name = 'SystemError';
  }
}

/**
 * Result 类型
 * 用于函数式错误处理
 */
export type Result<T, E extends ArchiToolError> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * 查询选项
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
  // 明确的过滤字段（便于使用）
  viewType?: string;
  category?: string;
  tags?: string[]; // 必须包含所有指定标签（AND 关系）
  status?: string;
}


