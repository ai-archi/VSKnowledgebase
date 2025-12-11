import * as vscode from 'vscode';

/**
 * SecretStorageService
 * 使用 VS Code SecretStorage API 安全存储敏感信息
 */
export class SecretStorageService {
  private secretStorage: vscode.SecretStorage;

  constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  /**
   * 存储 vault 的认证信息
   * @param vaultId Vault ID
   * @param credentials 认证信息
   */
  async storeVaultCredentials(vaultId: string, credentials: {
    username?: string;
    password?: string;
    accessToken?: string;
  }): Promise<void> {
    const key = this.getCredentialsKey(vaultId);
    const data = JSON.stringify(credentials);
    await this.secretStorage.store(key, data);
  }

  /**
   * 获取 vault 的认证信息
   * @param vaultId Vault ID
   * @returns 认证信息，如果不存在则返回 null
   */
  async getVaultCredentials(vaultId: string): Promise<{
    username?: string;
    password?: string;
    accessToken?: string;
  } | null> {
    const key = this.getCredentialsKey(vaultId);
    const data = await this.secretStorage.get(key);
    if (!data) {
      return null;
    }
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * 删除 vault 的认证信息
   * @param vaultId Vault ID
   */
  async deleteVaultCredentials(vaultId: string): Promise<void> {
    const key = this.getCredentialsKey(vaultId);
    await this.secretStorage.delete(key);
  }

  /**
   * 获取存储密钥
   */
  private getCredentialsKey(vaultId: string): string {
    return `vault.credentials.${vaultId}`;
  }
}
