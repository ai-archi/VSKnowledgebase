/**
 * IDE 通信工厂
 * 根据运行环境自动创建相应的 IDE 通信实例
 */

import { IDECommunication } from './ide-communication';
import { VSCodeCommunication } from './vscode-communication';
import { IntelliJCommunication } from './idea-communication';

/**
 * 创建 IDE 通信实例
 * 自动检测 IDE 类型并创建相应的实现
 */
export function createIDECommunication(): IDECommunication {
  // 检测 VS Code
  if (typeof (window as any).acquireVsCodeApi === 'function' || (window as any).vscode) {
    return new VSCodeCommunication();
  }

  // 检测 IntelliJ
  if ((window as any).idea || (window as any).intellij) {
    return new IntelliJCommunication();
  }

  // 默认使用 VS Code（向后兼容）
  return new VSCodeCommunication();
}

