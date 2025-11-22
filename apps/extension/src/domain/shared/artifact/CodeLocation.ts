/**
 * 代码位置
 * 用于关联 Artifact 与代码文件
 */
export interface CodeLocation {
  filePath: string; // 文件路径
  line?: number; // 行号
  column?: number; // 列号
  range?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  }; // 代码范围
}


