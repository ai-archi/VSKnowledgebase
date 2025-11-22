import { Artifact } from './Artifact';
import { Result, ArtifactError } from './errors';
/**
 * Artifact 验证器
 */
export declare class ArtifactValidator {
    /**
     * 验证 Artifact
     */
    static validate(artifact: Partial<Artifact>): Result<void, ArtifactError>;
    /**
     * 验证路径格式
     */
    private static isValidPath;
    /**
     * 验证 ISO 8601 时间戳
     */
    private static isValidISO8601;
}
//# sourceMappingURL=ArtifactValidator.d.ts.map