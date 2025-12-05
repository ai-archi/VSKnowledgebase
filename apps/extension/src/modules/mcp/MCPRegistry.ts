import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../../core/logger/Logger';

/**
 * 扩展实例注册表项
 */
export interface MCPInstanceInfo {
  workspaceHash: string;
  workspacePath: string;
  ipcEndpoint: string;
  lastActive: string; // ISO 8601 格式的时间戳
}

/**
 * 注册表数据结构
 */
export interface MCPRegistryData {
  instances: MCPInstanceInfo[];
}

/**
 * MCP 注册表管理器
 * 负责管理所有活动的 VS Code 扩展实例注册表
 */
export class MCPRegistry {
  private registryPath: string;
  private logger?: Logger;

  constructor(architoolRoot: string, logger?: Logger) {
    const mcpServersDir = path.join(architoolRoot, 'mcp-servers');
    this.registryPath = path.join(mcpServersDir, 'registry.json');
    this.logger = logger;
  }

  /**
   * 确保注册表目录存在
   */
  private ensureDirectory(): void {
    const dir = path.dirname(this.registryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 读取注册表
   */
  read(): MCPRegistryData {
    this.ensureDirectory();
    
    if (!fs.existsSync(this.registryPath)) {
      return { instances: [] };
    }

    try {
      const content = fs.readFileSync(this.registryPath, 'utf-8');
      return JSON.parse(content) as MCPRegistryData;
    } catch (error: any) {
      this.logger?.warn('Failed to read registry, returning empty registry', error);
      return { instances: [] };
    }
  }

  /**
   * 写入注册表
   */
  write(data: MCPRegistryData): void {
    this.ensureDirectory();
    
    try {
      fs.writeFileSync(this.registryPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error: any) {
      this.logger?.error('Failed to write registry', error);
      throw error;
    }
  }

  /**
   * 注册扩展实例
   */
  registerInstance(info: MCPInstanceInfo): void {
    const data = this.read();
    
    // 移除已存在的相同实例（基于 workspaceHash）
    data.instances = data.instances.filter(
      inst => inst.workspaceHash !== info.workspaceHash
    );
    
    // 添加新实例
    data.instances.push(info);
    
    this.write(data);
    this.logger?.info(`Registered MCP instance: ${info.workspaceHash}`);
  }

  /**
   * 注销扩展实例
   */
  unregisterInstance(workspaceHash: string): void {
    const data = this.read();
    data.instances = data.instances.filter(
      inst => inst.workspaceHash !== workspaceHash
    );
    this.write(data);
    this.logger?.info(`Unregistered MCP instance: ${workspaceHash}`);
  }

  /**
   * 更新实例的激活时间
   */
  updateLastActive(workspaceHash: string): void {
    const data = this.read();
    const instance = data.instances.find(inst => inst.workspaceHash === workspaceHash);
    
    if (instance) {
      instance.lastActive = new Date().toISOString();
      this.write(data);
    }
  }

  /**
   * 获取所有活动的实例
   */
  getActiveInstances(): MCPInstanceInfo[] {
    const data = this.read();
    
    // 过滤掉 IPC 端点不存在的实例（可能已关闭）
    return data.instances.filter(inst => {
      // Windows 使用命名管道，无法通过文件系统检查，需要尝试连接
      if (process.platform === 'win32') {
        // Windows 命名管道以 \\.\pipe\ 开头，无法通过 fs.existsSync 检查
        // 这里假设所有注册的实例都是活动的（实际连接时会验证）
        return true;
      } else {
        // Unix/Linux/macOS 使用 Unix Socket，可以通过文件系统检查
        const endpointPath = inst.ipcEndpoint.replace('~', os.homedir());
        return fs.existsSync(endpointPath);
      }
    });
  }

  /**
   * 获取最近激活的实例
   */
  getMostRecentActiveInstance(): MCPInstanceInfo | null {
    const instances = this.getActiveInstances();
    
    if (instances.length === 0) {
      return null;
    }

    // 按 lastActive 排序，返回最新的
    instances.sort((a, b) => {
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
    });

    return instances[0];
  }

  /**
   * 根据工作区哈希查找实例
   */
  findInstance(workspaceHash: string): MCPInstanceInfo | null {
    const data = this.read();
    return data.instances.find(inst => inst.workspaceHash === workspaceHash) || null;
  }
}

