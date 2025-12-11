import * as vscode from 'vscode';

/**
 * 日志服务
 * 使用 VSCode OutputChannel 输出日志
 */
export class Logger {
  private outputChannel: vscode.OutputChannel;
  private name: string;

  constructor(name: string = 'ArchiTool') {
    this.name = name;
    this.outputChannel = vscode.window.createOutputChannel(name);
  }

  info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }

  error(message: string, error?: any, ...args: any[]): void {
    this.log('ERROR', message, ...args);
    if (error) {
      this.outputChannel.appendLine(`  Error: ${error.message || error}`);
      if (error.stack) {
        this.outputChannel.appendLine(`  Stack: ${error.stack}`);
      }
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log('DEBUG', message, ...args);
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    this.outputChannel.appendLine(logMessage);
    if (args.length > 0) {
      args.forEach(arg => {
        this.outputChannel.appendLine(`  ${JSON.stringify(arg, null, 2)}`);
      });
    }
  }

  show(): void {
    this.outputChannel.show();
  }

  hide(): void {
    this.outputChannel.hide();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
