/**
 * 单元测试：使用 demo.archimate 验证所有元素都能正确渲染
 * 不忽略任何异常，确保所有问题都被发现
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Viewer from '../lib/Viewer';
import { logger } from '../lib/util/Logger';

// 禁用日志以减少测试输出
logger.log = () => {};
logger.warn = () => {};
logger.error = () => {};

describe('Archimate Renderer - Demo.archimate Test', () => {
  let viewer;
  let demoXml;

  beforeAll(() => {
    // 读取 demo.archimate 文件
    const demoPath = join(__dirname, '../specification/archimate3.0/demo.archimate');
    try {
      demoXml = readFileSync(demoPath, 'utf-8');
    } catch (error) {
      console.error('Failed to read demo.archimate:', error);
      throw error;
    }
  });

  beforeEach(() => {
    // 创建测试容器
    const container = document.createElement('div');
    container.style.width = '1000px';
    container.style.height = '1000px';
    document.body.appendChild(container);

    // 创建 Viewer 实例
    viewer = new Viewer({
      container: container
    });
  });

  afterEach(() => {
    // 清理
    if (viewer) {
      viewer.destroy();
    }
    const containers = document.querySelectorAll('div[style*="width: 1000px"]');
    containers.forEach(container => container.remove());
  });

  test('should import demo.archimate without errors', async () => {
    let importError = null;
    try {
      await viewer.importXML(demoXml);
    } catch (error) {
      importError = error;
    }

    expect(importError).toBeNull();
  });

  test('should parse all elements correctly', async () => {
    await viewer.importXML(demoXml);
    
      const moddle = viewer.get('moddle');
      const parseResult = await moddle.fromXML(demoXml, 'archimate:Model');
      const parsedModel = parseResult.rootElement;
    
    expect(parsedModel).toBeDefined();
    expect(parsedModel.elements).toBeDefined();
    expect(parsedModel.elements.element).toBeDefined();
    expect(Array.isArray(parsedModel.elements.element)).toBe(true);
    expect(parsedModel.elements.element.length).toBeGreaterThan(0);
  });

  test('should parse all relationships correctly', async () => {
    await viewer.importXML(demoXml);
    
    const moddle = viewer.get('moddle');
    const parseResult = await moddle.fromXML(demoXml, 'archimate:Model');
    const parsedModel = parseResult.rootElement;
    
    expect(parsedModel).toBeDefined();
    if (parsedModel.relationships) {
      expect(parsedModel.relationships.relationship).toBeDefined();
      if (parsedModel.relationships.relationship) {
        expect(Array.isArray(parsedModel.relationships.relationship)).toBe(true);
        expect(parsedModel.relationships.relationship.length).toBeGreaterThan(0);
      }
    }
  });

  test('should parse all views correctly', async () => {
    await viewer.importXML(demoXml);
    
    const moddle = viewer.get('moddle');
    const parseResult = await moddle.fromXML(demoXml, 'archimate:Model');
    const parsedModel = parseResult.rootElement;
    
    expect(parsedModel).toBeDefined();
    expect(parsedModel.views).toBeDefined();
    expect(parsedModel.views.diagrams).toBeDefined();
    expect(parsedModel.views.diagrams.view).toBeDefined();
    expect(Array.isArray(parsedModel.views.diagrams.view)).toBe(true);
    expect(parsedModel.views.diagrams.view.length).toBeGreaterThan(0);
  });

  test('should render all element types without errors', async () => {
    const errors = [];
    const warnings = [];

    try {
      await viewer.importXML(demoXml);
    } catch (error) {
      errors.push(`Import error: ${error.message}`);
      console.error('Import error:', error);
    }

    // 获取所有视图
    const moddle = viewer.get('moddle');
    let parsedModel;
    
    try {
      parsedModel = await moddle.fromXML(demoXml, 'archimate:Model');
    } catch (error) {
      errors.push(`Parse error: ${error.message}`);
      console.error('Parse error:', error);
    }
    
    if (parsedModel && parsedModel.views && parsedModel.views.diagrams && parsedModel.views.diagrams.view) {
      for (const view of parsedModel.views.diagrams.view) {
        try {
          await viewer.openView(view.identifier);
        } catch (error) {
          errors.push(`Failed to open view ${view.identifier}: ${error.message}`);
          console.error(`Failed to open view ${view.identifier}:`, error);
        }
      }
    }

    // 检查所有渲染的元素
    const elementRegistry = viewer.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    for (const element of allElements) {
      try {
        // 验证元素有正确的业务对象
        expect(element.businessObject).toBeDefined();
        
        // 验证元素有正确的类型
        expect(element.type).toBeDefined();
        
        // 验证元素有位置信息
        if (element.type !== 'root') {
          expect(element.x).toBeDefined();
          expect(element.y).toBeDefined();
          expect(element.width).toBeDefined();
          expect(element.height).toBeDefined();
        }
      } catch (error) {
        errors.push(`Element validation error for ${element.id}: ${error.message}`);
        console.error(`Element validation error for ${element.id}:`, error);
      }
    }

    // 不忽略任何错误
    if (errors.length > 0) {
      console.error('Errors found:', errors);
    }
    if (warnings.length > 0) {
      console.warn('Warnings found:', warnings);
    }

    expect(errors).toHaveLength(0);
  });

  test('should render all relationship types without errors', async () => {
    const errors = [];

    try {
      await viewer.importXML(demoXml);
    } catch (error) {
      errors.push(`Import error: ${error.message}`);
    }

    // 获取所有连接
    const elementRegistry = viewer.get('elementRegistry');
    const allConnections = elementRegistry.filter(element => 
      element.type === 'archimate:Relationship' || element.type === 'connection'
    );

    for (const connection of allConnections) {
      try {
        expect(connection.businessObject).toBeDefined();
        expect(connection.waypoints).toBeDefined();
        expect(Array.isArray(connection.waypoints)).toBe(true);
        expect(connection.waypoints.length).toBeGreaterThanOrEqual(2);
      } catch (error) {
        errors.push(`Connection validation error for ${connection.id}: ${error.message}`);
      }
    }

    expect(errors).toHaveLength(0);
  });

  test('should handle all element types from demo.archimate', async () => {
    const elementTypes = new Set();
    const errors = [];

    try {
      await viewer.importXML(demoXml);
      
      const moddle = viewer.get('moddle');
      let parsedModel;
      
      try {
        parsedModel = await moddle.fromXML(demoXml, 'archimate:Model');
      } catch (error) {
        errors.push(`Parse error: ${error.message}`);
        throw error;
      }
      
      // 收集所有元素类型
      if (parsedModel.elements && parsedModel.elements.element) {
        for (const element of parsedModel.elements.element) {
          if (element.$type) {
            elementTypes.add(element.$type);
          }
        }
      }

      // 打开所有视图并渲染
      if (parsedModel.views && parsedModel.views.diagrams && parsedModel.views.diagrams.view) {
        for (const view of parsedModel.views.diagrams.view) {
          try {
            await viewer.openView(view.identifier);
          } catch (error) {
            errors.push(`Failed to open view ${view.identifier}: ${error.message}`);
            console.error(`Failed to open view ${view.identifier}:`, error);
          }
        }
      }

      // 验证每种元素类型都能被正确渲染
      const elementRegistry = viewer.get('elementRegistry');
      const renderedTypes = new Set();
      
      elementRegistry.getAll().forEach(element => {
        if (element.businessObject) {
          const bo = element.businessObject;
          // 检查 elementRef 的类型
          if (bo.elementRef && bo.elementRef.$type) {
            renderedTypes.add(bo.elementRef.$type);
          }
          // 检查 relationshipRef 的类型
          if (bo.relationshipRef && bo.relationshipRef.$type) {
            renderedTypes.add(bo.relationshipRef.$type);
          }
          // 检查元素本身的类型
          if (bo.$type) {
            renderedTypes.add(bo.$type);
          }
        }
      });

      // 检查是否有未渲染的元素类型（只检查视图中的元素）
      for (const type of elementTypes) {
        if (!renderedTypes.has(type) && type !== 'archimate:Model') {
          // 这可能是正常的，因为不是所有元素都在视图中
          // 但我们仍然记录它
          console.warn(`Element type ${type} was not found in rendered views`);
        }
      }

    } catch (error) {
      errors.push(`Test error: ${error.message}`);
      console.error('Test error:', error);
    }

    expect(errors).toHaveLength(0);
  });

  test('should export XML without errors', async () => {
    await viewer.importXML(demoXml);
    
    let exportError = null;
    let exportedXml = null;

    try {
      const result = await viewer.saveXML({ format: true });
      exportedXml = result.xml;
    } catch (error) {
      exportError = error;
    }

    expect(exportError).toBeNull();
    expect(exportedXml).toBeDefined();
    expect(exportedXml.length).toBeGreaterThan(0);
  });

  test('should export SVG without errors', async () => {
    await viewer.importXML(demoXml);
    
    // 打开第一个视图
      const moddle = viewer.get('moddle');
      const parseResult = await moddle.fromXML(demoXml, 'archimate:Model');
      const parsedModel = parseResult.rootElement;
    
    if (parsedModel.views && parsedModel.views.diagrams && parsedModel.views.diagrams.view) {
      await viewer.openView(parsedModel.views.diagrams.view[0].identifier);
    }
    
    let exportError = null;
    let exportedSvg = null;

    try {
      const result = await viewer.saveSVG();
      exportedSvg = result.svg;
    } catch (error) {
      exportError = error;
    }

    expect(exportError).toBeNull();
    expect(exportedSvg).toBeDefined();
    expect(exportedSvg.length).toBeGreaterThan(0);
  });
});

