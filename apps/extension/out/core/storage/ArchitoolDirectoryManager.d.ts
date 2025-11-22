/**
 * .architool 目录管理器
 * 负责创建和管理 .architool 目录结构
 */
export declare class ArchitoolDirectoryManager {
    private rootPath;
    constructor(rootPath: string);
    /**
     * 初始化 .architool 目录结构
     */
    initialize(): Promise<void>;
    /**
     * 初始化 Vault 目录结构
     */
    initializeVault(vaultName: string): Promise<void>;
    /**
     * 获取 Vault 路径
     */
    getVaultPath(vaultName: string): string;
    /**
     * 获取 Artifact 目录路径
     */
    getArtifactsPath(vaultName: string): string;
    /**
     * 获取元数据目录路径
     */
    getMetadataPath(vaultName: string): string;
}
//# sourceMappingURL=ArchitoolDirectoryManager.d.ts.map