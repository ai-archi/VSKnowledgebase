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
exports.ArtifactFileSystemApplicationServiceImpl = void 0;
const inversify_1 = require("inversify");
const types_1 = require("../../../infrastructure/di/types");
const errors_1 = require("../../../domain/shared/artifact/errors");
const ArtifactValidator_1 = require("../../../domain/shared/artifact/ArtifactValidator");
const ArtifactFileSystemAdapter_1 = require("../../../infrastructure/storage/file/ArtifactFileSystemAdapter");
const DuckDbRuntimeIndex_1 = require("../../../infrastructure/storage/duckdb/DuckDbRuntimeIndex");
const Logger_1 = require("../../../core/logger/Logger");
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
let ArtifactFileSystemApplicationServiceImpl = class ArtifactFileSystemApplicationServiceImpl {
    constructor(fileAdapter, index, metadataRepo, logger) {
        this.fileAdapter = fileAdapter;
        this.index = index;
        this.metadataRepo = metadataRepo;
        this.logger = logger;
    }
    async createArtifact(opts) {
        const artifactId = (0, uuid_1.v4)();
        const metadataId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const artifact = {
            id: artifactId,
            vault: opts.vault,
            nodeType: 'FILE',
            path: opts.path,
            name: path.basename(opts.path, path.extname(opts.path)),
            format: opts.format || 'md',
            contentLocation: this.fileAdapter.getArtifactPath(opts.vault.name, opts.path),
            viewType: opts.viewType,
            category: opts.category,
            title: opts.title,
            description: '',
            status: 'draft',
            createdAt: now,
            updatedAt: now,
            metadataId,
            tags: opts.tags,
        };
        const validationResult = ArtifactValidator_1.ArtifactValidator.validate(artifact);
        if (!validationResult.success) {
            return validationResult;
        }
        const writeResult = await this.fileAdapter.writeArtifact(artifact, opts.content);
        if (!writeResult.success) {
            return writeResult;
        }
        const metadata = {
            id: metadataId,
            artifactId,
            vaultId: opts.vault.id,
            vaultName: opts.vault.name,
            type: opts.viewType,
            category: opts.category,
            tags: opts.tags || [],
            createdAt: now,
            updatedAt: now,
        };
        const metadataResult = await this.metadataRepo.create(metadata);
        if (!metadataResult.success) {
            return metadataResult;
        }
        try {
            const metadataPath = this.fileAdapter.getMetadataPath(opts.vault.name, metadataId);
            await this.index.syncFromYaml(metadata, metadataPath, artifact.title, artifact.description);
        }
        catch (error) {
            this.logger.warn('Failed to sync to index', error);
        }
        return { success: true, value: artifact };
    }
    async getArtifact(vaultId, artifactId) {
        // TODO: Implement artifact retrieval
        return {
            success: false,
            error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.NOT_FOUND, `Artifact not found: ${artifactId}`),
        };
    }
    async updateArtifact(artifactId, updates) {
        // TODO: Implement artifact update
        return {
            success: false,
            error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, 'Not implemented'),
        };
    }
    async updateArtifactContent(vaultId, artifactId, newContent) {
        // TODO: Implement content update
        return {
            success: false,
            error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, 'Not implemented'),
        };
    }
    async deleteArtifact(vaultId, artifactId) {
        // TODO: Implement artifact deletion
        return {
            success: false,
            error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, 'Not implemented'),
        };
    }
    async listArtifacts(vaultId, options) {
        // TODO: Implement artifact listing
        return { success: true, value: [] };
    }
    async updateArtifactMetadata(artifactId, updates) {
        // TODO: Implement metadata update
        return {
            success: false,
            error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, 'Not implemented'),
        };
    }
};
exports.ArtifactFileSystemApplicationServiceImpl = ArtifactFileSystemApplicationServiceImpl;
exports.ArtifactFileSystemApplicationServiceImpl = ArtifactFileSystemApplicationServiceImpl = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(types_1.TYPES.ArtifactFileSystemAdapter)),
    __param(1, (0, inversify_1.inject)(types_1.TYPES.DuckDbRuntimeIndex)),
    __param(2, (0, inversify_1.inject)(types_1.TYPES.MetadataRepository)),
    __param(3, (0, inversify_1.inject)(types_1.TYPES.Logger)),
    __metadata("design:paramtypes", [ArtifactFileSystemAdapter_1.ArtifactFileSystemAdapter,
        DuckDbRuntimeIndex_1.DuckDbRuntimeIndex, Object, Logger_1.Logger])
], ArtifactFileSystemApplicationServiceImpl);
//# sourceMappingURL=ArtifactFileSystemApplicationServiceImpl.js.map