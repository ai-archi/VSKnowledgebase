/**
 * CodeLocation
 * 代码位置信息
 */
export interface CodeLocation {
  file: string; // 文件路径
  line: number; // 行号
  column: number; // 列号
  range?: { // 代码范围，可选
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

