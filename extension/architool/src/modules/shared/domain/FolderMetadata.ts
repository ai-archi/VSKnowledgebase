import { TemplateStructureItem } from './services/TemplateStructureDomainService';

/**
 * 文件夹元数据
 * 存储文件夹的模板信息和预期文件列表
 */
export interface FolderMetadata {
  // 标识信息
  id: string;                    // 元数据ID（文件夹名称，与文件名一致）
  folderPath: string;            // 文件夹相对路径（相对于vault根目录）
  vaultId: string;               // 所属Vault ID
  vaultName: string;             // 所属Vault名称
  
  // 模板信息（如果基于模板创建）
  templateInfo?: {
    templateId: string;          // 模板ID（如：c4-model-template）
    templatePath: string;        // 模板文件路径（如：archi-templates/structure/c4-model-template.yml）
    templateVaultId?: string;     // 模板所在Vault ID（如果跨Vault）
    templateVaultName?: string;  // 模板所在Vault名称
    createdAt: string;            // 创建时间
    variables?: Record<string, string>;  // 创建时使用的变量（如：{folderName: "xxx"}）
  };
  
  // 模板结构内容（当前文件夹在模板中对应的结构项，包括子文件夹和文件）
  templateStructure?: TemplateStructureItem;
  
  // 预期文件列表（模板中定义但未创建的文件）
  expectedFiles?: Array<{
    path: string;                // 文件相对路径（相对于文件夹）
    name: string;                // 文件名（不含扩展名）
    extension?: string;          // 文件扩展名（如：md, mmd）
    description?: string;        // 文件描述（来自模板）
    template?: string;           // 文件模板ID（格式：vault-name/archi-templates/...，与模板列表中的ID格式一致）
  }>;
  
  // 预期子文件夹列表（模板中定义但未创建的子文件夹）
  expectedFolders?: Array<{
    path: string;                // 文件夹相对路径（相对于当前文件夹）
    name: string;                // 文件夹名称
    description?: string;        // 文件夹描述（来自模板）
    structure?: TemplateStructureItem;  // 子文件夹的模板结构
  }>;
  
  // 时间戳
  createdAt: string;             // ISO 8601 格式
  updatedAt: string;             // ISO 8601 格式
}

