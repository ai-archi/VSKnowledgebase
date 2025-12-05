import * as crypto from 'crypto';
import * as path from 'path';

/**
 * 计算工作区路径的哈希值
 * 用于生成唯一的 IPC 端点标识符
 */
export function calculateWorkspaceHash(workspacePath: string): string {
  // 标准化路径（处理路径分隔符和大小写）
  const normalizedPath = path.normalize(workspacePath).toLowerCase();
  
  // 使用 SHA256 生成哈希值，取前 16 个字符
  const hash = crypto.createHash('sha256').update(normalizedPath).digest('hex');
  return hash.substring(0, 16);
}

