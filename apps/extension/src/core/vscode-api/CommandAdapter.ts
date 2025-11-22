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
    const disposable = vscode.commands.registerCommand(command, callback);
    this.commands.set(command, disposable);
    this.context.subscriptions.push(disposable);
  }

  registerCommands(commandDefs: CommandDefinition[]): void {
    commandDefs.forEach(def => {
      this.registerCommand(def.command, def.callback);
    });
  }

  dispose(): void {
    this.commands.forEach(disposable => disposable.dispose());
    this.commands.clear();
  }
}


