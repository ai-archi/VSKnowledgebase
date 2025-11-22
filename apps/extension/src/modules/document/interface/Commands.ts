import * as vscode from 'vscode';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter } from '../../../core/vscode-api/CommandAdapter';
import { DocumentTreeViewProvider, DocumentTreeItem } from './DocumentTreeViewProvider';
import { RemoteEndpoint } from '../../../domain/shared/vault/RemoteEndpoint';
import * as path from 'path';

export class DocumentCommands {
  constructor(
    private documentService: DocumentApplicationService,
    private artifactService: ArtifactFileSystemApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger,
    private context: vscode.ExtensionContext,
    private treeViewProvider: DocumentTreeViewProvider,
    private treeView: vscode.TreeView<vscode.TreeItem>
  ) {}

  register(commandAdapter: CommandAdapter): void {
    commandAdapter.registerCommands([
      {
        command: 'archi.document.refresh',
        callback: () => {
          this.treeViewProvider.refresh();
        },
      },
      {
        command: 'archi.document.create',
        callback: async () => {
          const vaultsResult = await this.vaultService.listVaults();
          if (!vaultsResult.success || vaultsResult.value.length === 0) {
            vscode.window.showErrorMessage('No vaults available');
            return;
          }

          const vaultItems = vaultsResult.value.map(v => ({
            label: v.name,
            description: v.description,
            id: v.id,
          }));

          const selectedVault = await vscode.window.showQuickPick(vaultItems, {
            placeHolder: 'Select a vault',
          });

          if (!selectedVault) {
            return;
          }

          const documentName = await vscode.window.showInputBox({
            prompt: 'Enter document name',
          });

          if (!documentName) {
            return;
          }

          const result = await this.documentService.createDocument(
            selectedVault.id,
            `note/${documentName}.md`,
            documentName,
            `# ${documentName}\n\n`
          );

          if (result.success) {
            vscode.window.showInformationMessage(`Document created: ${documentName}`);
            this.treeViewProvider.refresh();
            const doc = await vscode.workspace.openTextDocument(result.value.contentLocation);
            await vscode.window.showTextDocument(doc);
          } else {
            vscode.window.showErrorMessage(`Failed to create document: ${result.error.message}`);
          }
        },
      },
      {
        command: 'archi.document.expandAll',
        callback: async () => {
          await this.expandAll();
        },
      },
      {
        command: 'archi.document.collapseAll',
        callback: async () => {
          await this.collapseAll();
        },
      },
      {
        command: 'archi.document.addFile',
        callback: async (item?: DocumentTreeItem) => {
          await this.addFile(item);
        },
      },
      {
        command: 'archi.document.addFolder',
        callback: async (item?: DocumentTreeItem) => {
          await this.addFolder(item);
        },
      },
      {
        command: 'archi.document.addDiagram',
        callback: async (item?: DocumentTreeItem) => {
          await this.addDiagram(item);
        },
      },
      {
        command: 'archi.document.delete',
        callback: async (item?: DocumentTreeItem) => {
          await this.deleteItem(item);
        },
      },
    ]);
  }

  /**
   * 展开所有节点
   */
  private async expandAll(): Promise<void> {
    try {
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success) {
        return;
      }

      // 先刷新视图以确保所有节点都已加载
      this.treeViewProvider.refresh();
      
      // 等待一小段时间让视图更新
      await new Promise(resolve => setTimeout(resolve, 100));

      // 展开所有 vault 节点
      for (const vault of vaultsResult.value) {
        const vaultItem = await this.treeViewProvider.getVaultTreeItem(vault.name);
        if (vaultItem) {
          try {
            await this.treeView.reveal(vaultItem, { expand: true });
          } catch (error) {
            // 忽略单个节点展开失败
          }
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to expand all nodes', error);
    }
  }

  /**
   * 折叠所有节点
   */
  private async collapseAll(): Promise<void> {
    try {
      // VSCode TreeView 没有直接的 collapseAll API
      // 最简单的方法是通过刷新视图来折叠所有节点
      // 刷新后所有节点默认是折叠状态
      this.treeViewProvider.refresh();
    } catch (error: any) {
      this.logger.error('Failed to collapse all nodes', error);
    }
  }

  /**
   * 获取选中的 vault 名称
   */
  private async getSelectedVaultName(item?: DocumentTreeItem): Promise<string | null> {
    // 如果直接传入了 item，使用它
    if (item) {
      if (item.vaultName) {
        return item.vaultName;
      }
      if (item.artifact) {
        return item.artifact.vault.name;
      }
    }

    // 否则从当前选中的项获取
    const selection = this.treeView.selection;
    if (selection.length > 0) {
      const selectedItem = selection[0] as DocumentTreeItem;
      if (selectedItem.vaultName) {
        return selectedItem.vaultName;
      }
      if (selectedItem.artifact) {
        return selectedItem.artifact.vault.name;
      }
    }

    return null;
  }

  /**
   * 添加文件
   */
  private async addFile(item?: DocumentTreeItem): Promise<void> {
    try {
      const vaultName = await this.getSelectedVaultName(item);
      if (!vaultName) {
        vscode.window.showErrorMessage('Please select a vault or document');
        return;
      }

      const vaultResult = await this.vaultService.listVaults();
      if (!vaultResult.success) {
        vscode.window.showErrorMessage('Failed to get vaults');
        return;
      }

      const vault = vaultResult.value.find(v => v.name === vaultName);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
        return;
      }

      if (vault.readOnly) {
        vscode.window.showErrorMessage(`Cannot add file to read-only vault: ${vaultName}`);
        return;
      }

      const fileName = await vscode.window.showInputBox({
        prompt: 'Enter file name (without extension)',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'File name cannot be empty';
          }
          if (/[<>:"/\\|?*]/.test(value)) {
            return 'File name contains invalid characters';
          }
          return null;
        }
      });

      if (!fileName) return;

      // 确定文件路径
      let filePath: string;
      if (item?.artifact) {
        // 如果是在文档节点上右键，在同一个目录下创建
        const artifactPath = item.artifact.path;
        const dir = path.dirname(artifactPath);
        filePath = path.join(dir, `${fileName}.md`);
      } else {
        // 如果是在 vault 节点上右键，在根目录下创建
        filePath = `${fileName}.md`;
      }

      const result = await this.documentService.createDocument(
        vault.id,
        filePath,
        fileName,
        `# ${fileName}\n\n`
      );

      if (result.success) {
        vscode.window.showInformationMessage(`File created: ${fileName}`);
        this.treeViewProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(result.value.contentLocation);
        await vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showErrorMessage(`Failed to create file: ${result.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to add file', error);
      vscode.window.showErrorMessage(`Failed to add file: ${error.message}`);
    }
  }

  /**
   * 添加文件夹
   */
  private async addFolder(item?: DocumentTreeItem): Promise<void> {
    try {
      const vaultName = await this.getSelectedVaultName(item);
      if (!vaultName) {
        vscode.window.showErrorMessage('Please select a vault or document');
        return;
      }

      const vaultResult = await this.vaultService.listVaults();
      if (!vaultResult.success) {
        vscode.window.showErrorMessage('Failed to get vaults');
        return;
      }

      const vault = vaultResult.value.find(v => v.name === vaultName);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
        return;
      }

      if (vault.readOnly) {
        vscode.window.showErrorMessage(`Cannot add folder to read-only vault: ${vaultName}`);
        return;
      }

      const folderName = await vscode.window.showInputBox({
        prompt: 'Enter folder name',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Folder name cannot be empty';
          }
          if (/[<>:"/\\|?*]/.test(value)) {
            return 'Folder name contains invalid characters';
          }
          return null;
        }
      });

      if (!folderName) return;

      // 确定文件夹路径
      let folderPath: string;
      if (item?.artifact) {
        // 如果是在文档节点上右键，在同一个目录下创建
        const artifactPath = item.artifact.path;
        const dir = path.dirname(artifactPath);
        folderPath = path.join(dir, folderName);
      } else {
        // 如果是在 vault 节点上右键，在根目录下创建
        folderPath = folderName;
      }

      // 创建文件夹（通过创建一个占位文件）
      // 确保文件夹路径以 / 结尾（如果不在根目录）
      const placeholderPath = folderPath.endsWith('/') || folderPath === '' 
        ? path.join(folderPath, '.keep') 
        : path.join(folderPath, '.keep');
      
      const result = await this.documentService.createDocument(
        vault.id,
        placeholderPath,
        folderName,
        `# ${folderName}\n\nThis folder contains documents.\n`
      );

      if (result.success) {
        vscode.window.showInformationMessage(`Folder created: ${folderName}`);
        // 刷新视图，确保文件夹显示出来
        this.treeViewProvider.refresh();
        // 等待一小段时间让文件系统更新
        await new Promise(resolve => setTimeout(resolve, 100));
        this.treeViewProvider.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to create folder: ${result.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to add folder', error);
      vscode.window.showErrorMessage(`Failed to add folder: ${error.message}`);
    }
  }

  /**
   * 添加设计图
   */
  private async addDiagram(item?: DocumentTreeItem): Promise<void> {
    try {
      const vaultName = await this.getSelectedVaultName(item);
      if (!vaultName) {
        vscode.window.showErrorMessage('Please select a vault or document');
        return;
      }

      const vaultResult = await this.vaultService.listVaults();
      if (!vaultResult.success) {
        vscode.window.showErrorMessage('Failed to get vaults');
        return;
      }

      const vault = vaultResult.value.find(v => v.name === vaultName);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
        return;
      }

      if (vault.readOnly) {
        vscode.window.showErrorMessage(`Cannot add diagram to read-only vault: ${vaultName}`);
        return;
      }

      const diagramName = await vscode.window.showInputBox({
        prompt: 'Enter diagram name (without extension)',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Diagram name cannot be empty';
          }
          if (/[<>:"/\\|?*]/.test(value)) {
            return 'Diagram name contains invalid characters';
          }
          return null;
        }
      });

      if (!diagramName) return;

      // 选择图表类型
      const diagramType = await vscode.window.showQuickPick([
        { label: 'Mermaid', value: 'mermaid', description: 'Mermaid diagram (.mmd)' },
        { label: 'PlantUML', value: 'puml', description: 'PlantUML diagram (.puml)' },
        { label: 'Archimate', value: 'archimate', description: 'Archimate diagram (.archimate)' },
      ], {
        placeHolder: 'Select diagram type'
      });

      if (!diagramType) return;

      // 确定文件路径和扩展名
      const extension = diagramType.value === 'mermaid' ? 'mmd' : diagramType.value === 'puml' ? 'puml' : 'archimate';
      let diagramPath: string;
      if (item?.artifact) {
        const artifactPath = item.artifact.path;
        const dir = path.dirname(artifactPath);
        diagramPath = path.join(dir, `${diagramName}.${extension}`);
      } else {
        diagramPath = `diagrams/${diagramName}.${extension}`;
      }

      // 创建设计图文件
      const content = this.getDiagramTemplate(diagramType.value, diagramName);
      const result = await this.artifactService.createArtifact({
        vault: {
          id: vault.id,
          name: vault.name,
        },
        path: diagramPath,
        title: diagramName,
        content,
        viewType: 'design',
        format: extension,
      });

      if (result.success) {
        vscode.window.showInformationMessage(`Diagram created: ${diagramName}`);
        this.treeViewProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(result.value.contentLocation);
        await vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showErrorMessage(`Failed to create diagram: ${result.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to add diagram', error);
      vscode.window.showErrorMessage(`Failed to add diagram: ${error.message}`);
    }
  }

  /**
   * 获取图表模板
   */
  private getDiagramTemplate(type: string, name: string): string {
    switch (type) {
      case 'mermaid':
        return `# ${name}\n\n\`\`\`mermaid\ngraph TD\n    A[Start] --> B[End]\n\`\`\`\n`;
      case 'puml':
        return `@startuml\n!theme plain\n\ntitle ${name}\n\n[Component1] --> [Component2]\n\n@enduml\n`;
      case 'archimate':
        return `# ${name}\n\nArchimate diagram content\n`;
      default:
        return `# ${name}\n\n`;
    }
  }

  /**
   * 删除项
   */
  private async deleteItem(item?: DocumentTreeItem): Promise<void> {
    try {
      if (!item) {
        // 从当前选中的项获取
        const selection = this.treeView.selection;
        if (selection.length === 0) {
          vscode.window.showErrorMessage('Please select an item to delete');
          return;
        }
        item = selection[0] as DocumentTreeItem;
      }

      if (item.vaultName) {
        // 删除 vault
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete vault '${item.vaultName}'? This action cannot be undone.`,
          { modal: true },
          'Delete'
        );

        if (confirm !== 'Delete') {
          return;
        }

        const vaultResult = await this.vaultService.listVaults();
        if (!vaultResult.success) {
          vscode.window.showErrorMessage('Failed to get vaults');
          return;
        }

        const vaultName = item.vaultName;
        if (!vaultName) {
          vscode.window.showErrorMessage('Vault name not found');
          return;
        }

        const vault = vaultResult.value.find(v => v.name === vaultName);
        if (!vault) {
          vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
          return;
        }

        const result = await this.vaultService.removeVault(vault.id);
        if (result.success) {
          vscode.window.showInformationMessage(`Vault '${vaultName}' deleted`);
          this.treeViewProvider.refresh();
        } else {
          vscode.window.showErrorMessage(`Failed to delete vault: ${result.error.message}`);
        }
      } else if (item.artifact) {
        // 删除文档
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete '${item.artifact.title}'? This action cannot be undone.`,
          { modal: true },
          'Delete'
        );

        if (confirm !== 'Delete') {
          return;
        }

        const result = await this.documentService.deleteDocument(
          item.artifact.vault.id,
          item.artifact.path
        );

        if (result.success) {
          vscode.window.showInformationMessage(`Document '${item.artifact.title}' deleted`);
          this.treeViewProvider.refresh();
        } else {
          vscode.window.showErrorMessage(`Failed to delete document: ${result.error.message}`);
        }
      } else {
        vscode.window.showErrorMessage('Please select a vault or document to delete');
      }
    } catch (error: any) {
      this.logger.error('Failed to delete item', error);
      vscode.window.showErrorMessage(`Failed to delete: ${error.message}`);
    }
  }
}

