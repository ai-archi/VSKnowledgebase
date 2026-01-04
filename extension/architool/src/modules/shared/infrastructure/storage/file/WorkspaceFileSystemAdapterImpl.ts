import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import fg from 'fast-glob';
import ignore from 'ignore';
import { ARCHITOOL_PATHS } from '../../../../../core/constants/Paths';
import { WorkspaceFileSystemAdapter, WorkspaceFolder, WorkspaceFileItem, WorkspaceFileSearchOptions } from './WorkspaceFileSystemAdapter';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/errors';

/**
 * 工作区文件系统适配器实现
 * 使用 fast-glob 和 ignore 库实现通用的文件系统操作
 * 仅 getWorkspaceFolders 方法依赖 VSCode API 获取工作区信息
 */
export class WorkspaceFileSystemAdapterImpl implements WorkspaceFileSystemAdapter {
  // 缓存 ignore 实例，避免重复读取 .gitignore
  private ignoreCache = new Map<string, { instance: ReturnType<typeof ignore>; ignorePatterns: string[] }>();
  async getWorkspaceFolders(): Promise<WorkspaceFolder[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    return workspaceFolders.map(folder => ({
      uri: folder.uri.fsPath,
      name: folder.name,
    }));
  }

  /**
   * 检查路径是否匹配查询字符串
   * 路径（相对于 workspace）包含查询字符串即匹配（不区分大小写）
   */
  private matchesQuery(relativePath: string, query?: string): boolean {
    if (!query || !query.trim()) {
      return true; // 没有查询条件，匹配所有
    }
    const queryLower = query.trim().toLowerCase();
    const pathLower = relativePath.toLowerCase();
    return pathLower.includes(queryLower);
  }

  /**
   * 构建 ignore 实例和 fast-glob 可用的 ignore 模式数组
   * 如果 options.exclude 已指定，使用它；否则读取 .gitignore
   * 始终排除 .git 和 node_modules 目录（但不排除 archidocs，因为用户需要搜索其中的文件）
   * @param folderUri 工作区文件夹 URI
   * @param options 搜索选项
   * @returns ignore 实例和 fast-glob 可用的 ignore 模式数组
   */
  private async buildIgnoreInstance(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<{
    instance: ReturnType<typeof ignore>;
    ignorePatterns: string[];
  }> {
    // 检查缓存
    const cacheKey = `${folderUri}:${options?.exclude || 'default'}`;
    const cached = this.ignoreCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const ig = ignore();
    const ignorePatterns: string[] = [];

    // 始终排除 .git 目录（但不排除 archidocs，因为用户需要搜索其中的文件）
    ig.add('.git');
    ig.add('**/.git');
    ignorePatterns.push('.git', '**/.git');
    
    // 始终排除 node_modules 目录
    ig.add('node_modules');
    ig.add('**/node_modules');
    ig.add('**/node_modules/**');
    ignorePatterns.push('node_modules', '**/node_modules', '**/node_modules/**');

    // 如果明确指定了 exclude，添加它
    if (options?.exclude !== undefined && options.exclude) {
      ig.add(options.exclude);
      ignorePatterns.push(options.exclude);
    } else {
      // 否则读取 .gitignore
      try {
        const gitignorePath = path.join(folderUri, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
          const content = fs.readFileSync(gitignorePath, 'utf-8');
          ig.add(content);
          
          // 将 .gitignore 内容转换为 fast-glob 可用的模式
          // fast-glob 的 ignore 选项接受 glob 模式数组
          const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
          ignorePatterns.push(...lines);
        }
      } catch (error) {
        // 读取失败，忽略
      }
    }

    const result = { instance: ig, ignorePatterns };
    // 缓存结果（限制缓存大小，避免内存泄漏）
    if (this.ignoreCache.size > 50) {
      // 清除最旧的缓存项（简单策略：清除第一个）
      const firstKey = this.ignoreCache.keys().next().value;
      if (firstKey) {
        this.ignoreCache.delete(firstKey);
      }
    }
    this.ignoreCache.set(cacheKey, result);

    return result;
  }

  /**
   * 输入规范化：将用户输入转换为 tokens
   * 支持驼峰命名拆分：ArchitectureVision -> ["architecture", "vision"]
   */
  private normalizeInput(input: string): string[] {
    // 1. 先处理分隔符（-、_、.）和空格
    const withSpaces = input
      .replace(/[-_.]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2') // 驼峰拆分：小写字母后跟大写字母，在中间插入空格
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2'); // 处理连续大写：ABCDe -> ABC De
    
    // 2. 转换为小写并分割
    return withSpaces
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  /**
   * 构建 glob 模式：从最强约束到最弱
   */
  private buildGlobPatterns(tokens: string[]): string[] {
    if (tokens.length === 0) {
      return [];
    }
    
    // 转义特殊字符
    const escaped = tokens.map(t => t.replace(/[\\*?[\]{}()!+@]/g, '\\$&'));
    
    if (tokens.length === 1) {
      // 单 token：支持多种匹配方式
      return [
        `**/*${escaped[0]}*`,  // 包含该 token
        `**/${escaped[0]}*`,   // 文件名以该 token 开头
      ];
    }

    // 多个 token：构建多个模式（从最强约束到最弱）
    const patterns: string[] = [];
    
    // 1. 文件名中包含所有 token（连续或非连续）
    patterns.push(`**/*${escaped.join('*')}*`);
    
    // 2. 文件名以第一个 token 开头，包含后续 token
    patterns.push(`**/${escaped[0]}*${escaped.slice(1).join('*')}*`);
    
    // 3. 路径中包含第一个，文件名中包含第二个
    if (tokens.length >= 2) {
      patterns.push(`**/*${escaped[0]}*/**/*${escaped[1]}*`);
    }
    
    return patterns;
  }

  /**
   * Cheap filter：快速过滤，只做 includes 检查，不算分
   */
  private cheapMatch(path: string, tokens: string[]): boolean {
    const lower = path.toLowerCase();
    return tokens.every(t => lower.includes(t));
  }

  /**
   * Fuzzy rank：对候选文件进行评分和排序
   */
  private score(path: string, tokens: string[]): number {
    let score = 0;
    const lower = path.toLowerCase();
    const fileName = path.split('/').pop() || '';

    for (const token of tokens) {
      const idx = lower.indexOf(token);
      if (idx === -1) {
        continue;
      }

      score += 10; // 命中基础分
      
      // 如果命中在文件名中（而不是路径中），额外加分
      const fileNameIdx = fileName.toLowerCase().indexOf(token);
      if (fileNameIdx !== -1) {
        score += 5;
        // 如果命中在文件名开头，再加分
        if (fileNameIdx < 3) {
          score += 3;
        }
      }
    }

    // 路径深度惩罚：路径越深，分数越低
    const depth = path.split('/').length;
    score -= depth;

    return score;
  }

  /**
   * 使用 glob + fuzzy 算法查找文件和文件夹
   * @param folderUri 工作区文件夹 URI
   * @param options 搜索选项
   * @param itemType 返回类型：'file' | 'folder' | 'both'
   * @returns 文件/文件夹项数组
   */
  private async findItemsWithFastGlob(
    folderUri: string,
    options?: WorkspaceFileSearchOptions,
    itemType: 'file' | 'folder' | 'both' = 'both'
  ): Promise<Result<WorkspaceFileItem[], ArtifactError>> {
    try {
      const folder = vscode.workspace.workspaceFolders?.find(f => f.uri.fsPath === folderUri);
      
      if (!folder) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Workspace folder not found: ${folderUri}`
          ),
        };
      }

      const maxResults = options?.maxResults || 100;
      const query = options?.query?.trim();
      
      // 特殊处理：如果查询是 '*'，表示获取所有文件（用于编辑关联关系等场景）
      if (query === '*') {
        // 构建 ignore 实例
        const { instance: ig, ignorePatterns } = await this.buildIgnoreInstance(folderUri, options);
        
        // 使用 fast-glob 获取所有文件和文件夹
        const allItems: WorkspaceFileItem[] = [];
        const globPatterns = ['**/*', '**/'];
        
        for (const pattern of globPatterns) {
          const entries = await fg(pattern, {
            cwd: folderUri,
            ignore: ignorePatterns,
            onlyFiles: pattern === '**/*',
            onlyDirectories: pattern === '**/',
            absolute: false,
            deep: 10, // 限制深度
          });
          
          for (const entry of entries.slice(0, maxResults)) {
            const fullPath = path.join(folderUri, entry);
            const stat = fs.statSync(fullPath);
            const relativePath = path.relative(folderUri, fullPath).replace(/\\/g, '/');
            
            // 使用 ignore 实例再次过滤（双重保险）
            if (ig.ignores(relativePath)) {
              continue;
            }
            
            allItems.push({
              path: relativePath,
              name: path.basename(entry),
              type: stat.isDirectory() ? 'folder' : 'file',
            });
            
            if (allItems.length >= maxResults) {
              break;
            }
          }
          
          if (allItems.length >= maxResults) {
            break;
          }
        }
        
        return { success: true, value: allItems };
      }
      
      // 如果没有查询条件或查询太短，不执行搜索
      if (!query || query.length < 2) {
        return { success: true, value: [] };
      }

      // 阶段 1：输入规范化
      const tokens = this.normalizeInput(query);
      if (tokens.length === 0) {
        return { success: true, value: [] };
      }

      // 构建 ignore 实例和 fast-glob 可用的 ignore 模式
      const { instance: ig, ignorePatterns } = await this.buildIgnoreInstance(folderUri, options);

      // 阶段 2：构建 glob 模式（从最强约束到最弱）
      const globPatterns = this.buildGlobPatterns(tokens);
      if (globPatterns.length === 0) {
        return { success: true, value: [] };
      }

      // 固定搜索深度为 10
      const searchDepth = 10;

      // 阶段 3：流式 glob + 短路终止
      // 候选上限：300（保证 worst-case，即使 30 万文件也只处理几百个）
      const MAX_CANDIDATES = 300;
      const candidates: Array<{ path: string; isDirectory: boolean }> = [];

      // 统一使用 fast-glob（流式处理）
      // 从最强约束到最弱，依次尝试 glob 模式
      for (const pattern of globPatterns) {
        if (candidates.length >= MAX_CANDIDATES) {
          break; // 达到候选上限，立即终止
        }

        // 使用 fast-glob 的 ignore 选项，在扫描阶段就排除文件（关键优化）
        // 使用 stats: true 获取文件类型，避免额外的 stat 调用
        const entries = await fg([pattern], {
        cwd: folderUri,
        dot: true,
          onlyFiles: itemType === 'file', // 如果只需要文件，只搜索文件
          absolute: false,
          stats: true, // 获取 stats 以区分文件和文件夹，避免额外的 stat 调用
          caseSensitiveMatch: false,
          deep: searchDepth, // 动态调整搜索深度
          ignore: ignorePatterns, // 关键优化：在扫描阶段就排除文件
      });

        // 流式处理：逐个检查并收集候选
        for (const entry of entries) {
          const entryPath = typeof entry === 'string' ? entry : entry.path;
          const relativePath = entryPath.replace(/\\/g, '/');
          
          if (candidates.length >= MAX_CANDIDATES) {
            break; // 达到上限，立即终止
          }
          
          // 使用 fast-glob 的 ignore 后，大部分不需要的文件已经被排除
          // 但为了安全，仍然进行快速检查（某些边缘情况可能漏掉）
          if (!ig.ignores(relativePath)) {
            // 从 stats 中获取文件类型，避免额外的 stat 调用
            // 当 stats: true 时，entry 是对象 { path, stats }
            let isDirectory = false;
            if (typeof entry !== 'string' && entry.stats) {
              isDirectory = entry.stats.isDirectory();
            } else if (itemType === 'file') {
              // 如果 onlyFiles: true，则都是文件
              isDirectory = false;
            } else {
              // 如果没有 stats，需要 fallback（这种情况应该很少）
              // 但为了性能，我们假设是文件（后续会在 itemType 过滤中处理）
              isDirectory = false;
            }
            
            candidates.push({ path: relativePath, isDirectory });
          }
        }
        
        // 如果第一个模式已经找到足够的结果，提前终止（优化）
        if (candidates.length >= maxResults * 2) {
          break;
        }
        }
        
      // 阶段 4：cheap filter（快速过滤，O(1)）
      const cheapFiltered = candidates.filter(candidate => this.cheapMatch(candidate.path, tokens));

      // 阶段 5：fuzzy rank（只对几十～几百个候选进行评分排序）
      const scored = cheapFiltered.map(candidate => ({
        candidate,
        score: this.score(candidate.path, tokens),
      }));

      // 排序并取 Top N
      scored.sort((a, b) => b.score - a.score);
      const topCandidates = scored.slice(0, maxResults).map(x => x.candidate);

      // 转换为 WorkspaceFileItem 并区分文件和文件夹
      // 注意：isDirectory 已经在 fast-glob 的 stats 中获取，无需额外的 stat 调用
      const items: WorkspaceFileItem[] = [];
      const processedPaths = new Set<string>();

      for (const candidate of topCandidates) {
        const entry = candidate.path;
        if (processedPaths.has(entry)) {
          continue;
        }

        const isDirectory = candidate.isDirectory;

        // 根据 itemType 过滤
        if (itemType === 'file' && isDirectory) {
          continue;
        }
        if (itemType === 'folder' && !isDirectory) {
          continue;
        }
        
        items.push({
          path: entry,
          name: path.basename(entry),
          type: isDirectory ? 'folder' : 'file',
        });

        processedPaths.add(entry);

        if (items.length >= maxResults) {
          break;
        }
      }

      return { success: true, value: items };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find items: ${error.message}`,
          {},
          error
        ),
      };
    }
  }

  async findFiles(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>> {
    return this.findItemsWithFastGlob(folderUri, options, 'file');
  }

  async findFolders(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>> {
    return this.findItemsWithFastGlob(folderUri, options, 'folder');
  }

  async findFilesAndFolders(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>> {
    const result = await this.findItemsWithFastGlob(folderUri, options, 'both');
    
    if (!result.success) {
      return result;
    }

    // 排序：文件夹在前，文件在后，都按路径排序
    result.value.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') {
        return -1;
      }
      if (a.type === 'file' && b.type === 'folder') {
        return 1;
      }
      return a.path.localeCompare(b.path);
    });

    return result;
  }
}

