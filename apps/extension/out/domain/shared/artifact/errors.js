"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemError = exports.VaultError = exports.ArtifactError = exports.ArchiToolError = exports.SystemErrorCode = exports.VaultErrorCode = exports.ArtifactErrorCode = void 0;
/**
 * 错误代码枚举
 */
var ArtifactErrorCode;
(function (ArtifactErrorCode) {
    ArtifactErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ArtifactErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ArtifactErrorCode["INVALID_PATH"] = "INVALID_PATH";
    ArtifactErrorCode["DUPLICATE"] = "DUPLICATE";
    ArtifactErrorCode["OPERATION_FAILED"] = "OPERATION_FAILED";
    ArtifactErrorCode["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    ArtifactErrorCode["VALIDATION_FAILED"] = "VALIDATION_FAILED";
})(ArtifactErrorCode || (exports.ArtifactErrorCode = ArtifactErrorCode = {}));
var VaultErrorCode;
(function (VaultErrorCode) {
    VaultErrorCode["NOT_FOUND"] = "NOT_FOUND";
    VaultErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    VaultErrorCode["OPERATION_FAILED"] = "OPERATION_FAILED";
    VaultErrorCode["GIT_ERROR"] = "GIT_ERROR";
})(VaultErrorCode || (exports.VaultErrorCode = VaultErrorCode = {}));
var SystemErrorCode;
(function (SystemErrorCode) {
    SystemErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    SystemErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    SystemErrorCode["FILE_SYSTEM_ERROR"] = "FILE_SYSTEM_ERROR";
    SystemErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(SystemErrorCode || (exports.SystemErrorCode = SystemErrorCode = {}));
/**
 * 基础错误类
 */
class ArchiToolError extends Error {
    constructor(code, message, context, cause) {
        super(message);
        this.code = code;
        this.context = context;
        this.cause = cause;
        this.name = 'ArchiToolError';
    }
}
exports.ArchiToolError = ArchiToolError;
/**
 * Artifact 错误
 */
class ArtifactError extends ArchiToolError {
    constructor(code, message, context, cause) {
        super(code, message, context, cause);
        this.name = 'ArtifactError';
    }
}
exports.ArtifactError = ArtifactError;
/**
 * Vault 错误
 */
class VaultError extends ArchiToolError {
    constructor(code, message, context, cause) {
        super(code, message, context, cause);
        this.name = 'VaultError';
    }
}
exports.VaultError = VaultError;
/**
 * 系统错误
 */
class SystemError extends ArchiToolError {
    constructor(code, message, context, cause) {
        super(code, message, context, cause);
        this.name = 'SystemError';
    }
}
exports.SystemError = SystemError;
//# sourceMappingURL=errors.js.map