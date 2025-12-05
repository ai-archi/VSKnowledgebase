import * as vscode from 'vscode';
import { Logger } from '../../core/logger/Logger';
import { MCPIPCServer } from './MCPIPCServer';

/**
 * MCP 窗口激活监控器
 * 监听 VS Code 窗口激活事件，更新注册表的 lastActive 时间戳
 */
export class MCPWindowActivationMonitor {
  private disposables: vscode.Disposable[] = [];
  private ipcServer: MCPIPCServer;
  private logger: Logger;

  constructor(ipcServer: MCPIPCServer, logger: Logger) {
    this.ipcServer = ipcServer;
    this.logger = logger;
  }

  /**
   * 开始监听窗口激活事件
   */
  start(): void {
    // 监听活动编辑器变化（窗口激活时触发）
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(() => {
      this.onWindowActivated();
    });

    // 监听窗口状态变化
    const windowStateDisposable = vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        this.onWindowActivated();
      }
    });

    this.disposables.push(editorChangeDisposable, windowStateDisposable);
    
    // 初始激活
    this.onWindowActivated();
    
    this.logger.info('MCP Window Activation Monitor started');
  }

  /**
   * 停止监听
   */
  stop(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.logger.info('MCP Window Activation Monitor stopped');
  }

  /**
   * 窗口激活时的处理
   */
  private onWindowActivated(): void {
    this.ipcServer.updateLastActive();
    this.logger.debug('Window activated, updated lastActive timestamp');
  }
}

