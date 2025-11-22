"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactValidator = void 0;
const errors_1 = require("./errors");
/**
 * Artifact 验证器
 */
class ArtifactValidator {
    /**
     * 验证 Artifact
     */
    static validate(artifact) {
        // 必需字段检查
        if (!artifact.id) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.INVALID_INPUT, 'Artifact ID is required'),
            };
        }
        if (!artifact.vault || !artifact.vault.id) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.INVALID_INPUT, 'Vault is required'),
            };
        }
        if (!artifact.path) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.INVALID_PATH, 'Path is required'),
            };
        }
        // 路径格式验证
        if (!this.isValidPath(artifact.path)) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.INVALID_PATH, `Invalid path format: ${artifact.path}`),
            };
        }
        // 标题验证
        if (!artifact.title || artifact.title.trim().length === 0) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.INVALID_INPUT, 'Title is required and cannot be empty'),
            };
        }
        if (artifact.title.length > 200) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.INVALID_INPUT, 'Title must be less than 200 characters'),
            };
        }
        // 时间戳验证
        if (artifact.createdAt && !this.isValidISO8601(artifact.createdAt)) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.INVALID_INPUT, 'CreatedAt must be a valid ISO 8601 timestamp'),
            };
        }
        return { success: true, value: undefined };
    }
    /**
     * 验证路径格式
     */
    static isValidPath(path) {
        // 路径不能为空
        if (!path || path.trim().length === 0) {
            return false;
        }
        // 路径不能以 / 开头或结尾
        if (path.startsWith('/') || path.endsWith('/')) {
            return false;
        }
        // 路径不能包含非法字符
        // eslint-disable-next-line no-control-regex
        const invalidChars = /[<>:"|?*\x00-\x1f]/;
        if (invalidChars.test(path)) {
            return false;
        }
        // 路径不能包含 .. 或 .
        if (path.includes('..') || path === '.') {
            return false;
        }
        return true;
    }
    /**
     * 验证 ISO 8601 时间戳
     */
    static isValidISO8601(timestamp) {
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        return iso8601Regex.test(timestamp) && !Number.isNaN(Date.parse(timestamp));
    }
}
exports.ArtifactValidator = ArtifactValidator;
//# sourceMappingURL=ArtifactValidator.js.map