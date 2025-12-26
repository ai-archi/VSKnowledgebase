package com.architool

import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.StartupActivity

/**
 * Architool 插件入口
 * 对应 VS Code 的 extension.ts activate 函数
 */
class ArchitoolPlugin : StartupActivity {
    override fun runActivity(project: Project) {
        // 初始化插件
        // 这里应该调用共享的业务逻辑初始化代码
        // 类似于 VS Code 的 activate 函数
        
        // TODO: 实现插件初始化逻辑
        // 1. 创建 IntelliJAdapter 实例
        // 2. 初始化依赖注入容器
        // 3. 注册命令和视图
        // 4. 注册自定义编辑器
    }
}

