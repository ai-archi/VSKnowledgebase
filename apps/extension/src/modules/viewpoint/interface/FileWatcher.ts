import * as vscode from 'vscode';
import { ViewpointApplicationService } from '../application/ViewpointApplicationService';
import { Logger } from '../../../core/logger/Logger';

/**
 * 文件打开事件监听器
 * 监听 VSCode onDidChangeActiveTextEditor 事件，用于响应式更新视点视图
 */
export class FileWatcher {
  private disposables: vscode.Disposable[] = [];
  private currentFilePath: string | undefined;
  private onFileChangedCallbacks: Array<(filePath: string | undefined) => void> = [];

  constructor(
    private viewpointService: ViewpointApplicationService,
    private logger: Logger
  ) {
    this.setupFileWatcher();
  }

  /**
   * 设置文件监听器
   */
  private setupFileWatcher(): void {
    // 监听编辑器切换事件
    const disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const filePath = editor.document.uri.fsPath;
        this.handleFileChange(filePath);
      } else {
        this.handleFileChange(undefined);
      }
    });

    this.disposables.push(disposable);

    // 初始化当前文件路径
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      this.currentFilePath = activeEditor.document.uri.fsPath;
    }
  }

  /**
   * 处理文件变更
   */
  private handleFileChange(filePath: string | undefined): void {
    if (this.currentFilePath === filePath) {
      return; // 文件未变更
    }

    this.currentFilePath = filePath;
    this.logger.debug('File changed', { filePath });

    // 通知所有回调
    for (const callback of this.onFileChangedCallbacks) {
      try {
        callback(filePath);
      } catch (error: any) {
        this.logger.error('Error in file change callback', error);
      }
    }
  }

  /**
   * 获取当前打开的文件路径
   */
  getCurrentFilePath(): string | undefined {
    return this.currentFilePath;
  }

  /**
   * 判断当前文件是否为代码文件
   */
  isCurrentFileCodeFile(): boolean {
    if (!this.currentFilePath) {
      return false;
    }
    return this.viewpointService.isCodeFile(this.currentFilePath);
  }

  /**
   * 判断当前文件是否为 Artifact
   */
  async isCurrentFileArtifact(): Promise<boolean> {
    if (!this.currentFilePath) {
      return false;
    }
    const result = await this.viewpointService.isArtifactFile(this.currentFilePath);
    return result.success && result.value === true;
  }

  /**
   * 注册文件变更回调
   */
  onFileChanged(callback: (filePath: string | undefined) => void): vscode.Disposable {
    this.onFileChangedCallbacks.push(callback);
    return new vscode.Disposable(() => {
      const index = this.onFileChangedCallbacks.indexOf(callback);
      if (index > -1) {
        this.onFileChangedCallbacks.splice(index, 1);
      }
    });
  }

  /**
   * 释放资源
   */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.onFileChangedCallbacks = [];
  }
}

