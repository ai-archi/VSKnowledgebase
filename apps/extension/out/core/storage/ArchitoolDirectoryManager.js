"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitoolDirectoryManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * .architool 目录管理器
 * 负责创建和管理 .architool 目录结构
 */
class ArchitoolDirectoryManager {
    constructor(rootPath) {
        this.rootPath = rootPath;
    }
    /**
     * 初始化 .architool 目录结构
     */
    async initialize() {
        // 创建根目录
        if (!fs.existsSync(this.rootPath)) {
            fs.mkdirSync(this.rootPath, { recursive: true });
        }
        // 创建 cache 目录（用于 DuckDB）
        const cacheDir = path.join(this.rootPath, 'cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
    }
    /**
     * 初始化 Vault 目录结构
     */
    async initializeVault(vaultName) {
        const vaultDir = path.join(this.rootPath, vaultName);
        if (!fs.existsSync(vaultDir)) {
            fs.mkdirSync(vaultDir, { recursive: true });
        }
        // 创建子目录
        const subDirs = [
            'artifacts',
            'metadata',
            'links',
            'templates',
            'tasks',
            'viewpoints',
            'changes',
        ];
        for (const dir of subDirs) {
            const dirPath = path.join(vaultDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        }
    }
    /**
     * 获取 Vault 路径
     */
    getVaultPath(vaultName) {
        return path.join(this.rootPath, vaultName);
    }
    /**
     * 获取 Artifact 目录路径
     */
    getArtifactsPath(vaultName) {
        return path.join(this.rootPath, vaultName, 'artifacts');
    }
    /**
     * 获取元数据目录路径
     */
    getMetadataPath(vaultName) {
        return path.join(this.rootPath, vaultName, 'metadata');
    }
}
exports.ArchitoolDirectoryManager = ArchitoolDirectoryManager;
//# sourceMappingURL=ArchitoolDirectoryManager.js.map