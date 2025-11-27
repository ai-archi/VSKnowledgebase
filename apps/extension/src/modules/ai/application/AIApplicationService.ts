import { Result } from '../../../core/types/Result';
import { Artifact } from '../../shared/domain/artifact';
import { ArtifactError } from '../../shared/domain/errors';
import { ArtifactChange } from '../../shared/domain/ArtifactChange';

/**
 * 影响分析结果
 */
export interface ImpactAnalysisResult {
  artifactId: string;
  impactedArtifacts: string[]; // 受影响的 Artifact ID 列表
  impactReason: string; // 影响原因
  severity: 'low' | 'medium' | 'high'; // 影响严重程度
  suggestions?: string[]; // 建议操作
}

/**
 * 提示生成选项
 */
export interface PromptGenerationOpts {
  context: {
    artifactId?: string;
    viewType?: string;
    category?: string;
    tags?: string[];
  };
  purpose: 'create' | 'update' | 'review' | 'analyze';
  template?: string; // 可选的自定义模板
}

/**
 * AI 应用服务接口
 */
export interface AIApplicationService {
  /**
   * 分析变更影响
   * 分析一个 Artifact 的变更对其他 Artifact 的潜在影响
   */
  analyzeImpact(
    artifactId: string,
    change: ArtifactChange
  ): Promise<Result<ImpactAnalysisResult, ArtifactError>>;

  /**
   * 批量分析影响
   * 分析多个 Artifact 变更的累积影响
   */
  analyzeBatchImpact(
    changes: ArtifactChange[]
  ): Promise<Result<ImpactAnalysisResult[], ArtifactError>>;

  /**
   * 生成提示（Prompt）
   * 根据上下文和目的生成 AI 提示
   */
  generatePrompt(opts: PromptGenerationOpts): Promise<Result<string, ArtifactError>>;

  /**
   * 生成文档摘要
   * 为 Artifact 生成摘要
   */
  generateSummary(artifactId: string): Promise<Result<string, ArtifactError>>;

  /**
   * 生成文档建议
   * 基于现有文档生成改进建议
   */
  generateSuggestions(artifactId: string): Promise<Result<string[], ArtifactError>>;

  /**
   * 关联分析
   * 分析 Artifact 之间的关联关系
   */
  analyzeRelationships(artifactId: string): Promise<Result<{
    relatedArtifacts: string[];
    relationshipTypes: Record<string, string>; // artifactId -> relationshipType
  }, ArtifactError>>;
}

