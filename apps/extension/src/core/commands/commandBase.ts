import * as vscode from 'vscode';
import { registerCommand } from './commandRegistry';

/**
 * 命令上下文接口
 */
export interface CommandContext {
  editor?: vscode.TextEditor;
  uri?: vscode.Uri;
  [key: string]: any;
}

/**
 * 命令基类
 * 所有命令类应继承此类，并在构造函数中调用 super(commandId)
 */
export abstract class BaseCommand implements vscode.Disposable {
  private readonly _disposable: vscode.Disposable;

  constructor(command: string | string[]) {
    const commands = Array.isArray(command) ? command : [command];
    const subscriptions = commands.map(cmd =>
      registerCommand(cmd, (...args: any[]) => this.execute(...args), this)
    );
    this._disposable = vscode.Disposable.from(...subscriptions);
  }

  dispose(): void {
    this._disposable.dispose();
  }

  /**
   * 执行命令
   * 子类必须实现此方法
   */
  abstract execute(...args: any[]): any;
}
