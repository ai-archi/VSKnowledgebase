import * as vscode from 'vscode';
export interface CommandDefinition {
    command: string;
    callback: (...args: any[]) => any;
}
export declare class CommandAdapter {
    private context;
    private commands;
    constructor(context: vscode.ExtensionContext);
    registerCommand(command: string, callback: (...args: any[]) => any): void;
    registerCommands(commandDefs: CommandDefinition[]): void;
    dispose(): void;
}
//# sourceMappingURL=CommandAdapter.d.ts.map