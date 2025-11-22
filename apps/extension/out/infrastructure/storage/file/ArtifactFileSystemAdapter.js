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
exports.ArtifactFileSystemAdapter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_1 = require("../../../domain/shared/artifact/errors");
class ArtifactFileSystemAdapter {
    constructor(architoolRoot) {
        this.architoolRoot = architoolRoot;
    }
    getArtifactPath(vaultName, artifactPath) {
        return path.join(this.architoolRoot, vaultName, 'artifacts', artifactPath);
    }
    getMetadataPath(vaultName, metadataId) {
        return path.join(this.architoolRoot, vaultName, 'metadata', `${metadataId}.yml`);
    }
    async readArtifact(vaultName, artifactPath) {
        try {
            const filePath = this.getArtifactPath(vaultName, artifactPath);
            if (!fs.existsSync(filePath)) {
                return {
                    success: false,
                    error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.NOT_FOUND, `Artifact not found: ${artifactPath}`),
                };
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            return { success: true, value: content };
        }
        catch (error) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, `Failed to read artifact: ${error.message}`, {}, error),
            };
        }
    }
    async writeArtifact(artifact, content) {
        try {
            const filePath = this.getArtifactPath(artifact.vault.name, artifact.path);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, content, 'utf-8');
            return { success: true, value: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, `Failed to write artifact: ${error.message}`, {}, error),
            };
        }
    }
    async deleteArtifact(vaultName, artifactPath) {
        try {
            const filePath = this.getArtifactPath(vaultName, artifactPath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return { success: true, value: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: new errors_1.ArtifactError(errors_1.ArtifactErrorCode.OPERATION_FAILED, `Failed to delete artifact: ${error.message}`, {}, error),
            };
        }
    }
}
exports.ArtifactFileSystemAdapter = ArtifactFileSystemAdapter;
//# sourceMappingURL=ArtifactFileSystemAdapter.js.map