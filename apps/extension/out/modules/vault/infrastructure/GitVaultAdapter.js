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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitVaultAdapterImpl = void 0;
const simple_git_1 = __importDefault(require("simple-git"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class GitVaultAdapterImpl {
    getGitInstance(repoPath) {
        const options = {
            baseDir: repoPath,
            binary: 'git',
            maxConcurrentProcesses: 1,
        };
        return (0, simple_git_1.default)(options);
    }
    async cloneRepository(remote, targetPath) {
        try {
            // Ensure target directory doesn't exist or is empty
            if (fs.existsSync(targetPath)) {
                const files = fs.readdirSync(targetPath);
                if (files.length > 0) {
                    return {
                        success: false,
                        error: {
                            code: 'DIRECTORY_NOT_EMPTY',
                            message: `Target directory is not empty: ${targetPath}`,
                        },
                    };
                }
            }
            else {
                // Create parent directory if it doesn't exist
                const parentDir = path.dirname(targetPath);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }
            }
            // Clone repository
            const git = (0, simple_git_1.default)();
            await git.clone(remote.url, targetPath, ['--branch', remote.branch || 'main']);
            return { success: true, value: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: {
                    code: 'CLONE_FAILED',
                    message: `Failed to clone repository: ${error.message}`,
                },
            };
        }
    }
    async pullRepository(vaultPath) {
        try {
            if (!(await this.isGitRepository(vaultPath))) {
                return {
                    success: false,
                    error: {
                        code: 'NOT_A_GIT_REPOSITORY',
                        message: `Path is not a Git repository: ${vaultPath}`,
                    },
                };
            }
            const git = this.getGitInstance(vaultPath);
            await git.pull();
            return { success: true, value: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: {
                    code: 'PULL_FAILED',
                    message: `Failed to pull repository: ${error.message}`,
                },
            };
        }
    }
    async pushRepository(vaultPath) {
        try {
            if (!(await this.isGitRepository(vaultPath))) {
                return {
                    success: false,
                    error: {
                        code: 'NOT_A_GIT_REPOSITORY',
                        message: `Path is not a Git repository: ${vaultPath}`,
                    },
                };
            }
            const git = this.getGitInstance(vaultPath);
            await git.push();
            return { success: true, value: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: {
                    code: 'PUSH_FAILED',
                    message: `Failed to push repository: ${error.message}`,
                },
            };
        }
    }
    async getRemoteUrl(vaultPath) {
        try {
            if (!(await this.isGitRepository(vaultPath))) {
                return {
                    success: false,
                    error: {
                        code: 'NOT_A_GIT_REPOSITORY',
                        message: `Path is not a Git repository: ${vaultPath}`,
                    },
                };
            }
            const git = this.getGitInstance(vaultPath);
            const remotes = await git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            if (!origin || !origin.refs.fetch) {
                return {
                    success: false,
                    error: {
                        code: 'NO_REMOTE_URL',
                        message: 'No remote URL found for origin',
                    },
                };
            }
            return { success: true, value: origin.refs.fetch };
        }
        catch (error) {
            return {
                success: false,
                error: {
                    code: 'GET_REMOTE_FAILED',
                    message: `Failed to get remote URL: ${error.message}`,
                },
            };
        }
    }
    async getCurrentBranch(vaultPath) {
        try {
            if (!(await this.isGitRepository(vaultPath))) {
                return {
                    success: false,
                    error: {
                        code: 'NOT_A_GIT_REPOSITORY',
                        message: `Path is not a Git repository: ${vaultPath}`,
                    },
                };
            }
            const git = this.getGitInstance(vaultPath);
            const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
            return { success: true, value: branch.trim() };
        }
        catch (error) {
            return {
                success: false,
                error: {
                    code: 'GET_BRANCH_FAILED',
                    message: `Failed to get current branch: ${error.message}`,
                },
            };
        }
    }
    async isGitRepository(vaultPath) {
        try {
            const gitDir = path.join(vaultPath, '.git');
            return fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory();
        }
        catch {
            return false;
        }
    }
    async checkoutBranch(vaultPath, branch) {
        try {
            if (!(await this.isGitRepository(vaultPath))) {
                return {
                    success: false,
                    error: {
                        code: 'NOT_A_GIT_REPOSITORY',
                        message: `Path is not a Git repository: ${vaultPath}`,
                    },
                };
            }
            const git = this.getGitInstance(vaultPath);
            await git.checkout(branch);
            return { success: true, value: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: {
                    code: 'CHECKOUT_FAILED',
                    message: `Failed to checkout branch: ${error.message}`,
                },
            };
        }
    }
}
exports.GitVaultAdapterImpl = GitVaultAdapterImpl;
//# sourceMappingURL=GitVaultAdapter.js.map