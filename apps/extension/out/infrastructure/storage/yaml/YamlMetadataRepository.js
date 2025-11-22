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
exports.YamlMetadataRepository = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const errors_1 = require("../../../domain/shared/artifact/errors");
class YamlMetadataRepository {
    constructor(vaultPath) {
        this.vaultPath = vaultPath;
    }
    getMetadataFilePath(metadataId) {
        return path.join(this.vaultPath, 'metadata', `${metadataId}.yml`);
    }
    async writeMetadata(metadata) {
        try {
            const filePath = this.getMetadataFilePath(metadata.id);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const content = yaml.dump(metadata);
            const tempPath = `${filePath}.tmp`;
            fs.writeFileSync(tempPath, content, 'utf-8');
            fs.renameSync(tempPath, filePath);
            return { success: true, value: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, `Failed to write metadata: ${error.message}`, {}, error),
            };
        }
    }
    async readMetadata(metadataId) {
        try {
            const filePath = this.getMetadataFilePath(metadataId);
            if (!fs.existsSync(filePath)) {
                return {
                    success: false,
                    error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.NOT_FOUND, `Metadata not found: ${metadataId}`),
                };
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            const metadata = yaml.load(content);
            return { success: true, value: metadata };
        }
        catch (error) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, `Failed to read metadata: ${error.message}`, {}, error),
            };
        }
    }
    async deleteMetadata(metadataId) {
        try {
            const filePath = this.getMetadataFilePath(metadataId);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return { success: true, value: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, `Failed to delete metadata: ${error.message}`, {}, error),
            };
        }
    }
}
exports.YamlMetadataRepository = YamlMetadataRepository;
//# sourceMappingURL=YamlMetadataRepository.js.map