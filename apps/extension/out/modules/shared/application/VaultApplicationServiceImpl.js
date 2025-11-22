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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultApplicationServiceImpl = void 0;
const inversify_1 = require("inversify");
const types_1 = require("../../../infrastructure/di/types");
const errors_1 = require("../../../domain/shared/artifact/errors");
const VaultFileSystemAdapter_1 = require("../../../infrastructure/storage/file/VaultFileSystemAdapter");
const Logger_1 = require("../../../core/logger/Logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let VaultApplicationServiceImpl = class VaultApplicationServiceImpl {
    constructor(vaultRepo, fileAdapter, gitAdapter, logger) {
        this.vaultRepo = vaultRepo;
        this.fileAdapter = fileAdapter;
        this.gitAdapter = gitAdapter;
        this.logger = logger;
    }
    async addLocalVault(opts) {
        const vault = {
            id: opts.name,
            name: opts.name,
            description: opts.description,
            selfContained: true,
            readOnly: false,
        };
        await this.fileAdapter.createVaultDirectory(vault);
        const saveResult = await this.vaultRepo.save(vault);
        if (!saveResult.success) {
            return saveResult;
        }
        return { success: true, value: vault };
    }
    async addVaultFromGit(opts) {
        const vault = {
            id: opts.name,
            name: opts.name,
            description: opts.description,
            remote: opts.remote,
            selfContained: false,
            readOnly: true,
        };
        // Determine target path for clone
        const targetPath = path.join(this.fileAdapter.getVaultsRoot(), opts.name);
        const cloneResult = await this.gitAdapter.cloneRepository(opts.remote, targetPath);
        if (!cloneResult.success) {
            return {
                success: false,
                error: new errors_1.VaultError(errors_1.VaultErrorCode.OPERATION_FAILED, cloneResult.error.message),
            };
        }
        await this.fileAdapter.createVaultDirectory(vault);
        const saveResult = await this.vaultRepo.save(vault);
        if (!saveResult.success) {
            return saveResult;
        }
        return { success: true, value: vault };
    }
    async forkGitVault(sourceVaultId, newVaultName) {
        // Get source vault
        const sourceVaultResult = await this.vaultRepo.findById(sourceVaultId);
        if (!sourceVaultResult.success || !sourceVaultResult.value) {
            return {
                success: false,
                error: new errors_1.VaultError(errors_1.VaultErrorCode.NOT_FOUND, `Source vault not found: ${sourceVaultId}`),
            };
        }
        const sourceVault = sourceVaultResult.value;
        if (!sourceVault.remote) {
            return {
                success: false,
                error: new errors_1.VaultError(errors_1.VaultErrorCode.OPERATION_FAILED, 'Source vault is not a Git vault'),
            };
        }
        // Create new local vault by copying source vault
        const sourcePath = path.join(this.fileAdapter.getVaultsRoot(), sourceVault.name);
        const targetPath = path.join(this.fileAdapter.getVaultsRoot(), newVaultName);
        try {
            // Copy directory recursively
            await this.copyDirectory(sourcePath, targetPath);
            // Remove .git directory to make it a local vault
            const gitDir = path.join(targetPath, '.git');
            if (fs.existsSync(gitDir)) {
                fs.rmSync(gitDir, { recursive: true, force: true });
            }
            // Create new vault object (local, writable)
            const newVault = {
                id: newVaultName,
                name: newVaultName,
                description: `Forked from ${sourceVault.name}`,
                selfContained: true,
                readOnly: false,
            };
            // Save new vault
            const saveResult = await this.vaultRepo.save(newVault);
            if (!saveResult.success) {
                // Cleanup on failure
                if (fs.existsSync(targetPath)) {
                    fs.rmSync(targetPath, { recursive: true, force: true });
                }
                return saveResult;
            }
            this.logger.info(`Vault forked: ${sourceVault.name} -> ${newVaultName}`);
            return { success: true, value: newVault };
        }
        catch (error) {
            // Cleanup on failure
            if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true, force: true });
            }
            return {
                success: false,
                error: new errors_1.VaultError(errors_1.VaultErrorCode.OPERATION_FAILED, `Failed to fork vault: ${error.message}`),
            };
        }
    }
    async copyDirectory(src, dest) {
        // Create destination directory
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                // Skip .git directory when forking
                if (entry.name === '.git') {
                    continue;
                }
                await this.copyDirectory(srcPath, destPath);
            }
            else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    async syncVault(vaultId) {
        const vaultResult = await this.vaultRepo.findById(vaultId);
        if (!vaultResult.success || !vaultResult.value) {
            return {
                success: false,
                error: new errors_1.VaultError(errors_1.VaultErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
            };
        }
        const vault = vaultResult.value;
        if (vault.remote) {
            const vaultPath = path.join(this.fileAdapter.getVaultsRoot(), vault.name);
            const pullResult = await this.gitAdapter.pullRepository(vaultPath);
            if (!pullResult.success) {
                return {
                    success: false,
                    error: new errors_1.VaultError(errors_1.VaultErrorCode.OPERATION_FAILED, pullResult.error.message),
                };
            }
        }
        return { success: true, value: undefined };
    }
    async removeVault(vaultId) {
        return this.vaultRepo.delete(vaultId);
    }
    async listVaults() {
        return this.vaultRepo.findAll();
    }
    async getVault(vaultId) {
        const result = await this.vaultRepo.findById(vaultId);
        if (!result.success || !result.value) {
            return {
                success: false,
                error: new errors_1.VaultError(errors_1.VaultErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
            };
        }
        return { success: true, value: result.value };
    }
};
exports.VaultApplicationServiceImpl = VaultApplicationServiceImpl;
exports.VaultApplicationServiceImpl = VaultApplicationServiceImpl = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(types_1.TYPES.VaultRepository)),
    __param(1, (0, inversify_1.inject)(types_1.TYPES.VaultFileSystemAdapter)),
    __param(2, (0, inversify_1.inject)(types_1.TYPES.GitVaultAdapter)),
    __param(3, (0, inversify_1.inject)(types_1.TYPES.Logger)),
    __metadata("design:paramtypes", [Object, VaultFileSystemAdapter_1.VaultFileSystemAdapter, Object, Logger_1.Logger])
], VaultApplicationServiceImpl);
//# sourceMappingURL=VaultApplicationServiceImpl.js.map