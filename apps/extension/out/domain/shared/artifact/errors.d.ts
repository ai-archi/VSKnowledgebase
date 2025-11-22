/**
 * 错误代码枚举
 */
export declare enum ArtifactErrorCode {
    NOT_FOUND = "NOT_FOUND",
    INVALID_INPUT = "INVALID_INPUT",
    INVALID_PATH = "INVALID_PATH",
    DUPLICATE = "DUPLICATE",
    OPERATION_FAILED = "OPERATION_FAILED",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    VALIDATION_FAILED = "VALIDATION_FAILED"
}
export declare enum VaultErrorCode {
    NOT_FOUND = "NOT_FOUND",
    INVALID_INPUT = "INVALID_INPUT",
    OPERATION_FAILED = "OPERATION_FAILED",
    GIT_ERROR = "GIT_ERROR"
}
export declare enum SystemErrorCode {
    NETWORK_ERROR = "NETWORK_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
/**
 * 基础错误类
 */
export declare class ArchiToolError extends Error {
    code: string;
    context?: Record<string, any> | undefined;
    cause?: Error | undefined;
    constructor(code: string, message: string, context?: Record<string, any> | undefined, cause?: Error | undefined);
}
/**
 * Artifact 错误
 */
export declare class ArtifactError extends ArchiToolError {
    constructor(code: ArtifactErrorCode, message: string, context?: Record<string, any>, cause?: Error);
}
/**
 * Vault 错误
 */
export declare class VaultError extends ArchiToolError {
    constructor(code: VaultErrorCode, message: string, context?: Record<string, any>, cause?: Error);
}
/**
 * 系统错误
 */
export declare class SystemError extends ArchiToolError {
    constructor(code: SystemErrorCode, message: string, context?: Record<string, any>, cause?: Error);
}
/**
 * Result 类型
 * 用于函数式错误处理
 */
export type Result<T, E extends ArchiToolError> = {
    success: true;
    value: T;
} | {
    success: false;
    error: E;
};
/**
 * 查询选项
 */
export interface QueryOptions {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filter?: Record<string, any>;
}
//# sourceMappingURL=errors.d.ts.map