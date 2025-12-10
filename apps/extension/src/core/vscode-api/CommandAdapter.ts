import * as vscode from 'vscode';

export interface CommandDefinition {
  command: string;
  callback: (...args: any[]) => any;
}

export class CommandAdapter {
  private context: vscode.ExtensionContext;
  private commands: Map<string, vscode.Disposable> = new Map();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  registerCommand(command: string, callback: (...args: any[]) => any): void {
    try {
      const disposable = vscode.commands.registerCommand(command, callback);
      this.commands.set(command, disposable);
      this.context.subscriptions.push(disposable);
    } catch (error: any) {
      console.error(`Failed to register command: ${command}`, error);
      throw error;
    }
  }

  registerCommands(commandDefs: CommandDefinition[]): void {
    commandDefs.forEach(def => {
      try {
        this.registerCommand(def.command, def.callback);
      } catch (error: any) {
        console.error(`Failed to register command: ${def.command}`, error);
        // 继续注册其他命令，不中断整个流程
      }
    });
  }

  dispose(): void {
    this.commands.forEach(disposable => disposable.dispose());
    this.commands.clear();
  }
}


