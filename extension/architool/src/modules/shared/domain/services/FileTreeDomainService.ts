import { PathUtils } from '../../infrastructure/utils/PathUtils';

/**
 * 文件树领域服务接口
 * 处理文件树相关的业务逻辑
 */
export interface FileTreeDomainService {
  /**
   * 根据上下文计算目标路径
   * @param item 当前选中的树项（可选）
   * @param fileName 文件名（不含扩展名）
   * @param extension 文件扩展名（不含点号，可选，默认为 'md'）
   * @returns 目标路径和目标文件夹路径
   */
  calculateTargetPath(
    item: { folderPath?: string; filePath?: string } | undefined,
    fileName: string,
    extension?: string
  ): { targetPath: string; targetFolderPath: string | undefined };

  /**
   * 验证文件操作是否允许
   * @param item 当前选中的树项（可选）
   * @param operation 操作类型
   * @returns 是否允许操作
   */
  validateFileOperation(
    item: { folderPath?: string; filePath?: string } | undefined,
    operation: 'create' | 'delete' | 'update'
  ): boolean;

  /**
   * 获取文件树结构
   * @param nodes 文件树节点列表
   * @param rootDir 根目录名称（如 'artifacts', 'templates'）
   * @returns 处理后的文件树结构
   */
  getFileTreeStructure(
    nodes: Array<{ name: string; path: string; isDirectory: boolean; isFile: boolean }>,
    rootDir: string
  ): Array<{ name: string; path: string; relativePath: string; isDirectory: boolean; isFile: boolean }>;
}

/**
 * 文件树领域服务实现
 */
export class FileTreeDomainServiceImpl implements FileTreeDomainService {
  calculateTargetPath(
    item: { folderPath?: string; filePath?: string } | undefined,
    fileName: string,
    extension: string = 'md'
  ): { targetPath: string; targetFolderPath: string | undefined } {
    const fileExtension = extension ? `.${extension}` : '.md';

    if (item?.folderPath !== undefined) {
      // 如果是在文件夹节点上右键，在该文件夹下创建
      const targetPath =
        item.folderPath === ''
          ? `${fileName}${fileExtension}`
          : `${item.folderPath}/${fileName}${fileExtension}`;
      const targetFolderPath = item.folderPath === '' ? undefined : item.folderPath;
      return { targetPath, targetFolderPath };
    } else if (item?.filePath) {
      // 如果是在文档节点上右键，在同一个目录下创建
      const dir = PathUtils.dirname(item.filePath);
      const targetPath =
        dir === '' ? `${fileName}${fileExtension}` : `${dir}/${fileName}${fileExtension}`;
      const targetFolderPath = dir === '' ? undefined : dir;
      return { targetPath, targetFolderPath };
    } else {
      // 如果是在 vault 节点上右键，在根目录下创建
      return { targetPath: `${fileName}${fileExtension}`, targetFolderPath: undefined };
    }
  }

  validateFileOperation(
    item: { folderPath?: string; filePath?: string } | undefined,
    operation: 'create' | 'delete' | 'update'
  ): boolean {
    // 基本验证：如果操作是创建，item 可以为 undefined（在根目录创建）
    // 如果操作是删除或更新，item 必须存在
    if (operation === 'create') {
      return true; // 创建操作总是允许的（在根目录或子目录）
    }
    return item !== undefined && (item.folderPath !== undefined || item.filePath !== undefined);
  }

  getFileTreeStructure(
    nodes: Array<{ name: string; path: string; isDirectory: boolean; isFile: boolean }>,
    rootDir: string
  ): Array<{ name: string; path: string; relativePath: string; isDirectory: boolean; isFile: boolean }> {
    return nodes.map(node => {
      const relativePath = PathUtils.removeRootDirPrefix(node.path, rootDir);
      return {
        name: node.name,
        path: node.path,
        relativePath,
        isDirectory: node.isDirectory,
        isFile: node.isFile,
      };
    });
  }
}

