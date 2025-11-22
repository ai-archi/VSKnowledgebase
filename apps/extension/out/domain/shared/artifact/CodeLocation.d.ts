/**
 * 代码位置
 * 用于关联 Artifact 与代码文件
 */
export interface CodeLocation {
    filePath: string;
    line?: number;
    column?: number;
    range?: {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    };
}
//# sourceMappingURL=CodeLocation.d.ts.map