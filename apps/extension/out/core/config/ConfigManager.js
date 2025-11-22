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
exports.ConfigManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const errors_1 = require("../../domain/shared/artifact/errors");
class ConfigManager {
    constructor(architoolRoot, logger) {
        this.architoolRoot = architoolRoot;
        this.configPath = path.join(architoolRoot, 'architool.yml');
        this.logger = logger;
    }
    getArchitoolRoot() {
        return this.architoolRoot;
    }
    async saveGlobalConfig(config) {
        if (!fs.existsSync(this.architoolRoot)) {
            fs.mkdirSync(this.architoolRoot, { recursive: true });
        }
        fs.writeFileSync(this.configPath, yaml.dump(config), 'utf-8');
    }
    async getGlobalConfig() {
        if (!fs.existsSync(this.configPath)) {
            return this.getDefaultConfig();
        }
        try {
            const content = fs.readFileSync(this.configPath, 'utf-8');
            return yaml.load(content);
        }
        catch (error) {
            this.logger?.error('Failed to load global config:', error);
            return this.getDefaultConfig();
        }
    }
    async getVaults() {
        const config = await this.getGlobalConfig();
        const vaults = config.workspace?.vaults || [];
        return {
            success: true,
            value: vaults.map((v) => ({
                id: v.name || v.fsPath,
                name: v.name || v.fsPath,
                description: v.description,
                remote: v.remote,
                selfContained: v.selfContained ?? true,
                readOnly: !!v.remote,
            }))
        };
    }
    async getVault(vaultId) {
        const vaultsResult = await this.getVaults();
        if (!vaultsResult.success) {
            return vaultsResult;
        }
        const vault = vaultsResult.value.find(v => v.id === vaultId);
        if (!vault) {
            return { success: false, error: new errors_1.VaultError(errors_1.VaultErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`) };
        }
        return { success: true, value: vault };
    }
    async addVault(vault) {
        const config = await this.getGlobalConfig();
        if (!config.workspace) {
            config.workspace = {};
        }
        if (!config.workspace.vaults) {
            config.workspace.vaults = [];
        }
        config.workspace.vaults.push({
            name: vault.name,
            fsPath: path.join(this.architoolRoot, vault.name),
            description: vault.description,
            remote: vault.remote,
        });
        await this.saveGlobalConfig(config);
    }
    async removeVault(vaultId) {
        const config = await this.getGlobalConfig();
        if (config.workspace?.vaults) {
            config.workspace.vaults = config.workspace.vaults.filter((v) => (v.name || v.fsPath) !== vaultId);
            await this.saveGlobalConfig(config);
        }
    }
    getDefaultConfig() {
        return {
            workspace: {
                vaults: [],
            },
        };
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map