import { IDEAdapter } from '../ide-api/ide-adapter';
import { Disposable } from '../ide-api/ide-types';

export interface CommandDefinition {
  command: string;
  callback: (...args: any[]) => any;
}

/**
 * 命令适配器
 * 封装命令注册逻辑，使用 IDEAdapter 接口
 */
export class CommandAdapter {
  private commands: Map<string, Disposable> = new Map();

  constructor(private ideAdapter: IDEAdapter) {}

  registerCommand(command: string, callback: (...args: any[]) => any): void {
    try {
      const disposable = this.ideAdapter.registerCommand(command, callback);
      this.commands.set(command, disposable);
      // 订阅到 IDEAdapter 的订阅系统（如果支持）
      this.ideAdapter.subscribe(disposable);
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


