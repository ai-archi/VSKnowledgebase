/**
 * 视图注册表
 * 统一管理所有视图组件
 */
import type { Component } from 'vue';
import ViewpointPanelPage from '@/pages/ViewpointPanelPage.vue';
import CreateTaskDialogPage from '@/pages/CreateTaskDialogPage.vue';
import CreateFileDialogPage from '@/pages/CreateFileDialogPage.vue';
import CreateFolderDialogPage from '@/pages/CreateFolderDialogPage.vue';
import CreateDesignDialogPage from '@/pages/CreateDesignDialogPage.vue';
import EditRelationsDialogPage from '@/pages/EditRelationsDialogPage.vue';
import MermaidEditorPage from '@/pages/MermaidEditorPage.vue';
import PlantUMLEditorPage from '@/pages/PlantUMLEditorPage.vue';
import SolutionEditorPage from '@/pages/SolutionEditorPage.vue';

export interface ViewConfig {
  name: string;
  component: Component;
  title?: string;
}

/**
 * 视图注册表
 * key: 视图名称（用于URL参数或路由）
 * value: 视图配置
 */
export const views: Record<string, ViewConfig> = {
  'viewpoint-panel': {
    name: 'viewpoint-panel',
    component: ViewpointPanelPage,
    title: 'Viewpoints',
  },
  'create-task-dialog': {
    name: 'create-task-dialog',
    component: CreateTaskDialogPage,
    title: 'Create Task',
  },
  'create-file-dialog': {
    name: 'create-file-dialog',
    component: CreateFileDialogPage,
    title: 'Create File',
  },
  'create-folder-dialog': {
    name: 'create-folder-dialog',
    component: CreateFolderDialogPage,
    title: 'Create Folder',
  },
  'create-design-dialog': {
    name: 'create-design-dialog',
    component: CreateDesignDialogPage,
    title: 'Create Design',
  },
  'edit-relations-dialog': {
    name: 'edit-relations-dialog',
    component: EditRelationsDialogPage,
    title: 'Edit Relations',
  },
  'mermaid-editor': {
    name: 'mermaid-editor',
    component: MermaidEditorPage,
    title: 'Mermaid Editor',
  },
  'plantuml-editor': {
    name: 'plantuml-editor',
    component: PlantUMLEditorPage,
    title: 'PlantUML Editor',
  },
  'solution-editor': {
    name: 'solution-editor',
    component: SolutionEditorPage,
    title: 'Solution Editor',
  },
};

/**
 * 根据视图名称获取视图配置
 */
export function getView(viewName: string): ViewConfig | undefined {
  return views[viewName];
}

/**
 * 获取默认视图（viewpoint-panel）
 */
export function getDefaultView(): ViewConfig {
  return views['viewpoint-panel'];
}

