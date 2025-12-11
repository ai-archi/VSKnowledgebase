import * as vscode from 'vscode';

/**
 * 可注册的命令构造函数类型
 */
type CommandConstructor = new (...args: any[]) => vscode.Disposable;

/**
 * 存储所有可注册的命令类
 */
const registrableCommands: CommandConstructor[] = [];

/**
 * 命令装饰器
 * 用于标记可自动注册的命令类
 * 
 * @example
 * ```typescript
 * @command()
 * export class MyCommand extends BaseCommand {
 *   constructor(container: Container) {
 *     super('my.command');
 *   }
 *   
 *   execute(...args: any[]) {
 *     // 命令逻辑
 *   }
 * }
 * ```
 */
export function command(): ClassDecorator {
  return (target: any) => {
    registrableCommands.push(target);
  };
}

/**
 * 注册单个命令
 * 这是对 vscode.commands.registerCommand 的包装
 */
export function registerCommand(
  command: string,
  callback: (...args: any[]) => any,
  thisArg?: any
): vscode.Disposable {
  return vscode.commands.registerCommand(command, callback, thisArg);
}

/**
 * 注册所有被 @command() 装饰器标记的命令
 * 
 * @param context - ExtensionContext，用于添加 subscriptions
 * @param container - 依赖注入容器（可选）
 * @param additionalArgs - 传递给命令构造函数的额外参数
 * @returns 所有命令的 Disposable 数组
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  container?: any,
  ...additionalArgs: any[]
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  
  for (const CommandClass of registrableCommands) {
    try {
      // 创建命令实例
      // 如果命令构造函数需要 container，则传入；否则只传入 additionalArgs
      const commandInstance = container
        ? new CommandClass(container, ...additionalArgs)
        : new CommandClass(...additionalArgs);
      
      disposables.push(commandInstance);
      context.subscriptions.push(commandInstance);
    } catch (error: any) {
      console.error(`Failed to register command: ${CommandClass.name}`, error);
    }
  }
  
  return disposables;
}

/**
 * 获取所有已注册的命令类（用于调试）
 */
export function getRegistrableCommands(): CommandConstructor[] {
  return [...registrableCommands];
}
