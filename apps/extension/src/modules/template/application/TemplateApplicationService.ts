import { Result } from '../../../core/types/Result';
import { Artifact } from '../../shared/domain/artifact';
import { ArtifactError } from '../../shared/domain/errors';
import { ArtifactViewType } from '../../shared/domain/types';

/**
 * 模板类型
 */
export type TemplateType = 'structure' | 'content';

/**
 * 模板定义
 */
export interface Template {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  category?: string; // 分类
  viewType?: ArtifactViewType; // 适用的视图类型
  content?: string; // 模板内容（对于内容模板）
  structure?: any; // 结构定义（对于结构模板，YAML 格式）
  variables?: string[]; // 模板变量列表
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
}

/**
 * 从模板创建 Artifact 的选项
 */
export interface CreateFromTemplateOpts {
  templateId: string;
  vaultId: string;
  title: string;
  path?: string; // 可选，如果不提供则根据模板生成
  variables?: Record<string, string>; // 模板变量值
}

/**
 * 模板应用服务接口
 */
export interface TemplateApplicationService {
  /**
   * 获取所有模板
   */
  getTemplates(vaultId?: string): Promise<Result<Template[], ArtifactError>>;

  /**
   * 获取模板
   */
  getTemplate(templateId: string, vaultId: string): Promise<Result<Template, ArtifactError>>;

  /**
   * 创建模板
   */
  createTemplate(
    vaultId: string,
    template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<Template, ArtifactError>>;

  /**
   * 更新模板
   */
  updateTemplate(
    vaultId: string,
    templateId: string,
    updates: Partial<Template>
  ): Promise<Result<Template, ArtifactError>>;

  /**
   * 删除模板
   */
  deleteTemplate(vaultId: string, templateId: string): Promise<Result<void, ArtifactError>>;

  /**
   * 从模板创建 Artifact
   */
  createArtifactFromTemplate(opts: CreateFromTemplateOpts): Promise<Result<Artifact, ArtifactError>>;

  /**
   * 处理模板内容（替换变量）
   */
  processTemplate(template: Template, variables: Record<string, string>): string;
}

