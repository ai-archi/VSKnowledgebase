import { RemoteEndpoint } from './RemoteEndpoint';
/**
 * Vault 实体
 * 架构内容的逻辑容器
 */
export interface Vault {
    id: string;
    name: string;
    description?: string;
    remote?: RemoteEndpoint;
    selfContained?: boolean;
    readOnly?: boolean;
}
//# sourceMappingURL=Vault.d.ts.map