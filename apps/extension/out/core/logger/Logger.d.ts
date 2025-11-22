/**
 * 日志服务
 * 使用 VSCode OutputChannel 输出日志
 */
export declare class Logger {
    private outputChannel;
    private name;
    constructor(name?: string);
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, error?: any, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    private log;
    show(): void;
    hide(): void;
    dispose(): void;
}
//# sourceMappingURL=Logger.d.ts.map