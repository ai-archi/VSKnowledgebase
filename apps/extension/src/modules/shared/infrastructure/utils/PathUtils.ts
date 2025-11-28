import * as path from 'path';

/**
 * 路径工具类
 * 提供纯函数式的路径操作，不包含业务逻辑
 */
export class PathUtils {
  /**
   * 验证文件名
   * @param value 文件名
   * @returns 错误信息，如果验证通过则返回 null
   */
  static validateFileName(value: string): string | null {
    if (!value || value.trim().length === 0) {
      return 'Name cannot be empty';
    }
    if (/[<>:"/\\|?*]/.test(value)) {
      return 'Name contains invalid characters';
    }
    return null;
  }

  /**
   * 规范化路径
   * @param filePath 路径
   * @returns 规范化后的路径
   */
  static normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  /**
   * 移除根目录前缀
   * @param filePath 完整路径
   * @param rootDir 根目录名称（如 'artifacts', 'templates'）
   * @returns 移除前缀后的路径
   */
  static removeRootDirPrefix(filePath: string, rootDir: string): string {
    if (filePath.startsWith(`${rootDir}/`)) {
      return filePath.substring(rootDir.length + 1);
    }
    return filePath;
  }

  /**
   * 连接路径
   * @param paths 路径片段
   * @returns 连接后的路径
   */
  static join(...paths: string[]): string {
    return path.join(...paths).replace(/\\/g, '/');
  }

  /**
   * 获取目录名
   * @param filePath 文件路径
   * @returns 目录路径
   */
  static dirname(filePath: string): string {
    const dir = path.dirname(filePath);
    return dir === '.' || dir === '' ? '' : dir.replace(/\\/g, '/');
  }

  /**
   * 获取文件名
   * @param filePath 文件路径
   * @returns 文件名（包含扩展名）
   */
  static basename(filePath: string): string {
    return path.basename(filePath);
  }

  /**
   * 获取文件扩展名
   * @param filePath 文件路径
   * @returns 扩展名（不含点号，如 'md', 'yml'）
   */
  static getFileExtension(filePath: string): string {
    const ext = path.extname(filePath);
    return ext ? ext.substring(1).toLowerCase() : '';
  }
}

