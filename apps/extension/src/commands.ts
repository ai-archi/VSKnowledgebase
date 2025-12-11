/**
 * 命令模块统一导入
 * 此文件通过 side-effect import 导入所有命令模块
 * 确保所有被 @command() 装饰器标记的命令类被自动收集
 * 
 * 注意：此文件必须在 extension.ts 中被导入，以确保命令注册机制正常工作
 */

// 导入所有命令模块（side-effect import）
// 这些导入会触发装饰器执行，将命令类添加到注册列表中

// 注意：由于当前命令类还没有完全重构为使用装饰器模式
// 这些导入暂时保留原有的注册逻辑
// 随着重构的进行，这些导入将确保命令类被正确加载

// 文档相关命令
import './modules/document/interface/Commands';

// 视点相关命令
import './modules/viewpoint/interface/Commands';

// 助手相关命令
import './modules/assistants/interface/Commands';

// AI 相关命令
import './modules/ai/interface/Commands';

// Vault 相关命令
import './modules/shared/interface/commands/VaultCommands';

// 任务相关命令（如果有独立的命令文件）
// import './modules/task/interface/Commands';
